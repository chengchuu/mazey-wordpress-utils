const { deepFreeze } = require("mazey");
const pkg = require("./package.json");
const {
  packageDetails,
  repositoryDetails,
} = require("./scripts/project-config-utils");

const packageConfig = packageDetails(pkg);
const repository = repositoryDetails(pkg.repository);
const siteUrl = new URL(pkg.homepage);
siteUrl.pathname = siteUrl.pathname.endsWith("/")
  ? siteUrl.pathname
  : `${siteUrl.pathname}/`;
siteUrl.search = "";
siteUrl.hash = "";

const basePath = siteUrl.pathname;
const displayName = pkg.name;
const githubUrl = repository.url;
const npmUrl = `https://www.npmjs.com/package/${pkg.name}`;
const theme = {
  storageKey: `${packageConfig.bundleBaseName}-theme`,
  colorPrimary: "#3858b3",
  colorLight: "#f7f9fc",
  colorDark: "#101522",
  primary: {
    light: {
      base: "#3858b3",
      hover: "#2b448e",
      active: "#233873",
      soft: "#e7edff",
      rgb: "56, 88, 179",
      hoverRgb: "43, 68, 142",
    },
    dark: {
      base: "#9db4ff",
      hover: "#becbff",
      active: "#d5ddff",
      soft: "#222e52",
      rgb: "157, 180, 255",
      hoverRgb: "190, 203, 255",
    },
  },
};
const pages = {
  home: {
    title: `${displayName} - Browser Utilities for WordPress Markup`,
    description:
      "TypeScript utilities for adding copy buttons, lazy-loading images, adapting WordPress headers and sidebars, checking URLs, and sizing images.",
    url: siteUrl.href,
  },
  playground: {
    title: `${displayName} Playground - Try WordPress DOM Utilities`,
    description:
      "Try the mazey-wordpress-utils public API against an isolated WordPress-style DOM example, including lazy images and URL-driven sidebar behavior.",
    url: new URL("playground/", siteUrl).href,
  },
  api: {
    title: `${displayName} API Documentation`,
    description:
      "TypeScript API documentation for the public copy-button, lazy-image, header, sidebar, URL, and image-sizing utilities.",
    url: new URL("api/", siteUrl).href,
  },
};
const assets = {
  faviconFile: "logo-32x32.png",
  faviconType: "image/png",
  logoFile: "logo-192x192.png",
  appleTouchIconFile: "logo-apple-touch-180x180.png",
  openGraphImageFile: "logo-open-graph-1200x630.jpg",
};
const software = {
  "@type": "SoftwareSourceCode",
  name: displayName,
  description: pages.home.description,
  url: pages.home.url,
  codeRepository: githubUrl,
  downloadUrl: npmUrl,
  license: `${githubUrl}/blob/main/LICENSE`,
  programmingLanguage: "TypeScript",
};

module.exports = deepFreeze({
  package: packageConfig,
  repository,
  brand: {
    displayName,
    shortName: "WP Utils",
  },
  urls: {
    github: githubUrl,
    npm: npmUrl,
    license: `${githubUrl}/blob/main/LICENSE`,
    sitemap: new URL("sitemap.xml", siteUrl).href,
  },
  assets: {
    ...assets,
    faviconUrl: `${basePath}images/${assets.faviconFile}`,
    logoUrl: `${basePath}images/${assets.logoFile}`,
    appleTouchIconUrl: `${basePath}images/${assets.appleTouchIconFile}`,
  },
  assetFiles: [
    assets.faviconFile,
    assets.logoFile,
    "logo-512x512.png",
    assets.appleTouchIconFile,
    "logo-maskable-512x512.png",
    assets.openGraphImageFile,
  ],
  site: {
    url: siteUrl.href,
    basePath,
    markerPrefix: packageConfig.bundleBaseName,
    pages,
    theme,
  },
  seo: {
    software,
    openGraphImage: {
      file: assets.openGraphImageFile,
      url: new URL(`images/${assets.openGraphImageFile}`, siteUrl).href,
      width: 1200,
      height: 630,
      type: "image/jpeg",
      alt: `${displayName} browser utilities for WordPress markup.`,
    },
    rootJsonLd: {
      "@context": "https://schema.org",
      ...software,
    },
    playgroundJsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${displayName} playground`,
      description: pages.playground.description,
      url: pages.playground.url,
      isPartOf: {
        "@type": "WebSite",
        name: displayName,
        url: pages.home.url,
      },
      about: software,
    },
  },
  pwa: {
    name: `${displayName} documentation`,
    shortName: "WP Utils",
    display: "standalone",
    backgroundColor: theme.colorLight,
    themeColor: theme.colorPrimary,
    manifestUrl: `${basePath}manifest.webmanifest`,
    serviceWorkerUrl: `${basePath}service-worker.js`,
    cachePrefix: `${packageConfig.bundleBaseName}-site-`,
    description:
      "Installable project website, playground, and API documentation for mazey-wordpress-utils.",
    icons: [
      {
        file: "logo-192x192.png",
        src: `${basePath}images/logo-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        file: "logo-512x512.png",
        src: `${basePath}images/logo-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        file: "logo-maskable-512x512.png",
        src: `${basePath}images/logo-maskable-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
});
