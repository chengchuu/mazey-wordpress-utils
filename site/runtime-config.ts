export interface SiteRuntimeConfig {
  installCommand: string;
  packageName: string;
  themeStorageKey: string;
  themeColors: {
    light: string;
    dark: string;
  };
  pwa: {
    appName: string;
    enabled: boolean;
    scope: string;
    serviceWorkerUrl: string;
  };
}

declare const __SITE_RUNTIME_CONFIG__: SiteRuntimeConfig;

export const SITE_RUNTIME_CONFIG = __SITE_RUNTIME_CONFIG__;
