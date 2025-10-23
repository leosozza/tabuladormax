import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorHuntProvider } from "./contexts/ErrorHuntContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorHuntProvider>
      <App />
    </ErrorHuntProvider>
  </StrictMode>
);
