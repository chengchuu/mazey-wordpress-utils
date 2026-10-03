const { readFileSync } = require("node:fs");
const path = require("node:path");
const projectConfig = require("../project.config");
const { packageDetails, repositoryDetails } = require(
  "../scripts/project-config-utils"
);
const { transformApiHtml } = require("../scripts/build-pages");

function installedThemeIconPaths() {
  return ["sun-fill.svg", "moon-stars-fill.svg"].flatMap(file =>
    [
      ...readFileSync(
        path.join(
          __dirname,
          "..",
          "node_modules",
          "bootstrap-icons",
          "icons",
          file
        ),
        "utf8"
      ).matchAll(/d="([^"]+)"/g),
    ].map(match => match[1])
  );
}

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
<html><head><title>mazey-wordpress-utils</title><script defer src="assets/main.js"></script></head>
<body><script>document.documentElement.dataset.theme = localStorage.getItem("tsd-theme") || "os";document.body.style.display="none";</script>
<header><div class="tsd-toolbar-contents container"></div></header>
<main><div class="tsd-page-title"><h2>mazey-wordpress-utils</h2></div>
<h1>README</h1><div class="tsd-theme-toggle"><label for="tsd-theme">Theme</label><select id="tsd-theme"><option value="os">OS</option><option value="light">Light</option><option value="dark">Dark</option></select></div></main></body></html>`;

  test("adds page-specific metadata, toolbar links, and exactly one h1", () => {
    const transformed = transformApiHtml(typedocHtml, "index.html");
    expect(transformed).toContain(
      `<link rel="canonical" href="${projectConfig.site.pages.api.url}">`
    );
    expect(transformed).toContain('class="site-project-links"');
    expect(transformed).toContain(
      `<a href="${projectConfig.site.pages.home.url}">Home</a>`
    );
    expect(transformed).toContain(
      `<a href="${projectConfig.site.pages.api.url}">API</a>`
    );
    expect(transformed).toContain("data-theme-toggle");
    expect(transformed).not.toContain("data-theme-select");
    expect(transformed).not.toContain('<option value="os">OS</option>');
    expect(transformed.match(/id="tsd-theme"/g)).toHaveLength(1);
    expect(transformed.indexOf('src="assets/main.js"')).toBeLessThan(
      transformed.indexOf('assets/api.js"')
    );
    expect(transformed).not.toContain("document.body.style.display");
    expect(transformed.match(/<h1\b/g)).toHaveLength(1);
    expect(transformed).toContain('rel="manifest"');
    for (const iconPath of installedThemeIconPaths()) {
      expect(transformed).toContain(iconPath);
    }
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

  test("rejects missing or duplicate native TypeDoc theme controls", () => {
    expect(() =>
      transformApiHtml(
        typedocHtml.replace(/<select id="tsd-theme">[\s\S]*?<\/select>/, ""),
        "index.html"
      )
    ).toThrow("Expected exactly one TypeDoc theme selector");
    expect(() =>
      transformApiHtml(
        typedocHtml.replace(
          '<option value="os">OS</option>',
          '<option value="os">OS</option><option value="os">OS</option>'
        ),
        "index.html"
      )
    ).toThrow("Expected exactly one TypeDoc OS theme option");
  });
});

describe("website integration sources", () => {
  test("navbar templates use official accessible Bootstrap theme icons", () => {
    const iconPaths = installedThemeIconPaths();

    for (const relativeFile of ["site/index.html", "playground/index.html"]) {
      const html = readFileSync(path.join(__dirname, "..", relativeFile), "utf8");
      expect(html).toContain("data-theme-toggle");
      expect(html).toContain('type="button"');
      expect(html).toContain(
        'aria-label="Current theme: Light. Switch to dark theme."'
      );
      expect(html).toContain('data-theme-icon="light"');
      expect(html).toMatch(/data-theme-icon="dark"\s+hidden/);
      expect(html).not.toContain("data-theme-select");
      expect(html).not.toContain("aria-pressed");
      const icons = [
        ...html.matchAll(/<svg\b[^>]*data-theme-icon="(?:light|dark)"[^>]*>/g),
      ];
      expect(icons).toHaveLength(2);
      for (const [icon] of icons) {
        expect(icon).toContain('width="16"');
        expect(icon).toContain('height="16"');
        expect(icon).toContain('aria-hidden="true"');
        expect(icon).toContain('focusable="false"');
      }
      for (const iconPath of iconPaths) expect(html).toContain(iconPath);
    }
  });

  test("theme buttons use exact circular dimensions", () => {
    const siteCss = readFileSync(
      path.join(__dirname, "..", "site", "site.css"),
      "utf8"
    );
    const apiCss = readFileSync(
      path.join(__dirname, "..", "site", "api.css"),
      "utf8"
    );
    const siteButton = siteCss.match(/\.theme-toggle\s*\{([^}]*)\}/)?.[1];
    const siteIcon = siteCss.match(/\.theme-toggle svg\s*\{([^}]*)\}/)?.[1];
    const apiButton = apiCss.match(
      /\.site-project-links \.theme-toggle\s*\{([^}]*)\}/
    )?.[1];
    const apiIcon = apiCss.match(
      /\.site-project-links \.theme-toggle svg\s*\{([^}]*)\}/
    )?.[1];

    expect(siteButton).toMatch(/(?:^|\s)width: 32px;/);
    expect(siteButton).toMatch(/(?:^|\s)height: 32px;/);
    expect(siteButton).toMatch(/(?:^|\s)padding: 7px;/);
    expect(siteButton).toContain("box-sizing: border-box");
    expect(siteButton).toContain("border-radius: 50%");
    expect(siteIcon).toMatch(/(?:^|\s)width: 16px;/);
    expect(siteIcon).toMatch(/(?:^|\s)height: 16px;/);
    expect(apiButton).toMatch(/(?:^|\s)width: 28px;/);
    expect(apiButton).toMatch(/(?:^|\s)height: 28px;/);
    expect(apiButton).toContain("box-sizing: border-box");
    expect(apiButton).toContain("border-radius: 50%");
    expect(apiIcon).toMatch(/(?:^|\s)width: 16px;/);
    expect(apiIcon).toMatch(/(?:^|\s)height: 16px;/);
    expect(apiCss).toMatch(
      /\.site-project-links\s*\{[^}]*flex: 1 1 auto;[^}]*min-width: 0;[^}]*overflow-x: auto;/s
    );
    expect(apiCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.tsd-toolbar-contents\s*\{[^}]*flex-wrap: wrap;[^}]*height: auto;[\s\S]*?\.site-project-links\s*\{[^}]*order: 2;[^}]*flex: 0 0 100%;/
    );
  });

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
