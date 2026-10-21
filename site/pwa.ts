import { SITE_RUNTIME_CONFIG } from "./runtime-config";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let installPrompt: InstallPromptEvent | null = null;

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
    await navigator.serviceWorker.register(
      pwa.serviceWorkerUrl,
      { scope: pwa.scope }
    );
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

  window.addEventListener("load", () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => void registerWorker());
    } else {
      globalThis.setTimeout(() => void registerWorker(), 0);
    }
  });
}
