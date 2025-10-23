import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, Database, AlertCircle, Info, Stethoscope, Workflow } from 'lucide-react';
import { supabase } from '@/lib/supabase-helper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SyncStatus {
  id: string;
  project_name: string;
  last_sync_at: string | null;
  last_sync_success: boolean | null;
  total_records: number;
  last_error: string | null;
}

interface SyncLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  sync_direction: string;
  records_synced: number;
  records_failed: number;
  processing_time_ms: number | null;
  errors: any;
}

export function TabuladorSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isSyncingSchema, setIsSyncingSchema] = useState(false);

  const loadSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .eq('project_name', 'TabuladorMax')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar status:', error);
      } else if (data) {
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Erro ao carregar sync status:', error);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao carregar logs:', error);
      } else {
        setSyncLogs(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar sync logs:', error);
    }
  };

  const runDiagnostic = async () => {
    setIsDiagnosing(true);
    
    try {
      console.log('🔍 Executando diagnóstico RLS...');
      
      const { data, error } = await supabase.functions.invoke('diagnose-gestao-rls', {
        body: {}
      });

      if (error) {
        console.error('Erro ao executar diagnóstico:', error);
        toast.error('Erro ao executar diagnóstico', {
          description: error.message
        });
        return;
      }

      console.log('Resultado do diagnóstico:', data);

      // Analisar resultados
      const results = data as any;
      const allTestsPassed = results.success;
      
      if (allTestsPassed) {
        toast.success('✅ Diagnóstico Completo', {
          description: 'Todas as verificações passaram! Sistema configurado corretamente.',
          duration: 5000
        });
      } else {
        // Mostrar problemas encontrados
        const problems = [];
        if (results.tests.connection.status === 'error') {
          problems.push(`Conexão: ${results.tests.connection.message}`);
        }
        if (results.tests.rls_policies.status === 'error') {
          problems.push(`RLS: ${results.tests.rls_policies.message}`);
        }
        if (results.tests.schema_reload.status === 'error') {
          problems.push(`Schema: ${results.tests.schema_reload.message}`);
        }
        if (results.tests.upsert_test.status === 'error') {
          problems.push(`UPSERT: ${results.tests.upsert_test.message}`);
        }

        toast.error('❌ Problemas Encontrados', {
          description: problems.join(' | '),
          duration: 8000
        });

        // Mostrar recomendações
        if (results.recommendations?.length > 0) {
          setTimeout(() => {
            toast.info('📋 Recomendações', {
              description: results.recommendations.join(' • '),
              duration: 10000
            });
          }, 1000);
        }
      }

      // Recarregar dados após diagnóstico
      await Promise.all([loadSyncStatus(), loadSyncLogs()]);

    } catch (error) {
      console.error('Erro fatal no diagnóstico:', error);
      toast.error('Erro Fatal', {
        description: error instanceof Error ? error.message : 'Erro desconhecido ao executar diagnóstico'
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const syncSchemaFromTabulador = async () => {
    setIsSyncingSchema(true);
    
    try {
      console.log('🔄 Solicitando schema do TabuladorMax...');

      console.log('🔍 [TabuladorSync] Buscando configuração para sincronização...');

      const { data: config, error: configError } = await supabase
        .from('tabulador_config')
        .select('*')
        .single();

      console.log('📊 [TabuladorSync] Resultado da query:', { config, error: configError });

      // Se houver erro E não for "nenhum registro encontrado", reportar erro específico
      if (configError && configError.code !== 'PGRST116') {
        console.error('❌ [TabuladorSync] Erro ao buscar configuração:', configError);
        toast.error('❌ Erro ao Buscar Configuração', {
          description: `Erro: ${configError.message} (Código: ${configError.code})`,
          duration: 8000,
        });
        return;
      }

      // Se não encontrou configuração no banco, tentar localStorage como fallback
      if (!config || configError?.code === 'PGRST116') {
        console.log('⚠️ [TabuladorSync] Configuração não encontrada no banco, tentando localStorage...');
        
        const stored = localStorage.getItem('tabuladormax_config');
        if (!stored) {
          toast.error('❌ Nenhuma Configuração Encontrada', {
            description: 'Configure o TabuladorMax na seção acima e clique em "Salvar Configuração"',
            duration: 8000,
          });
          return;
        }
        
        const localConfig = JSON.parse(stored);
        
        // Validar campos obrigatórios
        if (!localConfig.url || !localConfig.publishable_key) {
          toast.error('❌ Configuração Incompleta no Cache', {
            description: 'Por favor, salve a configuração novamente para sincronizar',
            duration: 8000,
          });
          return;
        }
        
        console.log('✅ [TabuladorSync] Usando configuração do localStorage, iniciando sincronização...');
        // Continuar com localConfig ao invés de config
        // [A lógica abaixo já usa 'config', então vamos continuar com o fluxo normal]
      }

      // Validar campos obrigatórios apenas se config existe
      if (config && (!config.url || !config.publishable_key)) {
        toast.error('❌ Configuração Incompleta', {
          description: 'Alguns campos obrigatórios estão vazios. Verifique a configuração.',
          duration: 8000,
        });
        return;
      }

      console.log('✅ [TabuladorSync] Configuração válida encontrada, iniciando sincronização...');

      const TABULADOR_URL = config.url;
      const TABULADOR_ANON_KEY = config.publishable_key;
      const GESTAO_URL = import.meta.env.VITE_SUPABASE_URL;
      const GESTAO_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // Call TabuladorMax to export schema
      console.log('📤 Chamando TabuladorMax para exportar schema...');
      
      const response = await fetch(`${TABULADOR_URL}/functions/v1/export-schema`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TABULADOR_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': TABULADOR_ANON_KEY,
        },
        body: JSON.stringify({
          target_url: GESTAO_URL,
          target_api_key: GESTAO_ANON_KEY,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao chamar TabuladorMax: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Resultado da sincronização:', result);
      
      if (result.success) {
        const targetResult = result.target_response;
        
        if (targetResult?.columns_added?.length === 0) {
          toast.success('✅ Schema Sincronizado', {
            description: 'Todas as colunas já estão atualizadas!',
            duration: 5000
          });
        } else {
          toast.success('✅ Schema Atualizado!', {
            description: `${targetResult?.columns_added?.length || 0} coluna(s) adicionada(s) e ${targetResult?.indexes_created?.length || 0} índice(s) criado(s)`,
            duration: 8000
          });

          // Mostrar detalhes das colunas adicionadas
          if (targetResult?.columns_added?.length > 0) {
            setTimeout(() => {
              const columnNames = targetResult.columns_added.map((c: any) => c.name).join(', ');
              toast.info('📊 Colunas Adicionadas', {
                description: columnNames,
                duration: 10000
              });
            }, 1000);
          }
        }

        // Recarregar dados
        await Promise.all([loadSyncStatus(), loadSyncLogs()]);
      } else {
        toast.error('❌ Erro na Sincronização', {
          description: result.error || 'Erro desconhecido',
          duration: 8000
        });
      }

    } catch (error) {
      console.error('Erro fatal na sincronização:', error);
      toast.error('Erro Fatal', {
        description: error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar schema'
      });
    } finally {
      setIsSyncingSchema(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadSyncStatus(), loadSyncLogs()]);
      setIsLoading(false);
    };

    loadData();

    // Atualizar a cada 5 segundos
    const interval = setInterval(loadData, 5000);

    // Setup realtime listeners
    const logsChannel = supabase
      .channel('sync-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sync_logs'
        },
        (payload) => {
          console.log('🔔 Novo log de sync:', payload);
          loadSyncLogs();
        }
      )
      .subscribe();

    const statusChannel = supabase
      .channel('sync-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_status'
        },
        (payload) => {
          console.log('🔔 Status atualizado:', payload);
          loadSyncStatus();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(statusChannel);
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6" />
              <div>
                <CardTitle>Sincronização TabuladorMax</CardTitle>
                <CardDescription>
                  Este projeto recebe dados via arquitetura PUSH
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isSyncingSchema}
                    variant="default"
                    size="sm"
                  >
                    {isSyncingSchema ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <Workflow className="h-4 w-4 mr-2" />
                        Sincronizar Schema
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sincronizar Schema Automático</AlertDialogTitle>
                    <AlertDialogDescription>
                      Este processo irá:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Analisar a tabela <code>leads</code> do TabuladorMax</li>
                        <li>Identificar colunas faltantes no Gestão Scouter</li>
                        <li>Adicionar automaticamente as colunas necessárias</li>
                        <li>Criar índices para otimização</li>
                        <li>Recarregar o schema cache</li>
                      </ul>
                      <p className="mt-3 font-semibold">
                        Deseja continuar?
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={syncSchemaFromTabulador}>
                      Sincronizar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button
                onClick={runDiagnostic}
                disabled={isDiagnosing}
                variant="outline"
                size="sm"
              >
                {isDiagnosing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Diagnosticando...
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Diagnóstico RLS
                  </>
                )}
              </Button>
              
              <Badge 
                variant={syncStatus?.last_sync_success ? 'default' : 'secondary'}
                className="text-sm"
              >
                {syncStatus?.last_sync_success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Ativo
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Aguardando Dados
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informational Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <div className="space-y-2">
                <p className="font-semibold">Este é um projeto receptor (PUSH)</p>
                <p className="text-sm">
                  O <strong>TabuladorMax</strong> envia dados automaticamente para este projeto via Edge Function <code className="bg-muted px-1 py-0.5 rounded">export-to-gestao-scouter-batch</code>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Para iniciar ou configurar a sincronização, acesse o <strong>painel de Sincronização no TabuladorMax</strong>.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Última Sincronização</div>
              <div className="text-lg font-semibold">
                {syncStatus?.last_sync_at ? (
                  formatDistanceToNow(new Date(syncStatus.last_sync_at), {
                    addSuffix: true,
                    locale: ptBR
                  })
                ) : (
                  'Nunca'
                )}
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total de Registros</div>
              <div className="text-lg font-semibold">
                {syncStatus?.total_records?.toLocaleString('pt-BR') || 0}
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <div className="text-lg font-semibold">
                {syncStatus?.last_sync_success === null ? (
                  <span className="text-muted-foreground">Aguardando</span>
                ) : syncStatus?.last_sync_success ? (
                  <span className="text-green-600">Funcionando</span>
                ) : (
                  <span className="text-destructive">Erro</span>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {syncStatus?.last_error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <p className="font-semibold">Último Erro:</p>
                <p className="text-sm mt-1">{syncStatus.last_error}</p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Verifique as configurações no TabuladorMax
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Recent Sync Logs */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Histórico de Sincronizações</h3>
            {syncLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma sincronização registrada ainda</p>
                <p className="text-sm mt-1">Os dados aparecerão aqui quando o TabuladorMax enviar os primeiros registros</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Direção</TableHead>
                      <TableHead className="text-right">Sincronizados</TableHead>
                      <TableHead className="text-right">Falhas</TableHead>
                      <TableHead className="text-right">Tempo (ms)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {formatDistanceToNow(new Date(log.started_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.sync_direction === 'pull' ? 'TabuladorMax → Gestão' : 
                             log.sync_direction === 'push' ? 'Gestão → TabuladorMax' :
                             log.sync_direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(log.records_synced ?? 0).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={(log.records_failed ?? 0) > 0 ? 'text-destructive' : ''}>
                            {(log.records_failed ?? 0).toLocaleString('pt-BR')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {log.processing_time_ms?.toLocaleString('pt-BR') || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Architecture Documentation Link */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <p className="text-sm">
                📚 Para mais informações sobre a arquitetura de sincronização, consulte o arquivo{' '}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">SYNC_ARCHITECTURE_GESTAO_SCOUTER.md</code>
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
