import { jsx, type VNode } from "@fleax/core";

import "./Badge.css";

export type BadgeProps = {
	children?: unknown;
	variant?: "default" | "secondary" | "destructive" | "outline";
};

export const Badge = ({ children, variant = "default" }: BadgeProps): VNode =>
	jsx("span", {
		children,
		class: `fx-badge ${variant !== "default" ? variant : ""}`,
	});
