/**
 * @jest-environment jsdom
 */

const mediaListeners = [];
const mediaQuery = {
  matches: false,
  addEventListener: (_name, listener) => mediaListeners.push(listener),
  addListener: jest.fn(),
};

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
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: jest.fn(() => mediaQuery),
});

const { initializeNavigation } = require("../site/navigation.ts");
const { initializePwa } = require("../site/pwa.ts");
const { initializeTheme } = require("../site/theme.ts");

afterEach(() => {
  document.documentElement.removeAttribute("data-bs-theme");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-preference");
  document.documentElement.removeAttribute("data-nav-enhanced");
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  localStorage.clear();
  mediaListeners.length = 0;
});

afterAll(() => {
  delete global.__SITE_RUNTIME_CONFIG__;
});

test("theme changes keep Bootstrap and TypeDoc state synchronized", () => {
  document.head.innerHTML =
    '<meta name="theme-color" content="#3858b3" data-theme-color>';
  document.body.innerHTML = `
    <select data-theme-select>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  `;
  initializeTheme();
  const select = document.querySelector("[data-theme-select]");

  expect(document.documentElement.dataset.bsTheme).toBe("light");
  expect(document.documentElement.dataset.theme).toBe("light");
  select.value = "dark";
  select.dispatchEvent(new Event("change", { bubbles: true }));

  expect(document.documentElement.dataset.bsTheme).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("tsd-theme")).toBe("dark");
  expect(document.querySelector('meta[name="theme-color"]').content).toBe(
    "#101522"
  );
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
