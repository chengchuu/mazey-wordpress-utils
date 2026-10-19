"use strict";

function packageBaseName(packageName) {
  if (typeof packageName !== "string" || !packageName.trim()) {
    throw new TypeError("package.json name must be a non-empty string");
  }
  return packageName.trim().replace(/^@[^/]+\//, "");
}

function packageDetails(pkg) {
  const name = pkg.name;
  const bundleBaseName = packageBaseName(name);
  return {
    name,
    bundleBaseName,
    installCommand: `npm install ${name}`,
  };
}

function repositoryDetails(repository) {
  const rawUrl =
    typeof repository === "string" ? repository : repository && repository.url;
  if (typeof rawUrl !== "string" || !rawUrl) {
    throw new TypeError("package.json repository URL is required");
  }
  const url = rawUrl
    .replace(/^git\+/, "")
    .replace(/^git:\/\/github\.com\//, "https://github.com/")
    .replace(/\.git$/, "");
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(url)) {
    throw new TypeError(`Unsupported GitHub repository URL: ${rawUrl}`);
  }
  return { url };
}

module.exports = {
  packageBaseName,
  packageDetails,
  repositoryDetails,
};
