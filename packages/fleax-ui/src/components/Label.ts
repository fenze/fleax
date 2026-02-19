import { jsx, type VNode } from "@fleax/core";

import "./Label.css";

export type LabelProps = {
	children?: unknown;
	for?: unknown;
};

export const Label = ({ for: htmlFor, children }: LabelProps): VNode =>
	jsx("label", {
		children,
		for: htmlFor,
		class: "fx-label",
	});
