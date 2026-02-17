#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline";

function question(rl, prompt) {
	return new Promise((resolve) => {
		rl.question(prompt, resolve);
	});
}

function parseArgs(args) {
	const result = { name: null, type: null, git: false };
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--client") result.type = "client";
		else if (arg === "--ssg") result.type = "ssg";
		else if (arg === "--git") result.git = true;
		else if (arg === "--no-git") result.git = false;
		else if (!arg.startsWith("-") && !result.name) result.name = arg;
	}
	return result;
}

async function main() {
	const parsed = parseArgs(process.argv.slice(2));

	let projectName = parsed.name;
	let appType = parsed.type;
	let useGit = parsed.git;

	if (!projectName || !appType) {
		if (!process.stdin.isTTY) {
			console.error(
				"Error: Project name and type required in non-interactive mode",
			);
			console.error("Usage: npx fleax <name> --ssg|--client [--git]");
			process.exit(1);
		}

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		projectName =
			(await question(rl, "What is your project named? (fleax-app) ")) ||
			"fleax-app";

		appType = await question(rl, "App type? (ssg/client) ");
		appType = appType === "client" ? "client" : "ssg";

		useGit = (await question(rl, "Initialize a git repository? (y/N) "))
			.toLowerCase()
			.startsWith("y");
		rl.close();
	}

	const targetDir = join(process.cwd(), projectName);

	if (existsSync(targetDir)) {
		console.error(`Directory ${projectName} already exists.`);
		process.exit(1);
	}

	mkdirSync(targetDir);
	process.chdir(targetDir);

	const cwd = process.cwd();

	console.log(`\nInitializing ${projectName} (${appType})...\n`);

	if (appType === "ssg") {
		createSSG(cwd, projectName);
	} else {
		createClient(cwd, projectName);
	}

	if (useGit) {
		try {
			execSync("git init", { stdio: "ignore" });
			writeFileSync(join(cwd, ".gitignore"), "node_modules/\nbuild/\ndist/\n");
			console.log("Initialized git repository");
		} catch (_e) {
			console.log("Could not initialize git repository");
		}
	}

	console.log(`\n✓ Created ${projectName} at ${targetDir}`);
	printNextSteps(projectName, appType);
}

function createSSG(cwd, name) {
	const packageJson = {
		name,
		version: "1.0.0",
		type: "module",
		scripts: {
			build: "tsc && node build/index.js",
			dev: "tsc -w & node --watch build/index.js",
		},
	};
	writeFileSync(
		join(cwd, "package.json"),
		JSON.stringify(packageJson, null, 2),
	);

	installDeps(false);
	createTSConfig(cwd, "NodeNext", "NodeNext");

	const srcDir = join(cwd, "src");
	mkdirSync(srcDir);

	const indexTsx = `import { render } from "fleax/server";

const App = () => (
	<div>
		<h1>Hello World</h1>
		<p>Welcome to Fleax SSG!</p>
	</div>
);

render(<App />, { title: "My App" });
`;
	writeFileSync(join(srcDir, "index.tsx"), indexTsx);
	console.log("Created src/index.tsx");
}

function createClient(cwd, name) {
	const packageJson = {
		name,
		version: "1.0.0",
		type: "module",
		scripts: {
			build:
				"esbuild src/index.tsx --bundle --outfile=public/bundle.js --format=esm --target=esnext",
			dev: "esbuild src/index.tsx --bundle --outfile=public/bundle.js --format=esm --target=esnext --watch",
			serve: "npx serve public",
		},
	};
	writeFileSync(
		join(cwd, "package.json"),
		JSON.stringify(packageJson, null, 2),
	);

	console.log("Installing dependencies...");
	try {
		execSync("npm install fleax", { stdio: "inherit" });
		execSync("npm install -D esbuild typescript @types/node serve", {
			stdio: "inherit",
		});
	} catch (_e) {
		console.log("Skipping install (might be local test)");
	}

	createTSConfig(cwd, "ESNext", "bundler");

	const publicDir = join(cwd, "public");
	mkdirSync(publicDir);

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${name}</title>
</head>
<body>
	<div id="root"></div>
	<script type="module" src="bundle.js"></script>
</body>
</html>
`;
	writeFileSync(join(publicDir, "index.html"), html);
	console.log("Created public/index.html");

	const srcDir = join(cwd, "src");
	mkdirSync(srcDir);

	const indexTsx = `import { ref, mount } from "fleax";

const count = ref(0);

const App = () => (
	<div>
		<h1>Counter</h1>
		<p>Count: {count}</p>
		<button onclick={() => count.value--}>-</button>
		<button onclick={() => count.value++}>+</button>
	</div>
);

mount(<App />, document.getElementById("root"));
`;
	writeFileSync(join(srcDir, "index.tsx"), indexTsx);
	console.log("Created src/index.tsx");
}

function installDeps(needsServe) {
	console.log("Installing dependencies...");
	try {
		execSync("npm install fleax", { stdio: "inherit" });
		const devDeps = needsServe
			? "typescript @types/node serve"
			: "typescript @types/node";
		execSync(`npm install -D ${devDeps}`, { stdio: "inherit" });
	} catch (_e) {
		console.log("Skipping install (might be local test)");
	}
}

function createTSConfig(cwd, mod, modRes) {
	const tsconfig = {
		compilerOptions: {
			jsx: "react-jsx",
			jsxImportSource: "fleax",
			module: mod,
			moduleResolution: modRes,
			target: "ESNext",
			strict: true,
			esModuleInterop: true,
			outDir: "build",
		},
		include: ["src/**/*"],
	};
	writeFileSync(join(cwd, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
	console.log("Created tsconfig.json");
}

function printNextSteps(projectName, appType) {
	console.log("\nNext steps:");
	console.log(`  cd ${projectName}`);
	console.log("  npm run build");
	if (appType === "client") {
		console.log("  npm run serve");
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
