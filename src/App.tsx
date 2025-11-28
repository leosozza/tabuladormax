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
          {/* Rota inicial - HomeChoice como padrão */}
          <Route path="/" element={<ProtectedRoute><HomeChoice /></ProtectedRoute>} />
          <Route path="/home-choice" element={<ProtectedRoute><HomeChoice /></ProtectedRoute>} />
          
          {/* Auth (pública) */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/debug" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
          
          {/* Hub Panels - Interactive sliding panels */}
          <Route path="/hub" element={<ProtectedRoute><HubPanels /></ProtectedRoute>} />
          
          {/* Telemarketing - Connected to 3D solar system planet button */}
          <Route path="/lead" element={<ProtectedRoute><LeadTab /></ProtectedRoute>} />
          <Route path="/telemarketing" element={<ProtectedRoute><LeadTab /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard-manager" element={<ProtectedRoute><DashboardManager /></ProtectedRoute>} />
          
          {/* Discador Module */}
          <Route path="/discador" element={<ProtectedRoute><DiscadorHub /></ProtectedRoute>} />
          <Route path="/discador/config" element={<ProtectedRoute requireManager><DiscadorConfig /></ProtectedRoute>} />
          <Route path="/discador/campanhas" element={<ProtectedRoute><DiscadorCampanhas /></ProtectedRoute>} />
          <Route path="/discador/enviar" element={<ProtectedRoute><DiscadorEnviarLeads /></ProtectedRoute>} />
          <Route path="/discador/metricas" element={<ProtectedRoute requireManager><DiscadorMetricas /></ProtectedRoute>} />
          
          {/* Rotas Administrativas - Connected to 3D solar system planet button */}
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

          {/* Agenciamento (Negotiations) - Connected to 3D solar system planet button */}
          <Route path="/agenciamento" element={<ProtectedRoute><Agenciamento /></ProtectedRoute>} />

          {/* Cadastro Module - Independent registration form (public access) */}
          <Route path="/cadastro" element={<CadastroFicha />} />
          <Route path="/cadastro/atualizar/:entityType/:entityId" element={<ProtectedRoute><CadastroFicha /></ProtectedRoute>} />
          <Route path="/cadastro/sucesso" element={<CadastroSucesso />} />

          {/* Pré-Cadastro Module - Public lead self-registration */}
          <Route path="/precadastro" element={<PreCadastro />} />
          <Route path="/precadastro/sucesso" element={<PreCadastroSucesso />} />

          {/* Rotas do Gestão Scouter (prefixo /scouter) - Connected to 3D solar system planet button */}
          <Route path="/scouter" element={<ProtectedRoute><GestaoHome /></ProtectedRoute>} />
          
          <Route path="/scouter/leads" element={<ProtectedRoute><GestaoLeads /></ProtectedRoute>} />
          <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
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
