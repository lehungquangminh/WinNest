import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/renderer/App.js";
import "@/renderer/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Renderer root was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
