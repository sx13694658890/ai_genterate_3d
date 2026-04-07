import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Leva } from "leva";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true }}>
      <Leva collapsed hidden={import.meta.env.PROD} />
      <App />
    </BrowserRouter>
  </StrictMode>
);
