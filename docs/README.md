# Fleax Documentation

A tiny, zero-dependency TSX-to-HTML library with reactive signals, SSG, and client-side hydration.

## Installation

```bash
npm install fleax
```

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

### 2. Static Site Generation (SSG)

```tsx
// build.ts
import { render, build } from "fleax/ssg";
import { ref, computed } from "fleax";

const App = () => {
  const count = ref(0);
  
  return (
    <div>
      <h1>Hello Fleax</h1>
      <p>Count: {count}</p>
    </div>
  );
};

// Single page
render(<App />, { title: "My Site", path: "dist/index.html" });

// Multi-page site
build({
  outDir: "dist",
  pages: {
    "/": () => <App />,
    "/about": () => <AboutPage />,
  },
});
```

Run with:
```bash
npx tsx build.ts
```

### 3. Islands Architecture (Recommended)

Static HTML with isolated interactive components:

```tsx
import { Island } from "fleax/ssg";

const Page = () => (
  <div>
    <h1>Static content - no JS needed</h1>
    
    <Island src="./counter.ts">
      <button>Count: 0</button>
    </Island>
  </div>
);
```

```tsx
// counter.ts
import { initIsland } from "fleax/client";
import { ref } from "fleax";

initIsland((el) => {
  const count = ref(0);
  const btn = el.querySelector("button")!;
  btn.onclick = () => {
    count.value++;
    btn.textContent = `Count: ${count.value}`;
  };
});
```

### 4. Pure Client-Side App

```tsx
import { mount } from "fleax/client";
import { ref } from "fleax";

const count = ref(0);

const App = () => (
  <div>
    <span>{count}</span>
    <button onclick={() => count.value++}>+1</button>
  </div>
);

mount(<App />, document.getElementById("root"));
```

---

## Modules

| Module | Purpose | Environment |
|--------|---------|-------------|
| `fleax` | Core primitives (signals, context, lifecycle) | Any |
| `fleax/ssg` | Static site generation + Islands | Node.js |
| `fleax/client` | Islands + DOM mounting | Browser |
| `fleax/jsx-runtime` | JSX transform (automatic) | Any |

---

## API Reference

- [Core API](./core.md) - Signals, Context, Lifecycle
- [SSG API](./ssg.md) - renderToString, render, build
- [Client API](./client.md) - mount, unmount, initIsland
- [Islands Architecture](./islands.md) - Interactive islands in static pages
- [Examples](./examples.md) - Complete example applications
