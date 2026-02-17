# SSG API

Static site generation for building HTML files at compile time.

## Import

```tsx
import { renderToString, render, renderHtml, build } from "fleax/ssg";
```

---

## renderToString

### `renderToString(vnode: unknown, isRaw?: boolean): string`

Convert a VNode tree to an HTML string.

```tsx
import { renderToString } from "fleax/ssg";
import { ref } from "fleax";

const html = renderToString(
  <div class="container">
    <h1>Hello World</h1>
    <p>This is a paragraph.</p>
  </div>
);

console.log(html);
// <div class="container"><h1>Hello World</h1><p>This is a paragraph.</p></div>
```

### With Reactive Values

```tsx
import { renderToString } from "fleax/ssg";
import { ref, computed } from "fleax";

const name = ref("Alice");
const greeting = computed(() => `Hello, ${name.value}!`);

const html = renderToString(<div>{greeting}</div>);
// <div>Hello, Alice!</div>
```

### With Context

```tsx
import { renderToString } from "fleax/ssg";
import { createContext, useContext } from "fleax";

const ThemeContext = createContext("light");

const ThemedDiv = () => {
  const theme = useContext(ThemeContext);
  return <div class={`theme-${theme}`}>Content</div>;
};

const html = renderToString(
  <ThemeContext.Provider value="dark">
    <ThemedDiv />
  </ThemeContext.Provider>
);
// <div class="theme-dark">Content</div>
```

### Raw Mode (isRaw)

By default, content is HTML-escaped. Use raw mode for script/style content:

```tsx
// Default: escaped
renderToString(<div>{"<script>alert('xss')</script>"</div>);
// <div>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;</div>

// Script/style tags automatically use raw mode
renderToString(<script>{"if (1 < 2) console.log('ok')"</script>);
// <script>if (1 < 2) console.log('ok')</script>

// Manual raw mode
renderToString(<div>{"<b>bold</b>"</div>, true);
// <div><b>bold</b></div>
```

---

## render

### `render(vnode: VNode, options?: PageOptions): void`

Render a VNode to an HTML file with a complete document wrapper.

```tsx
import { render } from "fleax/ssg";

render(<App />, {
  title: "My Page",
  lang: "en",
  path: "dist/index.html",
});
```

#### PageOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | - | Page `<title>` |
| `lang` | `string` | `"en"` | HTML `lang` attribute |
| `head` | `VNode` | - | Additional `<head>` content |
| `path` | `string` | Auto-generated | Output file path |

### Example with Head Content

```tsx
import { render } from "fleax/ssg";

render(<App />, {
  title: "My Site",
  head: (
    <>
      <meta name="description" content="A description" />
      <link rel="stylesheet" href="/styles.css" />
      <link rel="icon" href="/favicon.ico" />
    </>
  ),
  path: "dist/index.html",
});
```

Generates:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>My Site</title>
  <meta name="description" content="A description">
  <link rel="stylesheet" href="/styles.css">
  <link rel="icon" href="/favicon.ico">
</head>
<body>
  <!-- App content -->
</body>
</html>
```

---

## renderHtml

### `renderHtml(vnode: VNode, options?: PageOptions): string`

Same as `render`, but returns the HTML string instead of writing to a file.

```tsx
import { renderHtml } from "fleax/ssg";

const html = renderHtml(<App />, { title: "My Page" });

// Use the HTML string however you want
console.log(html);
// Or send as HTTP response
res.send(html);
```

---

## build

### `build(options: BuildOptions): void`

Build a multi-page static site from a page registry.

```tsx
import { build } from "fleax/ssg";

build({
  outDir: "dist",
  pages: {
    "/": () => <HomePage />,
    "/about": () => <AboutPage />,
    "/contact": () => <ContactPage />,
    "/blog": () => <BlogIndex />,
  },
});
```

#### BuildOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outDir` | `string` | `"dist"` | Output directory |
| `pages` | `Record<string, () => VNode>` | `{}` | Page registry |

Each page creates an `index.html` in its route directory:
```
dist/
├── index.html           # /
├── about/
│   └── index.html       # /about
├── contact/
│   └── index.html       # /contact
└── blog/
    └── index.html       # /blog
```

### Multi-Page Example

```tsx
// build.ts
import { build } from "fleax/ssg";
import { ref } from "fleax";

// Shared layout component
const Layout = ({ title, children }: { title: string; children: unknown }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width" />
      <title>{title}</title>
      <link rel="stylesheet" href="/styles.css" />
    </head>
    <body>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/pricing">Pricing</a>
      </nav>
      <main>{children}</main>
      <footer>© 2024 My Site</footer>
    </body>
  </html>
);

const Home = () => (
  <Layout title="Home">
    <h1>Welcome</h1>
    <p>This is the home page.</p>
  </Layout>
);

const About = () => (
  <Layout title="About">
    <h1>About Us</h1>
    <p>Learn more about our company.</p>
  </Layout>
);

const Pricing = () => (
  <Layout title="Pricing">
    <h1>Pricing Plans</h1>
    <div class="plans">
      <div class="plan">
        <h2>Free</h2>
        <p>$0/month</p>
      </div>
      <div class="plan">
        <h2>Pro</h2>
        <p>$19/month</p>
      </div>
    </div>
  </Layout>
);

build({
  outDir: "dist",
  pages: {
    "/": () => <Home />,
    "/about": () => <About />,
    "/pricing": () => <Pricing />,
  },
});

console.log("Build complete!");
```

### Dynamic Pages from Data

```tsx
import { build } from "fleax/ssg";

// Could also fetch from API/database
const posts = [
  { slug: "hello-world", title: "Hello World", content: "First post!" },
  { slug: "getting-started", title: "Getting Started", content: "How to begin." },
];

const PostPage = (post: typeof posts[0]) => (
  <article>
    <h1>{post.title}</h1>
    <p>{post.content}</p>
  </article>
);

const pages: Record<string, () => VNode> = {
  "/": () => (
    <ul>
      {posts.map(p => <li><a href={`/blog/${p.slug}`}>{p.title}</a></li>)}
    </ul>
  ),
};

// Add blog posts
for (const post of posts) {
  pages[`/blog/${post.slug}`] = () => <PostPage {...post} />;
}

build({ outDir: "dist", pages });
```

---

## SSG + Islands Pattern

For interactive sites, use SSG for initial HTML and Islands for interactivity:

### 1. Shared App Component

```tsx
// app.tsx
import { ref, computed } from "fleax";

export const Counter = () => {
  const count = ref(0);
  const doubled = computed(() => count.value * 2);
  
  return (
    <div>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <p>Doubled: {doubled}</p>
      <button onclick={() => count.value++}>Increment</button>
    </div>
  );
};
```

### 2. Page with Island (SSG)

```tsx
// build.ts
import { render, Island } from "fleax/ssg";

render(
  <Island src="./counter.ts">
    <div>
      <h1>Counter</h1>
      <p>Count: 0</p>
      <p>Doubled: 0</p>
      <button>Increment</button>
    </div>
  </Island>,
  { title: "Counter App" }
);
```

### 3. Island Script

```tsx
// counter.ts
import { initIsland } from "fleax/client";
import { ref, computed, effect } from "fleax";

initIsland((el) => {
  const count = ref(0);
  const doubled = computed(() => count.value * 2);
  
  const countEl = el.querySelectorAll("p")[0];
  const doubledEl = el.querySelectorAll("p")[1];
  const btn = el.querySelector("button")!;
  
  effect(() => {
    countEl.textContent = `Count: ${count.value}`;
    doubledEl.textContent = `Doubled: ${doubled.value}`;
  });
  
  btn.onclick = () => count.value++;
});
```

The SSG output provides fast initial load and SEO. Islands add interactivity only where needed.
