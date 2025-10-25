import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReloadSchemaCache } from "@/hooks/useReloadSchemaCache";
import { toast } from "sonner";

export function PermissionsTabs() {
  const [schemaCacheValid, setSchemaCacheValid] = useState<boolean | null>(null);
  const [checkingSchema, setCheckingSchema] = useState(true);
  const { reload, loading: reloading } = useReloadSchemaCache();

  useEffect(() => {
    checkSchemaCache();
  }, []);

  const checkSchemaCache = async () => {
    try {
      setCheckingSchema(true);
      const { data, error } = await supabase.functions.invoke(
        "validate-gestao-scouter-schema",
        { method: "POST" }
      );

      if (error) throw error;

      setSchemaCacheValid(data?.valid || false);
    } catch (error: any) {
      console.error("Erro ao validar cache do schema:", error);
      toast.error("Erro ao validar cache do schema");
      setSchemaCacheValid(false);
    } finally {
      setCheckingSchema(false);
    }
  };

  const handleReloadCache = async () => {
    const success = await reload();
    if (success) {
      // Re-check schema after reload
      setTimeout(() => checkSchemaCache(), 1000);
    }
  };

  return (
    <div className="space-y-4">
      {checkingSchema && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Verificando cache do schema</AlertTitle>
          <AlertDescription>
            Validando cache do schema gestao-scouter...
          </AlertDescription>
        </Alert>
      )}

      {!checkingSchema && schemaCacheValid === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cache do Schema Inválido</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              O cache do schema gestao-scouter está ausente ou inválido. Clique no
              botão para recarregar.
            </span>
            <Button
              onClick={handleReloadCache}
              disabled={reloading}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${reloading ? "animate-spin" : ""}`} />
              Recarregar Schema Cache
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
