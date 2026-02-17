import { cleanupMap, runWithLifecycle } from "../core/lifecycle.js";
import { effect, type Ref } from "../core/signals.js";
import { Fragment, type VNode } from "../core/vnode.js";

type Hydratable =
	| VNode
	| string
	| number
	| boolean
	| null
	| undefined
	| Ref<unknown>
	| Hydratable[];

const isRef = (v: unknown): v is Ref<unknown> =>
	typeof v === "object" && v !== null && "value" in v;

let hydrationNode: Node | null = null;

const getTextNode = (): Text | null => {
	if (!hydrationNode) return null;
	while (hydrationNode && hydrationNode.nodeType !== Node.TEXT_NODE) {
		if (hydrationNode.firstChild) {
			hydrationNode = hydrationNode.firstChild;
		} else if (hydrationNode.nextSibling) {
			hydrationNode = hydrationNode.nextSibling;
		} else {
			let parent: Node | null = hydrationNode.parentNode;
			while (parent && !parent.nextSibling) {
				parent = parent.parentNode;
			}
			hydrationNode = parent?.nextSibling ?? null;
		}
	}
	const text = hydrationNode as Text;
	hydrationNode = hydrationNode?.nextSibling ?? null;
	return text;
};

const getElementNode = (tag: string): Element | null => {
	if (!hydrationNode) return null;
	while (hydrationNode && hydrationNode.nodeType !== Node.ELEMENT_NODE) {
		hydrationNode = hydrationNode.nextSibling;
	}
	if (!hydrationNode) return null;
	const el = hydrationNode as Element;
	if (el.localName !== tag) return null;
	hydrationNode = hydrationNode.firstChild;
	return el;
};

const hydrateVNode = (vnode: Hydratable, container: Node): void => {
	if (vnode == null || vnode === false || vnode === true) return;

	if (typeof vnode !== "object") {
		const text = getTextNode();
		if (text) text.textContent = String(vnode);
		return;
	}

	if (Array.isArray(vnode)) {
		for (const v of vnode) hydrateVNode(v, container);
		return;
	}

	if (isRef(vnode)) {
		const text = getTextNode();
		if (text) {
			effect(() => {
				text.textContent = String(vnode.value);
			});
		}
		return;
	}

	const { type, props } = vnode;

	if (typeof type === "function") {
		const { result, mounts, cleanups } = runWithLifecycle(() => type(props));
		hydrateVNode(result as Hydratable, container);
		if (cleanups.length > 0 && hydrationNode) {
			cleanupMap.set(hydrationNode, cleanups);
		}
		for (const m of mounts) m();
		return;
	}

	if (type === Fragment) {
		hydrateVNode(props.children as Hydratable, container);
		return;
	}

	const el = getElementNode(type as string);
	if (!el) return;

	const { children, ref: elementRef, ...rest } = props || {};

	if (typeof elementRef === "function") {
		elementRef(el);
	}

	for (const [k, v] of Object.entries(rest)) {
		if (k.startsWith("on")) {
			el.addEventListener(k.slice(2), v as EventListener);
		} else if (v != null && v !== false && isRef(v)) {
			effect(() => {
				const val = v.value;
				if (val === false || val == null) el.removeAttribute(k);
				else el.setAttribute(k, val === true ? "" : String(val));
			});
		}
	}

	const savedNode = hydrationNode;
	hydrationNode = el.firstChild;
	hydrateVNode(children as Hydratable, el);
	hydrationNode = savedNode?.nextSibling ?? el.nextSibling;
};

export const hydrate = (vnode: Hydratable, container: Element): void => {
	hydrationNode = container.firstChild;
	hydrateVNode(vnode, container);
	hydrationNode = null;
};
