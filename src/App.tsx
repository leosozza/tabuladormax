import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Páginas do Tabulador
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import HomeChoice from "./pages/HomeChoice";
import Debug from "./pages/Debug";
import LeadTab from "./pages/LeadTab";
import Dashboard from "./pages/Dashboard";
import DashboardManager from "./pages/DashboardManager";
import NotFound from "./pages/NotFound";

// Páginas Administrativas
import AdminHub from "./pages/admin/AdminHub";
import Config from "./pages/admin/Config";
import Logs from "./pages/admin/Logs";
import Users from "./pages/admin/Users";
import AgentMapping from "./pages/admin/AgentMapping";
import Permissions from "./pages/admin/Permissions";
import Diagnostic from "./pages/admin/Diagnostic";
import Diagnostics from "./pages/admin/Diagnostics";
import PerformanceMonitoring from "./pages/admin/PerformanceMonitoring";
import SyncMonitor from "./pages/admin/SyncMonitor";
import UnifiedDashboard from "./pages/admin/UnifiedDashboard";

// Páginas do Gestão Scouter
import GestaoHome from "./pages/gestao/Home";
import GestaoLeads from "./pages/gestao/Leads";
import GestaoScouters from "./pages/gestao/Scouters";
import GestaoProjecao from "./pages/gestao/Projecao";
import GestaoPagamentos from "./pages/gestao/Pagamentos";
import GestaoArea from "./pages/gestao/AreaDeAbordagem";
import GestaoAnaliseLeads from "./pages/gestao/AnaliseLeads";
import GestaoRelatorios from "./pages/gestao/Relatorios";
import Install from "./pages/Install";

// Agenciamento Module
import Agenciamento from "./pages/Agenciamento";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Rota inicial - redireciona para escolha de módulo */}
          <Route path="/" element={<ProtectedRoute><HomeChoice /></ProtectedRoute>} />
          <Route path="/home-choice" element={<ProtectedRoute><HomeChoice /></ProtectedRoute>} />
          
          {/* Auth (pública) */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/install" element={<Install />} />
          <Route path="/debug" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
          
          {/* Telemarketing */}
          <Route path="/lead" element={<ProtectedRoute><LeadTab /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard-manager" element={<ProtectedRoute><DashboardManager /></ProtectedRoute>} />
          
          {/* Rotas Administrativas */}
          <Route path="/admin" element={<ProtectedRoute requireManager><AdminHub /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute requireManager><UnifiedDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireSupervisor><Users /></ProtectedRoute>} />
          <Route path="/admin/permissions" element={<ProtectedRoute requireAdmin><Permissions /></ProtectedRoute>} />
          <Route path="/admin/config" element={<ProtectedRoute requireManager><Config /></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute requireManager><Logs /></ProtectedRoute>} />
          <Route path="/admin/agent-mapping" element={<ProtectedRoute requireManager><AgentMapping /></ProtectedRoute>} />
          <Route path="/admin/diagnostic" element={<ProtectedRoute requireAdmin><Diagnostic /></ProtectedRoute>} />
          <Route path="/admin/diagnostics" element={<ProtectedRoute requireAdmin><Diagnostics /></ProtectedRoute>} />
          <Route path="/admin/monitoring" element={<ProtectedRoute requireManager><PerformanceMonitoring /></ProtectedRoute>} />
          <Route path="/admin/sync-monitor" element={<ProtectedRoute requireManager><SyncMonitor /></ProtectedRoute>} />

          {/* Agenciamento (Negotiations) */}
          <Route path="/agenciamento" element={<ProtectedRoute><Agenciamento /></ProtectedRoute>} />

          {/* Rotas do Gestão Scouter (prefixo /scouter) */}
          <Route path="/scouter" element={<ProtectedRoute><GestaoHome /></ProtectedRoute>} />
          <Route path="/scouter/leads" element={<ProtectedRoute><GestaoLeads /></ProtectedRoute>} />
          <Route path="/scouter/analise" element={<ProtectedRoute><GestaoAnaliseLeads /></ProtectedRoute>} />
          <Route path="/scouter/scouters" element={<ProtectedRoute><GestaoScouters /></ProtectedRoute>} />
          <Route path="/scouter/projecao" element={<ProtectedRoute><GestaoProjecao /></ProtectedRoute>} />
          <Route path="/scouter/pagamentos" element={<ProtectedRoute><GestaoPagamentos /></ProtectedRoute>} />
          <Route path="/scouter/area" element={<ProtectedRoute><GestaoArea /></ProtectedRoute>} />
          <Route path="/scouter/relatorios" element={<ProtectedRoute><GestaoRelatorios /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
