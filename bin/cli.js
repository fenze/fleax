#!/usr/bin/env node
import { execSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	watch,
	writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import {
	basename,
	dirname,
	extname,
	join,
	relative,
	resolve,
	sep,
} from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import brotli from "brotli";
import * as lightningcss from "lightningcss";
import { getIslands, renderToString, resetIslands } from "../dist/index.js";

const isProd = process.env.NODE_ENV === "production";
const cwd = process.cwd();
const CACHE_FILE = join(cwd, ".fleax-cache.json");
const CACHE_VERSION = 1;

const log = (msg) => console.log(`[fleax] ${msg}`);
const hash = (s) => createHash("md5").update(s).digest("hex").slice(0, 8);
const escapeHTML = (s) =>
	String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const minifyCss = (css) => {
	if (!isProd) return css;
	const { code } = lightningcss.transform({
		code: Buffer.from(css),
		minify: true,
	});
	return code.toString();
};

const runClosureCompiler = (inputPath, outputPath) => {
	try {
		execSync(
			`npx google-closure-compiler --js="${inputPath}" --js_output_file="${outputPath}" --compilation_level=ADVANCED --language_out=ES_2020 --create_source_map=%outname%.map`,
			{ stdio: "pipe" },
		);
		return true;
	} catch (e) {
		log(`Closure Compiler failed, using esbuild output: ${e.message}`);
		return false;
	}
};

const compressBrotli = (filePath) => {
	const content = readFileSync(filePath);
	const compressed = brotli.compress(content, {
		mode: 1,
		quality: 11,
		lgwin: 22,
	});
	if (compressed) {
		writeFileSync(`${filePath}.br`, Buffer.from(compressed));
	}
};

const compressDir = (dir, ext) => {
	for (const file of readdirSync(dir)) {
		const filePath = join(dir, file);
		if (statSync(filePath).isDirectory()) {
			compressDir(filePath, ext);
		} else if (file.endsWith(ext) && !file.endsWith(".br")) {
			compressBrotli(filePath);
		}
	}
};

const hashFile = (filePath) => {
	try {
		if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
		return createHash("md5").update(readFileSync(filePath)).digest("hex");
	} catch {
		return null;
	}
};

const resolveInputPath = (inputPath) =>
	inputPath.startsWith("/") ? inputPath : resolve(cwd, inputPath);

const computeDepHashes = (depPaths) => {
	const result = {};
	for (const depPath of depPaths) {
		const absPath = resolveInputPath(depPath);
		const fileHash = hashFile(absPath);
		result[absPath] = fileHash;
	}
	return result;
};

const depHashesEqual = (a, b) => {
	const aEntries = Object.entries(a || {});
	const bEntries = Object.entries(b || {});
	if (aEntries.length !== bEntries.length) return false;
	for (const [filePath, hashValue] of aEntries) {
		if (b[filePath] !== hashValue) return false;
	}
	return true;
};

const loadCache = () => {
	if (!existsSync(CACHE_FILE)) {
		return {
			version: CACHE_VERSION,
			mode: isProd ? "production" : "development",
			pages: {},
			islands: {},
		};
	}

	try {
		const raw = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
		if (
			raw.version !== CACHE_VERSION ||
			raw.mode !== (isProd ? "production" : "development")
		) {
			return {
				version: CACHE_VERSION,
				mode: isProd ? "production" : "development",
				pages: {},
				islands: {},
			};
		}
		return {
			version: CACHE_VERSION,
			mode: isProd ? "production" : "development",
			pages: raw.pages || {},
			islands: raw.islands || {},
		};
	} catch {
		return {
			version: CACHE_VERSION,
			mode: isProd ? "production" : "development",
			pages: {},
			islands: {},
		};
	}
};

const saveCache = (cache) => {
	writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
};

const resolveIslandSrcPath = (src) => {
	if (src.startsWith("@/")) {
		const srcDir = join(cwd, "src", src.slice(2));
		const rootPath = join(cwd, src.slice(2));
		return existsSync(srcDir) ? srcDir : rootPath;
	}
	if (src.startsWith("./")) return join(cwd, src);
	return src;
};

const outputExistsForUrl = (outDir, urlPath) => {
	if (!urlPath) return false;
	const diskPath = join(outDir, urlPath.replace(/^\//, ""));
	return existsSync(diskPath);
};

const removeOutputForUrl = (outDir, urlPath) => {
	if (!urlPath) return;
	const diskPath = join(outDir, urlPath.replace(/^\//, ""));
	if (existsSync(diskPath)) rmSync(diskPath);
};

const wrapDocument = (body, meta, scripts, cssLinks) => {
	const { title, lang = "en", head } = meta || {};
	const headHtml = head ? renderToString(head) : "";
	const safeLang = escapeHTML(lang);
	const safeTitle = title ? `<title>${escapeHTML(title)}</title>` : "";
	return `<!DOCTYPE html><html lang="${safeLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${safeTitle}${cssLinks}${headHtml}</head><body>${body}${scripts}</body></html>`;
};

const cssPlugin = () => ({
	name: "fleax-css",
	setup(build) {
		build.onResolve({ filter: /\.css$/ }, (args) => ({
			path: args.path,
			namespace: "css-void",
		}));
		build.onLoad({ filter: /.*/, namespace: "css-void" }, () => ({
			contents: "",
			loader: "js",
		}));
	},
});

const LIVE_RELOAD_PATH = "/__fleax_live";
const liveReloadScript = `<script>(()=>{const es=new EventSource("${LIVE_RELOAD_PATH}");es.addEventListener("reload",()=>location.reload());es.onerror=()=>{};})();</script>`;
const shouldWatchSourcePath = (file) =>
	file.startsWith("src/") ||
	file.startsWith("pages/") ||
	file === "tsconfig.json";
const shouldIgnoreWatchedPath = (file) =>
	file.startsWith("dist/") ||
	file.startsWith(".fleax-temp/") ||
	file === ".fleax-cache.json" ||
	file.startsWith(".");

const buildIslands = async (islands, outDir, islandCache) => {
	if (islands.size === 0) {
		return {
			paths: new Map(),
			css: new Map(),
			cache: {},
			changedSources: new Set(),
		};
	}

	const esbuild = await import("esbuild");
	const paths = new Map();
	const cssOutputs = new Map();
	const nextCache = {};
	const changedSources = new Set();

	mkdirSync(join(outDir, "islands"), { recursive: true });

	for (const [src] of islands) {
		const srcPath = resolveIslandSrcPath(src);

		if (!existsSync(srcPath)) {
			log(`Warning: Island not found: ${srcPath}`);
			changedSources.add(src);
			continue;
		}

		const prev = islandCache[src];
		if (prev?.depHashes) {
			const currentDepHashes = {};
			for (const depPath of Object.keys(prev.depHashes)) {
				currentDepHashes[depPath] = hashFile(depPath);
			}
			const canReuse =
				depHashesEqual(prev.depHashes, currentDepHashes) &&
				outputExistsForUrl(outDir, prev.jsPath) &&
				(!prev.cssPath || outputExistsForUrl(outDir, prev.cssPath));

			if (canReuse) {
				paths.set(src, prev.jsPath);
				if (prev.cssPath) cssOutputs.set(src, prev.cssPath);
				nextCache[src] = prev;
				continue;
			}
		}

		const content = readFileSync(srcPath, "utf-8");
		const baseName = basename(srcPath, extname(srcPath));
		const fileHash = isProd ? `.${hash(content)}` : "";
		const outName = `${baseName}${fileHash}.js`;

		const cssImports = content.match(/import\s+['"]([^'"]+\.css)['"]/g) || [];
		let cssContent = "";
		for (const imp of cssImports) {
			const match = imp.match(/['"]([^'"]+)['"]/);
			const cssPath = match ? match[1] : null;
			if (cssPath) {
				let fullPath = cssPath;
				if (cssPath.startsWith("@/")) {
					const srcDir = join(cwd, "src", cssPath.slice(2));
					const rootPath = join(cwd, cssPath.slice(2));
					fullPath = existsSync(srcDir) ? srcDir : rootPath;
				} else if (cssPath.startsWith("./")) {
					fullPath = join(dirname(srcPath), cssPath);
				}
				if (existsSync(fullPath)) {
					cssContent += `${readFileSync(fullPath, "utf-8")}\n`;
				}
			}
		}

		if (cssContent) {
			const minified = minifyCss(cssContent);
			const cssHash = isProd ? `.${hash(minified)}` : "";
			const cssName = `${baseName}${cssHash}.css`;
			writeFileSync(join(outDir, "islands", cssName), minified);
			cssOutputs.set(src, `/islands/${cssName}`);
		}

		const result = await esbuild.build({
			entryPoints: [srcPath],
			outfile: join(outDir, "islands", outName),
			bundle: true,
			treeShaking: true,
			format: "iife",
			globalName: "_island",
			footer: {
				js: `if(_island&&typeof _island.default==="function"){const nodes=document.querySelectorAll('[data-island="${src}"]');for(const el of nodes){_island.default(el)}}`,
			},
			minify: false,
			legalComments: isProd ? "none" : "inline",
			sourcemap: !isProd,
			platform: "browser",
			plugins: [cssPlugin()],
			metafile: true,
		});

		if (isProd) {
			const jsPath = join(outDir, "islands", outName);
			const tempPath = `${jsPath}.tmp`;
			runClosureCompiler(jsPath, tempPath);
			if (existsSync(tempPath)) {
				rmSync(jsPath);
				let compiledJsContent = readFileSync(tempPath, "utf-8");
				compiledJsContent += `\n//# sourceMappingURL=${basename(jsPath)}.map`;
				writeFileSync(jsPath, compiledJsContent);
				if (existsSync(`${tempPath}.map`)) {
					const sourceMapContent = readFileSync(`${tempPath}.map`, "utf-8");
					const sourceMap = JSON.parse(sourceMapContent);
					sourceMap.file = basename(jsPath);
					writeFileSync(`${jsPath}.map`, JSON.stringify(sourceMap));
					rmSync(`${tempPath}.map`);
				}
				rmSync(tempPath);
			}
		}

		paths.set(src, `/islands/${outName}`);
		log(`  ${src} → islands/${outName}`);
		changedSources.add(src);

		const depPaths = Object.keys(result.metafile?.inputs || {}).map(
			(inputPath) => resolveInputPath(inputPath),
		);
		const depHashes = computeDepHashes(depPaths);
		const jsPath = `/islands/${outName}`;
		const cssPath = cssOutputs.get(src);

		if (prev && (prev.jsPath !== jsPath || prev.cssPath !== cssPath)) {
			removeOutputForUrl(outDir, prev.jsPath);
			removeOutputForUrl(outDir, prev.cssPath);
		}

		nextCache[src] = {
			srcPath,
			depHashes,
			jsPath,
			cssPath,
		};
	}

	return { paths, css: cssOutputs, cache: nextCache, changedSources };
};

const findPages = (dir) => {
	const pages = [];

	const srcDir = join(dir, "src");
	if (existsSync(srcDir)) {
		for (const file of readdirSync(srcDir)) {
			if (
				(file.endsWith(".tsx") || file.endsWith(".jsx")) &&
				!file.startsWith(".fleax-temp")
			) {
				pages.push(join(srcDir, file));
			}
		}
	}

	if (existsSync(join(dir, "pages"))) {
		for (const file of readdirSync(join(dir, "pages"))) {
			if (
				(file.endsWith(".tsx") || file.endsWith(".jsx")) &&
				!file.startsWith(".fleax-temp")
			) {
				pages.push(join(dir, "pages", file));
			}
		}
	}

	return pages;
};

// Process CSS imports from a file, return { css, tempPath, depHashes }
const processPageFile = async (pagePath) => {
	const content = readFileSync(pagePath, "utf-8");
	const cssImports = content.match(/import\s+['"]([^'"]+\.css)['"]/g) || [];
	let pageCss = "";

	for (const imp of cssImports) {
		const match = imp.match(/['"]([^'"]+)['"]/);
		const cssPath = match ? match[1] : null;
		if (cssPath) {
			let fullPath = cssPath;
			if (cssPath.startsWith("@/")) {
				const srcDir = join(cwd, "src", cssPath.slice(2));
				const rootPath = join(cwd, cssPath.slice(2));
				fullPath = existsSync(srcDir) ? srcDir : rootPath;
			} else if (cssPath.startsWith("./")) {
				fullPath = join(dirname(pagePath), cssPath);
			}
			if (existsSync(fullPath)) {
				pageCss += `${readFileSync(fullPath, "utf-8")}\n`;
			}
		}
	}

	// Bundle with esbuild (handles JSX + strips CSS)
	const esbuild = await import("esbuild");
	const tempDir = join(cwd, ".fleax-temp");
	mkdirSync(tempDir, { recursive: true });
	const tempPath = join(
		tempDir,
		`${basename(pagePath)}.${Date.now()}.${randomUUID()}.mjs`,
	);

	const result = await esbuild.build({
		entryPoints: [pagePath],
		outfile: tempPath,
		bundle: true,
		treeShaking: true,
		format: "esm",
		platform: "node",
		external: ["node:*", "fleax"],
		plugins: [cssPlugin()],
		jsx: "automatic",
		jsxImportSource: "fleax",
		jsxSideEffects: false,
		metafile: true,
	});

	const depPaths = Object.keys(result.metafile?.inputs || {}).map((inputPath) =>
		resolveInputPath(inputPath),
	);
	const depHashes = computeDepHashes(depPaths);

	return { css: pageCss, tempPath, depHashes };
};

const getPageRoute = (pagePath) => basename(pagePath, extname(pagePath));

const getPageHtmlOutPath = (outDir, pagePath) => {
	const route = getPageRoute(pagePath);
	return route === "index"
		? join(outDir, "index.html")
		: join(outDir, route, "index.html");
};

const renderPage = async (pagePath) => {
	resetIslands();
	const { css: pageCss, tempPath, depHashes } = await processPageFile(pagePath);

	let module;
	try {
		module = await import(pathToFileURL(tempPath).href);
	} finally {
		try {
			rmSync(tempPath);
		} catch {}
	}

	const component = module.default;
	const meta = module.meta || {};
	if (!component) {
		log(`Skipping ${basename(pagePath)} - no default export`);
		return null;
	}

	return {
		path: pagePath,
		html: renderToString(component),
		meta,
		islands: getIslands(),
		css: pageCss,
		depHashes,
	};
};

const build = async () => {
	const outDir = join(cwd, "dist");
	mkdirSync(outDir, { recursive: true });

	const pageFiles = findPages(cwd);

	if (pageFiles.length === 0) {
		log(
			"No pages found. Create page.tsx or pages/*.tsx with `export default`.",
		);
		return;
	}

	const cache = loadCache();
	const prevPages = cache.pages || {};
	const prevIslands = cache.islands || {};
	const nextPages = {};
	const renderedPages = new Map();
	const islandSourcesByPage = new Map();
	const unchangedPagePaths = [];
	const pageSet = new Set(pageFiles);
	const allIslands = new Map();

	for (const oldPagePath of Object.keys(prevPages)) {
		if (!pageSet.has(oldPagePath)) {
			removeOutputForUrl(outDir, prevPages[oldPagePath].cssPath);
			if (
				prevPages[oldPagePath].htmlPath &&
				existsSync(prevPages[oldPagePath].htmlPath)
			) {
				rmSync(prevPages[oldPagePath].htmlPath);
			}
		}
	}

	for (const pagePath of pageFiles) {
		const prevPage = prevPages[pagePath];
		let sourceChanged = true;

		if (prevPage?.depHashes) {
			const currentDepHashes = {};
			for (const depPath of Object.keys(prevPage.depHashes)) {
				currentDepHashes[depPath] = hashFile(depPath);
			}
			sourceChanged = !depHashesEqual(prevPage.depHashes, currentDepHashes);
		}

		if (sourceChanged) {
			const page = await renderPage(pagePath);
			if (!page) continue;
			renderedPages.set(pagePath, page);
			const islandSources = Array.from(page.islands.keys());
			islandSourcesByPage.set(pagePath, islandSources);
			for (const [src, data] of page.islands) allIslands.set(src, data);
		} else {
			const islandSources = prevPage.islandSources || [];
			islandSourcesByPage.set(pagePath, islandSources);
			for (const src of islandSources) {
				allIslands.set(src, { originalSrc: src, resolvedPath: src });
			}
			unchangedPagePaths.push(pagePath);
		}
	}

	for (const oldSrc of Object.keys(prevIslands)) {
		if (!allIslands.has(oldSrc)) {
			removeOutputForUrl(outDir, prevIslands[oldSrc].jsPath);
			removeOutputForUrl(outDir, prevIslands[oldSrc].cssPath);
		}
	}

	log(`Building ${allIslands.size} islands...`);
	const {
		paths: islandPaths,
		css: islandCss,
		cache: nextIslands,
		changedSources,
	} = await buildIslands(allIslands, outDir, prevIslands);

	const pagesToWrite = new Set(renderedPages.keys());
	for (const pagePath of unchangedPagePaths) {
		const prevPage = prevPages[pagePath];
		const islandSources = islandSourcesByPage.get(pagePath) || [];
		const islandChanged = islandSources.some((src) => changedSources.has(src));
		const htmlPath = prevPage?.htmlPath || getPageHtmlOutPath(outDir, pagePath);
		const hasCssOutput =
			!prevPage?.cssPath || outputExistsForUrl(outDir, prevPage.cssPath);
		const hasHtmlOutput = existsSync(htmlPath);

		if (islandChanged || !hasHtmlOutput || !hasCssOutput) {
			pagesToWrite.add(pagePath);
		} else {
			nextPages[pagePath] = prevPage;
		}
	}

	for (const pagePath of pagesToWrite) {
		if (!renderedPages.has(pagePath)) {
			const page = await renderPage(pagePath);
			if (!page) continue;
			renderedPages.set(pagePath, page);
			islandSourcesByPage.set(pagePath, Array.from(page.islands.keys()));
		}

		const page = renderedPages.get(pagePath);
		const prevPage = prevPages[pagePath];

		let scripts = "";
		let cssLinks = "";

		for (const [src] of page.islands) {
			const path = islandPaths.get(src);
			if (path) scripts += `<script src="${path}"></script>`;
			const css = islandCss.get(src);
			if (css) cssLinks += `<link rel="stylesheet" href="${css}">`;
		}

		let cssPath;
		if (page.css) {
			const minified = minifyCss(page.css);
			const route = getPageRoute(page.path);
			const pageCssHash = isProd ? `.${hash(minified)}` : "";
			const pageCssName = `${route}${pageCssHash}.css`;
			writeFileSync(join(outDir, pageCssName), minified);
			cssPath = `/${pageCssName}`;
			cssLinks = `<link rel="stylesheet" href="${cssPath}">${cssLinks}`;
		}

		if (prevPage?.cssPath && prevPage.cssPath !== cssPath) {
			removeOutputForUrl(outDir, prevPage.cssPath);
		}

		const html = wrapDocument(page.html, page.meta || {}, scripts, cssLinks);
		const outPath = getPageHtmlOutPath(outDir, page.path);
		mkdirSync(dirname(outPath), { recursive: true });
		writeFileSync(outPath, html);
		log(`Built: ${relative(cwd, outPath)}`);

		nextPages[pagePath] = {
			depHashes: page.depHashes,
			islandSources: Array.from(page.islands.keys()),
			htmlPath: outPath,
			cssPath,
		};
	}

	saveCache({
		version: CACHE_VERSION,
		mode: isProd ? "production" : "development",
		pages: nextPages,
		islands: nextIslands,
	});

	log(`Done! (${isProd ? "production" : "development"})`);

	if (isProd) {
		compressDir(outDir, ".js");
		compressDir(outDir, ".css");
		log("Brotli compression complete");
	}

	const tempDir = join(cwd, ".fleax-temp");
	if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
};

const dev = async () => {
	log("Development mode");
	log("Run `NODE_ENV=production npx fleax build` for production.");
	await build();
};

const watchMode = async () => {
	log("Watch mode");
	await build();

	let timer;
	let building = false;
	let queued = false;

	const trigger = () => {
		clearTimeout(timer);
		timer = setTimeout(async () => {
			if (building) {
				queued = true;
				return;
			}

			building = true;
			try {
				await build();
			} catch (e) {
				log(`Build failed: ${e?.message || e}`);
			} finally {
				building = false;
				if (queued) {
					queued = false;
					trigger();
				}
			}
		}, 120);
	};

	const watcher = watch(cwd, { recursive: true }, (_eventType, fileName) => {
		const file = String(fileName || "");
		if (!file) return;
		if (shouldIgnoreWatchedPath(file)) return;
		if (shouldWatchSourcePath(file)) {
			trigger();
		}
	});

	process.on("SIGINT", () => {
		watcher.close();
		process.exit(0);
	});
};

const askProjectName = async () => {
	if (!process.stdin.isTTY || !process.stdout.isTTY) return "";
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		const answer = await rl.question("Project name: ");
		return answer.trim();
	} finally {
		rl.close();
	}
};

const create = async (name) => {
	let projectName = (name || "").trim();
	if (!projectName) {
		projectName = await askProjectName();
	}

	if (!projectName) {
		console.log("Usage: fleax create <project-name>");
		process.exit(1);
	}

	const projectDir = join(cwd, projectName);
	if (existsSync(projectDir)) {
		console.log(`Error: ${projectName} already exists`);
		process.exit(1);
	}

	mkdirSync(join(projectDir, "src", "components"), { recursive: true });

	const packageJson = {
		name: projectName,
		version: "1.0.0",
		type: "module",
		scripts: {
			build: "NODE_ENV=production fleax build",
			dev: "fleax build && fleax serve",
		},
		dependencies: {
			fleax: "latest",
		},
		devDependencies: {
			tsx: "^4.21.0",
			typescript: "^5.2.2",
			"google-closure-compiler": "^20260216.0.0",
		},
	};

	const tsconfig = {
		compilerOptions: {
			target: "ES2020",
			module: "ESNext",
			moduleResolution: "bundler",
			jsx: "react-jsx",
			jsxImportSource: "fleax",
			strict: true,
			baseUrl: ".",
			paths: {
				"@/*": ["./src/*"],
			},
		},
		include: ["src/**/*.ts", "src/**/*.tsx"],
	};

	const indexTsx = `import { Island } from "fleax";
import "./style.css";

export const meta = {
	title: "${projectName}",
};

export default (
	<main>
		<h1>${projectName}</h1>
		<Island src="@/components/counter.ts">
			<div class="counter">
				<button type="button" class="decrement">−</button>
				<span class="count">0</span>
				<button type="button" class="increment">+</button>
			</div>
		</Island>
	</main>
);
`;

	const styleCss = `* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

body {
	font-family: system-ui, sans-serif;
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #1a1a2e;
	color: #fff;
}

main {
	text-align: center;
}

h1 {
	margin-bottom: 2rem;
}

.counter {
	display: flex;
	align-items: center;
	gap: 1rem;
}

.counter button {
	width: 40px;
	height: 40px;
	font-size: 1.5rem;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	background: #e94560;
	color: #fff;
}

.count {
	font-size: 2rem;
	min-width: 3rem;
}
`;

	const counterTs = `import "@/components/counter.css";

export default (el: Element) => {
	let count = 0;
	const display = el.querySelector(".count")!;
	const decBtn = el.querySelector(".decrement") as HTMLButtonElement;
	const incBtn = el.querySelector(".increment") as HTMLButtonElement;

	decBtn.onclick = () => {
		count--;
		display.textContent = String(count);
	};

	incBtn.onclick = () => {
		count++;
		display.textContent = String(count);
	};
};
`;

	const counterCss = `.counter button:hover {
	opacity: 0.8;
}

.counter button:active {
	transform: scale(0.95);
}
`;

	writeFileSync(
		join(projectDir, "package.json"),
		JSON.stringify(packageJson, null, 2),
	);
	writeFileSync(
		join(projectDir, "tsconfig.json"),
		JSON.stringify(tsconfig, null, 2),
	);
	writeFileSync(join(projectDir, "src", "index.tsx"), indexTsx);
	writeFileSync(join(projectDir, "src", "style.css"), styleCss);
	writeFileSync(join(projectDir, "src", "components", "counter.ts"), counterTs);
	writeFileSync(
		join(projectDir, "src", "components", "counter.css"),
		counterCss,
	);

	console.log(`\nCreated ${projectName}/`);
	console.log("Installing dependencies with npm...");
	let installOk = false;
	try {
		execSync("npm install", { cwd: projectDir, stdio: "inherit" });
		installOk = true;
	} catch {
		console.log(
			"npm install failed. Run it manually inside the project folder.",
		);
	}
	console.log(`  src/`);
	console.log(`    index.tsx`);
	console.log(`    style.css`);
	console.log(`    components/`);
	console.log(`      counter.ts`);
	console.log(`      counter.css`);
	console.log(`  package.json`);
	console.log(`  tsconfig.json`);
	console.log(`\nNext steps:`);
	console.log(`  cd ${projectName}`);
	if (!installOk) console.log(`  npm install`);
	console.log(`  npm run dev`);
};

const serve = async ({ port = 3000, hot = false } = {}) => {
	const outDir = join(cwd, "dist");
	if (!existsSync(outDir)) {
		if (hot) {
			await build();
		} else {
			log("No dist folder. Run `fleax build` first.");
			process.exit(1);
		}
	}
	if (hot && !existsSync(outDir)) {
		log("No dist folder. Hot mode failed to produce output.");
		process.exit(1);
	}

	const liveClients = new Set();
	let notifyTimer;
	const notifyReload = () => {
		clearTimeout(notifyTimer);
		notifyTimer = setTimeout(() => {
			for (const client of liveClients) {
				client.write("event: reload\ndata: now\n\n");
			}
		}, 80);
	};

	const distWatcher = watch(outDir, { recursive: true }, () => {
		notifyReload();
	});

	let sourceWatcher;
	if (hot) {
		log("Hot mode enabled");
		let buildTimer;
		let building = false;
		let queued = false;
		const triggerBuild = () => {
			clearTimeout(buildTimer);
			buildTimer = setTimeout(async () => {
				if (building) {
					queued = true;
					return;
				}
				building = true;
				try {
					await build();
				} catch (e) {
					log(`Build failed: ${e?.message || e}`);
				} finally {
					building = false;
					if (queued) {
						queued = false;
						triggerBuild();
					}
				}
			}, 120);
		};

		sourceWatcher = watch(cwd, { recursive: true }, (_eventType, fileName) => {
			const file = String(fileName || "");
			if (!file) return;
			if (shouldIgnoreWatchedPath(file)) return;
			if (shouldWatchSourcePath(file)) triggerBuild();
		});
	}

	const mimeTypes = {
		".html": "text/html",
		".css": "text/css",
		".js": "application/javascript",
		".json": "application/json",
		".png": "image/png",
		".jpg": "image/jpeg",
		".svg": "image/svg+xml",
		".ico": "image/x-icon",
	};

	const server = createServer((req, res) => {
		if (req.url === LIVE_RELOAD_PATH) {
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
			});
			res.write("\n");
			liveClients.add(res);
			req.on("close", () => {
				liveClients.delete(res);
			});
			return;
		}

		let path = req.url || "/";
		path = path.split("?")[0].split("#")[0];
		try {
			path = decodeURIComponent(path);
		} catch {
			res.statusCode = 400;
			res.end("Bad request");
			return;
		}
		if (path === "/") path = "/index.html";

		const outRoot = resolve(outDir);
		const relativePath = path.replace(/^\/+/, "");
		let filePath = resolve(outRoot, relativePath);

		if (filePath !== outRoot && !filePath.startsWith(`${outRoot}${sep}`)) {
			res.statusCode = 403;
			res.end("Forbidden");
			return;
		}

		if (existsSync(filePath) && statSync(filePath).isDirectory()) {
			filePath = join(filePath, "index.html");
		}

		if (!existsSync(filePath) || !statSync(filePath).isFile()) {
			res.statusCode = 404;
			res.end("Not found");
			return;
		}

		const ext = extname(filePath);
		const contentType = mimeTypes[ext] || "application/octet-stream";

		res.setHeader("Content-Type", contentType);
		if (ext === ".html") {
			let html = readFileSync(filePath, "utf-8");
			if (html.includes("</body>")) {
				html = html.replace("</body>", `${liveReloadScript}</body>`);
			} else {
				html += liveReloadScript;
			}
			res.end(html);
			return;
		}
		res.end(readFileSync(filePath));
	});

	server.listen(port, () => {
		log(`Server running at http://localhost:${port}`);
	});

	process.on("SIGINT", () => {
		distWatcher.close();
		if (sourceWatcher) sourceWatcher.close();
		for (const client of liveClients) client.end();
		server.close(() => process.exit(0));
	});
};

const cmd = process.argv[2] || "build";
const arg = process.argv[3];
const restArgs = process.argv.slice(3);

if (cmd === "create") {
	create(arg);
} else if (cmd === "dev") {
	dev();
} else if (cmd === "watch") {
	watchMode();
} else if (cmd === "build") {
	build();
} else if (cmd === "serve") {
	let port = 3000;
	let hot = false;
	for (const token of restArgs) {
		if (token === "--hot") {
			hot = true;
			continue;
		}
		const parsed = Number.parseInt(token, 10);
		if (!Number.isNaN(parsed)) port = parsed;
	}
	serve({ port, hot });
} else {
	console.log("Usage: fleax [create|build|dev|watch|serve [port] [--hot]]");
}
