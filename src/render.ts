import { Fragment, type VNode } from "./jsx.js";

const escapeHTML = (s: unknown) =>
	String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const renderToString = (node: unknown, isRaw = false): string => {
	if (node == null || node === false || node === true) return "";
	if (typeof node !== "object")
		return isRaw ? String(node) : escapeHTML(String(node));
	if (Array.isArray(node))
		return node.map((n) => renderToString(n, isRaw)).join("");

	const { type, props } = node as VNode;
	if (type === Fragment)
		return renderToString((props as { children: unknown }).children, isRaw);
	if (typeof type === "function") return renderToString(type(props), isRaw);

	const { children, ...rest } = (props || {}) as { children?: unknown };
	const attrs = Object.entries(rest)
		.map(([k, v]) => {
			if (
				v === false ||
				v == null ||
				(k.startsWith("on") && typeof v !== "string")
			)
				return "";
			if (v === true) return k;
			if (k === "style" && typeof v === "object") {
				v = `${Object.entries(v as object)
					.map(
						([sk, sv]) =>
							`${sk.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${sv}`,
					)
					.join(";")};`;
			}
			return `${k}="${escapeHTML(v)}"`;
		})
		.filter(Boolean)
		.join(" ");

	const raw = isRaw || type === "script" || type === "style";
	const inner = renderToString(children, raw);
	if (
		/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(
			type as string,
		)
	)
		return `<${type as string} ${attrs}>`.replace(" >", ">");

	return `<${type as string}${attrs ? ` ${attrs}` : ""}>${inner}</${type as string}>`;
};
