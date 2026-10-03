const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("node:path");
const webpack = require("webpack");
const projectConfig = require("../project.config");

const resolve = relativePath => path.resolve(__dirname, relativePath);
const pagesBase =
  process.env.GITHUB_PAGES === "true" ? projectConfig.site.basePath : "/";
const pwaEnabled =
  process.env.GITHUB_PAGES === "true" || process.env.PWA_ENABLED === "true";
const { pages, theme } = projectConfig.site;
const { openGraphImage } = projectConfig.seo;
const templateParameters = {
  DISPLAY_NAME: projectConfig.brand.displayName,
  FAVICON_URL: `${pagesBase}images/${projectConfig.assets.faviconFile}`,
  GITHUB_URL: projectConfig.urls.github,
  INSTALL_COMMAND: projectConfig.package.installCommand,
  LICENSE_URL: projectConfig.urls.license,
  LOGO_URL: `${pagesBase}images/${projectConfig.assets.logoFile}`,
  MANIFEST_URL: pwaEnabled ? projectConfig.pwa.manifestUrl : null,
  NPM_URL: projectConfig.urls.npm,
  OPEN_GRAPH_IMAGE_ALT: openGraphImage.alt,
  OPEN_GRAPH_IMAGE_HEIGHT: openGraphImage.height,
  OPEN_GRAPH_IMAGE_TYPE: openGraphImage.type,
  OPEN_GRAPH_IMAGE_URL: openGraphImage.url,
  OPEN_GRAPH_IMAGE_WIDTH: openGraphImage.width,
  PACKAGE_NAME: projectConfig.package.name,
  PLAYGROUND_DESCRIPTION: pages.playground.description,
  PLAYGROUND_JSON_LD: JSON.stringify(projectConfig.seo.playgroundJsonLd),
  PLAYGROUND_TITLE: pages.playground.title,
  PLAYGROUND_URL: pages.playground.url,
  ROOT_DESCRIPTION: pages.home.description,
  ROOT_JSON_LD: JSON.stringify(projectConfig.seo.rootJsonLd),
  ROOT_TITLE: pages.home.title,
  SITE_URL: projectConfig.site.url,
  THEME_COLOR_DARK: theme.colorDark,
  THEME_COLOR_LIGHT: theme.colorLight,
  THEME_COLOR_PRIMARY: theme.colorPrimary,
  THEME_PRIMARY_ACTIVE: theme.primary.light.active,
  THEME_PRIMARY_DARK: theme.primary.dark.base,
  THEME_PRIMARY_DARK_ACTIVE: theme.primary.dark.active,
  THEME_PRIMARY_DARK_HOVER: theme.primary.dark.hover,
  THEME_PRIMARY_DARK_HOVER_RGB: theme.primary.dark.hoverRgb,
  THEME_PRIMARY_DARK_RGB: theme.primary.dark.rgb,
  THEME_PRIMARY_DARK_SOFT: theme.primary.dark.soft,
  THEME_PRIMARY_HOVER: theme.primary.light.hover,
  THEME_PRIMARY_HOVER_RGB: theme.primary.light.hoverRgb,
  THEME_PRIMARY_RGB: theme.primary.light.rgb,
  THEME_PRIMARY_SOFT: theme.primary.light.soft,
  THEME_STORAGE_KEY: theme.storageKey,
};
const runtimeConfig = {
  installCommand: projectConfig.package.installCommand,
  packageName: projectConfig.package.name,
  themeStorageKey: theme.storageKey,
  themeColors: {
    light: theme.colorLight,
    dark: theme.colorDark,
  },
  pwa: {
    appName: projectConfig.pwa.name,
    enabled: pwaEnabled,
    scope: projectConfig.site.basePath,
    serviceWorkerUrl: projectConfig.pwa.serviceWorkerUrl,
  },
};

module.exports = {
  mode: "development",
  entry: {
    shared: [resolve("../site/shared.ts"), resolve("../images/logo.svg")],
    home: {
      import: resolve("../site/index.ts"),
      dependOn: "shared",
    },
    playground: {
      import: resolve("../playground/index.ts"),
      dependOn: "shared",
    },
    api: resolve("../site/api.ts"),
  },
  output: {
    clean: true,
    filename: "assets/[name].js",
    path: resolve("../dist-dev"),
    publicPath: pagesBase,
  },
  devServer: {
    port: 8080,
    host: "0.0.0.0",
    static: {
      directory: resolve("../dist-dev"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: resolve("../tsconfig.site.json"),
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.svg$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __SITE_RUNTIME_CONFIG__: JSON.stringify(runtimeConfig),
    }),
    new MiniCssExtractPlugin({
      filename: "assets/[name].css",
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: resolve("../site/index.html"),
      chunks: ["shared", "home"],
      inject: "body",
      templateParameters,
    }),
    new HtmlWebpackPlugin({
      filename: "playground/index.html",
      template: resolve("../playground/index.html"),
      chunks: ["shared", "playground"],
      inject: "body",
      templateParameters,
    }),
  ],
  resolve: {
    extensions: [".ts", ".js"],
  },
  performance: {
    maxAssetSize: 300000,
    maxEntrypointSize: 300000,
  },
};
