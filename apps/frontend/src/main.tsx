import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

const root = document.getElementById("root") as HTMLElement;
const windowMode = new URLSearchParams(window.location.search).get("mode");

if (windowMode === "drag-preview" || windowMode === "floating-note") {
  document.documentElement.dataset.floatemCardWindow = windowMode;
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
