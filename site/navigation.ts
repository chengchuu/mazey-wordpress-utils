export function initializeNavigation(): void {
  document.documentElement.dataset.navEnhanced = "true";
  document.querySelectorAll<HTMLElement>("[data-site-navbar]").forEach(navbar => {
    const toggle = navbar.querySelector<HTMLButtonElement>("[data-nav-toggle]");
    const menu = navbar.querySelector<HTMLElement>("[data-mobile-nav]");
    if (!toggle || !menu) return;

    const setExpanded = (expanded: boolean) => {
      toggle.setAttribute("aria-expanded", String(expanded));
      menu.classList.toggle("show", expanded);
    };

    toggle.addEventListener("click", () => {
      setExpanded(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest("a")) {
        setExpanded(false);
      }
    });
    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        toggle.getAttribute("aria-expanded") === "true"
      ) {
        setExpanded(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1200) setExpanded(false);
    });
  });
}
