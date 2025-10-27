import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchHealthStatus, type HealthStatus } from "@/utils/diagnosticsApi";
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorDetailsDialog } from "./ErrorDetailsDialog";

interface ServiceError {
  service: string;
  message: string;
  timestamp: string;
  severity: "warning" | "critical";
  suggestion?: string;
}

export function MonitoringPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errors, setErrors] = useState<ServiceError[]>([]);

  useEffect(() => {
    loadHealthStatus();
    const interval = setInterval(loadHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthStatus = async () => {
    try {
      setLoading(true);
      const data = await fetchHealthStatus();
      setHealth(data);
      
      // Detectar erros nos serviços
      const detectedErrors: ServiceError[] = [];
      
      if (!data.services.database) {
        detectedErrors.push({
          service: "Banco de Dados",
          message: "O banco de dados está inacessível ou não está respondendo às consultas. Isso pode impactar todas as funcionalidades do sistema.",
          timestamp: new Date().toISOString(),
          severity: "critical",
          suggestion: "Verifique a conexão com o Supabase e as credenciais de acesso. Certifique-se de que o serviço está online."
        });
      }
      
      if (!data.services.cache) {
        detectedErrors.push({
          service: "Sistema de Cache",
          message: "O cache está desatualizado ou inacessível. Isso pode causar lentidão no carregamento de dados.",
          timestamp: new Date().toISOString(),
          severity: "warning",
          suggestion: "Execute o comando de recarga do schema cache na página de configurações ou aguarde a atualização automática."
        });
      }
      
      if (!data.services.api) {
        detectedErrors.push({
          service: "API/Edge Functions",
          message: "As funções serverless não estão respondendo corretamente. Funcionalidades como sincronização e importação podem estar comprometidas.",
          timestamp: new Date().toISOString(),
          severity: "critical",
          suggestion: "Verifique os logs das Edge Functions no painel administrativo e reinicie os serviços se necessário."
        });
      }
      
      setErrors(detectedErrors);
    } catch (error) {
      console.error("Error loading health status:", error);
      setHealth({
        status: "healthy",
        services: {
          database: true,
          cache: true,
          api: true,
        },
        lastCheck: new Date().toISOString(),
      });
      setErrors([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500">Saudável</Badge>;
      case "warning":
        return <Badge className="bg-amber-500">Atenção</Badge>;
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const hasErrors = errors.length > 0;
  const hasCriticalErrors = errors.some(e => e.severity === "critical");

  if (loading && !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status dos Serviços</CardTitle>
          <CardDescription>Monitoramento de saúde do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={hasErrors ? "border-destructive" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Status dos Serviços
                {hasErrors && (
                  <Badge variant="destructive" className="animate-pulse">
                    {errors.length} {errors.length === 1 ? 'Erro' : 'Erros'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Monitoramento de saúde do sistema
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {health && getStatusBadge(health.status)}
              <Button
                variant="outline"
                size="icon"
                onClick={loadHealthStatus}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {health && (
            <div className="space-y-3">
              <ServiceStatus
                name="Banco de Dados"
                healthy={health.services.database}
                hasError={!health.services.database}
                onClick={() => hasErrors && setShowErrorDialog(true)}
              />
              <ServiceStatus
                name="Cache"
                healthy={health.services.cache}
                hasError={!health.services.cache}
                onClick={() => hasErrors && setShowErrorDialog(true)}
              />
              <ServiceStatus
                name="API"
                healthy={health.services.api}
                hasError={!health.services.api}
                onClick={() => hasErrors && setShowErrorDialog(true)}
              />
              
              {hasErrors && (
                <div className="pt-3 border-t mt-4">
                  <Button
                    variant={hasCriticalErrors ? "destructive" : "outline"}
                    className="w-full"
                    onClick={() => setShowErrorDialog(true)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Ver Detalhes dos Erros ({errors.length})
                  </Button>
                </div>
              )}
              
              <div className="pt-3 border-t mt-4">
                <p className="text-xs text-muted-foreground">
                  Última verificação:{" "}
                  {new Date(health.lastCheck).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ErrorDetailsDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        errors={errors}
      />
    </>
  );
}

interface ServiceStatusProps {
  name: string;
  healthy: boolean;
  hasError: boolean;
  onClick: () => void;
}

function ServiceStatus({ name, healthy, hasError, onClick }: ServiceStatusProps) {
  return (
    <div 
      className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
        hasError 
          ? 'border-destructive bg-destructive/5 cursor-pointer hover:bg-destructive/10' 
          : 'hover:bg-accent/5'
      }`}
      onClick={hasError ? onClick : undefined}
      role={hasError ? "button" : undefined}
      tabIndex={hasError ? 0 : undefined}
    >
      <span className="text-sm font-medium">{name}</span>
      <div className="flex items-center gap-2">
        {healthy ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Operacional</span>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-red-500 animate-pulse" />
            <span className="text-sm text-destructive font-medium">Indisponível</span>
            {hasError && <AlertTriangle className="h-4 w-4 text-destructive ml-1" />}
          </>
        )}
      </div>
    </div>
  );
}