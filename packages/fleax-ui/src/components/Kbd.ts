import { jsx, type VNode } from "@fleax/core";

import "./Kbd.css";

const KBD_SYMBOLS = {
	cmd: "⌘",
	option: "⌥",
	ctrl: "⌃",
	enter: "⏎",
} as const;

export type KbdSymbol = keyof typeof KBD_SYMBOLS;

export type KbdProps = JSX.IntrinsicElements["kbd"] & {
	symbol?: KbdSymbol;
};

export const Kbd = ({
	children,
	class: className,
	symbol,
	...props
}: KbdProps): VNode =>
	jsx("kbd", {
		class: `fx-kbd ${className ?? ""}`,
		children: children ?? (symbol ? KBD_SYMBOLS[symbol] : undefined),
		...props,
	});
