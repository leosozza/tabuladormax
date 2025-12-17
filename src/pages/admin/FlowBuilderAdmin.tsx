// ============================================
// Flow Builder Admin - Central de Automações
// ============================================

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Workflow, Zap, History } from "lucide-react";
import { FlowsTab } from "@/components/flow/admin/FlowsTab";
import { TriggersTab } from "@/components/flow/admin/TriggersTab";
import { HistoryTab } from "@/components/flow/admin/HistoryTab";

export default function FlowBuilderAdmin() {
  const [activeTab, setActiveTab] = useState("flows");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Central de Automações</h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie flows de automação com gatilhos inteligentes
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="flows" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Flows
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Gatilhos
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows">
          <FlowsTab />
        </TabsContent>

        <TabsContent value="triggers">
          <TriggersTab />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
