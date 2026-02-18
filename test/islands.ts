import { Island, jsx, renderToString } from "../src/index.js";
import { getIslands, resetIslands } from "../src/island.js";

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

resetIslands();
const island1 = renderToString(
	Island({
		src: "./counter.ts",
		children: jsx("button", { children: "Click me" }),
	}),
);
test(
	"Basic island renders wrapper",
	island1,
	'<div data-island="./counter.ts" data-island-id="island-1"><button>Click me</button></div>',
);

resetIslands();
const islands2 = renderToString(
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
);
const hasCounter = islands2.includes('data-island="./counter.ts"');
const hasToggle = islands2.includes('data-island="./toggle.ts"');
test("Multiple islands render", hasCounter && hasToggle ? "ok" : "fail", "ok");

resetIslands();
const duplicateIslands = renderToString(
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
);
const duplicateCount = (
	duplicateIslands.match(
		/data-island="\.\.\/counter\.ts"|data-island="\.\/counter\.ts"/g,
	) || []
).length;
test(
	"Duplicate island instances render",
	duplicateCount === 2 ? "ok" : "fail",
	"ok",
);

resetIslands();
renderToString(
	jsx("div", {
		children: [
			Island({ src: "./a.ts", children: jsx("span", { children: "A" }) }),
			Island({ src: "./b.ts", children: jsx("span", { children: "B" }) }),
			Island({ src: "./a.ts", children: jsx("span", { children: "A2" }) }),
		],
	}),
);
const registeredIslands = getIslands();
test(
	"Registry tracks unique islands",
	registeredIslands.size === 2 ? "2 islands" : "wrong",
	"2 islands",
);

resetIslands();
const island4 = renderToString(
	Island({
		src: "@/components/custom-counter.ts",
		children: jsx("button", { children: "0" }),
	}),
);
test(
	"Custom island source",
	island4.includes('data-island="@/components/custom-counter.ts"')
		? "ok"
		: "fail",
	"ok",
);

console.log("\n--- All island tests complete ---");
