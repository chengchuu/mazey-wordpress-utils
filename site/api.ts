import "./api.css";
import { initializePwa } from "./pwa";
import { SITE_RUNTIME_CONFIG } from "./runtime-config";
import { initializeThemeControls } from "./theme";

initializeThemeControls(SITE_RUNTIME_CONFIG.themeStorageKey);
initializePwa();
