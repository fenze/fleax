# Examples

Complete example applications demonstrating Fleax patterns.

---

## 1. Basic Static Site

A simple blog built with SSG.

### Project Structure

```
my-blog/
├── src/
│   ├── app.tsx        # Shared components
│   └── build.ts       # SSG build script
├── dist/              # Generated output
├── tsconfig.json
└── package.json
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "fleax",
    "strict": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

### app.tsx

```tsx
import { ref, computed } from "fleax";

type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
};

export const posts: Post[] = [
  {
    slug: "hello-world",
    title: "Hello World",
    date: "2024-01-15",
    excerpt: "My first blog post",
    content: "Welcome to my blog! This is my very first post.",
  },
  {
    slug: "learning-fleax",
    title: "Learning Fleax",
    date: "2024-01-20",
    excerpt: "Building reactive UIs",
    content: "Fleax makes it easy to build reactive UIs with signals.",
  },
];

export const Layout = ({
  title,
  children,
}: {
  title: string;
  children: unknown;
}) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width" />
      <title>{title}</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>© 2024 My Blog</p>
      </footer>
    </body>
  </html>
);

export const HomePage = () => (
  <Layout title="My Blog">
    <h1>My Blog</h1>
    <ul class="post-list">
      {posts.map((post) => (
        <li>
          <a href={`/posts/${post.slug}`}>
            <h2>{post.title}</h2>
            <time>{post.date}</time>
            <p>{post.excerpt}</p>
          </a>
        </li>
      ))}
    </ul>
  </Layout>
);

export const PostPage = (post: Post) => (
  <Layout title={post.title}>
    <article>
      <header>
        <h1>{post.title}</h1>
        <time>{post.date}</time>
      </header>
      <p>{post.content}</p>
      <a href="/">← Back to posts</a>
    </article>
  </Layout>
);

export const AboutPage = () => (
  <Layout title="About">
    <h1>About</h1>
    <p>This is a simple blog built with Fleax.</p>
  </Layout>
);
```

### build.ts

```tsx
import { build } from "fleax/ssg";
import { posts, HomePage, PostPage, AboutPage } from "./app.js";

const pages: Record<string, () => unknown> = {
  "/": () => <HomePage />,
  "/about": () => <AboutPage />,
};

for (const post of posts) {
  pages[`/posts/${post.slug}`] = () => <PostPage {...post} />;
}

build({ outDir: "dist", pages });
```

### Run

```bash
npx tsx src/build.ts
```

---

## 2. Interactive Todo App with Islands

Todo app using SSG + Islands for interactivity.

### Project Structure

```
todo-app/
├── src/
│   ├── build.ts       # SSG build
│   └── todo.ts        # Island script
├── public/
│   └── style.css
├── dist/
│   ├── index.html
│   └── islands/
│       └── todo.js
└── package.json
```

### build.ts

```tsx
import { render, Island } from "fleax/ssg";

render(
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width" />
      <title>Todo App</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
      <Island src="./todo.ts">
        <div class="todoapp">
          <header>
            <h1>Todos</h1>
            <form>
              <input
                type="text"
                class="new-todo"
                placeholder="What needs to be done?"
              />
            </form>
          </header>
          <section class="main">
            <ul class="todo-list"></ul>
          </section>
          <footer class="footer">
            <span class="todo-count">0 items left</span>
          </footer>
        </div>
      </Island>
    </body>
  </html>,
  { path: "dist/index.html" }
);
```

### todo.ts (Island)

```tsx
import { initIsland } from "fleax/client";
import { ref, computed, effect } from "fleax";

initIsland((el) => {
  const todos = ref<{ id: number; text: string; done: boolean }[]>([]);
  const input = ref("");
  let nextId = 1;
  
  const inputEl = el.querySelector(".new-todo") as HTMLInputElement;
  const listEl = el.querySelector(".todo-list")!;
  const countEl = el.querySelector(".todo-count")!;
  
  const render = () => {
    listEl.innerHTML = "";
    const active = todos.value.filter(t => !t.done).length;
    countEl.textContent = `${active} item${active !== 1 ? 's' : ''} left`;
    
    todos.value.forEach(todo => {
      const li = document.createElement("li");
      li.className = todo.done ? "completed" : "";
      li.innerHTML = `
        <input type="checkbox" ${todo.done ? "checked" : ""} />
        <span>${todo.text}</span>
        <button class="delete">×</button>
      `;
      
      li.querySelector("input")!.onchange = () => {
        todo.done = !todo.done;
        render();
      };
      
      li.querySelector(".delete")!.onclick = () => {
        todos.value = todos.value.filter(t => t.id !== todo.id);
        render();
      };
      
      listEl.appendChild(li);
    });
  };
  
  el.querySelector("form")!.onsubmit = (e) => {
    e.preventDefault();
    if (inputEl.value.trim()) {
      todos.value = [...todos.value, { id: nextId++, text: inputEl.value.trim(), done: false }];
      inputEl.value = "";
      render();
    }
  };
});
```

### package.json

```json
{
  "type": "module",
  "scripts": {
    "build": "npx tsx src/build.ts && cp public/* dist/",
    "build:islands": "esbuild src/todo.ts --outfile=dist/islands/todo.js --bundle --format=esm",
    "build:all": "npm run build && npm run build:islands"
  }
}
```

---

## 3. Reactive Form Validation (Client-Side)

```tsx
import { ref, computed } from "fleax";
import { mount } from "fleax/client";

const Form = () => {
  const email = ref("");
  const password = ref("");
  const confirmPassword = ref("");
  
  const emailError = computed(() => {
    if (!email.value) return "";
    if (!email.value.includes("@")) return "Invalid email";
    return "";
  });
  
  const passwordError = computed(() => {
    if (!password.value) return "";
    if (password.value.length < 8) return "Min 8 characters";
    return "";
  });
  
  const confirmError = computed(() => {
    if (!confirmPassword.value) return "";
    if (confirmPassword.value !== password.value) return "Passwords don't match";
    return "";
  });
  
  const isValid = computed(
    () =>
      email.value &&
      password.value &&
      !emailError.value &&
      !passwordError.value &&
      !confirmError.value
  );
  
  const submit = (e: Event) => {
    e.preventDefault();
    if (isValid.value) {
      console.log("Submitted:", { email: email.value });
    }
  };
  
  return (
    <form onsubmit={submit} class="form">
      <div class="field">
        <label>Email</label>
        <input
          type="email"
          value={email}
          oninput={(e) => (email.value = (e.target as HTMLInputElement).value)}
        />
        {emailError.value && <span class="error">{emailError}</span>}
      </div>
      
      <div class="field">
        <label>Password</label>
        <input
          type="password"
          value={password}
          oninput={(e) => (password.value = (e.target as HTMLInputElement).value)}
        />
        {passwordError.value && <span class="error">{passwordError}</span>}
      </div>
      
      <div class="field">
        <label>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          oninput={(e) => (confirmPassword.value = (e.target as HTMLInputElement).value)}
        />
        {confirmError.value && <span class="error">{confirmError}</span>}
      </div>
      
      <button type="submit" disabled={!isValid.value}>
        Sign Up
      </button>
    </form>
  );
};

mount(<Form />, document.body);
```

---

## 4. Data Fetching with Loading States

```tsx
import { ref, onMount, onCleanup } from "fleax";
import { mount } from "fleax/client";

type User = {
  id: number;
  name: string;
  email: string;
};

const UserList = () => {
  const users = ref<User[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  
  onMount(async () => {
    try {
      const response = await fetch("https://jsonplaceholder.typicode.com/users");
      if (!response.ok) throw new Error("Failed to fetch");
      users.value = await response.json();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  });
  
  if (loading.value) {
    return <div class="loading">Loading users...</div>;
  }
  
  if (error.value) {
    return <div class="error">Error: {error}</div>;
  }
  
  return (
    <div class="user-list">
      <h1>Users</h1>
      <ul>
        {users.value.map((user) => (
          <li key={user.id}>
            <strong>{user.name}</strong>
            <br />
            <a href={`mailto:${user.email}`}>{user.email}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

mount(<UserList />, document.body);
```

---

## 5. Real-Time Search

```tsx
import { ref, computed, onCleanup } from "fleax";
import { mount } from "fleax/client";

const Search = () => {
  const query = ref("");
  const results = ref<string[]>([]);
  const searching = ref(false);
  
  // Debounced search
  let timeout: ReturnType<typeof setTimeout>;
  
  const searchItems = async (q: string) => {
    if (!q.trim()) {
      results.value = [];
      return;
    }
    
    searching.value = true;
    
    // Simulate API call
    await new Promise((r) => setTimeout(r, 300));
    
    const items = [
      "Apple", "Banana", "Cherry", "Date", "Elderberry",
      "Fig", "Grape", "Honeydew", "Kiwi", "Lemon",
    ];
    
    results.value = items.filter((item) =>
      item.toLowerCase().includes(q.toLowerCase())
    );
    
    searching.value = false;
  };
  
  const handleInput = (e: Event) => {
    query.value = (e.target as HTMLInputElement).value;
    
    clearTimeout(timeout);
    timeout = setTimeout(() => searchItems(query.value), 300);
  };
  
  onCleanup(() => clearTimeout(timeout));
  
  return (
    <div class="search">
      <input
        type="search"
        placeholder="Search fruits..."
        value={query}
        oninput={handleInput}
      />
      
      {searching.value && <div class="spinner">Searching...</div>}
      
      {results.value.length > 0 && (
        <ul class="results">
          {results.value.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      
      {query.value && !searching.value && results.value.length === 0 && (
        <div class="no-results">No results found</div>
      )}
    </div>
  );
};

mount(<Search />, document.body);
```
