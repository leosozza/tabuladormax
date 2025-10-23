import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
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
import Permissions from "./pages/Permissions";
import Diagnostic from "./pages/Diagnostic";

const queryClient = new QueryClient();

// Este App é o Tabulador - será montado em /tabulador/*
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/debug" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
        <Route path="/lead" element={<ProtectedRoute><LeadTab /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute requireSupervisor><Users /></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute requireAdmin><Permissions /></ProtectedRoute>} />
        <Route path="/config" element={<ProtectedRoute requireManager><Config /></ProtectedRoute>} />
        <Route path="/logs" element={<ProtectedRoute requireManager><Logs /></ProtectedRoute>} />
        <Route path="/agent-mapping" element={<ProtectedRoute requireManager><AgentMapping /></ProtectedRoute>} />
        <Route path="/diagnostic" element={<ProtectedRoute requireAdmin><Diagnostic /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
