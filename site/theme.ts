import { resolveThemePreference, setThemePreference } from "mazey";
import type { ResolvedTheme } from "mazey";
import { SITE_RUNTIME_CONFIG } from "./runtime-config";

function themeFromTypeDoc(value: string): ResolvedTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function initializeThemeControls(storageKey: string): () => void {
  const root = document.documentElement;
  if (root.dataset.themeControlsReady === "true") return () => undefined;

  let resolvedTheme: ResolvedTheme = resolveThemePreference(storageKey).value;

  const apply = (theme: ResolvedTheme): void => {
    resolvedTheme = theme;
    root.dataset.bsTheme = theme;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    document
      .querySelectorAll<HTMLMetaElement>(
        "meta[name=\"theme-color\"][data-theme-color]"
      )
      .forEach(meta => {
        meta.content = SITE_RUNTIME_CONFIG.themeColors[theme];
      });

    try {
      window.localStorage.setItem("tsd-theme", theme);
    } catch {
      // TypeDoc synchronization is optional when storage is unavailable.
    }

    const typeDocControl = document.getElementById("tsd-theme");
    if (
      typeDocControl instanceof HTMLSelectElement &&
      typeDocControl.value !== theme
    ) {
      typeDocControl.value = theme;
    }

    const currentTheme = theme === "light" ? "Light" : "Dark";
    const nextTheme = theme === "light" ? "dark" : "light";
    document
      .querySelectorAll<HTMLButtonElement>("[data-theme-toggle]")
      .forEach(button => {
        button.setAttribute(
          "aria-label",
          `Current theme: ${currentTheme}. Switch to ${nextTheme} theme.`
        );
        button
          .querySelectorAll<SVGElement>("[data-theme-icon]")
          .forEach(icon => {
            icon.toggleAttribute("hidden", icon.dataset.themeIcon !== theme);
          });
      });
  };

  const handleClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("[data-theme-toggle]");
    if (!button) return;

    const nextTheme: ResolvedTheme =
      resolvedTheme === "light" ? "dark" : "light";
    setThemePreference(storageKey, nextTheme);
    apply(nextTheme);
  };

  const handleChange = (event: Event): void => {
    const control = event.target;
    if (!(control instanceof HTMLSelectElement) || control.id !== "tsd-theme") {
      return;
    }
    const theme = themeFromTypeDoc(control.value);
    if (!theme) {
      apply(resolvedTheme);
      return;
    }

    setThemePreference(storageKey, theme);
    apply(theme);
  };

  root.dataset.themeControlsReady = "true";
  apply(resolvedTheme);
  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);

  return () => {
    document.removeEventListener("click", handleClick);
    document.removeEventListener("change", handleChange);
    delete root.dataset.themeControlsReady;
  };
}
