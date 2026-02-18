# Fleax API

## `Island`

Wraps children in a container that gets hydrated by an island script.

```tsx
<Island src="@/components/counter.ts" id="optional-id">
  <button>Click me</button>
</Island>
```

**Props:**
- `src` - Path to island file (supports `@/` aliases)
- `id` - Optional unique identifier
- `children` - Content to wrap

**Output:**
```html
<div data-island="@/components/counter.ts" data-island-id="island-1">
  <button>Click me</button>
</div>
<script src="/islands/counter.js"></script>
```

If multiple `Island` components use the same `src`, all matching wrappers are hydrated.

**Island file pattern:**
```ts
// src/components/counter.ts
export default (el: Element) => {
  // el is the wrapper div with data-island attribute
  const btn = el.querySelector("button")!;
  btn.onclick = () => console.log("clicked");
};
```

## `renderToString`

Converts a VNode to HTML string.

```ts
import { renderToString, jsx } from "fleax";

const html = renderToString(
  jsx("div", { class: "container", children: "Hello" })
);
// <div class="container">Hello</div>
```

**Features:**
- Escapes HTML in text content (except `<script>` and `<style>`)
- Converts `style` object to string: `{ color: "red" }` → `style="color:red;"`
- Handles boolean attributes: `disabled={true}` → `disabled`, `disabled={false}` → omitted
- Ignores `null`, `undefined`, `false`, `true` children
- Renders self-closing tags: `<img>`, `<br>`, etc.

## `Fragment`

Groups children without adding a wrapper element.

```tsx
<>
  <span>A</span>
  <span>B</span>
</>

// or
<Fragment>
  <span>A</span>
  <span>B</span>
</Fragment>
```

## `jsx` / `jsxs`

JSX runtime functions. Called automatically by TypeScript.

```ts
jsx("div", { class: "x", children: "text" })
jsxs("div", { class: "x", children: ["a", "b"] })
```

## `VNode` Type

```ts
type VNode = {
  type: string | symbol | ((props: unknown) => unknown);
  props: Record<string, unknown>;
  key?: string | number;
};
```
