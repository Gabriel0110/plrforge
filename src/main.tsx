import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GameAssetProvider } from "./lib/assets";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameAssetProvider>
      <App />
    </GameAssetProvider>
  </StrictMode>,
);
