import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import type { VNode } from "../core/vnode.js";
import { getIslands, resetIslands } from "./island.js";
import { renderToString } from "./render.js";

export type PageOptions = {
	title?: string;
	lang?: string;
	head?: VNode;
	path?: string;
	islandsDir?: string;
};

export type BuildOptions = {
	outDir?: string;
	pages?: Record<string, () => VNode>;
	islandsDir?: string;
};

const wrapDocument = (
	body: string,
	{ title, lang = "en", head }: PageOptions = {},
	scripts: string = "",
): string => {
	return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${title ? `<title>${title}</title>` : ""}${head ? renderToString(head) : ""}</head><body>${body}${scripts}</body></html>`;
};

const collectIslandScripts = (basePath: string): string => {
	const islands = getIslands();
	let scripts = "";
	for (const src of islands) {
		const scriptSrc =
			src.startsWith("/") || src.startsWith("http")
				? src
				: `${basePath}/${src.replace(/\.(ts|tsx)$/, ".js")}`;
		scripts += `<script type="module" src="${scriptSrc}"></script>`;
	}
	return scripts;
};

export const render = (vnode: VNode, options: PageOptions = {}): void => {
	const { path, islandsDir = "/islands" } = options;
	resetIslands();

	const outPath =
		path ??
		join("dist", `${basename(process.argv[1], extname(process.argv[1]))}.html`);
	mkdirSync(dirname(outPath), { recursive: true });

	const body = renderToString(vnode);
	const scripts = collectIslandScripts(islandsDir);
	const html = wrapDocument(body, options, scripts);

	writeFileSync(outPath, html);
	console.log(`Rendered: ${outPath}`);
};

export const renderHtml = (vnode: VNode, options: PageOptions = {}): string => {
	resetIslands();
	const body = renderToString(vnode);
	const scripts = collectIslandScripts(options.islandsDir || "/islands");
	return wrapDocument(body, options, scripts);
};

export const build = (options: BuildOptions): void => {
	const { outDir = "dist", pages = {}, islandsDir = "/islands" } = options;

	mkdirSync(outDir, { recursive: true });

	const allIslands = new Set<string>();

	for (const [route, component] of Object.entries(pages)) {
		resetIslands();
		const outPath = join(outDir, route, "index.html");
		mkdirSync(dirname(outPath), { recursive: true });

		const body = renderToString(component());
		const pageIslands = getIslands();
		pageIslands.forEach((island) => {
			allIslands.add(island);
		});

		let scripts = "";
		for (const src of pageIslands) {
			const scriptSrc =
				src.startsWith("/") || src.startsWith("http")
					? src
					: `${islandsDir}/${src.replace(/\.(ts|tsx)$/, ".js")}`;
			scripts += `<script type="module" src="${scriptSrc}"></script>`;
		}

		const html = wrapDocument(body, {}, scripts);
		writeFileSync(outPath, html);
		console.log(`Built: ${outPath}`);
	}

	if (allIslands.size > 0) {
		console.log(`\nIslands to compile:`);
		for (const island of allIslands) {
			console.log(`  - ${island}`);
		}
	}
};
