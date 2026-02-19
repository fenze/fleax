import { jsx, type VNode } from "@fleax/core";

import "./Field.css";

export type FieldProps = {
	children?: unknown;
	disabled?: boolean;
	orientation?: "horizontal" | "vertical";
};

export const Field = ({
	children,
	orientation = "vertical",
}: FieldProps): VNode =>
	jsx("div", {
		children,
		class: `fx-field ${orientation === "horizontal" ? "horizontal" : ""}`,
		role: "group",
	});
