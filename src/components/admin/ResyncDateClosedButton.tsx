import { Button } from "@/components/ui/button";
import { useResyncDateClosed } from "@/hooks/useResyncDateClosed";
import { RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ResyncDateClosedButton() {
  const { resync, loading, progress } = useResyncDateClosed();

  const handleResync = async () => {
    const result = await resync();
    if (result?.success) {
      console.log("Resync completed:", result);
    }
  };

  const progressPercentage = progress.iterations > 0 
    ? Math.min(100, (progress.iterations / 37) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resincronizar DATE_CLOSED</CardTitle>
        <CardDescription>
          Busca o campo DATE_CLOSED do Bitrix para leads convertidos que não têm essa informação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleResync}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processando... (Iteração {progress.iterations})
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Iniciar Resincronização
            </>
          )}
        </Button>

        {loading && (
          <div className="space-y-2">
            <Progress value={progressPercentage} />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Processados: {progress.totalProcessed} leads</p>
              <p>Atualizados: {progress.totalUpdated} leads</p>
              <p>Ignorados: {progress.totalSkipped} leads</p>
              {progress.totalErrors > 0 && (
                <p className="text-destructive">Erros: {progress.totalErrors}</p>
              )}
            </div>
          </div>
        )}

        {!loading && progress.iterations > 0 && (
          <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
            <p className="font-semibold">Última execução:</p>
            <p>Total processado: {progress.totalProcessed} leads</p>
            <p>Total atualizado: {progress.totalUpdated} leads</p>
            <p>Total ignorado: {progress.totalSkipped} leads</p>
            {progress.totalErrors > 0 && (
              <p className="text-destructive">Total de erros: {progress.totalErrors}</p>
            )}
            <p>Iterações: {progress.iterations}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
