import { jsx, type VNode } from "@fleax/core";

import "./KbdGroup.css";

export type KbdGroupProps = JSX.IntrinsicElements["kbd"];

export const KbdGroup = ({
	class: className,
	...props
}: KbdGroupProps): VNode =>
	jsx("kbd", {
		class: `fx-kbd-group ${className ?? ""}`,
		...props,
	});
