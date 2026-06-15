# Fleax TODO

Improvements from the framework review, ordered by impact.

## Correctness bugs (fix first)

- [x] **JSX function event handlers are silently dropped.** Types invite `onclick?: ((e: MouseEvent) => void)` (`src/jsx.ts:105-114`), but the renderer throws non-string handlers away (`src/render.ts:23`). SSG can't serialize a server closure, so remove the function variants from the types (or route users to islands) — don't let the types promise what the runtime ignores. — _Done: event-handler types are now string-only with a comment pointing to `<Island>`._
- [x] **Production can ship unminified JS.** Island esbuild runs with `minify: false` (`bin/cli.js:477`); minification depends entirely on Closure Compiler (`bin/cli.js:497`), whose failure path falls back to unminified esbuild output (`bin/cli.js:498`) — contradicting the README's "Auto minification in production." Set `minify: isProd` on the esbuild build as the baseline. — _Done: esbuild now minifies in prod; Closure runs on top._
- [x] **Drop or opt-in Closure Compiler.** `google-closure-compiler` is in deps (`package.json:47`) and the generated starter (`bin/cli.js:948`). It's a huge, JVM-requiring install that contradicts the "tiny, zero-dep" pitch. Remove it or hide it behind an explicit flag; esbuild minify covers the common case. — _Done: removed from framework deps and starter; Closure now runs only behind the `--closure` flag. esbuild is the default minifier._

## Architectural gaps

- [x] **Add nested routing.** `findPages` only scans the top level of `src/` and `pages/` (`bin/cli.js:547,558`). Recurse directories and map to nested `index.html` paths so `src/blog/post.tsx → /blog/post`. — _Done: `findPages` recurses; routes derive from the path relative to `src/`/`pages/`; `index` segments map to the dir's `index.html`; nested page CSS dirs are created. Keep islands as `.ts`._
- [x] **Add a raw-HTML / markdown escape hatch.** Everything is escaped except `<script>`/`<style>` (`src/render.ts:41`). Add a sanctioned `<Raw>` / `dangerouslySetInnerHTML` node so Markdown → HTML (the core SSG use case) works. — _Done: added `<Raw html={...}>` / `<Raw>{...}</Raw>` backed by a `RawHtml` symbol; emits content unescaped. Exported from `@fleax/core`._
- [ ] **Add layouts / shared shell.** Every page is standalone; the only shared surface is `meta`. Introduce a `Layout` component or `_document` convention to remove duplication.

## Lower-priority cleanups

- [x] **Shell-injection shape in Closure invocation** (`bin/cli.js:139`): interpolated paths in `execSync`. Switch to `execFileSync` with an args array. — _Done: `runClosureCompiler` uses `execFileSync("npx", [...args])`._
- [x] **Scope file watchers.** Recursive `watch(cwd)` (`bin/cli.js:864`, `bin/cli.js:1199`) fires on every `node_modules` change and filters in JS. Watch `src/`, `pages/`, and `tsconfig.json` directly. — _Done: new `watchSources` helper watches only the source roots + `tsconfig.json`; used by `watch` and hot `serve`._
- [x] **Clean temp dir on crash.** `.fleax-temp` is only removed after a successful build (`bin/cli.js:823`); a thrown page leaves it behind. Remove it in a `finally`. — _Done: `build` wraps its body in try/finally and removes `.fleax-temp` in the finally._
- [x] **Parallelize builds.** Pages and islands build in `await` loops (`bin/cli.js:701`, `bin/cli.js:431`). Use `Promise.all` for larger sites. — _Done for islands: `buildIslands` now bundles concurrently via `Promise.all`. Pages stay sequential on purpose — `renderPage` relies on the module-global island registry (`resetIslands`/`getIslands`), which would race under concurrency. Parallelizing pages requires removing that global state first._
- [x] **Per-page error context.** A page module throwing during `import()` (`bin/cli.js:624`) crashes a plain `build` without naming the page. Wrap and report `pagePath`. — _Done: `renderPage` rethrows as `Failed to render page <path>: <msg>` with the original error as `cause`._
- [x] **Viewport meta** omits `initial-scale=1` (`bin/cli.js:305`). — _Done: now `width=device-width, initial-scale=1`._

## Follow-up (not yet done)

- **Parallelize page rendering** — blocked on the global island registry in `src/island.ts`. Refactor `Island`/`getIslands` to thread a per-render collector instead of module-level state, then pages can build concurrently too.

