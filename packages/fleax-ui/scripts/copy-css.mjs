import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const srcDir = resolve(process.cwd(), "src/components");
const distDir = resolve(process.cwd(), "dist/components");

if (!existsSync(srcDir)) process.exit(0);

const listFiles = (dir, out = []) => {
	if (!existsSync(dir)) return out;
	for (const name of readdirSync(dir)) {
		const fullPath = join(dir, name);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			listFiles(fullPath, out);
			continue;
		}
		out.push(fullPath);
	}
	return out;
};

const removeDistCss = (dir) => {
	for (const filePath of listFiles(dir)) {
		if (filePath.endsWith(".css")) rmSync(filePath, { force: true });
	}
};

mkdirSync(distDir, { recursive: true });
removeDistCss(distDir);

const deindentBlock = (content) => {
	const normalized = content.replace(/\r\n/g, "\n");
	const lines = normalized.split("\n");
	while (lines.length && lines[0].trim() === "") lines.shift();
	while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
	if (lines.length === 0) return "";

	let minIndent = Infinity;
	for (const line of lines) {
		if (line.trim() === "") continue;
		const indent = (line.match(/^[\t ]*/) || [""])[0].length;
		minIndent = Math.min(minIndent, indent);
	}
	if (!Number.isFinite(minIndent) || minIndent <= 0)
		return `${lines.join("\n")}\n`;
	const deindented = lines.map((line) =>
		line.trim() === "" ? "" : line.slice(minIndent),
	);
	return `${deindented.join("\n")}\n`;
};

const unwrapComponentsLayer = (css) => {
	const match = css.match(
		/^\s*@layer\s+(?:components|componenets)\s*\{([\s\S]*)\}\s*$/i,
	);
	if (!match) return css;
	return deindentBlock(match[1]);
};

const walkCssFiles = (dir) =>
	listFiles(dir).filter((filePath) => filePath.endsWith(".css"));

for (const cssPath of walkCssFiles(srcDir)) {
	const relPath = relative(srcDir, cssPath);
	const outPath = join(distDir, relPath);
	mkdirSync(dirname(outPath), { recursive: true });
	const source = readFileSync(cssPath, "utf-8");
	const normalized = unwrapComponentsLayer(source);
	writeFileSync(outPath, normalized);
}
