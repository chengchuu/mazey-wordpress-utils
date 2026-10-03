import "bootstrap/dist/css/bootstrap.min.css";
import "./site.css";
import { initializeNavigation } from "./navigation";
import { initializePwa } from "./pwa";
import { initializeTheme } from "./theme";

initializeNavigation();
initializeTheme();
initializePwa();
