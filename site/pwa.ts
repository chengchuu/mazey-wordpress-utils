import { SITE_RUNTIME_CONFIG } from "./runtime-config";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let installPrompt: InstallPromptEvent | null = null;
let refreshing = false;

function setStatus(message: string): void {
  document.querySelectorAll<HTMLElement>("[data-pwa-status]").forEach(status => {
    status.textContent = message;
  });
}

function setInstallVisibility(visible: boolean): void {
  document
    .querySelectorAll<HTMLElement>("[data-pwa-install-container]")
    .forEach(container => {
      container.hidden = !visible;
    });
  document
    .querySelectorAll<HTMLButtonElement>("[data-pwa-install]")
    .forEach(button => {
      button.hidden = !visible;
    });
}

function isStandalone(): boolean {
  let standaloneDisplay = false;
  try {
    standaloneDisplay =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    // The iOS compatibility signal below remains available as a fallback.
  }
  return (
    standaloneDisplay ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function showUpdate(registration: ServiceWorkerRegistration): void {
  const notice = document.querySelector<HTMLElement>("[data-pwa-update]");
  const button = notice?.querySelector<HTMLButtonElement>(
    "[data-pwa-update-now]"
  );
  if (!notice || !button || !registration.waiting) return;
  notice.hidden = false;
  setStatus("A website update is ready.");
  button.onclick = () => {
    button.disabled = true;
    setStatus("Updating the website…");
    registration.waiting?.postMessage({ type: "SKIP_WAITING" });
  };
}

async function registerWorker(): Promise<void> {
  const { pwa } = SITE_RUNTIME_CONFIG;
  if (
    !pwa.enabled ||
    !("serviceWorker" in navigator) ||
    !(window.isSecureContext || location.hostname === "localhost") ||
    !location.pathname.startsWith(pwa.scope)
  ) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      pwa.serviceWorkerUrl,
      { scope: pwa.scope }
    );
    if (registration.waiting) showUpdate(registration);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdate(registration);
        }
      });
    });
  } catch {
    setStatus("Offline support could not be enabled in this browser.");
  }
}

export function initializePwa(): void {
  setInstallVisibility(false);
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    if (!isStandalone()) setInstallVisibility(true);
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    setInstallVisibility(false);
    setStatus(`${SITE_RUNTIME_CONFIG.pwa.appName} was installed.`);
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-pwa-install]")
    .forEach(button => {
      button.addEventListener("click", async () => {
        if (!installPrompt) {
          setStatus("Use your browser menu to install this website.");
          return;
        }
        try {
          await installPrompt.prompt();
          const choice = await installPrompt.userChoice;
          setStatus(
            choice.outcome === "accepted"
              ? "Installation was accepted."
              : "Installation was dismissed."
          );
          installPrompt = null;
          setInstallVisibility(false);
        } catch {
          setStatus("The installation prompt could not be opened.");
          installPrompt = null;
          setInstallVisibility(false);
        }
      });
    });

  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
  window.addEventListener("load", () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => void registerWorker());
    } else {
      globalThis.setTimeout(() => void registerWorker(), 0);
    }
  });
}
