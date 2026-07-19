import React from "react";
import ReactDOM from "react-dom/client";
import { FloatingNoteApp } from "./components/floating-note/FloatingNoteApp";
import "./styles/global.css";

document.documentElement.dataset.stickitCardWindow = "floating-note";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FloatingNoteApp />
  </React.StrictMode>,
);
