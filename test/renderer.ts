import { createContext, Fragment, jsx, ref, useContext } from "../src/index.js";
import { renderToString } from "../src/ssg/index.js";

const test = (name, result, expected) => {
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

// 1. Style Object
test(
	"Style Object",
	jsx("div", { style: { color: "red", marginTop: "10px" } }),
	'<div style="color:red;margin-top:10px;"></div>',
);

// 2. Class
test(
	"class attribute",
	jsx("div", { class: "my-class" }),
	'<div class="my-class"></div>',
);

// 3. Boolean Attributes
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

// 4. Children: 0
test("Child 0", jsx("div", { children: 0 }), "<div>0</div>");

// 5. Children: false/null/undefined
test(
	"Ignored Children",
	jsx("div", { children: [false, null, undefined, "hello"] }),
	"<div>hello</div>",
);

// 6. Array of children
test("Array Children", jsx("div", { children: ["a", "b"] }), "<div>ab</div>");

// 7. Fragment
test(
	"Fragment inside Div",
	jsx("div", { children: jsx(Fragment, { children: ["a", "b"] }) }),
	"<div>ab</div>",
);

// 8. Event handlers as strings
test(
	"onclick string",
	jsx("button", { onclick: "alert('hi')" }),
	'<button onclick="alert(&#39;hi&#39;)"></button>',
);

// 10. Context
const Ctx = createContext("default");
const Consumer = () => {
	const val = useContext(Ctx);
	return jsx("div", { children: val });
};
const providerRes = jsx(Ctx.Provider, {
	value: "provided",
	children: jsx(Consumer, {}),
});
test("Context Provider", providerRes, "<div>provided</div>");
test("Context Default", jsx(Consumer, {}), "<div>default</div>");

// 11. Ref (SSG)
const count = ref(42);
test("Ref rendering", jsx("div", { children: count }), "<div>42</div>");

// 12. Automatic Raw (script/style)
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
