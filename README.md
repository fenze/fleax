# Fleax

A tiny, zero-dependency TSX-to-HTML compiler with reactive client support.

## Features

- **Zero runtime dependencies**
- **Lightweight** (~8KB)
- **Two modes**: SSG (static) and Client (reactive)
- **Standard JSX** with full TypeScript support
- **Reactive signals** (`ref`, `computed`, `effect`)
- **Context API** (`createContext`, `useContext`)
- **Lifecycle hooks** (`onMount`, `onCleanup`)

## Quick Start

```bash
# Create SSG app (static site generation)
npx fleax my-app --ssg

# Create client app (reactive browser app)
npx fleax my-app --client

# With git initialization
npx fleax my-app --ssg --git
```

## App Types

### SSG Mode

Generates static HTML files. Runs in Node.js.

```tsx
import { render } from "fleax/server";

const App = () => (
  <div>
    <h1>Hello World</h1>
  </div>
);

render(<App />, { title: "My App" });
```

**Build:**
```bash
npm run build  # Creates dist/index.html
```

### Client Mode

Reactive browser apps with signals. Requires HTML file.

```tsx
import { ref, mount } from "fleax";

const count = ref(0);

const App = () => (
  <div>
    <p>Count: {count}</p>
    <button onclick={() => count.value++}>+</button>
  </div>
);

mount(<App />, document.getElementById("root"));
```

**Build & serve:**
```bash
npm run build  # Compiles to build/
npm run serve  # Serves index.html
```

## Manual Setup

1. Install: `npm install fleax`
2. Configure `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "jsx": "react-jsx",
       "jsxImportSource": "fleax",
       "strict": true
     }
   }
   ```
3. Add `"type": "module"` to `package.json`

## API

### Server (SSG)

```tsx
import { render } from "fleax/server";

render(<App />, {
  title: "Page Title",
  lang: "en",
  head: <link rel="stylesheet" href="style.css" />,
  path: "dist/custom.html"
});
```

### Client (Reactive)

```tsx
import { ref, computed, effect, mount } from "fleax";

// Reactive values
const count = ref(0);
const doubled = computed(() => count.value * 2);

// Side effects
effect(() => console.log(count.value));

// Mount to DOM
mount(<App />, document.getElementById("root"));
```

### Context

```tsx
import { createContext, useContext } from "fleax";

const Theme = createContext("light");

const Button = () => {
  const theme = useContext(Theme);
  return <button class={theme}>Click</button>;
};

// Provider
<Theme.Provider value="dark">
  <Button />
</Theme.Provider>
```

### Lifecycle

```tsx
import { onMount, onCleanup } from "fleax";

const Component = () => {
  onMount(() => console.log("mounted"));
  onCleanup(() => console.log("cleanup"));
  return <div>Hello</div>;
};
```

## CLI Options

```
npx fleax <name> [options]

Options:
  --ssg      Static site generation (default)
  --client   Reactive client app
  --git      Initialize git repository
  --no-git   Skip git initialization
```

## Scripts

```bash
npm run build    # Compile TypeScript
npm run dev      # Watch mode
npm run lint     # Biome linter
npm run format   # Format code
npm run serve    # Serve client app (client mode only)
```
