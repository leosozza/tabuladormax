/**
 * Painel de Problemas
 * Exibe problemas detectados e permite auto-correção
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { detectProblems, autoFixProblem, autoFixAll } from "@/lib/diagnostic/problemDetectionService";
import type { DetectedProblem, AutoFixResult } from "@/types/diagnostic";
import { useToast } from "@/hooks/use-toast";

export function ProblemsPanel() {
  const [problems, setProblems] = useState<DetectedProblem[]>([]);
  const [fixResults, setFixResults] = useState<Record<string, AutoFixResult>>({});
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const { toast } = useToast();

  const loadProblems = async () => {
    setLoading(true);
    try {
      const detected = await detectProblems();
      setProblems(detected);
    } catch (error) {
      toast({
        title: "Erro ao detectar problemas",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProblems();
    // Atualiza a cada 60 segundos
    const interval = setInterval(loadProblems, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleFixProblem = async (problem: DetectedProblem) => {
    setFixing(problem.id);
    try {
      const result = await autoFixProblem(problem);
      setFixResults(prev => ({ ...prev, [problem.id]: result }));
      
      if (result.success) {
        toast({
          title: "Problema corrigido",
          description: result.message,
        });
        // Recarrega problemas após correção
        await loadProblems();
      } else {
        toast({
          title: "Falha na correção",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao corrigir problema",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setFixing(null);
    }
  };

  const handleFixAll = async () => {
    setLoading(true);
    try {
      const results = await autoFixAll();
      const successCount = results.filter(r => r.success).length;
      
      toast({
        title: "Auto-correção concluída",
        description: `${successCount} de ${results.length} problemas foram corrigidos`,
      });
      
      await loadProblems();
    } catch (error) {
      toast({
        title: "Erro na auto-correção",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const activeProblems = problems.filter(p => !p.fixed);
  const fixedProblems = problems.filter(p => p.fixed);
  const fixableProblems = activeProblems.filter(p => p.canAutoFix);

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Problemas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{problems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Problemas Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeProblems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Problemas Corrigidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fixedProblems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Auto-Corrigíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{fixableProblems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Problemas Detectados</CardTitle>
              <CardDescription>
                Problemas encontrados no sistema e ações de correção
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadProblems}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {fixableProblems.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleFixAll}
                  disabled={loading}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Corrigir Todos ({fixableProblems.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeProblems.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Nenhum problema ativo detectado. O sistema está operando normalmente.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {activeProblems.map((problem) => {
                const fixResult = fixResults[problem.id];
                
                return (
                  <div key={problem.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{getSeverityIcon(problem.severity)}</span>
                          <h4 className="font-semibold">{problem.title}</h4>
                          <Badge variant={getSeverityColor(problem.severity)}>
                            {problem.severity}
                          </Badge>
                          {problem.canAutoFix && (
                            <Badge variant="outline">Auto-corrigível</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {problem.description}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Componente: {problem.component}</span>
                          <span>Detectado: {problem.detectedAt.toLocaleString()}</span>
                          <span>Tipo: {problem.type}</span>
                        </div>
                        
                        {fixResult && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className={`text-sm font-medium ${fixResult.success ? 'text-green-600' : 'text-red-600'}`}>
                              {fixResult.success ? '✓ ' : '✗ '}
                              {fixResult.message}
                            </p>
                            {fixResult.actions.length > 0 && (
                              <ul className="mt-2 text-xs space-y-1">
                                {fixResult.actions.map((action, i) => (
                                  <li key={i} className="text-muted-foreground">• {action}</li>
                                ))}
                              </ul>
                            )}
                            {fixResult.error && (
                              <p className="mt-2 text-xs text-red-600">Erro: {fixResult.error}</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {problem.canAutoFix && !fixResult && (
                        <Button
                          size="sm"
                          onClick={() => handleFixProblem(problem)}
                          disabled={fixing === problem.id}
                        >
                          <Wrench className={`w-4 h-4 mr-2 ${fixing === problem.id ? 'animate-spin' : ''}`} />
                          Corrigir
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problemas Corrigidos */}
      {fixedProblems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Problemas Corrigidos
            </CardTitle>
            <CardDescription>
              Problemas que foram corrigidos automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fixedProblems.map((problem) => (
                <div key={problem.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-green-900">{problem.title}</h4>
                    <p className="text-sm text-green-700">{problem.description}</p>
                    {problem.fixedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Corrigido em: {problem.fixedAt.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
