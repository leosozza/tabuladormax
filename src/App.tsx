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
import Config from "./pages/Config";
import Logs from "./pages/Logs";
import Users from "./pages/Users";
import AgentMapping from "./pages/AgentMapping";
import Permissions from "./pages/Permissions";
import Diagnostic from "./pages/Diagnostic";
import NotFound from "./pages/NotFound";

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
          <Route path="/lead" element={<ProtectedRoute><LeadTab /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute requireSupervisor><Users /></ProtectedRoute>} />
          <Route path="/permissions" element={<ProtectedRoute requireAdmin><Permissions /></ProtectedRoute>} />
          <Route path="/config" element={<ProtectedRoute requireManager><Config /></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute requireManager><Logs /></ProtectedRoute>} />
          <Route path="/agent-mapping" element={<ProtectedRoute requireManager><AgentMapping /></ProtectedRoute>} />
          <Route path="/diagnostic" element={<ProtectedRoute requireAdmin><Diagnostic /></ProtectedRoute>} />

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
