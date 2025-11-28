import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./theme-overrides.css";
import { ReloadPrompt } from "@/components/pwa/ReloadPrompt";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <ReloadPrompt />
  </>
);
