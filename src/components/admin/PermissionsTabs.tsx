import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PermissionsTabs() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="por-recurso" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="por-recurso">Por Recurso</TabsTrigger>
          <TabsTrigger value="por-pagina">Por Página</TabsTrigger>
        </TabsList>

        <TabsContent value="por-recurso" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissões Por Recurso</CardTitle>
              <CardDescription>
                Gerencie permissões organizadas por recurso do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Esta visualização permite gerenciar permissões agrupadas por recurso
                (ex: leads, usuários, relatórios).
              </div>
              {/* Placeholder for future resource-based permissions UI */}
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <p className="text-sm">
                  Interface de gerenciamento de permissões por recurso será
                  implementada aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="por-pagina" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissões Por Página</CardTitle>
              <CardDescription>
                Gerencie permissões organizadas por página/rota do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Esta visualização permite gerenciar permissões agrupadas por página ou
                rota da aplicação.
              </div>
              {/* Placeholder for future page-based permissions UI */}
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <p className="text-sm">
                  Interface de gerenciamento de permissões por página será
                  implementada aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
