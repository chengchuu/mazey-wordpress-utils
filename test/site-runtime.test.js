/**
 * @jest-environment jsdom
 */

global.__SITE_RUNTIME_CONFIG__ = {
  installCommand: "npm install mazey-wordpress-utils",
  packageName: "mazey-wordpress-utils",
  themeStorageKey: "mazey-wordpress-utils-theme",
  themeColors: {
    light: "#f7f9fc",
    dark: "#101522",
  },
  pwa: {
    appName: "mazey-wordpress-utils documentation",
    enabled: false,
    scope: "/mazey-wordpress-utils/",
    serviceWorkerUrl: "/mazey-wordpress-utils/service-worker.js",
  },
};
const { initializeNavigation } = require("../site/navigation.ts");
const { initializePwa } = require("../site/pwa.ts");
const { initializeThemeControls } = require("../site/theme.ts");

const storageKey = global.__SITE_RUNTIME_CONFIG__.themeStorageKey;
let activeCleanup = null;

function mediaQuery(matches = false) {
  return {
    matches,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
}

function installMatchMedia(media) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn(() => media),
  });
}

function renderThemeControls({ count = 1, typeDoc = false } = {}) {
  document.head.innerHTML = `
    <meta name="theme-color" content="#3858b3" data-theme-color
      data-theme-color-light="#f7f9fc" data-theme-color-dark="#101522">
  `;
  const button = `
    <button type="button" data-theme-toggle
      aria-label="Current theme: Light. Switch to dark theme.">
      <svg data-theme-icon="light" aria-hidden="true" focusable="false"></svg>
      <svg data-theme-icon="dark" aria-hidden="true" focusable="false" hidden></svg>
    </button>
  `;
  document.body.innerHTML = `
    ${button.repeat(count)}
    ${
      typeDoc
        ? `<select id="tsd-theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>`
        : ""
    }
  `;
}

function initializeTheme() {
  activeCleanup = initializeThemeControls(storageKey);
  return activeCleanup;
}

function expectRenderedTheme(theme) {
  const current = theme === "light" ? "Light" : "Dark";
  const next = theme === "light" ? "dark" : "light";
  expect(document.documentElement.dataset.bsTheme).toBe(theme);
  expect(document.documentElement.dataset.theme).toBe(theme);
  expect(document.documentElement.style.colorScheme).toBe(theme);
  expect(document.documentElement.dataset.themePreference).toBeUndefined();
  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    expect(button.getAttribute("aria-label")).toBe(
      `Current theme: ${current}. Switch to ${next} theme.`
    );
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    expect(
      button
        .querySelector('[data-theme-icon="light"]')
        .hasAttribute("hidden")
    ).toBe(theme !== "light");
    expect(
      button
        .querySelector('[data-theme-icon="dark"]')
        .hasAttribute("hidden")
    ).toBe(theme !== "dark");
  });
  expect(document.querySelector('meta[name="theme-color"]').content).toBe(
    theme === "light" ? "#f7f9fc" : "#101522"
  );
}

afterEach(() => {
  activeCleanup?.();
  activeCleanup = null;
  jest.restoreAllMocks();
  document.documentElement.removeAttribute("data-bs-theme");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-preference");
  document.documentElement.removeAttribute("data-theme-controls-ready");
  document.documentElement.removeAttribute("data-nav-enhanced");
  document.documentElement.style.removeProperty("color-scheme");
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  localStorage.clear();
  history.replaceState({}, "", "/");
});

afterAll(() => {
  delete global.__SITE_RUNTIME_CONFIG__;
});

test("URL theme overrides storage without rewriting the project preference", () => {
  renderThemeControls({ count: 2, typeDoc: true });
  history.replaceState({}, "", `/?${storageKey}=dark`);
  localStorage.setItem(storageKey, "light");
  installMatchMedia(mediaQuery(false));

  initializeTheme();
  expectRenderedTheme("dark");
  expect(localStorage.getItem(storageKey)).toBe("light");
  expect(localStorage.getItem("tsd-theme")).toBe("dark");
  expect(document.querySelector("#tsd-theme").value).toBe("dark");
});

test.each([
  [false, "light"],
  [true, "dark"],
])("missing preference resolves the OS theme once", (matches, expected) => {
  renderThemeControls();
  const media = mediaQuery(matches);
  installMatchMedia(media);

  initializeTheme();
  expectRenderedTheme(expected);
  expect(localStorage.getItem(storageKey)).toBeNull();
  expect(localStorage.getItem("tsd-theme")).toBe(expected);
  expect(media.addEventListener).not.toHaveBeenCalled();

  media.matches = !matches;
  expectRenderedTheme(expected);
});

test("saved theme remains fixed and the button persists repeated toggles", () => {
  renderThemeControls();
  localStorage.setItem(storageKey, "dark");
  const media = mediaQuery(false);
  installMatchMedia(media);

  initializeTheme();
  expectRenderedTheme("dark");
  document.querySelector("[data-theme-toggle]").click();
  expectRenderedTheme("light");
  expect(localStorage.getItem(storageKey)).toBe("light");
  document.querySelector("[data-theme-toggle]").click();
  expectRenderedTheme("dark");
  expect(localStorage.getItem(storageKey)).toBe("dark");
  expect(media.addEventListener).not.toHaveBeenCalled();
});

test("invalid storage and unavailable media queries use the light fallback", () => {
  renderThemeControls();
  localStorage.setItem(storageKey, "invalid");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => {
      throw new Error("Media query unavailable");
    },
  });

  expect(() => initializeTheme()).not.toThrow();
  expectRenderedTheme("light");
  expect(localStorage.getItem(storageKey)).toBe("invalid");
});

test("failed persistence keeps the explicit theme for the current session", () => {
  renderThemeControls();
  installMatchMedia(mediaQuery(true));
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Storage unavailable", "SecurityError");
  });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage unavailable", "SecurityError");
  });

  expect(() => initializeTheme()).not.toThrow();
  expectRenderedTheme("dark");
  expect(() => document.querySelector("[data-theme-toggle]").click()).not.toThrow();
  expectRenderedTheme("light");
});

test("TypeDoc Settings synchronize without recursive change events", () => {
  renderThemeControls({ typeDoc: true });
  installMatchMedia(mediaQuery(true));
  const control = document.querySelector("#tsd-theme");
  const typeDocListener = jest.fn(() => {
    document.documentElement.dataset.theme = control.value;
    localStorage.setItem("tsd-theme", control.value);
  });
  control.addEventListener("change", typeDocListener);

  initializeTheme();
  expectRenderedTheme("dark");
  control.value = "light";
  control.dispatchEvent(new Event("change", { bubbles: true }));
  expectRenderedTheme("light");
  expect(localStorage.getItem(storageKey)).toBe("light");
  expect(typeDocListener).toHaveBeenCalledTimes(1);

  document.querySelector("[data-theme-toggle]").click();
  expectRenderedTheme("dark");
  expect(control.value).toBe("dark");
  expect(typeDocListener).toHaveBeenCalledTimes(1);
});

test("unsupported TypeDoc values restore the current concrete theme", () => {
  renderThemeControls({ typeDoc: true });
  installMatchMedia(mediaQuery(false));
  const control = document.querySelector("#tsd-theme");
  control.addEventListener("change", () => {
    document.documentElement.dataset.theme = control.value;
    localStorage.setItem("tsd-theme", control.value);
  });
  initializeTheme();

  control.append(new Option("Unsupported", "unsupported"));
  control.value = "unsupported";
  control.dispatchEvent(new Event("change", { bubbles: true }));
  expectRenderedTheme("light");
  expect(control.value).toBe("light");
  expect(localStorage.getItem("tsd-theme")).toBe("light");
  expect(localStorage.getItem(storageKey)).toBeNull();
});

test("duplicate initialization and cleanup are idempotent", () => {
  renderThemeControls();
  installMatchMedia(mediaQuery(false));
  const cleanup = initializeTheme();
  const duplicateCleanup = initializeThemeControls(storageKey);

  duplicateCleanup();
  document.querySelector("[data-theme-toggle]").click();
  expectRenderedTheme("dark");
  cleanup();
  activeCleanup = null;
  cleanup();
  document.querySelector("[data-theme-toggle]").click();
  expectRenderedTheme("dark");
});

test("mobile navigation toggles, closes on Escape, and restores focus", () => {
  document.body.innerHTML = `
    <nav data-site-navbar>
      <button type="button" aria-expanded="false" data-nav-toggle>Menu</button>
      <div data-mobile-nav><a href="#content">Content</a></div>
    </nav>
  `;
  initializeNavigation();
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-mobile-nav]");

  toggle.click();
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(menu.classList.contains("show")).toBe(true);

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(menu.classList.contains("show")).toBe(false);
  expect(document.activeElement).toBe(toggle);

  toggle.click();
  window.innerWidth = 1200;
  window.dispatchEvent(new Event("resize"));
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(menu.classList.contains("show")).toBe(false);
});

test("a rejected install prompt reports feedback and hides the consumed action", async () => {
  document.body.innerHTML = `
    <div data-pwa-install-container hidden>
      <button type="button" data-pwa-install hidden>Install</button>
    </div>
    <p data-pwa-status></p>
  `;
  initializePwa();
  const promptEvent = new Event("beforeinstallprompt");
  promptEvent.prompt = jest
    .fn()
    .mockRejectedValue(new Error("Prompt unavailable"));
  promptEvent.userChoice = Promise.resolve({ outcome: "dismissed" });
  window.dispatchEvent(promptEvent);
  const container = document.querySelector("[data-pwa-install-container]");
  const button = document.querySelector("[data-pwa-install]");

  expect(container.hidden).toBe(false);
  button.click();
  await Promise.resolve();
  await Promise.resolve();

  expect(document.querySelector("[data-pwa-status]").textContent).toBe(
    "The installation prompt could not be opened."
  );
  expect(container.hidden).toBe(true);
  expect(button.hidden).toBe(true);
});
