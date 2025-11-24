import { useState, useEffect } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, PlayCircle, AlertTriangle, CheckCircle2, Database, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReprocessStats {
  totalLeads: number;
  processedLeads: number;
  updatedLeads: number;
  skippedLeads: number;
  errorLeads: number;
  fieldsUpdated: { [key: string]: number };
}

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
  const [reprocessStats, setReprocessStats] = useState<ReprocessStats | null>(null);
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
    setReprocessStats(null);
    setLogs([]);
    addLog('🚀 Iniciando re-processamento de leads...');

    try {
      const { data, error } = await supabase.functions.invoke('reprocess-leads-from-raw', {
        body: {
          action: 'start',
          batchSize: 100,
          filters: {
            onlyMissingFields
          }
        }
      });

      if (error) throw error;

      setReprocessStats(data);
      addLog(`✅ Re-processamento concluído!`);
      addLog(`📊 ${data.updatedLeads} leads atualizados`);
      addLog(`⏭️ ${data.skippedLeads} leads ignorados (sem mudanças)`);
      if (data.errorLeads > 0) {
        addLog(`⚠️ ${data.errorLeads} leads com erro`);
      }

      toast.success('Re-processamento concluído!');
      
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

  const getProgressPercentage = () => {
    if (!reprocessStats || reprocessStats.totalLeads === 0) return 0;
    return Math.round((reprocessStats.processedLeads / reprocessStats.totalLeads) * 100);
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
              {reprocessStats && (
                <>
                  <Progress value={getProgressPercentage()} className="w-full" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <span className="ml-2 font-semibold">{reprocessStats.totalLeads.toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Processados:</span>
                      <span className="ml-2 font-semibold">{reprocessStats.processedLeads.toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Atualizados:</span>
                      <span className="ml-2 font-semibold text-green-600">{reprocessStats.updatedLeads.toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ignorados:</span>
                      <span className="ml-2 font-semibold text-blue-600">{reprocessStats.skippedLeads.toLocaleString('pt-BR')}</span>
                    </div>
                    {reprocessStats.errorLeads > 0 && (
                      <div>
                        <span className="text-muted-foreground">Erros:</span>
                        <span className="ml-2 font-semibold text-red-600">{reprocessStats.errorLeads.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>

                  {Object.keys(reprocessStats.fieldsUpdated).length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Campos Atualizados
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(reprocessStats.fieldsUpdated).map(([field, count]) => (
                          <div key={field} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{field}:</span>
                            <Badge variant="secondary">{(count as number).toLocaleString('pt-BR')}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
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
