/**
 * Página de Diagnóstico do Sistema
 * Dashboard completo para monitoramento e diagnóstico
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { HealthCheckPanel } from "@/components/diagnostic/HealthCheckPanel";
import { ProblemsPanel } from "@/components/diagnostic/ProblemsPanel";
import { AlertsPanel } from "@/components/diagnostic/AlertsPanel";
import { ReportExportPanel } from "@/components/diagnostic/ReportExportPanel";

export default function Diagnostic() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Sistema de Diagnóstico
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitoramento, detecção de problemas e auto-correção
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
      </main>
    </div>
  );
}
