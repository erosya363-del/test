import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { disableAppZoom } from "./disableAppZoom.ts";
import { GameStoreProvider } from "./data/GameStore.tsx";

disableAppZoom();

const iosNav = window.navigator as Navigator & { standalone?: boolean };
if (iosNav.standalone || window.matchMedia("(display-mode: standalone)").matches) {
  document.documentElement.classList.add("standalone");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GameStoreProvider>
    <App />
  </GameStoreProvider>,
);
