/**
 * Página de Diagnóstico do Sistema
 * Dashboard completo para monitoramento e diagnóstico
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthCheckPanel } from "@/components/diagnostic/HealthCheckPanel";
import { ProblemsPanel } from "@/components/diagnostic/ProblemsPanel";
import { AlertsPanel } from "@/components/diagnostic/AlertsPanel";
import { ReportExportPanel } from "@/components/diagnostic/ReportExportPanel";
import { AdminPageLayout } from "@/components/layouts/AdminPageLayout";

export default function Diagnostic() {
  return (
    <AdminPageLayout
      title="Sistema de Diagnóstico"
      description="Monitoramento, detecção de problemas e auto-correção"
      backTo="/admin"
    >
      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="health">🏥 Saúde do Sistema</TabsTrigger>
          <TabsTrigger value="problems">⚠️ Problemas</TabsTrigger>
          <TabsTrigger value="alerts">🔔 Alertas</TabsTrigger>
          <TabsTrigger value="reports">📊 Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          <HealthCheckPanel />
        </TabsContent>

        <TabsContent value="problems" className="space-y-6">
          <ProblemsPanel />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsPanel />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportExportPanel />
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
