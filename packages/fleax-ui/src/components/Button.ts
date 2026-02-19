import { jsx, type VNode } from "@fleax/core";

import "./Button.css";

export type ButtonProps = {
	children?: unknown;
	class?: string;
	disabled?: boolean;
	id?: string;
	size?: "default" | "xs" | "sm" | "lg";
	type?: "button" | "submit" | "reset";
	variant?:
		| "default"
		| "secondary"
		| "outline"
		| "ghost"
		| "destructive"
		| "link";
};

export const Button = ({
	children,
	class: className = "",
	disabled = false,
	id,
	size = "default",
	type = "button",
	variant = "default",
}: ButtonProps): VNode =>
	jsx("button", {
		children,
		class:
			`fx-button ${size !== "default" ? `fx-button-${size}` : ""} ${variant !== "default" ? `fx-button-${variant}` : ""} ${className}`.trim(),
		disabled,
		id,
		type,
	});

(Button as unknown as { __fleax_ui_button?: boolean }).__fleax_ui_button = true;
