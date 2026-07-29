"use strict";

const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const projectConfig = require("../project.config");

const docsDir = path.resolve(__dirname, "..", "docs");
const failures = [];

function read(relativePath) {
  const file = path.join(docsDir, relativePath);
  if (!existsSync(file)) {
    failures.push(`Missing ${relativePath}`);
    return Buffer.alloc(0);
  }
  return readFileSync(file);
}

const manifestBuffer = read("manifest.webmanifest");
let manifest;
try {
  manifest = JSON.parse(manifestBuffer.toString("utf8"));
} catch {
  failures.push("manifest.webmanifest is not valid JSON");
}

if (manifest) {
  if (manifest.start_url !== projectConfig.site.basePath) {
    failures.push("manifest start_url does not match the Pages base path");
  }
  if (manifest.scope !== projectConfig.site.basePath) {
    failures.push("manifest scope does not match the Pages base path");
  }
  if (manifest.name !== projectConfig.pwa.name) {
    failures.push("manifest name does not match project configuration");
  }
  const requiredIcons = new Map([
    ["192x192:any", [192, 192]],
    ["512x512:any", [512, 512]],
    ["512x512:maskable", [512, 512]],
  ]);
  for (const icon of manifest.icons || []) {
    const key = `${icon.sizes}:${icon.purpose}`;
    const dimensions = requiredIcons.get(key);
    if (!dimensions) continue;
    const relativePath = icon.src.replace(projectConfig.site.basePath, "");
    const png = read(relativePath);
    if (
      png.length < 24 ||
      png.toString("ascii", 1, 4) !== "PNG" ||
      png.readUInt32BE(16) !== dimensions[0] ||
      png.readUInt32BE(20) !== dimensions[1]
    ) {
      failures.push(`${relativePath} is not the expected PNG size`);
    }
    requiredIcons.delete(key);
  }
  requiredIcons.forEach((_dimensions, key) => {
    failures.push(`manifest is missing required icon ${key}`);
  });
}

for (const page of [
  "index.html",
  "playground/index.html",
  "api/index.html",
]) {
  const html = read(page).toString("utf8");
  if (!html.includes(`href="${projectConfig.pwa.manifestUrl}"`)) {
    failures.push(`${page}: manifest link is missing`);
  }
  if (!html.includes('name="theme-color"')) {
    failures.push(`${page}: theme-color metadata is missing`);
  }
}

const worker = read("service-worker.js").toString("utf8");
try {
  new vm.Script(worker, { filename: "service-worker.js" });
} catch (error) {
  failures.push(`service-worker.js has invalid syntax: ${error.message}`);
}
if (worker.includes("__BASE_PATH__") || worker.includes("__CACHE_NAME__")) {
  failures.push("service-worker.js contains unreplaced build tokens");
}
if (!worker.includes(`const BASE_PATH = "${projectConfig.site.basePath}"`)) {
  failures.push("service-worker.js scope guard does not match the Pages base");
}
if (!worker.includes('event.data.type === "SKIP_WAITING"')) {
  failures.push("service-worker.js lacks explicit update activation handling");
}
if (!worker.includes("networkFirst(request, BASE_PATH)")) {
  failures.push("service-worker.js navigation fallback is not the precached root");
}
const shellMatch = worker.match(/const APP_SHELL = (\[[^;]+\]);/);
let appShell = [];
try {
  appShell = JSON.parse(shellMatch?.[1] || "");
} catch {
  failures.push("service-worker.js app shell is missing or invalid");
}
for (const page of [
  "index.html",
  "playground/index.html",
  "api/index.html",
]) {
  const html = read(page).toString("utf8");
  const pageUrl = new URL(page.replace(/index\.html$/, ""), projectConfig.site.url);
  const assetReferences = [
    ...html.matchAll(/(?:href|src)="([^"]+\.(?:css|js|png|svg|webmanifest))"/g),
  ].map(match => new URL(match[1], pageUrl));
  for (const asset of assetReferences) {
    if (
      asset.origin === new URL(projectConfig.site.url).origin &&
      asset.pathname.startsWith(projectConfig.site.basePath) &&
      !appShell.includes(asset.pathname)
    ) {
      failures.push(`${page}: app-shell asset is not precached: ${asset.pathname}`);
    }
  }
}

if (failures.length) {
  throw new Error(`PWA validation failed:\n- ${failures.join("\n- ")}`);
}

console.log("PWA validation passed for manifest, icons, pages, and service worker.");
