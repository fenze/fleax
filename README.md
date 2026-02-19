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

## Documentation

- [**Guide**](./docs/guide.md) - Learn how Fleax works and how to use the CLI.
- [**API Reference**](./docs/api.md) - Detailed documentation for core components and functions.
- [**UI Components**](./packages/fleax-ui/docs/index.md) - Documentation for the optional `@fleax/ui` package.

## Installation

```bash
npm install @fleax/core
```

Optional UI package:

```bash
npm install @fleax/ui
```

Or create a new project:

```bash
npx fleax create my-project
cd my-project
npm run build
```

If no name is provided, `create` prompts for one interactively. You can also pass `--ui` or `--no-ui` to include or skip `@fleax/ui`.

## Quick Start

### 1. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fleax/core"
  }
}
```

### 2. Create a Page

```tsx
// src/index.tsx
import { Island } from "@fleax/core";
import "./style.css";

export const meta = {
  title: "My Page",
  lang: "en",
};

export default (
  <main>
    <h1>Hello World</h1>
    <Island src="@/islands/counter.ts">
      <button type="button" class="increment">Count: 0</button>
    </Island>
  </main>
);
```

### 3. Create an Island

Islands receive the wrapper element and add interactivity:

```ts
// src/islands/counter.ts
import "@/islands/counter.css";

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
npx fleax create [name] [--ui|--no-ui]  # Create project, optional @fleax/ui starter
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
} from "@fleax/core";
```

## UI Components

`@fleax/ui` is an optional component package in this repo.

```ts
import { Button, Card, CardBody, CardTitle } from "@fleax/ui";
```

```tsx
<Card>
  <CardTitle>Hello</CardTitle>
  <CardBody>Reusable UI components.</CardBody>
</Card>
<Button variant="solid">Click me</Button>
```

`@fleax/ui` components import their own CSS automatically.  
Optional global CSS is still available:

```ts
import "@fleax/ui/styles.css";
```

### Island

```tsx
<Island src="@/islands/counter.ts">
  <button>Click me</button>
</Island>
```

Renders a wrapper `<div class="__...">` around children. The island file's default export receives this element.
All matching wrappers for the same island source are hydrated.

### Page Meta

```tsx
export const meta = {
  title: "Page Title",
  lang: "en",
  themeColor: {
    light: "#ffffff",
    dark: "#000000",
  },
  head: <meta name="description" content="...">,
};
```

`themeColor` is optional. Defaults are `light: "#ffffff"` and `dark: "#000000"`.

## CSS

Import CSS in pages or islands:

```tsx
// src/index.tsx (page)
import "./style.css";

// src/islands/counter.ts (island)
import "@/islands/counter.css";
```

CSS is:
- Extracted to separate files
- Minified in production
- Content-hashed in production

Production builds also enable CSS purge by default.  
To keep dynamic class names, configure `package.json`:

```json
{
  "fleax": {
    "class": {
      "keep": ["is-open", "theme-dark", "btn-active"]
    }
  }
}
```

CLI flags:
- `--purge` force enable purge
- `--no-purge` disable purge

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
<Island src="@/islands/counter.ts">
```

## Project Structure

```
my-project/
├── src/
│   ├── index.tsx          # Page
│   ├── style.css          # Page styles
│   └── islands/
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
    <div class="__96f4f26a">
      <button type="button" class="increment">Count: 0</button>
    </div>
  </main>
  <script src="/islands/counter.a1b2c3d4.js"></script>
</body>
</html>
```

## How Islands Work

1. **Build time**: `<Island>` wraps children in `<div class="__...">`
2. **Bundle**: Each island file is bundled into a self-executing IIFE
3. **Runtime**: The script finds all matching elements by island class and calls `default(el)` for each

## Build Cache

`fleax build` stores dependency hashes in `.fleax-cache.json` to skip unchanged pages/islands.

## License

MIT
