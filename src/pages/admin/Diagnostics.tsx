/**
 * Unified Admin Diagnostics & Monitoring Page
 * Comprehensive dashboard for system diagnostics, monitoring, and auto-repair
 */

import { LiveMetrics } from "@/components/admin/Diagnostics/LiveMetrics";
import { PerformanceChart } from "@/components/admin/Diagnostics/PerformanceChart";
import { LogsPanel } from "@/components/admin/Diagnostics/LogsPanel";
import { AutoRepairPanel } from "@/components/admin/Diagnostics/AutoRepairPanel";
import { MonitoringPanel } from "@/components/admin/Diagnostics/MonitoringPanel";
import { AdminPageLayout } from "@/components/layouts/AdminPageLayout";

export default function Diagnostics() {
  return (
    <AdminPageLayout
      title="Diagnósticos & Monitoramento"
      description="Painel unificado para diagnóstico, monitoramento em tempo real e auto-correção"
      backTo="/admin"
    >
      <div className="space-y-6">
        {/* Live Metrics Cards */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Métricas em Tempo Real</h2>
          <LiveMetrics />
        </section>

        {/* Performance Chart and Monitoring */}
        <section className="grid gap-6 md:grid-cols-2">
          <PerformanceChart />
          <MonitoringPanel />
        </section>

        {/* Auto Repair Panel */}
        <section>
          <AutoRepairPanel />
        </section>

        {/* Logs Panel */}
        <section>
          <LogsPanel />
        </section>
      </div>
    </AdminPageLayout>
  );
}
