# Fleax

A tiny SSG framework with Islands architecture. Zero runtime dependencies.

## Features

- **Zero runtime dependencies**
- **Tiny** (~2KB)
- **SSG + Islands** - Static HTML with isolated interactive components
- **Standard JSX** with full TypeScript support
- **CSS support** - Import CSS in pages and islands
- **Content hashing** for production builds
- **Auto minification** (JS + CSS) in production
- **Incremental builds** with dependency-aware caching
- **Live reload** with `serve --hot`

## Installation

```bash
npm install fleax
```

Or create a new project:

```bash
npx fleax create my-project
cd my-project
npm run build
```

If no name is provided, `create` prompts for one interactively.

## Quick Start

### 1. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "fleax"
  }
}
```

### 2. Create a Page

```tsx
// src/index.tsx
import { Island } from "fleax";
import "./style.css";

export const meta = {
  title: "My Page",
  lang: "en",
};

export default (
  <main>
    <h1>Hello World</h1>
    <Island src="@/components/counter.ts">
      <button type="button" class="increment">Count: 0</button>
    </Island>
  </main>
);
```

### 3. Create an Island

Islands receive the wrapper element and add interactivity:

```ts
// src/components/counter.ts
import "@/components/counter.css";

export default (el: Element) => {
  let count = 0;
  const btn = el.querySelector(".increment") as HTMLButtonElement;
  const display = el.querySelector(".count") as HTMLElement;
  
  btn.onclick = () => {
    count++;
    display.textContent = String(count);
  };
};
```

The island's `export default` function is automatically called with the wrapper element.

### 4. Build

```bash
# Development
npx fleax build

# Production (minified + content hashing)
NODE_ENV=production npx fleax build

# Dev server with auto-rebuild + browser reload
npx fleax serve --hot
```

## CLI

```bash
npx fleax create [name]         # Create new project (prompts if missing)
npx fleax build                 # Build pages with incremental cache
npx fleax watch                 # Watch source and rebuild on change
npx fleax serve [port]          # Serve dist/ folder (default: 3000)
npx fleax serve [port] --hot    # Serve + watch + auto-reload browser
npx fleax dev                   # One-shot development build
```

The CLI finds pages in:
- `src/*.tsx` / `src/*.jsx`
- `pages/*.tsx` / `pages/*.jsx`

## API

```ts
import { 
  Island,         // Island component
  Fragment,       // JSX Fragment
  jsx, jsxs,      // JSX runtime
  renderToString, // Render VNode to HTML
  VNode           // Type
} from "fleax";
```

### Island

```tsx
<Island src="@/components/counter.ts">
  <button>Click me</button>
</Island>
```

Renders a wrapper `<div data-island="@/components/counter.ts">` around children. The island file's default export receives this element.
Each wrapper also gets a stable `data-island-id`, and all matching instances are hydrated.

### Page Meta

```tsx
export const meta = {
  title: "Page Title",
  lang: "en",
  head: <meta name="description" content="...">,
};
```

## CSS

Import CSS in pages or islands:

```tsx
// src/index.tsx (page)
import "./style.css";

// src/components/counter.ts (island)
import "@/components/counter.css";
```

CSS is:
- Extracted to separate files
- Minified in production
- Content-hashed in production

## Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Use in islands:
```tsx
<Island src="@/components/counter.ts">
```

## Project Structure

```
my-project/
├── src/
│   ├── index.tsx          # Page
│   ├── style.css          # Page styles
│   └── components/
│       ├── counter.ts     # Island
│       └── counter.css    # Island styles
├── package.json
└── tsconfig.json
```

## Output

```
dist/
├── index.html
├── index.a1b2c3d4.css      # Page CSS (hashed in prod)
└── islands/
    ├── counter.a1b2c3d4.js
    └── counter.e5f6g7h8.css
```

**HTML output:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>My Page</title>
  <link rel="stylesheet" href="/index.a1b2c3d4.css">
  <link rel="stylesheet" href="/islands/counter.e5f6g7h8.css">
</head>
<body>
  <main>
    <h1>Hello World</h1>
    <div data-island="@/components/counter.ts" data-island-id="island-1">
      <button type="button" class="increment">Count: 0</button>
    </div>
  </main>
  <script src="/islands/counter.a1b2c3d4.js"></script>
</body>
</html>
```

## How Islands Work

1. **Build time**: `<Island>` wraps children in `<div data-island="..." data-island-id="...">`
2. **Bundle**: Each island file is bundled into a self-executing IIFE
3. **Runtime**: The script finds all matching elements via `data-island` and calls `default(el)` for each

## Build Cache

`fleax build` stores dependency hashes in `.fleax-cache.json` to skip unchanged pages/islands.

## License

MIT
