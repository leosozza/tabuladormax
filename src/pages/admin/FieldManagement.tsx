import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SupabaseBasedMappingTable } from '@/components/bitrix/SupabaseBasedMappingTable';
import { GestaoScouterFieldMappingDragDrop } from '@/components/gestao/GestaoScouterFieldMappingDragDrop';

export default function FieldManagement() {
  return (
    <AdminPageLayout
      title="Gerenciamento de Campos"
      description="Configure mapeamentos Bitrix e exibição de campos no Gestão Scouter"
    >
      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sync">🔄 Sincronização Bitrix</TabsTrigger>
          <TabsTrigger value="ui">📋 Configuração de Exibição</TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de Campos Bitrix ↔ Supabase</CardTitle>
              <CardDescription>
                Configure quais campos do Bitrix24 sincronizam com a tabela leads.
                Você também pode ocultar campos não mapeados da visualização.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SupabaseBasedMappingTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ui" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Exibição - Gestão Scouter</CardTitle>
              <CardDescription>
                Configure quais campos aparecem no módulo Gestão Scouter.
                Arraste para reordenar, clique em editar para configurar propriedades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GestaoScouterFieldMappingDragDrop />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
