# Repository Guide

## Scope and Runtime

This repository publishes `mazey-wordpress-utils`, a browser-focused TypeScript utility library for modifying WordPress page markup. Work from this repository root and use Node.js 22 (`nvm use`) with npm, matching `.nvmrc`, `package.json`, the README, and CI. Preserve the current public API and ES5 browser target unless a change explicitly requires otherwise.

## Repository Map

- `src/index.ts` is the canonical public API. It exports copy-button, lazy-image, header/sidebar, URL, and image-sizing helpers.
- `src/polyfill.js` is an independent legacy `querySelector`/`querySelectorAll` polyfill entry.
- `project.config.js` centralizes package-derived site identity, routes, SEO, theme, and PWA settings.
- `site/` contains the homepage, shared navigation/theme/PWA modules, API enhancements, styles, and service-worker source.
- `playground/` contains the crawlable interactive browser example.
- `images/` contains handwritten source artwork; Pages assembly generates raster PWA/social assets.
- `test/default.test.js` contains Jest/jsdom behavior tests against source.
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

## Configuration and Build Pipeline

- `rollup.config.mjs` owns production packaging. It clears `lib/`, compiles TypeScript declarations, applies Babel, and emits CJS and ESM builds while keeping runtime dependencies external. A second Rollup entry minifies `src/polyfill.js` to `lib/polyfill.min.js`.
- `scripts/webpack.config.js` owns only the website/playground and generated `dist-dev/` files.
- TypeDoc generates `.pages-api/`; `scripts/build-pages.js` combines it with Webpack output and emits the final `docs/` Pages artifact.
- `tsconfig.json` defines strict isolated TypeScript checking, declarations, modern bundler resolution, DOM libraries, ESNext modules, and the ES2015 intermediate target. Babel owns final browser downleveling.
- `.babelrc` defines browser transpilation and usage-based `core-js` transforms.
- `.eslintrc`, `.eslintignore`, `.editorconfig`, and `.lintstagedrc` define source style and staged-file linting.
- `commitlint.config.js` and `.husky/` enforce Conventional Commit messages and pre-commit linting.
- `.npmignore`, `.gitignore`, and `package.json` control generated, repository, and published package boundaries.

## Contributor Workflow

Install with `npm install`. Use `npm run lint`, `npm test`, and `npm run build` for focused work; run `npm run check-health` before handoff because it executes all three in that order. For website work, run `npm run docs` so SEO and PWA checks inspect the final artifact. Add deterministic Jest coverage for behavior changes and keep tests independent of the network and local browser state.

Do not run `npm run release`, publish packages, create tags, or modify release branches unless explicitly requested. Before finishing, review `git status`, inspect the complete diff, run `git diff --check`, and report exact commands run plus any skipped verification.
