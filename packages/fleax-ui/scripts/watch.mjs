import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { resolve } from "node:path";

const cssSourceDir = resolve(process.cwd(), "src/components");

const runCopyCss = () => {
	const copy = spawn(process.execPath, ["scripts/copy-css.mjs"], {
		cwd: process.cwd(),
		stdio: "inherit",
	});
	copy.on("error", () => {});
};

runCopyCss();

const tsc = spawn(
	process.platform === "win32" ? "npx.cmd" : "npx",
	["tsc", "-p", "tsconfig.json", "--watch"],
	{
		cwd: process.cwd(),
		stdio: "inherit",
	},
);

let timer;
const cssWatcher = watch(
	cssSourceDir,
	{ recursive: true },
	(_eventType, file) => {
		if (!String(file || "").endsWith(".css")) return;
		clearTimeout(timer);
		timer = setTimeout(() => runCopyCss(), 120);
	},
);

const shutdown = () => {
	cssWatcher.close();
	tsc.kill("SIGINT");
	process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
