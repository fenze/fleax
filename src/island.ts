import { Fragment, jsx, type VNode } from "./jsx.js";

type IslandProps = {
	src: string;
	id?: string;
	children: unknown;
};

type IslandEntry = {
	originalSrc: string;
	resolvedPath: string;
};

const islandRegistry = new Map<string, IslandEntry>();

const hashString = (value: string) => {
	let h = 2166136261;
	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16).padStart(8, "0");
};

export const getIslandClassName = (src: string) => `__${hashString(src)}`;

export const resetIslands = () => {
	islandRegistry.clear();
};

export const getIslands = () => new Map(islandRegistry);

export const Island = ({ src, id, children }: IslandProps): VNode => {
	const islandClassName = getIslandClassName(src);

	islandRegistry.set(src, {
		originalSrc: src,
		resolvedPath: src,
	});

	return {
		type: Fragment,
		props: {
			children: [
				jsx("div", {
					class: islandClassName,
					id: id || undefined,
					children,
				}),
			],
		},
	};
};
