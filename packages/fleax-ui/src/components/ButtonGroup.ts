import { Fragment, jsx, type VNode } from "@fleax/core";

import type { ButtonProps } from "./Button";

import "./ButtonGroup.css";

export type ButtonGroupProps = {
	children?: unknown;
	class?: string;
	orientation?: "horizontal" | "vertical";
};

const isVNode = (node: unknown): node is VNode =>
	typeof node === "object" &&
	node !== null &&
	"type" in node &&
	"props" in node;

const flattenChildren = (children: unknown): unknown[] => {
	if (Array.isArray(children)) return children.flatMap(flattenChildren);
	if (
		isVNode(children) &&
		children.type === Fragment &&
		typeof children.props === "object" &&
		children.props !== null
	) {
		return flattenChildren((children.props as { children?: unknown }).children);
	}
	return [children];
};

const isButtonLike = (node: unknown) => {
	if (!isVNode(node)) return false;
	const componentType = node.type as { __fleax_ui_button?: boolean };
	return Boolean(componentType?.__fleax_ui_button);
};

const patchButtons = (children: unknown): unknown => {
	if (Array.isArray(children)) return children.map(patchButtons);
	if (!isVNode(children)) return children;

	const componentType = children.type as { __fleax_ui_button?: boolean };
	if (componentType?.__fleax_ui_button) {
		const props = (children.props || {}) as ButtonProps;
		return {
			...children,
			props: {
				...props,
				size: "default",
				variant: "outline",
			},
		};
	}

	const props = (children.props || {}) as { children?: unknown };
	if (!("children" in props)) return children;

	return {
		...children,
		props: {
			...props,
			children: patchButtons(props.children),
		},
	};
};

const packChildren = (
	children: unknown,
	orientation: "horizontal" | "vertical",
): unknown[] => {
	const flat = flattenChildren(children);
	const packed: unknown[] = [];
	let run: unknown[] = [];

	const flushRun = () => {
		if (run.length === 0) return;
		packed.push(
			jsx("div", {
				class: `fx-button-group-segment ${orientation}`,
				children: run,
			}),
		);
		run = [];
	};

	for (const child of flat) {
		if (isButtonLike(child)) {
			run.push(child);
			continue;
		}
		flushRun();
		packed.push(child);
	}
	flushRun();
	return packed;
};

export const ButtonGroup = ({
	children,
	class: className = "",
	orientation = "horizontal",
}: ButtonGroupProps): VNode =>
	jsx("div", {
		role: "group",
		class: `fx-button-group ${orientation} ${className}`.trim(),
		children: packChildren(patchButtons(children), orientation),
	});
