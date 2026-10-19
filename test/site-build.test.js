const { readFileSync } = require("node:fs");
const path = require("node:path");
const projectConfig = require("../project.config");
const { packageDetails, repositoryDetails } = require(
  "../scripts/project-config-utils"
);
const { transformApiHtml } = require("../scripts/build-pages");

describe("project configuration", () => {
  test("derives package and repository identity", () => {
    expect(packageDetails({ name: "@scope/example" })).toEqual({
      name: "@scope/example",
      bundleBaseName: "example",
      installCommand: "npm install @scope/example",
    });
    expect(
      repositoryDetails({
        url: "git+https://github.com/example/project.git",
      })
    ).toEqual({ url: "https://github.com/example/project" });
  });

  test("keeps stable routes and PWA scope under the Pages base", () => {
    expect(projectConfig.site.basePath).toBe("/mazey-wordpress-utils/");
    expect(projectConfig.site.pages.playground.url).toBe(
      "https://chengchuu.github.io/mazey-wordpress-utils/playground/"
    );
    expect(projectConfig.site.pages.api.url).toBe(
      "https://chengchuu.github.io/mazey-wordpress-utils/api/"
    );
    expect(projectConfig.pwa.serviceWorkerUrl).toBe(
      "/mazey-wordpress-utils/service-worker.js"
    );
    expect(Object.isFrozen(projectConfig.site)).toBe(true);
  });
});

describe("TypeDoc HTML transformation", () => {
  const typedocHtml = `<!doctype html>
<html><head><title>mazey-wordpress-utils</title></head>
<body><header><div class="tsd-toolbar-contents container"></div></header>
<main><div class="tsd-page-title"><h2>mazey-wordpress-utils</h2></div>
<h1>README</h1></main></body></html>`;

  test("adds page-specific metadata, toolbar links, and exactly one h1", () => {
    const transformed = transformApiHtml(typedocHtml, "index.html");
    expect(transformed).toContain(
      `<link rel="canonical" href="${projectConfig.site.pages.api.url}">`
    );
    expect(transformed).toContain('class="site-project-links"');
    expect(transformed.match(/<h1\b/g)).toHaveLength(1);
    expect(transformed).toContain('rel="manifest"');
  });

  test("is idempotent", () => {
    const once = transformApiHtml(typedocHtml, "index.html");
    expect(transformApiHtml(once, "index.html")).toBe(once);
  });

  test("keeps subpage titles stable when transformed again", () => {
    const subpageHtml = typedocHtml.replace(
      "<title>mazey-wordpress-utils</title>",
      "<title>hideSidebar | mazey-wordpress-utils</title>"
    );
    const once = transformApiHtml(
      subpageHtml,
      "functions/hideSidebar.html"
    );
    const twice = transformApiHtml(once, "functions/hideSidebar.html");

    expect(twice).toBe(once);
    expect(twice).toContain(
      "<title>hideSidebar - mazey-wordpress-utils API</title>"
    );
    expect(twice).not.toContain(
      "hideSidebar - mazey-wordpress-utils - mazey-wordpress-utils API"
    );
  });
});

describe("website integration sources", () => {
  test("collapses only enhanced mobile navigation", () => {
    const css = readFileSync(
      path.join(__dirname, "..", "site", "site.css"),
      "utf8"
    );

    expect(css).toMatch(
      /\[data-nav-enhanced="true"\] \.site-navbar \.navbar-collapse:not\(\.show\)\s*{\s*display: none;/
    );
  });

  test("uses the precached project root for offline navigation fallback", () => {
    const worker = readFileSync(
      path.join(__dirname, "..", "site", "service-worker.js"),
      "utf8"
    );

    expect(worker).toContain("networkFirst(request, BASE_PATH)");
    expect(worker).not.toContain("networkFirst(request, `${BASE_PATH}index.html`)");
  });
});
