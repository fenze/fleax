# Client API

Browser runtime for mounting and islands.

## Import

```tsx
import { mount, unmount, initIsland, defineIsland } from "fleax/client";
```

---

## Islands

The recommended way to add interactivity. See [Islands Architecture](./islands.md).

```tsx
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

---

## mount

### `mount(vnode: Mountable, container: Node | null): void`

Mount a VNode tree to a DOM container. Use for pure client-side apps.

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

### Reactive Attributes

```tsx
import { mount } from "fleax/client";
import { ref, computed } from "fleax";

const isActive = ref(false);
const buttonClass = computed(() => isActive.value ? "btn-active" : "btn");

const App = () => (
  <button class={buttonClass} onclick={() => isActive.value = !isActive.value}>
    Toggle Active
  </button>
);

mount(<App />, document.body);
```

### SVG Support

```tsx
import { mount } from "fleax/client";

const Icon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="blue" />
  </svg>
);

mount(<Icon />, document.body);
```

### Event Handling

```tsx
import { mount } from "fleax/client";
import { ref } from "fleax";

const Form = () => {
  const value = ref("");
  
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    console.log("Submitted:", value.value);
  };
  
  return (
    <form onsubmit={handleSubmit}>
      <input 
        type="text" 
        oninput={(e) => value.value = (e.target as HTMLInputElement).value}
      />
      <button type="submit">Submit</button>
    </form>
  );
};

mount(<Form />, document.body);
```

---

## unmount

### `unmount(container: Node): void`

Remove all children and run cleanup callbacks.

```tsx
import { mount, unmount } from "fleax/client";
import { onCleanup } from "fleax";

const Timer = () => {
  onCleanup(() => console.log("Cleaned up!"));
  return <div>Timer</div>;
};

const container = document.getElementById("root")!;
mount(<Timer />, container);

// Later...
unmount(container); // Runs cleanup
```

---

## When to Use What

| Scenario | Use |
|----------|-----|
| Static site + widgets | Islands (`initIsland`) |
| Pure client app (SPA) | `mount` |
| SSG with full interactivity | Islands (split into components) |
