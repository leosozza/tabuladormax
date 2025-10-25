import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { triggerAutoFix, type AutoFixIssue } from "@/utils/diagnosticsApi";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AutoRepairPanel() {
  const [issues, setIssues] = useState<AutoFixIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      setLoading(true);
      // Mock data for now - will be replaced with actual API call
      const mockIssues: AutoFixIssue[] = [
        {
          id: "1",
          type: "orphaned_records",
          description: "3 registros órfãos detectados na tabela de leads",
          severity: "low",
          canAutoFix: true,
        },
        {
          id: "2",
          type: "cache_invalidation",
          description: "Cache de permissões desatualizado",
          severity: "medium",
          canAutoFix: true,
        },
        {
          id: "3",
          type: "stale_sessions",
          description: "5 sessões antigas detectadas",
          severity: "low",
          canAutoFix: true,
        },
      ];
      setIssues(mockIssues);
    } catch (error) {
      console.error("Error loading issues:", error);
      toast.error("Erro ao carregar problemas");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFix = async (issueId: string) => {
    try {
      setFixing(issueId);
      const success = await triggerAutoFix(issueId);
      
      if (success) {
        toast.success("Correção aplicada com sucesso!");
        // Remove fixed issue from list
        setIssues(issues.filter(issue => issue.id !== issueId));
      } else {
        toast.error("Falha ao aplicar correção automática");
      }
    } catch (error) {
      const err = error as Error;
      console.error("Error applying auto-fix:", err);
      toast.error("Erro ao aplicar correção: " + err.message);
    } finally {
      setFixing(null);
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Auto-Correção</CardTitle>
            <CardDescription>
              Problemas detectados que podem ser corrigidos automaticamente
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadIssues} disabled={loading}>
            <Wrench className="h-4 w-4 mr-2" />
            Verificar Novamente
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum problema detectado
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start gap-3 p-4 border rounded-lg"
              >
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getSeverityBadgeVariant(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {issue.type}
                    </span>
                  </div>
                  <p className="text-sm">{issue.description}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAutoFix(issue.id)}
                  disabled={!issue.canAutoFix || fixing === issue.id}
                >
                  {fixing === issue.id ? (
                    <>
                      <Wrench className="h-4 w-4 mr-2 animate-spin" />
                      Corrigindo...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 mr-2" />
                      Corrigir
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
