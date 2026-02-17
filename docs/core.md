# Core API

Environment-agnostic primitives for building reactive applications.

## Signals

### `ref<T>(value: T): Ref<T>`

Create a reactive reference that automatically tracks dependencies.

```tsx
import { ref, effect } from "fleax";

const count = ref(0);

// Reading
console.log(count.value); // 0

// Writing
count.value = 1;

// Automatic dependency tracking
effect(() => {
  console.log(`Count is: ${count.value}`);
});

count.value = 2; // Logs: "Count is: 2"
```

### `computed<T>(fn: () => T): Ref<T>`

Create a derived reactive value that recalculates when dependencies change.

```tsx
import { ref, computed, effect } from "fleax";

const firstName = ref("John");
const lastName = ref("Doe");

const fullName = computed(() => `${firstName.value} ${lastName.value}`);

effect(() => {
  console.log(fullName.value); // "John Doe"
});

firstName.value = "Jane"; // Logs: "Jane Doe"
```

### `effect(fn: () => void): void`

Run a function that automatically re-executes when reactive dependencies change.

```tsx
import { ref, effect } from "fleax";

const price = ref(100);
const quantity = ref(2);

effect(() => {
  const total = price.value * quantity.value;
  console.log(`Total: $${total}`);
});
// Logs: "Total: $200"

price.value = 150;
// Logs: "Total: $300"
```

---

## Context

### `createContext<T>(defaultValue: T)`

Create a context for passing data through the component tree without prop drilling.

```tsx
import { createContext, useContext } from "fleax";

const ThemeContext = createContext("light");

const ThemeProvider = ThemeContext.Provider;

const Button = () => {
  const theme = useContext(ThemeContext);
  return <button class={`btn btn-${theme}`}>Click me</button>;
};

const App = () => (
  <ThemeProvider value="dark">
    <Button /> {/* Gets "dark" */}
  </ThemeProvider>
);

// Without provider, uses default
const DefaultApp = () => <Button />; {/* Gets "light" */}
```

### Nested Contexts

```tsx
import { createContext, useContext } from "fleax";

const UserContext = createContext({ name: "Guest" });
const ThemeContext = createContext("light");

const Profile = () => {
  const user = useContext(UserContext);
  const theme = useContext(ThemeContext);
  
  return (
    <div class={`profile ${theme}`}>
      Hello, {user.name}!
    </div>
  );
};

const App = () => (
  <UserContext.Provider value={{ name: "Alice" }}>
    <ThemeContext.Provider value="dark">
      <Profile />
    </ThemeContext.Provider>
  </UserContext.Provider>
);
```

---

## Lifecycle

### `onMount(fn: () => void): void`

Register a callback to run when a component mounts (client-side only).

```tsx
import { onMount, ref } from "fleax";

const DataFetcher = () => {
  const data = ref<string | null>(null);
  const loading = ref(true);
  
  onMount(async () => {
    const response = await fetch("/api/data");
    data.value = await response.text();
    loading.value = false;
  });
  
  if (loading.value) {
    return <div>Loading...</div>;
  }
  
  return <div>{data}</div>;
};
```

### `onCleanup(fn: () => void): void`

Register a callback to run when a component unmounts.

```tsx
import { onMount, onCleanup, ref } from "fleax";

const Timer = () => {
  const seconds = ref(0);
  
  onMount(() => {
    const interval = setInterval(() => {
      seconds.value++;
    }, 1000);
    
    onCleanup(() => {
      clearInterval(interval);
    });
  });
  
  return <div>Elapsed: {seconds}s</div>;
};
```

### Event Listeners Cleanup

```tsx
import { onMount, onCleanup } from "fleax";

const WindowSize = () => {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);
  
  onMount(() => {
    const handleResize = () => {
      width.value = window.innerWidth;
      height.value = window.innerHeight;
    };
    
    window.addEventListener("resize", handleResize);
    
    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
    });
  });
  
  return <div>{width} x {height}</div>;
};
```

---

## JSX Types

Fleax includes comprehensive TypeScript types for all HTML and SVG elements.

### HTML Elements

```tsx
// Standard attributes work as expected
<div id="main" class="container" style={{ color: "red" }}>
  <h1>Title</h1>
  <p>Paragraph</p>
</div>

// Form elements
<form action="/submit" method="POST">
  <input type="text" name="email" placeholder="Email" required />
  <button type="submit">Submit</button>
</form>

// Media elements
<img src="/photo.jpg" alt="Photo" loading="lazy" />
<video src="/video.mp4" controls autoplay />
```

### SVG Elements

```tsx
<svg width="100" height="100" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="blue" />
  <path d="M10 10 L90 90" stroke="black" strokeWidth="2" />
</svg>
```

### Event Handlers

```tsx
const Button = () => {
  const handleClick = (e: MouseEvent) => {
    console.log("Clicked!", e.target);
  };
  
  const handleInput = (e: Event) => {
    console.log("Input:", (e.target as HTMLInputElement).value);
  };
  
  return (
    <div>
      <button onclick={handleClick}>Click</button>
      <input oninput={handleInput} />
    </div>
  );
};
```

### Refs (Element References)

```tsx
import { ref } from "fleax";

const InputFocus = () => {
  let inputEl: HTMLInputElement | null = null;
  
  const focus = () => {
    inputEl?.focus();
  };
  
  return (
    <div>
      <input ref={(el) => { inputEl = el; }} />
      <button onclick={focus}>Focus Input</button>
    </div>
  );
};
```

---

## VNode

### `jsx(type, props, key?): VNode`

The underlying JSX factory function. Called automatically by the JSX transform.

```tsx
// This JSX:
<div id="main">Hello</div>

// Becomes:
jsx("div", { id: "main", children: "Hello" })
```

### `Fragment`

Group children without adding extra DOM nodes.

```tsx
import { Fragment } from "fleax";

const List = () => (
  <>
    <li>Item 1</li>
    <li>Item 2</li>
  </>
);

// Or explicitly:
const List2 = () => (
  <Fragment>
    <li>Item 1</li>
    <li>Item 2</li>
  </Fragment>
);
```
