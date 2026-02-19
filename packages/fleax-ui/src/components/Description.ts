import { jsx, type VNode } from "@fleax/core";

import "./Description.css";

export type DescriptionProps = {
	children?: unknown;
	disabled?: boolean;
};

export const Description = ({ children }: DescriptionProps): VNode =>
	jsx("p", {
		children,
		class: "fx-description",
	});
