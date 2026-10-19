import {
  hideSidebar,
  isIncludeInUrl,
  setImgLazyLoadingWhenDomReady,
} from "../src";
import "./playground.css";

const form = document.querySelector<HTMLFormElement>("[data-playground-form]");
const output = document.querySelector<HTMLElement>("[data-playground-output]");
const error = document.querySelector<HTMLElement>("[data-playground-error]");
const lazyButton = document.querySelector<HTMLButtonElement>(
  "[data-lazy-images]"
);
const sidebarButton = document.querySelector<HTMLButtonElement>(
  "[data-hide-sidebar]"
);

function report(message: string): void {
  if (output) output.textContent = message;
  if (error) {
    error.hidden = true;
    error.textContent = "";
  }
}

function reportError(cause: unknown): void {
  if (!error) return;
  error.hidden = false;
  error.textContent =
    cause instanceof Error
      ? `The example could not run: ${cause.message}`
      : "The example could not run because of an unexpected error.";
}

form?.addEventListener("submit", event => {
  event.preventDefault();
  try {
    const data = new FormData(form);
    const fragment = String(data.get("fragment") || "");
    if (!fragment) throw new Error("Enter a URL fragment.");
    const included = isIncludeInUrl({ urlContainString: fragment });
    report(
      included
        ? `The current URL includes “${fragment}”.`
        : `The current URL does not include “${fragment}”.`
    );
  } catch (cause) {
    reportError(cause);
  }
});

lazyButton?.addEventListener("click", () => {
  try {
    const changed = setImgLazyLoadingWhenDomReady("[data-demo]");
    const image = document.querySelector<HTMLImageElement>("[data-demo] img");
    report(
      changed && image?.loading === "lazy"
        ? "Lazy loading is now enabled on the example image."
        : "No matching image was updated."
    );
  } catch (cause) {
    reportError(cause);
  }
});

sidebarButton?.addEventListener("click", () => {
  try {
    const hidden = hideSidebar({
      urlContainList: [ "hide_sidebar" ],
      primarySelector: "#primary",
      secondarySelector: "#secondary",
    });
    report(
      hidden
        ? "The example sidebar is hidden because the URL contains hide_sidebar."
        : "The sidebar remains visible. Add ?hide_sidebar to the URL and reload to meet the documented condition."
    );
  } catch (cause) {
    reportError(cause);
  }
});
