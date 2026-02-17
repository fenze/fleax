import type { VNode } from "../core/vnode.js";
import { mount, unmount } from "./dom.js";

type IslandInit = (el: HTMLElement) => VNode | void;

export const initIsland = (init: IslandInit): void => {
	const script = document.currentScript as HTMLScriptElement | null;
	if (!script) return;

	const src = script.src;
	const elements = document.querySelectorAll(`[data-island]`);

	elements.forEach((el) => {
		const islandSrc = el.getAttribute("data-island");
		if (!islandSrc) return;

		const normalizedIslandSrc = islandSrc.replace(/\.(ts|tsx)$/, ".js");
		const normalizedSrc = src.replace(/^(https?:\/\/[^/]+)?/, "");

		if (
			normalizedSrc.endsWith(normalizedIslandSrc) ||
			src.endsWith(islandSrc.replace(/\.(ts|tsx)$/, ".js"))
		) {
			const result = init(el as HTMLElement);
			if (result) {
				mount(result, el);
			}
		}
	});
};

export const defineIsland = (
	name: string,
	component: (el: HTMLElement) => VNode,
): void => {
	const elements = document.querySelectorAll(
		`[data-island="${name}"], [data-island="${name}.ts"], [data-island="${name}.tsx"]`,
	);

	elements.forEach((el) => {
		const result = component(el as HTMLElement);
		if (result) {
			mount(result, el);
		}
	});
};

export { mount, unmount };
