"use strict";

const { existsSync, readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");
const projectConfig = require("../project.config");

const docsDir = path.resolve(__dirname, "..", "docs");
const failures = [];

function read(relativePath) {
  const file = path.join(docsDir, relativePath);
  if (!existsSync(file)) {
    failures.push(`Missing ${relativePath}`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function count(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

function walkFiles(directory, relative = "") {
  return readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap(entry => {
      const next = path.join(relative, entry.name);
      return entry.isDirectory() ? walkFiles(directory, next) : [next];
    })
    .sort();
}

function validateThemeToggle(relativePath, html) {
  const buttons = [
    ...html.matchAll(
      /<button\b[^>]*data-theme-toggle[^>]*>[\s\S]*?<\/button>/gi
    ),
  ];
  if (buttons.length !== 1) {
    failures.push(`${relativePath}: expected exactly one navbar theme button`);
    return;
  }

  const button = buttons[0][0];
  const openingTag = button.match(/<button\b[^>]*>/i)?.[0] || "";
  if (!/\btype=["']button["']/i.test(openingTag)) {
    failures.push(`${relativePath}: theme button must use type=button`);
  }
  if (!/\bclass=["'][^"']*\btheme-toggle\b[^"']*["']/i.test(openingTag)) {
    failures.push(`${relativePath}: theme button is missing theme-toggle`);
  }
  if (
    !openingTag.includes(
      'aria-label="Current theme: Light. Switch to dark theme."'
    )
  ) {
    failures.push(`${relativePath}: theme button label is invalid`);
  }
  if (/\baria-pressed\b/i.test(openingTag)) {
    failures.push(`${relativePath}: theme button must not use aria-pressed`);
  }

  for (const theme of ["light", "dark"]) {
    const icons = [
      ...button.matchAll(
        new RegExp(
          `<svg\\b(?=[^>]*data-theme-icon=["']${theme}["'])[^>]*>`,
          "gi"
        )
      ),
    ];
    if (icons.length !== 1) {
      failures.push(`${relativePath}: expected one ${theme} theme icon`);
      continue;
    }
    const icon = icons[0][0];
    if (!/\bwidth=["']16["']/i.test(icon) || !/\bheight=["']16["']/i.test(icon)) {
      failures.push(`${relativePath}: ${theme} theme icon must be 16 by 16`);
    }
    if (!/\baria-hidden=["']true["']/i.test(icon) || !/\bfocusable=["']false["']/i.test(icon)) {
      failures.push(`${relativePath}: ${theme} theme icon must be decorative`);
    }
    const hidden = /\shidden(?:\s|=|>)/i.test(icon);
    if ((theme === "light" && hidden) || (theme === "dark" && !hidden)) {
      failures.push(`${relativePath}: ${theme} theme icon visibility is invalid`);
    }
  }

  if (/data-theme-select/i.test(html)) {
    failures.push(`${relativePath}: obsolete navbar theme selector is present`);
  }
}

function validateTypeDocThemeSelector(relativePath, html) {
  const selectors = [
    ...html.matchAll(
      /<select\b(?=[^>]*\bid=["']tsd-theme["'])[^>]*>([\s\S]*?)<\/select>/gi
    ),
  ];
  if (selectors.length !== 1) {
    failures.push(`${relativePath}: expected one native TypeDoc theme selector`);
    return;
  }
  const options = [...selectors[0][1].matchAll(
    /<option\b[^>]*value=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi
  )].map(match => [match[1], match[2].replace(/<[^>]*>/g, "").trim()]);
  if (
    JSON.stringify(options) !==
    JSON.stringify([
      ["light", "Light"],
      ["dark", "Dark"],
    ])
  ) {
    failures.push(`${relativePath}: TypeDoc themes must be Light and Dark`);
  }
}

function validatePage(relativePath, page) {
  const html = read(relativePath);
  const checks = [
    [html.includes(`<title>${page.title}</title>`), "title"],
    [/<meta name="description" content="[^"]+">?/.test(html), "description"],
    [html.includes(`<link rel="canonical" href="${page.url}"`), "canonical"],
    [html.includes('property="og:type"'), "Open Graph type"],
    [html.includes('property="og:site_name"'), "Open Graph site name"],
    [html.includes(`property="og:url" content="${page.url}"`), "Open Graph URL"],
    [html.includes('name="twitter:card"'), "Twitter card"],
    [html.includes('type="application/ld+json"'), "JSON-LD"],
    [html.includes('rel="icon"'), "favicon"],
    [html.includes('rel="manifest"'), "manifest"],
    [html.includes('name="theme-color"'), "theme color"],
    [count(html, /<h1\b/gi) === 1, "exactly one h1"],
  ];
  checks.forEach(([passed, label]) => {
    if (!passed) failures.push(`${relativePath}: missing or invalid ${label}`);
  });
}

validatePage("index.html", projectConfig.site.pages.home);
validatePage("playground/index.html", projectConfig.site.pages.playground);
validatePage("api/index.html", projectConfig.site.pages.api);
validateThemeToggle("index.html", read("index.html"));
validateThemeToggle(
  "playground/index.html",
  read("playground/index.html")
);

const apiHtmlFiles = walkFiles(path.join(docsDir, "api"))
  .filter(file => file.endsWith(".html"))
  .map(file => path.join("api", file));
const canonicalUrls = [];
for (const relativePath of apiHtmlFiles) {
  const html = read(relativePath);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) failures.push(`${relativePath}: canonical URL is missing`);
  else canonicalUrls.push(canonical);
  if (!/<title>[^<]+<\/title>/.test(html)) {
    failures.push(`${relativePath}: title is missing`);
  }
  if (!/<meta name="description" content="[^"]+">/.test(html)) {
    failures.push(`${relativePath}: description is missing`);
  }
  if (count(html, /<h1\b/gi) !== 1) {
    failures.push(`${relativePath}: expected exactly one h1`);
  }
  validateThemeToggle(relativePath, html);
  validateTypeDocThemeSelector(relativePath, html);
}
if (new Set(canonicalUrls).size !== canonicalUrls.length) {
  failures.push("API documentation contains duplicate canonical URLs");
}

const robots = read("robots.txt");
if (!robots.includes(`Sitemap: ${projectConfig.urls.sitemap}`)) {
  failures.push("robots.txt: sitemap URL is missing or incorrect");
}

const sitemap = read("sitemap.xml");
if (
  !sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>') ||
  !sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
) {
  failures.push("sitemap.xml: invalid XML header or urlset");
}
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  match => match[1]
);
const expectedLocations = Object.values(projectConfig.site.pages).map(
  page => page.url
);
if (
  locations.length !== expectedLocations.length ||
  new Set(locations).size !== locations.length ||
  expectedLocations.some(url => !locations.includes(url))
) {
  failures.push("sitemap.xml: stable canonical routes are incomplete or duplicated");
}

for (const relativePath of [
  "index.html",
  "playground/index.html",
  ...apiHtmlFiles,
]) {
  const html = read(relativePath);
  const pageRoute = relativePath.replace(/index\.html$/, "");
  const pageUrl = new URL(pageRoute, projectConfig.site.url);
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(
    match => match[1]
  );
  for (const reference of references) {
    if (
      !reference ||
      reference.startsWith("#") ||
      /^(?:data|mailto|tel|javascript):/.test(reference)
    ) {
      continue;
    }
    const target = new URL(reference, pageUrl);
    if (target.origin !== new URL(projectConfig.site.url).origin) continue;
    if (!target.pathname.startsWith(projectConfig.site.basePath)) {
      failures.push(`${relativePath}: path escapes Pages base: ${reference}`);
      continue;
    }
    let artifactPath = decodeURIComponent(
      target.pathname.slice(projectConfig.site.basePath.length)
    );
    if (!artifactPath || artifactPath.endsWith("/")) {
      artifactPath = path.join(artifactPath, "index.html");
    }
    if (!existsSync(path.join(docsDir, artifactPath))) {
      failures.push(`${relativePath}: unresolved local reference ${reference}`);
    }
  }
}

if (failures.length) {
  throw new Error(`SEO validation failed:\n- ${failures.join("\n- ")}`);
}

console.log("SEO validation passed for home, playground, API, robots, and sitemap.");
