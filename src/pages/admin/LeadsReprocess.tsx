import { useState, useEffect } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, PlayCircle, AlertTriangle, CheckCircle2, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticStats {
  totalLeadsWithRaw: number;
  leadsWithNullScouter: number;
  leadsWithNullFonte: number;
  leadsWithNullEtapa: number;
  leadsWithNullProject: number;
  leadsNeedingUpdate: number;
}

export default function LeadsReprocess() {
  const [loading, setLoading] = useState(false);
  const [diagnosticStats, setDiagnosticStats] = useState<DiagnosticStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Filtros
  const [onlyMissingFields, setOnlyMissingFields] = useState(true);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reprocess-leads-from-raw', {
        body: { action: 'stats' }
      });

      if (error) throw error;

      setDiagnosticStats(data);
      addLog(`✅ Diagnóstico carregado: ${data.leadsNeedingUpdate} leads precisam de atualização`);
    } catch (error) {
      console.error('Erro ao carregar diagnóstico:', error);
      toast.error('Erro ao carregar diagnóstico');
      addLog(`❌ Erro ao carregar diagnóstico: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const startReprocessing = async () => {
    if (!diagnosticStats?.leadsNeedingUpdate) {
      toast.info('Não há leads para re-processar');
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    addLog('🚀 Iniciando re-processamento instantâneo de TODOS os leads...');

    try {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('reprocess-leads-from-raw', {
        body: {
          action: 'start',
          filters: {
            onlyMissingFields
          }
        }
      });

      if (error) throw error;

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      addLog(`✅ Re-processamento concluído em ${duration}s!`);
      addLog(`📊 ${data.updated_count?.toLocaleString('pt-BR') || 0} leads atualizados`);

      toast.success(`${data.updated_count?.toLocaleString('pt-BR') || 0} leads re-processados em ${duration}s!`);
      
      // Recarregar diagnóstico
      await loadDiagnostics();
    } catch (error) {
      console.error('Erro ao re-processar leads:', error);
      toast.error('Erro ao re-processar leads');
      addLog(`❌ Erro: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };


  return (
    <AdminPageLayout 
      title="Re-processar Leads Históricos"
      description="Re-processar leads históricos extraindo dados do campo 'raw' usando os mapeamentos ativos"
    >
      <div className="space-y-6">
        {/* Diagnóstico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Diagnóstico
            </CardTitle>
            <CardDescription>
              Análise dos leads que precisam de re-processamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de leads com raw</span>
                <Badge variant="secondary">
                  {loading ? '...' : diagnosticStats?.totalLeadsWithRaw.toLocaleString('pt-BR')}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Leads sem scouter <span className="text-xs text-muted-foreground">(apenas Scouters/CALL)</span></span>
                  <Badge variant="outline">
                    {loading ? '...' : diagnosticStats?.leadsWithNullScouter.toLocaleString('pt-BR')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Leads sem fonte</span>
                  <Badge variant="outline">
                    {loading ? '...' : diagnosticStats?.leadsWithNullFonte.toLocaleString('pt-BR')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Leads sem etapa</span>
                  <Badge variant="outline">
                    {loading ? '...' : diagnosticStats?.leadsWithNullEtapa.toLocaleString('pt-BR')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Leads sem projeto</span>
                  <Badge variant="outline">
                    {loading ? '...' : diagnosticStats?.leadsWithNullProject.toLocaleString('pt-BR')}
                  </Badge>
                </div>
              </div>

              {diagnosticStats && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{diagnosticStats.leadsNeedingUpdate.toLocaleString('pt-BR')} leads</strong> precisam de atualização
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={loadDiagnostics} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar Diagnóstico
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>
              Opções de re-processamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="only-missing">Apenas leads com campos faltando</Label>
                <p className="text-sm text-muted-foreground">
                  Re-processar apenas leads com scouter, fonte, etapa ou projeto NULL
                </p>
              </div>
              <Switch
                id="only-missing"
                checked={onlyMissingFields}
                onCheckedChange={setOnlyMissingFields}
                disabled={isProcessing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ação */}
        <Card>
          <CardHeader>
            <CardTitle>Re-processar Leads</CardTitle>
            <CardDescription>
              Iniciar o processo de re-sincronização em massa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.length > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {logs[logs.length - 1].split('] ')[1]}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={startReprocessing}
                disabled={isProcessing || loading || !diagnosticStats?.leadsNeedingUpdate}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Iniciar Re-processamento
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPageLayout>
  );
}
