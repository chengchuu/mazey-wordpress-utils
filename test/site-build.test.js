const { readFileSync, mkdtempSync, rmSync, existsSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const projectConfig = require("../project.config");
const { packageDetails, repositoryDetails } = require(
  "../scripts/project-config-utils"
);
const { transformApiHtml, copyImages } = require("../scripts/build-pages");
const { imageDimensions } = require("../scripts/image-dimensions");

function runPwaValidator(icons) {
  const root = path.join(__dirname, "..");
  const artifact = new Map();
  const { basePath } = projectConfig.site;
  const html = `<link rel="manifest" href="${projectConfig.pwa.manifestUrl}"><meta name="theme-color" content="#3858b3">`;
  for (const page of ["index.html", "playground/index.html", "api/index.html"]) {
    artifact.set(path.join(root, "docs", page), Buffer.from(html));
  }
  for (const file of projectConfig.assetFiles) {
    artifact.set(path.join(root, "docs", "images", file), readFileSync(path.join(root, "images", file)));
  }
  artifact.set(path.join(root, "docs", "manifest.webmanifest"), Buffer.from(JSON.stringify({
    start_url: basePath,
    scope: basePath,
    name: projectConfig.pwa.name,
    icons,
  })));
  const shell = projectConfig.assetFiles.map(file => `${basePath}images/${file}`);
  shell.push(projectConfig.pwa.manifestUrl);
  artifact.set(path.join(root, "docs", "service-worker.js"), Buffer.from(
    `const BASE_PATH = "${basePath}"; const APP_SHELL = ${JSON.stringify(shell)}; function networkFirst() {} networkFirst(request, BASE_PATH);`
  ));
  const validate = new Function("require", "__dirname", "Buffer", "URL", "console",
    readFileSync(path.join(root, "scripts", "validate-pwa.js"), "utf8"));
  validate(
    id => {
      if (id === "../project.config") return projectConfig;
      if (id !== "node:fs") return require(id);
      return {
        existsSync: file => artifact.has(file),
        readFileSync: (file, encoding) => {
          const buffer = artifact.has(file) ? artifact.get(file) : readFileSync(file);
          return encoding ? buffer.toString(encoding) : buffer;
        },
        readdirSync: () => [],
      };
    },
    path.join(root, "scripts"), Buffer, URL, { log() {} }
  );
}

describe("PWA manifest asset validation", () => {
  const icons = projectConfig.pwa.icons.map(({ file, ...icon }) => icon);

  test("accepts equivalent JSON with reordered icon properties", () => {
    const reordered = icons.map(({ src, sizes, type, purpose }) => ({ purpose, type, sizes, src }));
    expect(() => runPwaValidator(reordered)).not.toThrow();
  });

  test("rejects incorrect icon mappings and missing referenced images", () => {
    expect(() => runPwaValidator(icons.map(icon => ({ ...icon, type: "image/jpeg" })))).toThrow(/manifest icons/);
    expect(() => runPwaValidator(icons.map(icon => ({ ...icon, src: `${projectConfig.site.basePath}images/missing.png` })))).toThrow(/Missing images\/missing.png/);
  });
});

describe("supplied website artwork", () => {
  const root = path.join(__dirname, "..");
  const expected = [
    ["logo-32x32.png", "image/png", [32, 32]],
    ["logo-192x192.png", "image/png", [192, 192]],
    ["logo-512x512.png", "image/png", [512, 512]],
    ["logo-apple-touch-180x180.png", "image/png", [180, 180]],
    ["logo-maskable-512x512.png", "image/png", [512, 512]],
    ["logo-open-graph-1200x630.jpg", "image/jpeg", [1200, 630]],
  ];

  test("configures the six supplied assets and their actual formats", () => {
    expect(projectConfig.assetFiles).toEqual(expected.map(([file]) => file));
    for (const [file, type, dimensions] of expected) {
      expect(imageDimensions(readFileSync(path.join(root, "images", file)), type)).toEqual(dimensions);
    }
    expect(projectConfig.assets.faviconType).toBe("image/png");
    expect(projectConfig.seo.openGraphImage.type).toBe("image/jpeg");
    expect(projectConfig.pwa.icons.map(icon => [icon.file, icon.sizes, icon.purpose])).toEqual([
      ["logo-192x192.png", "192x192", "any"],
      ["logo-512x512.png", "512x512", "any"],
      ["logo-maskable-512x512.png", "512x512", "maskable"],
    ]);
  });

  test("copies artwork byte-for-byte and excludes the unused SVG", () => {
    const temporary = mkdtempSync(path.join(os.tmpdir(), "wp-logo-test-"));
    try {
      copyImages(path.join(root, "images"), temporary);
      for (const [file] of expected) {
        expect(readFileSync(path.join(temporary, file))).toEqual(readFileSync(path.join(root, "images", file)));
      }
      expect(existsSync(path.join(temporary, "logo.svg"))).toBe(false);
      expect(() => copyImages(path.join(temporary, "missing"), temporary)).toThrow();
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  test("Webpack emits every configured raster and templates use configured icon metadata", () => {
    const config = require("../scripts/webpack.config");
    expect(config.entry.shared.slice(1)).toEqual(expected.map(([file]) => path.join(root, "images", file)));
    const rule = config.module.rules.find(item => item.type === "asset/resource");
    for (const [file] of expected) expect(rule.test.test(file)).toBe(true);
    for (const file of ["site/index.html", "playground/index.html"]) {
      const template = readFileSync(path.join(root, file), "utf8");
      expect(template).toContain('type="<%= FAVICON_TYPE %>"');
      expect(template).toContain('href="<%= APPLE_TOUCH_ICON_URL %>" sizes="180x180"');
    }
  });

  test("rejects malformed and mismatched image formats", () => {
    for (const type of ["image/png", "image/jpeg"]) {
      expect(() => imageDimensions(Buffer.alloc(24), type)).toThrow();
    }
    const jpeg = readFileSync(path.join(root, "images", expected[5][0]));
    expect(() => imageDimensions(jpeg.subarray(0, 20), "image/jpeg")).toThrow();
    expect(() => imageDimensions(jpeg, "image/png")).toThrow();
  });
});

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

  test("replaces obsolete favicon and Apple links on API index and nested pages", () => {
    const input = typedocHtml.replace("</head>", '<link href="old.svg" rel="icon"><link rel="shortcut icon" href="old.ico"><link rel="apple-touch-icon" href="old.png"></head>');
    for (const file of ["index.html", "functions/hideSidebar.html"]) {
      const html = transformApiHtml(input, file);
      expect(html.match(/rel="icon"/g)).toHaveLength(1);
      expect(html.match(/rel="apple-touch-icon"/g)).toHaveLength(1);
      expect(html).toContain(`href="${projectConfig.assets.faviconUrl}" type="image/png" sizes="32x32"`);
      expect(html).toContain(`href="${projectConfig.assets.appleTouchIconUrl}" sizes="180x180"`);
      expect(html).toContain(`property="og:image" content="${projectConfig.seo.openGraphImage.url}"`);
      expect(html).toContain('property="og:image:type" content="image/jpeg"');
      expect(html).not.toContain("old.svg");
      expect(html).not.toContain("old.png");
      expect(transformApiHtml(html, file)).toBe(html);
    }
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
