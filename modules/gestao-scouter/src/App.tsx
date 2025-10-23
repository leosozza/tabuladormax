import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PWABadge } from "@/components/PWABadge";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlobalErrorCaptureHandler } from "@/components/ai-debug/GlobalErrorCaptureHandler";

// Lazy load page components for better code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjecaoPage = lazy(() => import("./pages/Projecao"));
const Leads = lazy(() => import("./pages/Leads"));
const Scouters = lazy(() => import("./pages/Scouters"));
const Pagamentos = lazy(() => import("./pages/Pagamentos"));
const AreaDeAbordagem = lazy(() => import("./pages/AreaDeAbordagem"));
const ConfiguracoesPage = lazy(() => import("./pages/Configuracoes"));
const SyncMonitor = lazy(() => import("./pages/SyncMonitor"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BitrixCallback = lazy(() => import("./pages/BitrixCallback"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
// TestFichas route disabled - functionality now integrated in /area-de-abordagem
// const TestFichas = lazy(() => import("./pages/TestFichas"));
// DashboardBuilder and AdvancedDashboard removed - functionality now unified in main Dashboard
// const DashboardBuilder = lazy(() => import("./pages/DashboardBuilder"));
// const AdvancedDashboard = lazy(() => import("./pages/AdvancedDashboard"));

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWABadge />
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <GlobalErrorCaptureHandler />
            <Routes>
              {/* Rotas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              {/* Rotas protegidas */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/projecao" element={<ProtectedRoute><ProjecaoPage /></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
              <Route path="/scouters" element={<ProtectedRoute><Scouters /></ProtectedRoute>} />
              <Route path="/pagamentos" element={<ProtectedRoute><Pagamentos /></ProtectedRoute>} />
              <Route path="/area-de-abordagem" element={<ProtectedRoute><AreaDeAbordagem /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><ConfiguracoesPage /></ProtectedRoute>} />
              <Route path="/sync-monitor" element={<ProtectedRoute><SyncMonitor /></ProtectedRoute>} />
              <Route path="/bitrix-callback" element={<ProtectedRoute><BitrixCallback /></ProtectedRoute>} />
              {/* TestFichas route disabled - functionality now in /area-de-abordagem */}
              {/* <Route path="/test-fichas" element={<ProtectedRoute><TestFichas /></ProtectedRoute>} /> */}
              {/* DashboardBuilder and AdvancedDashboard routes removed - functionality now unified in main Dashboard */}
              {/* <Route path="/dashboard-builder" element={<ProtectedRoute><DashboardBuilder /></ProtectedRoute>} /> */}
              {/* <Route path="/dashboard-advanced" element={<ProtectedRoute><AdvancedDashboard /></ProtectedRoute>} /> */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
