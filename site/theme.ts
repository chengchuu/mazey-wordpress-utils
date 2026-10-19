import { SITE_RUNTIME_CONFIG } from "./runtime-config";

type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

function getThemeQuery(): MediaQueryList | null {
  try {
    return typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  } catch {
    return null;
  }
}

const themeQuery = getThemeQuery();

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(SITE_RUNTIME_CONFIG.themeStorageKey);
    return isThemePreference(value) ? value : "system";
  } catch {
    return "system";
  }
}

function resolvedTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system"
    ? themeQuery?.matches
      ? "dark"
      : "light"
    : preference;
}

function applyTheme(preference: ThemePreference): void {
  const resolved = resolvedTheme(preference);
  document.documentElement.dataset.bsTheme = resolved;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  document
    .querySelectorAll<HTMLSelectElement>("[data-theme-select]")
    .forEach(select => {
      select.value = preference;
    });
  document
    .querySelectorAll<HTMLMetaElement>("meta[name=\"theme-color\"][data-theme-color]")
    .forEach(meta => {
      meta.content = SITE_RUNTIME_CONFIG.themeColors[resolved];
    });
  try {
    localStorage.setItem("tsd-theme", resolved === "dark" ? "dark" : "light");
  } catch {
    // TypeDoc theme synchronization is best-effort when storage is unavailable.
  }
}

export function initializeTheme(): void {
  let preference = readPreference();
  applyTheme(preference);

  document
    .querySelectorAll<HTMLSelectElement>("[data-theme-select]")
    .forEach(select => {
      select.addEventListener("change", () => {
        if (!isThemePreference(select.value)) return;
        preference = select.value;
        try {
          localStorage.setItem(
            SITE_RUNTIME_CONFIG.themeStorageKey,
            preference
          );
        } catch {
          // Applying the selected theme does not depend on persistence.
        }
        applyTheme(preference);
      });
    });

  const handleSystemThemeChange = () => {
    if (preference === "system") applyTheme(preference);
  };
  if (typeof themeQuery?.addEventListener === "function") {
    themeQuery.addEventListener("change", handleSystemThemeChange);
  } else {
    themeQuery?.addListener(handleSystemThemeChange);
  }
}
