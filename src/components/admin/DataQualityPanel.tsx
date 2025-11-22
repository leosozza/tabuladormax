import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2, Database } from "lucide-react";
import { useDataQuality } from "@/hooks/useDataQuality";

export function DataQualityPanel() {
  const {
    numericScouterCount,
    isLoading,
    fixScouterNames,
    isFixing,
    fixResult,
  } = useDataQuality();

  const hasIssues = numericScouterCount && numericScouterCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Qualidade de Dados - Scouters
        </CardTitle>
        <CardDescription>
          Monitore e corrija problemas de qualidade nos dados de scouters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verificando qualidade dos dados...</span>
          </div>
        ) : hasIssues ? (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {numericScouterCount} {numericScouterCount === 1 ? 'lead com' : 'leads com'} ID numérico detectado
                {numericScouterCount !== 1 && 's'}
              </AlertTitle>
              <AlertDescription>
                Alguns leads têm IDs ao invés de nomes no campo scouter.
                O sistema pode corrigir isso automaticamente usando os dados
                da tabela bitrix_spa_entities.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={() => fixScouterNames()}
                disabled={isFixing}
                className="flex-1"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Corrigindo...
                  </>
                ) : (
                  '🔧 Corrigir Nomes de Scouters'
                )}
              </Button>
            </div>

            {fixResult && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-200">
                  Correção Concluída com Sucesso!
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  <div className="space-y-1 mt-2">
                    <p>✅ {fixResult.leadsFixed} leads corrigidos</p>
                    {fixResult.leadsNotFound > 0 && (
                      <p className="text-amber-600 dark:text-amber-400">
                        ⚠️ {fixResult.leadsNotFound} leads não encontrados no cache SPA
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-200">
              Dados de Scouters OK
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Todos os leads possuem nomes válidos de scouters. Nenhuma correção necessária.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground pt-2 border-t">
          <p className="font-medium mb-2">ℹ️ Como funciona:</p>
          <ul className="space-y-1 text-xs">
            <li>• Sistema detecta automaticamente IDs numéricos no campo scouter</li>
            <li>• Correção substitui IDs pelos nomes corretos da tabela bitrix_spa_entities</li>
            <li>• Novos leads com IDs são convertidos automaticamente via trigger</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
