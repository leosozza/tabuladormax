import { useState } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Shield, UserCog, Database, Layers, FileText, Brain } from 'lucide-react'
import { IntegrationsPanel } from '@/components/dashboard/integrations/IntegrationsPanel'
import { UsersPanel } from '@/components/auth/UsersPanel'
import { PermissionsPanel } from '@/components/auth/PermissionsPanel'
import { BitrixSyncPanel } from '@/components/dashboard/integrations/BitrixSyncPanel'
import { ImportHistoryPanel } from '@/components/dashboard/ImportHistoryPanel'
import { AIDebugPanel } from '@/components/ai-debug/AIDebugPanel'

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('usuarios')

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, permissões, importação e sincronização com TabuladorMax
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 rounded-2xl">
            <TabsTrigger value="usuarios" className="rounded-xl">
              <UserCog className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Usuários</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="permissoes" className="rounded-xl">
              <Shield className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Permissões</span>
              <span className="sm:hidden">Perm</span>
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="rounded-xl">
              <Database className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Integrações</span>
              <span className="sm:hidden">Integ</span>
            </TabsTrigger>
            <TabsTrigger value="bitrix" className="rounded-xl">
              <Layers className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Bitrix24</span>
              <span className="sm:hidden">B24</span>
            </TabsTrigger>
            <TabsTrigger value="importacoes" className="rounded-xl">
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Importações</span>
              <span className="sm:hidden">Import</span>
            </TabsTrigger>
            <TabsTrigger value="ia-debug" className="rounded-xl">
              <Brain className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">IA Debug</span>
              <span className="sm:hidden">IA</span>
            </TabsTrigger>
          </TabsList>

          {/* Usuários */}
          <TabsContent value="usuarios" className="space-y-4">
            <UsersPanel />
          </TabsContent>

          {/* Permissões de Acesso */}
          <TabsContent value="permissoes" className="space-y-4">
            <PermissionsPanel />
          </TabsContent>

          {/* Integrações */}
          <TabsContent value="integracoes" className="space-y-4">
            <IntegrationsPanel />
          </TabsContent>

          {/* Bitrix24 */}
          <TabsContent value="bitrix" className="space-y-4">
            <BitrixSyncPanel />
          </TabsContent>

          {/* Histórico de Importações */}
          <TabsContent value="importacoes" className="space-y-4">
            <ImportHistoryPanel />
          </TabsContent>

          {/* IA de Debug */}
          <TabsContent value="ia-debug" className="space-y-4">
            <AIDebugPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
