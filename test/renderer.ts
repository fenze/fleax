import { Fragment, jsx, renderToString } from "../src/index.js";

const test = (name: string, result: unknown, expected: string) => {
	const actual = renderToString(result);
	if (actual === expected) {
		console.log(`[PASS] ${name}`);
	} else {
		console.log(`[FAIL] ${name}`);
		console.log(`  Expected: ${expected}`);
		console.log(`  Actual:   ${actual}`);
	}
};

console.log("--- Testing JSX Runtime ---");

test(
	"Style Object",
	jsx("div", { style: { color: "red", marginTop: "10px" } }),
	'<div style="color:red;margin-top:10px;"></div>',
);

test(
	"class attribute",
	jsx("div", { class: "my-class" }),
	'<div class="my-class"></div>',
);

test(
	"Boolean Attribute (true)",
	jsx("button", { disabled: true }),
	"<button disabled></button>",
);
test(
	"Boolean Attribute (false)",
	jsx("button", { disabled: false }),
	"<button></button>",
);

test("Child 0", jsx("div", { children: 0 }), "<div>0</div>");

test(
	"Ignored Children",
	jsx("div", { children: [false, null, undefined, "hello"] }),
	"<div>hello</div>",
);

test("Array Children", jsx("div", { children: ["a", "b"] }), "<div>ab</div>");

test(
	"Fragment inside Div",
	jsx("div", { children: jsx(Fragment, { children: ["a", "b"] }) }),
	"<div>ab</div>",
);

test(
	"onclick string",
	jsx("button", { onclick: "alert('hi')" }),
	'<button onclick="alert(&#39;hi&#39;)"></button>',
);

test(
	"Auto raw script",
	jsx("script", { children: "console.log(1 < 2)" }),
	"<script>console.log(1 < 2)</script>",
);
test(
	"Auto raw style",
	jsx("style", { children: "body > div { color: red; }" }),
	"<style>body > div { color: red; }</style>",
);

console.log("\n--- All tests complete ---");
