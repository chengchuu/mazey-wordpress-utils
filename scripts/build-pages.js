"use strict";

const {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { createHash } = require("node:crypto");
const path = require("node:path");
const zlib = require("node:zlib");
const projectConfig = require("../project.config");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist-dev");
const typedocDir = path.join(root, ".pages-api");
const docsDir = path.join(root, "docs");
const marker = projectConfig.site.markerPrefix;
const seoStart = `<!-- ${marker}-seo:start -->`;
const seoEnd = `<!-- ${marker}-seo:end -->`;

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function themeToggleHtml() {
  return '<button class="theme-toggle" type="button" data-theme-toggle aria-label="Current theme: Light. Switch to dark theme."><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" focusable="false" data-theme-icon="light"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/></svg><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" focusable="false" data-theme-icon="dark" hidden><path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278"/><path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.73 1.73 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.73 1.73 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.73 1.73 0 0 0 1.097-1.097zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/></svg></button>';
}

function removeTypeDocOsThemeOption(html, relativeFile, alreadyTransformed) {
  const selectorPattern =
    /<select\b(?=[^>]*\bid=["']tsd-theme["'])[^>]*>[\s\S]*?<\/select>/gi;
  const selectors = [...html.matchAll(selectorPattern)];
  if (selectors.length !== 1) {
    throw new Error(
      `Expected exactly one TypeDoc theme selector in ${relativeFile}`
    );
  }

  const [selector] = selectors;
  const osOptionPattern =
    /<option\b(?=[^>]*\bvalue=["']os["'])[^>]*>[\s\S]*?<\/option>/gi;
  const osOptions = [...selector[0].matchAll(osOptionPattern)];
  if (osOptions.length === 0 && alreadyTransformed) return html;
  if (osOptions.length !== 1) {
    throw new Error(
      `Expected exactly one TypeDoc OS theme option in ${relativeFile}`
    );
  }

  const start = selector.index;
  const updatedSelector = selector[0].replace(osOptions[0][0], "");
  return `${html.slice(0, start)}${updatedSelector}${html.slice(start + selector[0].length)}`;
}

function walkFiles(directory, relative = "") {
  return readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap(entry => {
      const next = path.join(relative, entry.name);
      return entry.isDirectory() ? walkFiles(directory, next) : [next];
    })
    .sort();
}

function pageUrl(relativeFile) {
  const route = relativeFile
    .split(path.sep)
    .join("/")
    .replace(/index\.html$/, "");
  return new URL(route, projectConfig.site.pages.api.url).href;
}

function apiTitle(html, relativeFile) {
  if (relativeFile === "index.html") return projectConfig.site.pages.api.title;
  const existing = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  if (!existing) throw new Error(`Missing TypeDoc title in ${relativeFile}`);
  const suffix = ` - ${projectConfig.brand.displayName} API`;
  if (existing.endsWith(suffix)) return existing;
  return `${existing.replace(/ \| .*$/, "").replace(/ API$/, "")}${suffix}`;
}

function ensureOneH1(html, title) {
  let seen = false;
  let output = html.replace(
    /<h1(\b[^>]*)>([\s\S]*?)<\/h1>/gi,
    (_match, attributes, content) => {
      if (!seen) {
        seen = true;
        return `<h1${attributes}>${content}</h1>`;
      }
      return `<h2${attributes}>${content}</h2>`;
    }
  );
  if (!seen) {
    const pageTitleHeading =
      /(<div class="tsd-page-title"[^>]*>[\s\S]*?)<h([2-6])(\b[^>]*)>([\s\S]*?)<\/h\2>/i;
    if (pageTitleHeading.test(output)) {
      output = output.replace(pageTitleHeading, "$1<h1$3>$4</h1>");
    } else {
      output = output.replace(
        /(<main\b[^>]*>)/i,
        `$1<h1>${escapeAttribute(title)}</h1>`
      );
    }
  }
  return output;
}

function transformApiHtml(html, relativeFile) {
  const { pages, theme } = projectConfig.site;
  const social = projectConfig.seo.openGraphImage;
  const title = apiTitle(html, relativeFile);
  const description =
    relativeFile === "index.html"
      ? pages.api.description
      : `TypeScript API reference for ${title.replace(` - ${projectConfig.brand.displayName} API`, "")} in ${projectConfig.brand.displayName}.`;
  const url = pageUrl(relativeFile);
  const depth = relativeFile.split(path.sep).length;
  const assetPrefix = "../".repeat(depth);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    name: title,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: projectConfig.brand.displayName,
      url: pages.home.url,
    },
    about: projectConfig.seo.software,
  });
  const metadata = [
    seoStart,
    `<meta name="description" content="${escapeAttribute(description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<link rel="icon" href="${projectConfig.assets.faviconUrl}" type="image/svg+xml">`,
    `<link rel="manifest" href="${projectConfig.pwa.manifestUrl}">`,
    `<meta name="theme-color" content="${theme.colorPrimary}" data-theme-color data-theme-color-light="${theme.colorLight}" data-theme-color-dark="${theme.colorDark}">`,
    `<style>:root{--project-theme-primary:${theme.colorPrimary};--project-theme-primary-dark:${theme.primary.dark.base}}</style>`,
    `<link rel="stylesheet" href="${assetPrefix}assets/api.css">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${escapeAttribute(projectConfig.brand.displayName)}">`,
    `<meta property="og:title" content="${escapeAttribute(title)}">`,
    `<meta property="og:description" content="${escapeAttribute(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${social.url}">`,
    `<meta property="og:image:type" content="${social.type}">`,
    `<meta property="og:image:width" content="${social.width}">`,
    `<meta property="og:image:height" content="${social.height}">`,
    `<meta property="og:image:alt" content="${escapeAttribute(social.alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeAttribute(title)}">`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}">`,
    `<meta name="twitter:image" content="${social.url}">`,
    `<meta name="twitter:image:alt" content="${escapeAttribute(social.alt)}">`,
    `<script type="application/ld+json">${jsonLd}</script>`,
    `<script src="${assetPrefix}assets/api.js" defer></script>`,
    seoEnd,
  ].join("");

  const alreadyTransformed = html.includes(seoStart);
  let output = html
    .replace(
      new RegExp(
        `${seoStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${seoEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "g"
      ),
      ""
    )
    .replace(/<nav class="site-project-links"[\s\S]*?<\/nav>/g, "")
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttribute(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/i, "")
    .replace(/<link rel="canonical"[^>]*>/i, "")
    .replace(/<link rel="icon"[^>]*>/i, "")
    .replace(
      /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?document\.body\.style\.display(?:(?!<\/script>)[\s\S])*?<\/script>/i,
      ""
    )
    .replace(/<html\b(?![^>]*data-bs-theme)/i, '<html data-bs-theme="light"')
    .replace("</head>", `${metadata}</head>`);

  output = removeTypeDocOsThemeOption(
    output,
    relativeFile,
    alreadyTransformed
  );

  const toolbarPattern = /(<div class="tsd-toolbar-contents container"[^>]*>)/i;
  if (!toolbarPattern.test(output)) {
    throw new Error(`Missing TypeDoc toolbar in ${relativeFile}`);
  }
  const links = `<nav class="site-project-links" aria-label="Project links"><a href="${pages.home.url}">Home</a><a href="${pages.api.url}">API</a><a href="${projectConfig.urls.github}">GitHub</a><a href="${projectConfig.urls.npm}">npm</a><span role="status" aria-live="polite" data-pwa-status></span>${themeToggleHtml()}</nav>`;
  output = output.replace(toolbarPattern, `$1${links}`);
  return ensureOneH1(output, title);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return output;
}

function generatePng(width, height, painter) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha = 255] = painter(x, y, width, height);
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
      raw[offset + 3] = alpha;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function logoPixel(x, y, width, height, maskable) {
  const scale = Math.min(width, height);
  const margin = maskable ? 0.1 * scale : 0;
  const inside =
    x >= margin && y >= margin && x < width - margin && y < height - margin;
  if (!inside) return [247, 249, 252, 255];
  const nx = x / width;
  const ny = y / height;
  const orange = (nx - 0.81) ** 2 + (ny - 0.2) ** 2 < 0.006;
  if (orange) return [255, 180, 84, 255];
  const leftBar = nx > 0.2 && nx < 0.31 && ny > 0.28 && ny < 0.75;
  const rightBar = nx > 0.69 && nx < 0.8 && ny > 0.28 && ny < 0.75;
  const diagonalA = Math.abs(ny - (0.27 + (nx - 0.31) * 1.45)) < 0.065;
  const diagonalB = Math.abs(ny - (0.75 - (nx - 0.5) * 1.45)) < 0.065;
  if (leftBar || rightBar || diagonalA || diagonalB) return [255, 255, 255, 255];
  return [56, 88, 179, 255];
}

function writeGeneratedImages() {
  const imagesDir = path.join(docsDir, "images");
  mkdirSync(imagesDir, { recursive: true });
  writeFileSync(
    path.join(imagesDir, "icon-192.png"),
    generatePng(192, 192, (x, y, width, height) =>
      logoPixel(x, y, width, height, false)
    )
  );
  writeFileSync(
    path.join(imagesDir, "icon-512.png"),
    generatePng(512, 512, (x, y, width, height) =>
      logoPixel(x, y, width, height, false)
    )
  );
  writeFileSync(
    path.join(imagesDir, "icon-maskable-512.png"),
    generatePng(512, 512, (x, y, width, height) =>
      logoPixel(x, y, width, height, true)
    )
  );
  writeFileSync(
    path.join(imagesDir, projectConfig.seo.openGraphImage.file),
    generatePng(1200, 630, (x, y, width, height) => {
      const normalizedX = x / width;
      const normalizedY = y / height;
      if (
        (normalizedX - 0.78) ** 2 + (normalizedY - 0.25) ** 2 <
        0.018
      ) {
        return [255, 180, 84, 255];
      }
      if (normalizedX > 0.08 && normalizedX < 0.42) {
        return logoPixel(
          x - 0.08 * width,
          y - 0.18 * height,
          0.5 * width,
          0.64 * height,
          false
        );
      }
      return normalizedY > 0.72
        ? [27, 40, 73, 255]
        : [56, 88, 179, 255];
    })
  );
}

function contentFingerprint() {
  const hash = createHash("sha256");
  walkFiles(docsDir)
    .filter(file => file !== "service-worker.js")
    .forEach(file => {
      hash.update(file);
      hash.update(readFileSync(path.join(docsDir, file)));
    });
  return hash.digest("hex").slice(0, 12);
}

function buildPages() {
  for (const required of [distDir, typedocDir]) {
    if (!existsSync(required) || !statSync(required).isDirectory()) {
      throw new Error(`Required generated directory is missing: ${required}`);
    }
  }
  rmSync(docsDir, { recursive: true, force: true });
  cpSync(distDir, docsDir, { recursive: true });
  cpSync(typedocDir, path.join(docsDir, "api"), { recursive: true });
  writeGeneratedImages();

  const apiDir = path.join(docsDir, "api");
  walkFiles(apiDir)
    .filter(file => file.endsWith(".html"))
    .forEach(relativeFile => {
      const file = path.join(apiDir, relativeFile);
      writeFileSync(
        file,
        transformApiHtml(readFileSync(file, "utf8"), relativeFile)
      );
    });

  const manifest = {
    name: projectConfig.pwa.name,
    short_name: projectConfig.pwa.shortName,
    description: projectConfig.pwa.description,
    start_url: projectConfig.site.basePath,
    scope: projectConfig.site.basePath,
    display: projectConfig.pwa.display,
    background_color: projectConfig.pwa.backgroundColor,
    theme_color: projectConfig.pwa.themeColor,
    icons: projectConfig.pwa.icons.map(({ file, ...icon }) => icon),
  };
  writeFileSync(
    path.join(docsDir, "manifest.webmanifest"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  writeFileSync(
    path.join(docsDir, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${projectConfig.urls.sitemap}\n`
  );
  const routes = Object.values(projectConfig.site.pages).map(page => page.url);
  writeFileSync(
    path.join(docsDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(url => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`
  );

  const staticExtensions = new Set([ ".css", ".js", ".png", ".svg" ]);
  const staticAssets = walkFiles(docsDir)
    .filter(file => staticExtensions.has(path.extname(file)))
    .map(file => `${projectConfig.site.basePath}${file.split(path.sep).join("/")}`);
  const shell = [
    ...new Set([
      projectConfig.site.basePath,
      `${projectConfig.site.basePath}playground/`,
      `${projectConfig.site.basePath}api/`,
      projectConfig.pwa.manifestUrl,
      ...staticAssets,
    ]),
  ];
  const worker = readFileSync(
    path.join(root, "site", "service-worker.js"),
    "utf8"
  )
    .replaceAll("__BASE_PATH__", projectConfig.site.basePath)
    .replaceAll("__CACHE_PREFIX__", projectConfig.pwa.cachePrefix)
    .replaceAll(
      "__CACHE_NAME__",
      `${projectConfig.pwa.cachePrefix}${contentFingerprint()}`
    )
    .replace("__APP_SHELL__", JSON.stringify(shell));
  writeFileSync(path.join(docsDir, "service-worker.js"), worker);
}

if (require.main === module) buildPages();

module.exports = {
  buildPages,
  transformApiHtml,
};
