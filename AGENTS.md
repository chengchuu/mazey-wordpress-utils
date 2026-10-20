# Repository Guide

## Scope and Runtime

This repository publishes `mazey-wordpress-utils`, a browser-focused TypeScript utility library for modifying WordPress page markup. Work from this repository root and use Node.js 22 with npm, matching the README and CI. The repository does not pin a local Node.js version through `.nvmrc` or `package.json`. Preserve the current public API and the browser support targets in `.babelrc` unless a change explicitly requires otherwise.

## Repository Map

- `src/index.ts` is the canonical public API. It exports copy-button, lazy-image, header/sidebar, URL, and image-sizing helpers.
- `src/polyfill.js` is an independent legacy `querySelector`/`querySelectorAll` polyfill entry.
- `project.config.js` centralizes package-derived site identity, routes, SEO, theme, and PWA settings.
- `site/` contains the homepage, shared navigation/theme/PWA modules, API enhancements, styles, and service-worker source.
- `playground/` contains the crawlable interactive browser example.
- `images/` contains handwritten source artwork; Pages assembly generates raster PWA/social assets.
- `test/default.test.js` contains Jest/jsdom behavior tests for the public utilities.
- `test/site-build.test.js` covers project configuration and deterministic TypeDoc/Pages transformations; `test/site-runtime.test.js` covers browser theme, navigation, and PWA behavior.
- `typing.d.ts` supplies local declarations for dependencies and browser globals used by the source.
- `scripts/` contains package-name helpers, Webpack configuration, deterministic Pages assembly, preview, and final-artifact validation.
- `.github/workflows/publish-npm.yml` tests pull requests and publishes release branches.
- `lib/`, `dist-dev/`, `.pages-api/`, `docs/`, and `coverage/` are generated, ignored outputs. Do not edit them by hand. The root `index.js` is a legacy placeholder, not the package or build entrypoint.

## Entry Points and Startup Flow

Consumers resolve the package through `package.json`: `main` points to `lib/index.cjs.js`, `module` to `lib/index.esm.js`, and `typings` to `lib/index.d.ts`. All three originate from `src/index.ts`.

For local development, `npm run dev` starts Webpack Dev Server for the homepage and playground. The playground imports the source API directly. This flow does not consume `lib/`, so also run the package build before considering a change complete.

## Data Flow and Browser Boundaries

Callers pass selectors and URL-matching options into exported helpers. The helpers read `location`, query the live DOM, and mutate matching elements or attach event handlers. `setCopyBtn` sends extracted paragraph text to `copy-to-clipboard`; shared validation, logging, and throttling come from `mazey`. `setImgWidthHeight` is the only helper that expects a page-provided `window.jQuery` or `window.$`. `hideHeaderInTOC` retains module-level state so its scroll listener is installed only once.

These APIs require browser globals when invoked. Keep imports free of new module-load DOM side effects, and test DOM behavior under jsdom. When public behavior changes, update source, declarations, tests, examples, and README usage together.

The website theme controls expose only light and dark. `site/theme.ts` resolves the operating-system theme once when no explicit preference exists, persists only concrete `light` or `dark` selections through Mazey, and synchronizes Bootstrap, browser theme color, and TypeDoc state. Generated API pages retain TypeDoc's native Settings selector with only Light and Dark options.

## Configuration and Build Pipeline

- `rollup.config.mjs` owns production packaging. It clears `lib/`, compiles TypeScript declarations, applies Babel, and emits CJS and ESM builds while keeping runtime dependencies external. A second Rollup entry minifies `src/polyfill.js` to `lib/polyfill.min.js`.
- `scripts/webpack.config.js` owns only the website/playground and generated `dist-dev/` files.
- TypeDoc generates `.pages-api/`; `scripts/build-pages.js` combines it with Webpack output and emits the final `docs/` Pages artifact.
- `tsconfig.json` defines strict isolated TypeScript checking, declarations, modern bundler resolution, DOM libraries, ESNext modules, and the ES2015 intermediate target. Babel owns final browser downleveling.
- `tsconfig.site.json` extends the package configuration for `src/`, `site/`, and `playground/`, uses the repository root as `rootDir`, and disables declaration output for Webpack.
- `.babelrc` defines browser transpilation and usage-based `core-js` transforms.
- `.eslintrc`, `.eslintignore`, `.editorconfig`, and `.lintstagedrc` define source style and staged-file linting.
- `commitlint.config.js` and `.husky/` enforce Conventional Commit messages and pre-commit linting.
- `.npmignore`, `.gitignore`, and `package.json` control generated, repository, and published package boundaries.

## Contributor Workflow

Install with `npm install`. Use `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` for focused work. Run `npm run check-health` before handoff; it executes lint, package build, and tests, while type checking remains a separate command. For website work, run `npm run docs` so SEO and PWA checks inspect the assembled `docs/` artifact. `npm run preview` is the full local verification pipeline, and `npm run pages:preview` builds and serves the Pages artifact. Add deterministic Jest coverage for behavior changes and keep tests independent of the network and local browser state.

Do not run `npm run release`, publish packages, create tags, or modify release branches unless explicitly requested. Before finishing, review `git status`, inspect the complete diff, run `git diff --check`, and report exact commands run plus any skipped verification.
