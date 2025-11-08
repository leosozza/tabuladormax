import { GestaoPageLayout } from '@/components/layouts/GestaoPageLayout';
import { GestaoScouterFieldMappingDragDrop } from '@/components/gestao/GestaoScouterFieldMappingDragDrop';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConfigurarCamposGestao() {
  return (
    <GestaoPageLayout
      title="Configurar Campos"
      description="Configure quais campos aparecem no dashboard e nas listas de leads"
    >
      <Tabs defaultValue="mapping" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mapping">📋 Mapeamento de Campos</TabsTrigger>
        </TabsList>

        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de Campos do Gestão Scouter</CardTitle>
              <CardDescription>
                Configure quais campos do banco de dados aparecem no Gestão Scouter.
                Arraste para reordenar, clique em editar para configurar propriedades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GestaoScouterFieldMappingDragDrop />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </GestaoPageLayout>
  );
}
