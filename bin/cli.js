#!/usr/bin/env node
import { execSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	statSync,
	watch,
	writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
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
import {
	getIslandClassName,
	getIslands,
	renderToString,
	resetIslands,
} from "../dist/index.js";

const isProd = process.env.NODE_ENV === "production";
const cwd = process.cwd();
const nodeRequire = createRequire(import.meta.url);
const CACHE_FILE = join(cwd, ".fleax-cache.json");
const CACHE_VERSION = 1;

const log = (msg) => console.log(`[fleax] ${msg}`);
const hash = (s) => createHash("md5").update(s).digest("hex").slice(0, 8);
const escapeHTML = (s) =>
	String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const extractClassesFromHtml = (html) => {
	const classes = new Set();
	const classAttr = /class\s*=\s*("([^"]*)"|'([^']*)')/g;
	let match = classAttr.exec(html);
	while (match) {
		const value = match[2] || match[3] || "";
		for (const token of value.split(/\s+/).filter(Boolean)) classes.add(token);
		match = classAttr.exec(html);
	}
	return classes;
};

const extractClassSymbolsFromCss = (css) => {
	const symbols = new Set();
	const classSymbol = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g;
	let match = classSymbol.exec(css);
	while (match) {
		symbols.add(match[1]);
		match = classSymbol.exec(css);
	}
	return symbols;
};

const loadFleaxConfig = () => {
	const packageJsonPath = join(cwd, "package.json");
	if (!existsSync(packageJsonPath)) return { classKeep: [] };
	try {
		const raw = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
		const classKeep = Array.isArray(raw?.fleax?.class?.keep)
			? raw.fleax.class.keep.filter((s) => typeof s === "string")
			: [];
		return { classKeep };
	} catch {
		return { classKeep: [] };
	}
};

const optimizeCss = (
	css,
	{
		purge = false,
		usedClasses = new Set(),
		classKeep = [],
		filename = "style.css",
	} = {},
) => {
	if (!purge && !isProd) return css;
	let unusedSymbols;
	if (purge) {
		const keep = new Set([...usedClasses, ...classKeep]);
		const allSymbols = extractClassSymbolsFromCss(css);
		const expandedKeep = new Set(keep);
		for (const symbol of allSymbols) {
			for (const token of keep) {
				if (
					symbol === token ||
					symbol.startsWith(`${token}-`) ||
					token.startsWith(`${symbol}-`)
				) {
					expandedKeep.add(symbol);
					break;
				}
			}
		}
		unusedSymbols = [...allSymbols].filter(
			(symbol) => !expandedKeep.has(symbol),
		);
	}
	const { code } = lightningcss.transform({
		filename,
		code: Buffer.from(css),
		minify: isProd,
		unusedSymbols,
	});
	return code.toString();
};

const classKeepHash = (classKeep) =>
	createHash("md5").update(JSON.stringify(classKeep)).digest("hex");

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

const loadCache = (profile) => {
	if (!existsSync(CACHE_FILE)) {
		return {
			version: CACHE_VERSION,
			mode: isProd ? "production" : "development",
			purge: profile.purge,
			classKeepHash: profile.classKeepHash,
			pages: {},
			islands: {},
		};
	}

	try {
		const raw = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
		if (
			raw.version !== CACHE_VERSION ||
			raw.mode !== (isProd ? "production" : "development") ||
			raw.purge !== profile.purge ||
			raw.classKeepHash !== profile.classKeepHash
		) {
			return {
				version: CACHE_VERSION,
				mode: isProd ? "production" : "development",
				purge: profile.purge,
				classKeepHash: profile.classKeepHash,
				pages: {},
				islands: {},
			};
		}
		return {
			version: CACHE_VERSION,
			mode: isProd ? "production" : "development",
			purge: profile.purge,
			classKeepHash: profile.classKeepHash,
			pages: raw.pages || {},
			islands: raw.islands || {},
		};
	} catch {
		return {
			version: CACHE_VERSION,
			mode: isProd ? "production" : "development",
			purge: profile.purge,
			classKeepHash: profile.classKeepHash,
			pages: {},
			islands: {},
		};
	}
};

const saveCache = (cache) => {
	writeFileSync(CACHE_FILE, JSON.stringify(cache, null, "\t"));
};

const resolveIslandSrcPath = (src) => {
	if (src.startsWith("@/")) {
		const srcDir = join(cwd, "src", src.slice(2));
		const rootPath = join(cwd, src.slice(2));
		return existsSync(srcDir) ? srcDir : rootPath;
	}
	if (src.startsWith("./")) return join(cwd, src);
	try {
		return nodeRequire.resolve(src, { paths: [cwd] });
	} catch {
		return src;
	}
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
	const themeColor = meta?.themeColor;
	const themeColorLight =
		typeof themeColor === "string"
			? themeColor
			: typeof themeColor?.light === "string"
				? themeColor.light
				: "#ffffff";
	const themeColorDark =
		typeof themeColor === "string"
			? themeColor
			: typeof themeColor?.dark === "string"
				? themeColor.dark
				: "#000000";
	const themeColorMeta = `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${escapeHTML(themeColorLight)}"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="${escapeHTML(themeColorDark)}">`;
	const themeBootstrap =
		'<script>(()=>{const a=v=>{const t=v==="dark"?"dark":"light";document.documentElement.style.colorScheme=t};try{a(localStorage.getItem("theme"))}catch{a(null)};addEventListener("storage",e=>{if(e.key==="theme")a(e.newValue)})})();</script>';
	return `<!DOCTYPE html><html lang="${safeLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="dark light">${themeColorMeta}${themeBootstrap}${safeTitle}${cssLinks}${headHtml}</head><body>${body}${scripts}</body></html>`;
};

const resolveCssImportPath = (cssPath, resolveDir) => {
	if (cssPath.startsWith("@/")) {
		const srcDir = join(cwd, "src", cssPath.slice(2));
		const rootPath = join(cwd, cssPath.slice(2));
		return existsSync(srcDir) ? srcDir : rootPath;
	}
	if (cssPath.startsWith("./") || cssPath.startsWith("../")) {
		return resolve(resolveDir || cwd, cssPath);
	}
	if (cssPath.startsWith("/")) {
		return resolve(cwd, cssPath.slice(1));
	}
	try {
		return nodeRequire.resolve(cssPath, {
			paths: [resolveDir || cwd, cwd],
		});
	} catch {
		return cssPath;
	}
};

const isFleaxUiComponentCssPath = (filePath) => {
	const normalized = String(filePath || "").replace(/\\/g, "/");
	return (
		normalized.includes("/@fleax/ui/dist/components/") ||
		normalized.includes("/packages/fleax-ui/dist/components/")
	);
};

const cssStartsWithLayerRule = (css) => /^\s*@layer\b/i.test(css);

const composeCollectedCss = (entries) => {
	if (!Array.isArray(entries) || entries.length === 0) return "";

	const chunks = [];
	let componentsLayerOpen = false;

	const closeComponentsLayer = () => {
		if (!componentsLayerOpen) return;
		chunks.push("}");
		componentsLayerOpen = false;
	};

	for (const entry of entries) {
		const content = String(entry?.content || "").trim();
		if (!content) continue;

		const shouldWrapInComponentsLayer =
			isFleaxUiComponentCssPath(entry.path) && !cssStartsWithLayerRule(content);

		if (shouldWrapInComponentsLayer) {
			if (!componentsLayerOpen) {
				chunks.push("@layer components {");
				componentsLayerOpen = true;
			}
			chunks.push(content);
			continue;
		}

		closeComponentsLayer();
		chunks.push(content);
	}

	closeComponentsLayer();
	return chunks.length > 0 ? `${chunks.join("\n\n")}\n` : "";
};

const cssPlugin = (collector) => ({
	name: "fleax-css",
	setup(build) {
		build.onResolve({ filter: /\.css$/ }, async (args) => {
			const path = resolveCssImportPath(args.path, args.resolveDir);
			return {
				path,
				namespace: "css-void",
			};
		});
		build.onLoad({ filter: /.*/, namespace: "css-void" }, (args) => {
			if (collector && existsSync(args.path)) {
				collector.paths.add(args.path);
				collector.entries.push({
					path: args.path,
					content: readFileSync(args.path, "utf-8"),
				});
			}
			return {
				contents: "",
				loader: "js",
			};
		});
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
		const islandClassName = getIslandClassName(src);

		const cssCollector = { entries: [], paths: new Set() };

		const result = await esbuild.build({
			entryPoints: [srcPath],
			outfile: join(outDir, "islands", outName),
			bundle: true,
			treeShaking: true,
			format: "iife",
			globalName: "_island",
			footer: {
				js: `if(_island&&typeof _island.default==="function"){const nodes=document.querySelectorAll('.${islandClassName}');for(const el of nodes){_island.default(el)}}`,
			},
			minify: false,
			legalComments: isProd ? "none" : "inline",
			sourcemap: !isProd,
			platform: "browser",
			plugins: [cssPlugin(cssCollector)],
			metafile: true,
		});

		const cssContent = composeCollectedCss(cssCollector.entries).trim();
		if (cssContent) {
			const minified = minifyCss(cssContent);
			const cssHash = isProd ? `.${hash(minified)}` : "";
			const cssName = `${baseName}${cssHash}.css`;
			writeFileSync(join(outDir, "islands", cssName), minified);
			cssOutputs.set(src, `/islands/${cssName}`);
		}

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
		for (const cssPath of cssCollector.paths) depPaths.push(cssPath);
		const depHashes = computeDepHashes([...new Set(depPaths)]);
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
	const cssCollector = { entries: [], paths: new Set() };

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
		external: ["node:*", "@fleax/core"],
		plugins: [cssPlugin(cssCollector)],
		jsx: "automatic",
		jsxImportSource: "@fleax/core",
		jsxSideEffects: false,
		metafile: true,
	});

	const depPaths = Object.keys(result.metafile?.inputs || {}).map((inputPath) =>
		resolveInputPath(inputPath),
	);
	for (const cssPath of cssCollector.paths) depPaths.push(cssPath);
	const depHashes = computeDepHashes([...new Set(depPaths)]);
	const pageCss = composeCollectedCss(cssCollector.entries).trim();

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

const build = async ({ purge } = {}) => {
	const outDir = join(cwd, "dist");
	mkdirSync(outDir, { recursive: true });
	const fleaxConfig = loadFleaxConfig();
	const shouldPurge = typeof purge === "boolean" ? purge : isProd;
	const profile = {
		purge: shouldPurge,
		classKeepHash: classKeepHash(fleaxConfig.classKeep),
	};

	const pageFiles = findPages(cwd);

	if (pageFiles.length === 0) {
		log(
			"No pages found. Create page.tsx or pages/*.tsx with `export default`.",
		);
		return;
	}

	const cache = loadCache(profile);
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
			const usedClasses = extractClassesFromHtml(page.html || "");
			const minified = optimizeCss(page.css, {
				purge: shouldPurge,
				usedClasses,
				classKeep: fleaxConfig.classKeep,
				filename: page.path,
			});
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
		purge: shouldPurge,
		classKeepHash: profile.classKeepHash,
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

const dev = async ({ purge } = {}) => {
	log("Development mode");
	log("Run `NODE_ENV=production npx fleax build` for production.");
	await build({ purge });
};

const watchMode = async ({ purge } = {}) => {
	log("Watch mode");
	await build({ purge });

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
				await build({ purge });
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

const askIncludeUi = async () => {
	if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		const answer = await rl.question(
			"Include @fleax/ui starter components? (y/N): ",
		);
		const normalized = answer.trim().toLowerCase();
		return normalized === "y" || normalized === "yes";
	} finally {
		rl.close();
	}
};

const create = async ({ name, includeUi }) => {
	let projectName = (name || "").trim();
	if (!projectName) {
		projectName = await askProjectName();
	}

	if (!projectName) {
		console.log("Usage: fleax create [name] [--ui|--no-ui]");
		process.exit(1);
	}

	const projectDir = join(cwd, projectName);
	if (existsSync(projectDir)) {
		console.log(`Error: ${projectName} already exists`);
		process.exit(1);
	}

	let withUi = includeUi;
	if (typeof withUi !== "boolean") {
		withUi = await askIncludeUi();
	}

	mkdirSync(join(projectDir, "src", "islands"), { recursive: true });

	const packageJson = {
		name: projectName,
		version: "1.0.0",
		type: "module",
		scripts: {
			build: "NODE_ENV=production fleax build",
			dev: "fleax build && fleax serve",
		},
		dependencies: {
			"@fleax/core": "latest",
		},
		devDependencies: {
			tsx: "^4.21.0",
			typescript: "^5.2.2",
			"google-closure-compiler": "^20260216.0.0",
		},
	};
	if (withUi) {
		packageJson.dependencies["@fleax/ui"] = "latest";
	}

	const tsconfig = {
		compilerOptions: {
			target: "ES2020",
			module: "ESNext",
			moduleResolution: "bundler",
			jsx: "react-jsx",
			jsxImportSource: "@fleax/core",
			strict: true,
			baseUrl: ".",
			paths: {
				"@/*": ["./src/*"],
			},
		},
		include: ["src/**/*.ts", "src/**/*.tsx"],
	};

	const indexTsx = withUi
		? `import { Island } from "@fleax/core";
import { Button, Card, CardBody, CardTitle } from "@fleax/ui";
import "@fleax/ui/styles.css";
import "./style.css";

export const meta = {
	title: "${projectName}",
};

export default (
	<main>
		<Card class="intro-card">
			<CardTitle>${projectName}</CardTitle>
			<CardBody>Fleax app with optional @fleax/ui components.</CardBody>
		</Card>
		<Island src="@/islands/counter.ts">
			<div class="counter">
				<Button type="button" variant="outline" class="decrement">
					−
				</Button>
				<span class="count">0</span>
				<Button type="button" class="increment">
					+
				</Button>
			</div>
		</Island>
	</main>
);
`
		: `import { Island } from "@fleax/core";
import "./style.css";

export const meta = {
	title: "${projectName}",
};

export default (
	<main>
		<h1>${projectName}</h1>
		<Island src="@/islands/counter.ts">
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

.intro-card {
	margin-bottom: 1.5rem;
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

	const counterTs = `import "@/islands/counter.css";

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
	writeFileSync(join(projectDir, "src", "islands", "counter.ts"), counterTs);
	writeFileSync(join(projectDir, "src", "islands", "counter.css"), counterCss);

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
	console.log(`    islands/`);
	console.log(`      counter.ts`);
	console.log(`      counter.css`);
	console.log(`  package.json`);
	console.log(`  tsconfig.json`);
	console.log(`\nNext steps:`);
	console.log(`  cd ${projectName}`);
	if (!installOk) console.log(`  npm install`);
	console.log(`  npm run dev`);
};

const serve = async ({ port = 3000, hot = false, purge } = {}) => {
	const outDir = join(cwd, "dist");
	if (!existsSync(outDir)) {
		if (hot) {
			await build({ purge });
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
	const dependencyWatchers = [];
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
					await build({ purge });
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

		const depPaths = [
			join(cwd, "node_modules", "@fleax", "ui"),
			join(cwd, "node_modules", "@fleax", "core"),
		];
		for (const depPath of depPaths) {
			if (!existsSync(depPath)) continue;
			try {
				const target = realpathSync(depPath);
				const watchTargets = depPath.includes("@fleax/ui")
					? [
							join(target, "src"),
							join(target, "dist"),
							join(target, "styles.css"),
						]
					: [join(target, "src"), join(target, "dist"), join(target, "bin")];
				for (const watchTarget of watchTargets) {
					if (!existsSync(watchTarget)) continue;
					const watcher = watch(
						watchTarget,
						{ recursive: statSync(watchTarget).isDirectory() },
						() => triggerBuild(),
					);
					dependencyWatchers.push(watcher);
				}
			} catch {}
		}
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
		for (const watcher of dependencyWatchers) watcher.close();
		for (const client of liveClients) client.end();
		server.close(() => process.exit(0));
	});
};

const cmd = process.argv[2] || "build";
const arg = process.argv[3];
const restArgs = process.argv.slice(3);

const parseCreateArgs = (args) => {
	let name = "";
	let includeUi;
	for (const token of args) {
		if (token === "--ui") {
			includeUi = true;
			continue;
		}
		if (token === "--no-ui") {
			includeUi = false;
			continue;
		}
		if (!token.startsWith("-") && !name) {
			name = token;
		}
	}
	return { name, includeUi };
};

const parsePurgeFlag = (args) => {
	let purge;
	for (const token of args) {
		if (token === "--purge") purge = true;
		if (token === "--no-purge") purge = false;
	}
	return purge;
};

const purgeFlag = parsePurgeFlag(restArgs);

if (cmd === "create") {
	const createArgs = parseCreateArgs(restArgs);
	if (!createArgs.name && arg && !arg.startsWith("-")) createArgs.name = arg;
	create(createArgs);
} else if (cmd === "dev") {
	dev({ purge: purgeFlag });
} else if (cmd === "watch") {
	watchMode({ purge: purgeFlag });
} else if (cmd === "build") {
	build({ purge: purgeFlag });
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
	serve({ port, hot, purge: purgeFlag });
} else {
	console.log(
		"Usage: fleax [create [name] [--ui|--no-ui]|build|dev|watch|serve [port] [--hot]] [--purge|--no-purge]",
	);
}
