# Fleax

A tiny, zero-dependency TSX-to-HTML library with reactive signals, SSG, and client-side hydration.

## Features

- **Zero runtime dependencies**
- **Lightweight** (~8KB)
- **Three modes**: SSG, Client, Hydration
- **Islands Architecture** - Static HTML with isolated interactive components
- **Standard JSX** with full TypeScript support
- **Reactive signals** (`ref`, `computed`, `effect`)
- **Context API** (`createContext`, `useContext`)
- **Lifecycle hooks** (`onMount`, `onCleanup`)

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

### 2. Static Site Generation

```tsx
import { render, build, Island } from "fleax/ssg";

const App = () => (
  <div>
    <h1>Hello World</h1>
    
    <Island src="./counter.ts">
      <button>Count: 0</button>
    </Island>
  </div>
);

// Single page
render(<App />, { title: "My Site" });

// Multi-page site
build({
  outDir: "dist",
  pages: {
    "/": () => <App />,
    "/about": () => <AboutPage />,
  },
});
```

### 3. Islands (Interactive Components)

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

### 4. Client-Side Hydration

```tsx
import { hydrate } from "fleax/client";
import { ref } from "fleax";

const count = ref(0);

const App = () => (
  <div>
    <span>{count}</span>
    <button onclick={() => count.value++}>+1</button>
  </div>
);

hydrate(<App />, document.body);
```

### 5. Pure Client App

```tsx
import { mount } from "fleax/client";
import { ref } from "fleax";

const count = ref(0);

const App = () => (
  <button onclick={() => count.value++}>
    Count: {count}
  </button>
);

mount(<App />, document.getElementById("root"));
```

## Modules

| Import | Description |
|--------|-------------|
| `fleax` | Core: signals, context, lifecycle |
| `fleax/ssg` | Static site generation + Islands |
| `fleax/client` | Islands + DOM mounting |
| `fleax/jsx-runtime` | JSX transform (auto) |

## Documentation

- [Core API](./docs/core.md) - Signals, Context, Lifecycle
- [SSG API](./docs/ssg.md) - renderToString, render, build
- [Client API](./docs/client.md) - mount, unmount, initIsland
- [Islands Architecture](./docs/islands.md) - Interactive islands in static pages
- [Examples](./docs/examples.md) - Complete applications

## License

MIT
