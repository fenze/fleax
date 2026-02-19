import { jsx, type VNode } from "@fleax/core";

import "./Flex.css";

export type FlexProps = {
	children?: unknown;
	orientation?: "vertical" | "horizontal";
	gap?: "default" | "sm" | "lg";
};

export const Flex = ({
	children,
	orientation = "horizontal",
	gap = "default",
}: FlexProps): VNode =>
	jsx("div", {
		children,
		class:
			`fx-flex ${gap !== "default" ? `fx-flex-${gap}` : ""} ${orientation !== "horizontal" ? `fx-flex-${orientation}` : ""}`.trim(),
	});
