import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "../modules/gestao-scouter/src/contexts/AuthContext";

// Página de escolha inicial
import HomeChoice from "./pages/HomeChoice";

// ========== PÁGINAS DO TABULADOR ==========
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Debug from "./pages/Debug";
import LeadTab from "./pages/LeadTab";
import Dashboard from "./pages/Dashboard";
import Config from "./pages/Config";
import Logs from "./pages/Logs";
import Users from "./pages/Users";
import AgentMapping from "./pages/AgentMapping";
import Permissions from "./pages/Permissions";
import Diagnostic from "./pages/Diagnostic";

// ========== PÁGINAS DO GESTÃO SCOUTER (importadas do módulo) ==========
import GestaoHome from "../modules/gestao-scouter/src/pages/Dashboard";
import Scouters from "../modules/gestao-scouter/src/pages/Scouters";
import Projecao from "../modules/gestao-scouter/src/pages/Projecao";
import LeadsGestao from "../modules/gestao-scouter/src/pages/Leads";
import Pagamentos from "../modules/gestao-scouter/src/pages/Pagamentos";
import AreaDeAbordagem from "../modules/gestao-scouter/src/pages/AreaDeAbordagem";
import GestaoLogin from "../modules/gestao-scouter/src/pages/Login";
import GestaoRegister from "../modules/gestao-scouter/src/pages/Register";
import GestaoProtectedRoute from "../modules/gestao-scouter/src/components/ProtectedRoute";

// 404
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ========== PÁGINA INICIAL ========== */}
            <Route path="/" element={<HomeChoice />} />

            {/* ========== ROTAS DO TABULADOR ========== */}
            <Route path="/tabulador" element={<Home />} />
            <Route path="/tabulador/auth" element={<Auth />} />
            <Route path="/tabulador/debug" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
            <Route path="/tabulador/lead" element={<ProtectedRoute><LeadTab /></ProtectedRoute>} />
            <Route path="/tabulador/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tabulador/users" element={<ProtectedRoute requireSupervisor><Users /></ProtectedRoute>} />
            <Route path="/tabulador/permissions" element={<ProtectedRoute requireAdmin><Permissions /></ProtectedRoute>} />
            <Route path="/tabulador/config" element={<ProtectedRoute requireManager><Config /></ProtectedRoute>} />
            <Route path="/tabulador/logs" element={<ProtectedRoute requireManager><Logs /></ProtectedRoute>} />
            <Route path="/tabulador/agent-mapping" element={<ProtectedRoute requireManager><AgentMapping /></ProtectedRoute>} />
            <Route path="/tabulador/diagnostic" element={<ProtectedRoute requireAdmin><Diagnostic /></ProtectedRoute>} />

            {/* ========== ROTAS DO GESTÃO SCOUTER ========== */}
            <Route path="/scouter/login" element={<GestaoLogin />} />
            <Route path="/scouter/register" element={<GestaoRegister />} />
            <Route path="/scouter" element={<GestaoProtectedRoute><GestaoHome /></GestaoProtectedRoute>} />
            <Route path="/scouter/leads" element={<GestaoProtectedRoute><LeadsGestao /></GestaoProtectedRoute>} />
            <Route path="/scouter/scouters" element={<GestaoProtectedRoute><Scouters /></GestaoProtectedRoute>} />
            <Route path="/scouter/projecao" element={<GestaoProtectedRoute><Projecao /></GestaoProtectedRoute>} />
            <Route path="/scouter/pagamentos" element={<GestaoProtectedRoute><Pagamentos /></GestaoProtectedRoute>} />
            <Route path="/scouter/area-de-abordagem" element={<GestaoProtectedRoute><AreaDeAbordagem /></GestaoProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
