# Getting Started with Fleax

Fleax is a tiny, zero-dependency SSG (Static Site Generation) framework with an Islands architecture. It allows you to build fast, static websites while still having interactive components where they matter.

## Core Concepts

### 1. Static by Default
Every `.tsx` file in your `src/` or `pages/` directory is treated as a page. During the build process, Fleax executes these files and renders them into static HTML files in the `dist/` directory.

### 2. Islands Architecture
Unlike traditional SPAs that hydrate the entire page, Fleax only hydrates specific "Islands" of interactivity. This means most of your page is pure, static HTML with zero JavaScript overhead.

### 3. Automatic CSS Pipeline
When you import a `.css` file in a page or an island, Fleax:
- Extracts it into a separate file.
- Minifies it in production.
- Content-hashes the filename for caching.
- Purges unused classes (optional, enabled by default in production).

## CLI Usage

The `fleax` command is your primary tool for development.

- `fleax create <name>`: Scaffolds a new project.
- `fleax build`: Performs a one-time build. Use `NODE_ENV=production` for minified output.
- `fleax watch`: Rebuilds your project whenever you save changes.
- `fleax serve`: Starts a local server for your `dist/` directory.
- `fleax serve --hot`: Starts a server and automatically reloads the browser when files change.

## Configuration

Fleax is designed to work out of the box with zero configuration, but you can customize its behavior in your `package.json`:

```json
{
  "fleax": {
    "class": {
      "keep": ["is-active", "theme-dark"]
    }
  }
}
```

### `class.keep`
If you use dynamic class names (e.g., in a script that toggles `el.classList.add('is-active')`), Fleax's CSS purger might remove those classes because they aren't found in your static HTML. Adding them to `keep` ensures they remain in your CSS bundle.

## Path Aliases

Fleax supports TypeScript path aliases. This is especially useful for importing islands:

```tsx
<Island src="@/islands/MyButton.ts">
```

To set this up, add it to your `tsconfig.json`:

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

## Production Builds

For production, always run:
```bash
NODE_ENV=production npx fleax build
```

This enables:
- **Minification**: Using Google Closure Compiler for JS and LightningCSS for CSS.
- **Content Hashing**: Filenames like `style.a1b2c3d4.css`.
- **CSS Purging**: Removing unused CSS rules based on your HTML content.
