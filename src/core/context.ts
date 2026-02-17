import type { VNode } from "./vnode.js";
import { Fragment } from "./vnode.js";

const ctxMap = new Map<object, unknown[]>();
const PROVIDER = Symbol.for("fleax.Provider");

export const createContext = <T>(defaultValue: T) => {
	const ctx: { defaultValue: T; Provider: (props: unknown) => unknown } = {
		defaultValue,
		Provider: () => null,
	};
	ctx.Provider = (({ value, children }: { value: T; children: unknown }) => ({
		type: PROVIDER,
		props: { value, children, ctx },
	})) as (props: unknown) => unknown;
	return ctx;
};

export const useContext = <T>(ctx: { defaultValue: T }): T => {
	const stack = ctxMap.get(ctx as object);
	return stack?.length ? (stack[stack.length - 1] as T) : ctx.defaultValue;
};

export const PROVIDER_SYMBOL = PROVIDER;

export const renderProvider = (
	props: { value: unknown; children: unknown; ctx: object },
	render: (node: unknown) => string,
): string => {
	const { value, children, ctx } = props;
	const stack = ctxMap.get(ctx) || [];
	if (!ctxMap.has(ctx)) ctxMap.set(ctx, stack);
	stack.push(value);
	const res = render(children);
	stack.pop();
	return res;
};

export const isProviderNode = (
	node: unknown,
): node is VNode & { type: typeof PROVIDER } => {
	return (
		typeof node === "object" &&
		node !== null &&
		"type" in node &&
		(node as VNode).type === PROVIDER
	);
};
