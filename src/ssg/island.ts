import { Fragment, jsx, type VNode } from "../core/vnode.js";

type IslandProps = {
	src: string;
	id?: string;
	children: unknown;
};

const islandRegistry = new Set<string>();
let islandCounter = 0;

export const resetIslands = () => {
	islandRegistry.clear();
	islandCounter = 0;
};

export const getIslands = () => new Set(islandRegistry);

export const Island = ({ src, id, children }: IslandProps): VNode => {
	islandRegistry.add(src);
	const islandId = id || `island-${++islandCounter}`;

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

export const IslandScripts = ({
	basePath = "/islands",
}: {
	basePath?: string;
} = {}): VNode[] => {
	const scripts: VNode[] = [];
	for (const src of islandRegistry) {
		const scriptSrc =
			src.startsWith("/") || src.startsWith("http")
				? src
				: `${basePath}/${src.replace(/\.(ts|tsx)$/, ".js")}`;
		scripts.push(
			jsx("script", {
				type: "module",
				src: scriptSrc,
			}),
		);
	}
	return scripts;
};
