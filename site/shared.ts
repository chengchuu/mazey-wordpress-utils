import "bootstrap/dist/css/bootstrap.min.css";
import "./site.css";
import { initializeNavigation } from "./navigation";
import { initializePwa } from "./pwa";
import { SITE_RUNTIME_CONFIG } from "./runtime-config";
import { initializeThemeControls } from "./theme";

initializeNavigation();
initializeThemeControls(SITE_RUNTIME_CONFIG.themeStorageKey);
initializePwa();
