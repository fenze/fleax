import { jsx, type VNode } from "@fleax/core";

import "./Input.css";

export type InputProps = Omit<
	JSX.IntrinsicElements["input"],
	"class" | "children" | "aria-invalid"
> & {
	class?: string;
	"aria-invalid"?: boolean;
};

export const Input = ({
	class: className = "",
	type = "text",
	"aria-invalid": isInvalid = false,
	...nativeProps
}: InputProps): VNode =>
	jsx("input", {
		...nativeProps,
		class: className ? `fx-input ${className}` : "fx-input",
		"aria-invalid": isInvalid ? "true" : undefined,
		type,
	});
