import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import type { VNode } from "../core/vnode.js";
import { renderToString } from "./render.js";

export type PageOptions = {
	title?: string;
	lang?: string;
	head?: VNode;
	path?: string;
};

export type BuildOptions = {
	outDir?: string;
	pages?: Record<string, () => VNode>;
};

const wrapDocument = (
	body: string,
	{ title, lang = "en", head }: PageOptions = {},
): string => {
	return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${title ? `<title>${title}</title>` : ""}${head ? renderToString(head) : ""}</head><body>${body}</body></html>`;
};

export const render = (vnode: VNode, options: PageOptions = {}): void => {
	const { path } = options;
	const outPath =
		path ??
		join("dist", `${basename(process.argv[1], extname(process.argv[1]))}.html`);
	mkdirSync(dirname(outPath), { recursive: true });
	const html = wrapDocument(renderToString(vnode), options);
	writeFileSync(outPath, html);
	console.log(`Rendered: ${outPath}`);
};

export const renderHtml = (vnode: VNode, options: PageOptions = {}): string => {
	return wrapDocument(renderToString(vnode), options);
};

export const build = (options: BuildOptions): void => {
	const { outDir = "dist", pages = {} } = options;

	mkdirSync(outDir, { recursive: true });

	for (const [route, component] of Object.entries(pages)) {
		const outPath = join(outDir, route, "index.html");
		mkdirSync(dirname(outPath), { recursive: true });
		const html = wrapDocument(renderToString(component()));
		writeFileSync(outPath, html);
		console.log(`Built: ${outPath}`);
	}
};
