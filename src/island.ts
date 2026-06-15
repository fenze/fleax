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

// The registry is scoped to a single synchronous render via `collectIslands`.
// `renderToString` never yields, so concurrent page renders (which only
// interleave at await points, never mid-render) each see their own registry.
let activeRegistry: Map<string, IslandEntry> | null = null;

const hashString = (value: string) => {
	let h = 2166136261;
	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16).padStart(8, "0");
};

export const getIslandClassName = (src: string) => `__${hashString(src)}`;

/**
 * Runs `render` with a fresh island registry and returns both its result and
 * the islands registered during that render. Supports nesting; the previous
 * registry (if any) is restored afterwards.
 */
export const collectIslands = <T>(
	render: () => T,
): { result: T; islands: Map<string, IslandEntry> } => {
	const registry = new Map<string, IslandEntry>();
	const previous = activeRegistry;
	activeRegistry = registry;
	try {
		const result = render();
		return { result, islands: registry };
	} finally {
		activeRegistry = previous;
	}
};

export const Island = ({ src, id, children }: IslandProps): VNode => {
	const islandClassName = getIslandClassName(src);

	activeRegistry?.set(src, {
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
