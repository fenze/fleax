import { cleanupMap, runWithLifecycle } from "../core/lifecycle.js";
import { effect, type Ref } from "../core/signals.js";
import { Fragment, type VNode } from "../core/vnode.js";

type Mountable =
	| VNode
	| string
	| number
	| boolean
	| null
	| undefined
	| Ref<unknown>
	| Mountable[];

const isRef = (v: unknown): v is Ref<unknown> =>
	typeof v === "object" && v !== null && "value" in v;

export const unmount = (container: Node): void => {
	const cleanups = cleanupMap.get(container);
	if (cleanups) {
		for (const c of cleanups) c();
		cleanupMap.delete(container);
	}
	while (container.firstChild) {
		unmount(container.firstChild);
		container.removeChild(container.firstChild);
	}
};

export const mount = (vnode: Mountable, container: Node | null): void => {
	if (container == null) return;
	if (vnode == null || vnode === false || vnode === true) return;

	if (typeof vnode !== "object") {
		container.appendChild(document.createTextNode(String(vnode)));
		return;
	}

	if (Array.isArray(vnode)) {
		for (const v of vnode) {
			mount(v, container);
		}
		return;
	}

	if (isRef(vnode)) {
		const node = document.createTextNode("");
		effect(() => {
			node.textContent = String(vnode.value);
		});
		container.appendChild(node);
		return;
	}

	const { type, props } = vnode;

	if (typeof type === "function") {
		const { result, mounts, cleanups } = runWithLifecycle(() => type(props));
		const frag = document.createDocumentFragment();
		mount(result as Mountable, frag);
		if (cleanups.length > 0) {
			for (const node of Array.from(frag.childNodes)) {
				cleanupMap.set(node, cleanups);
			}
		}
		container.appendChild(frag);
		for (const m of mounts) m();
		return;
	}

	if (type === Fragment) {
		mount(props.children as Mountable, container);
		return;
	}

	const isSVG =
		type === "svg" ||
		(container as Element).namespaceURI === "http://www.w3.org/2000/svg";
	const el = isSVG
		? document.createElementNS("http://www.w3.org/2000/svg", type as string)
		: document.createElement(type as string);

	const { children, ref: elementRef, ...rest } = props || {};

	if (typeof elementRef === "function") {
		elementRef(el);
	}

	for (const [k, v] of Object.entries(rest)) {
		if (k.startsWith("on")) {
			el.addEventListener(k.slice(2), v as EventListener);
		} else if (v != null && v !== false) {
			if (isRef(v)) {
				effect(() => {
					const val = v.value;
					if (val === false || val == null) el.removeAttribute(k);
					else el.setAttribute(k, val === true ? "" : String(val));
				});
			} else {
				el.setAttribute(k, v === true ? "" : String(v));
			}
		}
	}

	mount(children as Mountable, el);
	container.appendChild(el);
};
