import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AppLayout } from "@/components/layouts/AppLayout";

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
import BitrixIntegration from "./pages/admin/BitrixIntegration";
import LeadResync from "./pages/admin/LeadResync";
import CsvImport from "./pages/admin/CsvImport";
import LeadsReprocess from "./pages/admin/LeadsReprocess";
import SyncErrors from "./pages/admin/SyncErrors";

import FieldManagement from "./pages/admin/FieldManagement";
import TemplateManagement from "./pages/admin/TemplateManagement";
import AITraining from './pages/admin/AITraining';
import StageMappings from './pages/admin/StageMappings';
import AppReleases from './pages/admin/AppReleases';

// Páginas do Gestão Scouter
import GestaoHome from "./pages/gestao/Home";
import GestaoLeads from "./pages/gestao/Leads";
import GestaoScouters from "./pages/gestao/Scouters";
import GestaoProjecao from "./pages/gestao/Projecao";
import GestaoPagamentos from "./pages/gestao/Pagamentos";
import GestaoArea from "./pages/gestao/AreaDeAbordagem";
import GestaoRelatorios from "./pages/gestao/Relatorios";
import WhatsApp from "./pages/WhatsApp";

// Agenciamento Module
import Agenciamento from "./pages/Agenciamento";

// Cadastro Module
import CadastroFicha from "./pages/cadastro/CadastroFicha";
import CadastroSucesso from "./pages/cadastro/CadastroSucesso";

// Pré-Cadastro Module
import PreCadastro from "./pages/precadastro/PreCadastro";
import PreCadastroSucesso from "./pages/precadastro/PreCadastroSucesso";

// Hub Panels
import HubPanels from "./pages/HubPanels";
import "@/styles/hub.css";

// Roadmap
import Roadmap from "./pages/Roadmap";
import Processos from "./pages/docs/Processos";

// Discador Module
import DiscadorHub from "./pages/discador/DiscadorHub";
import DiscadorConfig from "./pages/discador/DiscadorConfig";
import DiscadorCampanhas from "./pages/discador/DiscadorCampanhas";
import DiscadorEnviarLeads from "./pages/discador/DiscadorEnviarLeads";
import DiscadorMetricas from "./pages/discador/DiscadorMetricas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Rotas PÚBLICAS - sem sidebar */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/cadastro" element={<CadastroFicha />} />
          <Route path="/cadastro/sucesso" element={<CadastroSucesso />} />
          <Route path="/precadastro" element={<PreCadastro />} />
          <Route path="/precadastro/sucesso" element={<PreCadastroSucesso />} />

          {/* Rotas PROTEGIDAS - com sidebar persistente */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            {/* Home */}
            <Route path="/" element={<HomeChoice />} />
            <Route path="/home-choice" element={<HomeChoice />} />
            <Route path="/debug" element={<Debug />} />
            
            {/* Hub Panels */}
            <Route path="/hub" element={<HubPanels />} />
            
            {/* Telemarketing */}
            <Route path="/lead" element={<ProtectedRoute checkRoutePermission><LeadTab /></ProtectedRoute>} />
            <Route path="/telemarketing" element={<ProtectedRoute checkRoutePermission><LeadTab /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute checkRoutePermission><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard-manager" element={<DashboardManager />} />
            
            {/* Discador Module */}
            <Route path="/discador" element={<DiscadorHub />} />
            <Route path="/discador/config" element={<ProtectedRoute requireManager><DiscadorConfig /></ProtectedRoute>} />
            <Route path="/discador/campanhas" element={<DiscadorCampanhas />} />
            <Route path="/discador/enviar" element={<DiscadorEnviarLeads />} />
            <Route path="/discador/metricas" element={<ProtectedRoute requireManager><DiscadorMetricas /></ProtectedRoute>} />
            
            {/* Rotas Administrativas */}
            <Route path="/admin" element={<ProtectedRoute requireSupervisor><AdminHub /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute requireManager><UnifiedDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireSupervisor><Users /></ProtectedRoute>} />
            <Route path="/admin/permissions" element={<ProtectedRoute requireAdmin><Permissions /></ProtectedRoute>} />
            <Route path="/admin/config" element={<ProtectedRoute requireManager><Config /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute requireManager><Logs /></ProtectedRoute>} />
            <Route path="/admin/agent-mapping" element={<ProtectedRoute requireSupervisor><AgentMapping /></ProtectedRoute>} />
            <Route path="/admin/diagnostic" element={<ProtectedRoute requireAdmin><Diagnostic /></ProtectedRoute>} />
            <Route path="/admin/diagnostics" element={<ProtectedRoute requireAdmin><Diagnostics /></ProtectedRoute>} />
            <Route path="/admin/monitoring" element={<ProtectedRoute requireManager><PerformanceMonitoring /></ProtectedRoute>} />
            <Route path="/admin/sync-monitor" element={<ProtectedRoute requireManager><SyncMonitor /></ProtectedRoute>} />
            <Route path="/admin/bitrix-integration" element={<ProtectedRoute requireManager><BitrixIntegration /></ProtectedRoute>} />
            <Route path="/admin/lead-resync" element={<ProtectedRoute requireManager><LeadResync /></ProtectedRoute>} />
            <Route path="/admin/csv-import" element={<ProtectedRoute requireAdmin><CsvImport /></ProtectedRoute>} />
            <Route path="/admin/leads-reprocess" element={<ProtectedRoute requireManager><LeadsReprocess /></ProtectedRoute>} />
            <Route path="/admin/sync-errors" element={<ProtectedRoute requireManager><SyncErrors /></ProtectedRoute>} />
            <Route path="/admin/field-management" element={<ProtectedRoute requireManager><FieldManagement /></ProtectedRoute>} />
            <Route path="/admin/template-management" element={<ProtectedRoute requireManager><TemplateManagement /></ProtectedRoute>} />
            <Route path="/admin/ai-training" element={<ProtectedRoute requireAdmin><AITraining /></ProtectedRoute>} />
            <Route path="/admin/stage-mappings" element={<ProtectedRoute requireManager><StageMappings /></ProtectedRoute>} />
            <Route path="/admin/app-releases" element={<ProtectedRoute requireAdmin><AppReleases /></ProtectedRoute>} />

            {/* Agenciamento */}
            <Route path="/agenciamento" element={<Agenciamento />} />

            {/* Cadastro protegido */}
            <Route path="/cadastro/atualizar/:entityType/:entityId" element={<CadastroFicha />} />

            {/* Gestão Scouter */}
            <Route path="/scouter" element={<GestaoHome />} />
            <Route path="/scouter/leads" element={<GestaoLeads />} />
            <Route path="/whatsapp" element={<ProtectedRoute checkRoutePermission><WhatsApp /></ProtectedRoute>} />
            <Route path="/scouter/scouters" element={<GestaoScouters />} />
            <Route path="/scouter/projecao" element={<GestaoProjecao />} />
            <Route path="/scouter/pagamentos" element={<GestaoPagamentos />} />
            <Route path="/scouter/area" element={<GestaoArea />} />
            <Route path="/scouter/relatorios" element={<GestaoRelatorios />} />

            {/* Roadmap & Docs */}
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/docs/processos" element={<Processos />} />

            {/* Redirects */}
            <Route path="/users" element={<Navigate to="/admin/users" replace />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
