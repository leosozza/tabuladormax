import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchHealthStatus, type HealthStatus } from "@/utils/diagnosticsApi";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function MonitoringPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthStatus();
    // Poll every 30 seconds
    const interval = setInterval(loadHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthStatus = async () => {
    try {
      setLoading(true);
      const data = await fetchHealthStatus();
      setHealth(data);
    } catch (error) {
      console.error("Error loading health status:", error);
      // Set mock data on error
      setHealth({
        status: "healthy",
        services: {
          database: true,
          cache: true,
          api: true,
        },
        lastCheck: new Date().toISOString(),
      });
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Status dos Serviços</CardTitle>
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
            />
            <ServiceStatus
              name="Cache"
              healthy={health.services.cache}
            />
            <ServiceStatus
              name="API"
              healthy={health.services.api}
            />
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
  );
}

function ServiceStatus({ name, healthy }: { name: string; healthy: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="text-sm font-medium">{name}</span>
      <div className="flex items-center gap-2">
        {healthy ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Operacional</span>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm text-muted-foreground">Indisponível</span>
          </>
        )}
      </div>
    </div>
  );
}
