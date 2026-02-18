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
let islandCounter = 0;

export const resetIslands = () => {
	islandRegistry.clear();
	islandCounter = 0;
};

export const getIslands = () => new Map(islandRegistry);

export const Island = ({ src, id, children }: IslandProps): VNode => {
	const islandId = id || `island-${++islandCounter}`;

	islandRegistry.set(src, {
		originalSrc: src,
		resolvedPath: src,
	});

	return {
		type: Fragment,
		props: {
			children: [
				jsx("div", {
					"data-island": src,
					"data-island-id": islandId,
					children,
				}),
			],
		},
	};
};
