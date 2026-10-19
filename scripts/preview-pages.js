"use strict";

const { createReadStream, existsSync, statSync } = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const projectConfig = require("../project.config");

const docsDir = path.resolve(__dirname, "..", "docs");
const port = Number(process.env.PORT || 4173);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function resolveRequest(pathname) {
  if (!pathname.startsWith(projectConfig.site.basePath)) return null;
  const relative = decodeURIComponent(
    pathname.slice(projectConfig.site.basePath.length)
  );
  const candidate = path.resolve(docsDir, relative || "index.html");
  if (!candidate.startsWith(`${docsDir}${path.sep}`)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    return path.join(candidate, "index.html");
  }
  return candidate;
}

http
  .createServer((request, response) => {
    const file = resolveRequest(new URL(request.url || "/", "http://local").pathname);
    if (!file || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type":
        contentTypes[path.extname(file)] || "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(
      `Pages preview: http://127.0.0.1:${port}${projectConfig.site.basePath}`
    );
  });
