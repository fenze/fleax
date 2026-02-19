export type Theme = "light" | "dark";

export function setTheme(theme: Theme) {
	localStorage.setItem("theme", theme);
	document.documentElement.style.colorScheme = theme;
}

export function getTheme(): Theme {
	const stored = localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") return stored;

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function toggleTheme() {
	setTheme(getTheme() === "dark" ? "light" : "dark");
}
