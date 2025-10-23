import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ModuleRouter from "./routes/ModuleRouter";
import "./index.css";

const queryClient = new QueryClient();

/**
 * Alternative entry point that uses ModuleRouter instead of the default App
 * This enables the multi-module architecture with HomeChoice and lazy-loaded modules
 * 
 * To use this entry point:
 * 1. Update index.html to point to this file instead of main.tsx
 * 2. Or update main.tsx to import ModuleRouter instead of App
 */
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ModuleRouter />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
