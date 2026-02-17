# Islands Architecture

Islands architecture allows you to have static HTML with isolated interactive "islands". Only the interactive parts load JavaScript, keeping your pages fast and lightweight.

## Overview

```
┌─────────────────────────────────────┐
│  Static HTML (no JavaScript)        │
│  ┌─────────────────────────────┐    │
│  │  Island: Counter            │ ← JS loaded
│  │  <button>0</button>         │    │
│  └─────────────────────────────┘    │
│                                     │
│  More static content...             │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Island: SearchBox          │ ← JS loaded
│  │  <input type="search" />    │    │
│  └─────────────────────────────┘    │
│                                     │
│  Footer (no JavaScript)             │
└─────────────────────────────────────┘
```

## Usage

### 1. Define an Island in Your Page

```tsx
// build.ts
import { render, Island } from "fleax/ssg";

const App = () => (
  <html>
    <head>
      <title>My Site</title>
    </head>
    <body>
      <header>
        <h1>Welcome</h1>
        <nav>Static navigation...</nav>
      </header>
      
      <main>
        <p>This is static content - no JavaScript needed.</p>
        
        <Island src="./counter.ts">
          <button>Count: 0</button>
        </Island>
        
        <p>More static content...</p>
      </main>
      
      <footer>Static footer...</footer>
    </body>
  </html>
);

render(<App />, { title: "My Site" });
```

### 2. Create the Island Script

```tsx
// counter.ts
import { initIsland } from "fleax/client";
import { ref } from "fleax";

initIsland((el) => {
  const count = ref(0);
  const button = el.querySelector("button")!;
  
  button.onclick = () => {
    count.value++;
    button.textContent = `Count: ${count.value}`;
  };
});
```

### 3. Build & Compile Islands

```bash
# Build your pages
npx tsx build.ts

# Compile island scripts (using esbuild or similar)
npx esbuild counter.ts --outfile=dist/islands/counter.js --bundle --format=esm
```

## API Reference

### `<Island>`

Wrap interactive components in an Island.

```tsx
<Island 
  src="./counter.ts"    // Path to island script
  id="my-counter"       // Optional: unique ID
>
  <button>0</button>    // Initial static content
</Island>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `src` | `string` | Yes | Path to the island's client script |
| `id` | `string` | No | Custom ID (auto-generated if omitted) |
| `children` | `unknown` | Yes | Initial HTML content |

### `initIsland(callback)`

Initialize an island from its script. Called inside your island file.

```tsx
// counter.ts
import { initIsland } from "fleax/client";
import { ref, computed, onMount, onCleanup } from "fleax";

initIsland((el) => {
  // el is the island's wrapper element
  const count = ref(0);
  
  // Update UI reactively
  const update = () => {
    el.querySelector("button")!.textContent = `Count: ${count.value}`;
  };
  
  // Add event handlers
  el.onclick = () => {
    count.value++;
    update();
  };
  
  // Cleanup when island is removed
  onCleanup(() => {
    console.log("Island cleaned up");
  });
});
```

### `defineIsland(name, component)`

Define an island by name instead of file path.

```tsx
// islands.ts
import { defineIsland } from "fleax/client";
import { ref, mount } from "fleax";

defineIsland("counter", (el) => {
  const count = ref(0);
  
  return (
    <button onclick={() => count.value++}>
      Count: {count}
    </button>
  );
});
```

```tsx
// In your page
<Island src="counter">
  <button>Count: 0</button>
</Island>
```

## Complete Example

### Project Structure

```
my-site/
├── src/
│   ├── app.tsx         # Page components
│   ├── build.ts        # SSG build
│   ├── counter.ts      # Island: counter
│   └── theme-toggle.ts # Island: theme toggle
├── dist/
│   ├── index.html
│   └── islands/
│       ├── counter.js
│       └── theme-toggle.js
└── package.json
```

### app.tsx

```tsx
import { Island } from "fleax/ssg";

export const Layout = ({ title, children }: { title: string; children: unknown }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width" />
      <title>{title}</title>
    </head>
    <body>
      <header>
        <Island src="./theme-toggle.ts">
          <button>🌙 Dark</button>
        </Island>
      </header>
      <main>{children}</main>
      <footer>© 2024</footer>
    </body>
  </html>
);

export const HomePage = () => (
  <Layout title="Home">
    <h1>Welcome</h1>
    
    <p>Here's an interactive counter:</p>
    
    <Island src="./counter.ts" id="main-counter">
      <div class="counter">
        <button class="decrement">-</button>
        <span class="count">0</span>
        <button class="increment">+</button>
      </div>
    </Island>
    
    <p>The rest of the page is static HTML.</p>
  </Layout>
);
```

### counter.ts

```tsx
import { initIsland } from "fleax/client";
import { ref, effect } from "fleax";

initIsland((el) => {
  const count = ref(0);
  const countEl = el.querySelector(".count")!;
  const decBtn = el.querySelector(".decrement")!;
  const incBtn = el.querySelector(".increment")!;
  
  // Reactive UI update
  effect(() => {
    countEl.textContent = String(count.value);
  });
  
  decBtn.onclick = () => count.value--;
  incBtn.onclick = () => count.value++;
});
```

### theme-toggle.ts

```tsx
import { initIsland } from "fleax/client";
import { ref, effect } from "fleax";

initIsland((el) => {
  const isDark = ref(
    localStorage.getItem("theme") === "dark" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  
  const btn = el.querySelector("button")!;
  
  effect(() => {
    document.documentElement.classList.toggle("dark", isDark.value);
    btn.textContent = isDark.value ? "☀️ Light" : "🌙 Dark";
    localStorage.setItem("theme", isDark.value ? "dark" : "light");
  });
  
  btn.onclick = () => {
    isDark.value = !isDark.value;
  };
});
```

### build.ts

```tsx
import { render, build } from "fleax/ssg";
import { HomePage } from "./app";

build({
  outDir: "dist",
  islandsDir: "/islands",
  pages: {
    "/": () => <HomePage />,
  },
});
```

### package.json

```json
{
  "type": "module",
  "scripts": {
    "build": "npx tsx src/build.ts",
    "build:islands": "esbuild src/*.ts --outdir=dist/islands --format=esm --bundle --external:fleax",
    "build:all": "npm run build && npm run build:islands"
  }
}
```

## Benefits of Islands

| Aspect | Full Hydration | Islands |
|--------|---------------|---------|
| Initial JS load | Entire app | Only islands |
| TTI (Time to Interactive) | Slower | Faster |
| SEO | ✅ | ✅ |
| Progressive enhancement | ❌ | ✅ |
| Simpler debugging | ❌ | ✅ |

## When to Use Islands

**Use Islands when:**
- Most of your page is static content
- You have a few interactive widgets
- Performance and fast TTI are critical
- You want progressive enhancement

**Use Full Hydration when:**
- Most of your app is interactive
- You need complex client-side routing
- The entire page state is reactive
