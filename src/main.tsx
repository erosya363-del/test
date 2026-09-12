import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { disableAppZoom } from "./disableAppZoom.ts";

disableAppZoom();

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
