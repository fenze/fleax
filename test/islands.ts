import { collectIslands, Island, jsx, renderToString } from "../src/index.js";
import { getIslandClassName } from "../src/island.js";

const test = (name: string, result: string, expected: string) => {
	if (result === expected) {
		console.log(`[PASS] ${name}`);
	} else {
		console.log(`[FAIL] ${name}`);
		console.log(`  Expected: ${expected}`);
		console.log(`  Actual:   ${result}`);
	}
};

console.log("--- Testing Islands ---");

const { result: island1 } = collectIslands(() =>
	renderToString(
		Island({
			src: "./counter.ts",
			children: jsx("button", { children: "Click me" }),
		}),
	),
);
test(
	"Basic island renders wrapper",
	island1,
	`<div class="${getIslandClassName("./counter.ts")}"><button>Click me</button></div>`,
);

const { result: islands2 } = collectIslands(() =>
	renderToString(
		jsx("div", {
			children: [
				Island({
					src: "./counter.ts",
					children: jsx("button", { children: "Counter" }),
				}),
				Island({
					src: "./toggle.ts",
					children: jsx("span", { children: "Toggle" }),
				}),
			],
		}),
	),
);
const hasCounter = islands2.includes(
	`class="${getIslandClassName("./counter.ts")}"`,
);
const hasToggle = islands2.includes(
	`class="${getIslandClassName("./toggle.ts")}"`,
);
test("Multiple islands render", hasCounter && hasToggle ? "ok" : "fail", "ok");

const { result: duplicateIslands } = collectIslands(() =>
	renderToString(
		jsx("div", {
			children: [
				Island({
					src: "./counter.ts",
					children: jsx("button", { children: "A" }),
				}),
				Island({
					src: "./counter.ts",
					children: jsx("button", { children: "B" }),
				}),
			],
		}),
	),
);
const duplicateCount = (
	duplicateIslands.match(new RegExp(getIslandClassName("./counter.ts"), "g")) ||
	[]
).length;
test(
	"Duplicate island instances render",
	duplicateCount === 2 ? "ok" : "fail",
	"ok",
);

const { islands: registeredIslands } = collectIslands(() =>
	renderToString(
		jsx("div", {
			children: [
				Island({ src: "./a.ts", children: jsx("span", { children: "A" }) }),
				Island({ src: "./b.ts", children: jsx("span", { children: "B" }) }),
				Island({ src: "./a.ts", children: jsx("span", { children: "A2" }) }),
			],
		}),
	),
);
test(
	"Registry tracks unique islands",
	registeredIslands.size === 2 ? "2 islands" : "wrong",
	"2 islands",
);

const { islands: scopedA } = collectIslands(() =>
	renderToString(
		Island({ src: "./only-a.ts", children: jsx("span", { children: "A" }) }),
	),
);
const { islands: scopedB } = collectIslands(() =>
	renderToString(
		Island({ src: "./only-b.ts", children: jsx("span", { children: "B" }) }),
	),
);
test(
	"Registries are isolated per collect",
	scopedA.has("./only-a.ts") &&
		!scopedA.has("./only-b.ts") &&
		scopedB.has("./only-b.ts") &&
		!scopedB.has("./only-a.ts")
		? "isolated"
		: "leaked",
	"isolated",
);

const { result: island4 } = collectIslands(() =>
	renderToString(
		Island({
			src: "@/islands/custom-counter.ts",
			children: jsx("button", { children: "0" }),
		}),
	),
);
test(
	"Custom island source",
	island4.includes(
		`class="${getIslandClassName("@/islands/custom-counter.ts")}"`,
	)
		? "ok"
		: "fail",
	"ok",
);

console.log("\n--- All island tests complete ---");
