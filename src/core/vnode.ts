export type VNode = {
	type: string | symbol | ((props: unknown) => unknown);
	props: Record<string, unknown>;
	key?: string | number;
};

export const jsx = (
	type: VNode["type"],
	props: VNode["props"],
	key?: VNode["key"],
): VNode => ({
	type,
	props,
	key,
});

export const jsxs = jsx;

export const Fragment: unique symbol = Symbol.for(
	"fleax.Fragment",
) as typeof Fragment;
