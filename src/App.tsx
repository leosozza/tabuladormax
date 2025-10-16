import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Debug from "./pages/Debug";
import LeadTab from "./pages/LeadTab";
import Dashboard from "./pages/Dashboard";
import Config from "./pages/Config";
import Logs from "./pages/Logs";
import Users from "./pages/Users";
import AgentMapping from "./pages/AgentMapping";
import NotFound from "./pages/NotFound";
import Departments from "./pages/Departments";
import Permissions from "./pages/Permissions";
import SyncMonitor from "./pages/SyncMonitor";
import BitrixImport from "./pages/BitrixImport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Home />} />
          <Route path="/debug" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
          <Route path="/lead" element={<ProtectedRoute><LeadTab /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute requireSupervisor><Users /></ProtectedRoute>} />
          <Route path="/departments" element={<ProtectedRoute requireManager><Departments /></ProtectedRoute>} />
          <Route path="/permissions" element={<ProtectedRoute requireAdmin><Permissions /></ProtectedRoute>} />
          <Route path="/config" element={<ProtectedRoute requireManager><Config /></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute requireManager><Logs /></ProtectedRoute>} />
          <Route path="/agent-mapping" element={<ProtectedRoute requireManager><AgentMapping /></ProtectedRoute>} />
          <Route path="/sync-monitor" element={<ProtectedRoute requireAdmin><SyncMonitor /></ProtectedRoute>} />
          <Route path="/bitrix-import" element={<ProtectedRoute requireAdmin><BitrixImport /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
