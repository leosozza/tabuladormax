import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SyncStats {
  projetos: { total: number; synced: number };
  scouters: { total: number; synced: number };
}

interface EnrichStats {
  total_leads: number;
  enriched: number;
  errors: number;
}

interface SyncProgress {
  entity: 'projetos' | 'scouters';
  message: string;
}

export function BitrixSyncPanel() {
  const [syncingSpas, setSyncingSpas] = useState(false);
  const [enrichingLeads, setEnrichingLeads] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [enrichStats, setEnrichStats] = useState<EnrichStats | null>(null);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const handleSyncSpas = async () => {
    setSyncingSpas(true);
    setSyncStats(null);
    setSyncProgress(null);

    try {
      console.log('🔄 Iniciando sincronização de SPAs do Bitrix24...');
      
      setSyncProgress({ entity: 'projetos', message: 'Buscando projetos do Bitrix24...' });
      
      toast({
        title: '🔄 Sincronizando SPAs',
        description: 'Buscando todos os registros do Bitrix24 com paginação...',
      });

      const { data, error } = await supabase.functions.invoke('sync-bitrix-spas', {
        method: 'POST'
      });

      if (error) throw error;

      if (data.success) {
        setSyncStats({
          projetos: data.projetos,
          scouters: data.scouters
        });

        const timeInSeconds = (data.processing_time_ms / 1000).toFixed(1);
        const totalRecords = data.projetos.total + data.scouters.total;
        const totalSynced = data.projetos.synced + data.scouters.synced;
        
        toast({
          title: '✅ SPAs sincronizadas com sucesso',
          description: `${totalSynced} de ${totalRecords} registros em ${timeInSeconds}s\n📁 ${data.projetos.synced}/${data.projetos.total} projetos\n👤 ${data.scouters.synced}/${data.scouters.total} scouters`,
        });
      } else {
        throw new Error(data.errors?.[0]?.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('❌ Erro ao sincronizar SPAs:', error);
      toast({
        title: '❌ Erro na sincronização',
        description: error.message || 'Não foi possível sincronizar as SPAs',
        variant: 'destructive',
      });
    } finally {
      setSyncingSpas(false);
      setSyncProgress(null);
    }
  };

  const handleEnrichLeads = async () => {
    setEnrichingLeads(true);
    setEnrichStats(null);
    setEnrichProgress(0);

    try {
      console.log('🔧 Iniciando enriquecimento de leads...');
      
      toast({
        title: '🔄 Enriquecendo Leads',
        description: 'Buscando dados do Bitrix24 para todos os leads...',
      });

      // Simular progress bar baseado em tempo estimado
      const progressInterval = setInterval(() => {
        setEnrichProgress(prev => Math.min(prev + 5, 95));
      }, 1000);

      const { data, error } = await supabase.functions.invoke('enrich-leads-from-bitrix', {
        method: 'POST'
      });

      clearInterval(progressInterval);
      setEnrichProgress(100);

      if (error) throw error;

      setEnrichStats({
        total_leads: data.total_leads,
        enriched: data.enriched,
        errors: data.errors
      });

      if (data.success) {
        const timeInSeconds = (data.processing_time_ms / 1000).toFixed(1);
        toast({
          title: '✅ Leads enriquecidos com sucesso',
          description: `${data.enriched} de ${data.total_leads} leads em ${timeInSeconds}s`,
        });
      } else {
        toast({
          title: '⚠️ Enriquecimento concluído com erros',
          description: `${data.enriched} atualizados, ${data.errors} erros`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao enriquecer leads:', error);
      setEnrichProgress(0);
      toast({
        title: '❌ Erro no enriquecimento',
        description: error.message || 'Não foi possível enriquecer os leads',
        variant: 'destructive',
      });
    } finally {
      setEnrichingLeads(false);
      setTimeout(() => setEnrichProgress(0), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integração Bitrix24</h2>
        <p className="text-muted-foreground">
          Sincronize Projetos Comerciais e Scouters do Bitrix24 e enriqueça leads existentes
        </p>
      </div>

      {/* Sincronizar SPAs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sincronizar SPAs do Bitrix24
          </CardTitle>
          <CardDescription>
            Buscar e atualizar tabelas de referência de Projetos Comerciais e Scouters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSyncSpas}
            disabled={syncingSpas}
            className="w-full"
          >
            {syncingSpas ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar SPAs
              </>
            )}
          </Button>

          {syncProgress && (
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{syncProgress.message}</span>
              </div>
            </div>
          )}

          {syncStats && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Projetos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{syncStats.projetos.synced}</div>
                  <p className="text-xs text-muted-foreground">
                    de {syncStats.projetos.total} sincronizados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Scouters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{syncStats.scouters.synced}</div>
                  <p className="text-xs text-muted-foreground">
                    de {syncStats.scouters.total} sincronizados
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enriquecer Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Enriquecer Leads Existentes
          </CardTitle>
          <CardDescription>
            Buscar dados do Bitrix24 para leads com campos faltantes (scouter/projeto)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleEnrichLeads}
            disabled={enrichingLeads}
            variant="secondary"
            className="w-full"
          >
            {enrichingLeads ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enriquecendo...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Enriquecer Leads
              </>
            )}
          </Button>

          {enrichingLeads && (
            <div className="space-y-2">
              <Progress value={enrichProgress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                {enrichProgress}% concluído
              </p>
            </div>
          )}

          {enrichStats && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Enriquecidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{enrichStats.enriched}</div>
                  <p className="text-xs text-muted-foreground">
                    de {enrichStats.total_leads} processados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Erros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{enrichStats.errors}</div>
                  <p className="text-xs text-muted-foreground">leads com erro</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ Instruções de Uso</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>1. Sincronizar SPAs:</strong> Execute primeiro para carregar as tabelas de referência
            de Projetos Comerciais e Scouters do Bitrix24.
          </p>
          <p>
            <strong>2. Enriquecer Leads:</strong> Após sincronizar SPAs, use este botão para buscar
            dados faltantes nos leads existentes (campos PARENT_ID_1120 e PARENT_ID_1096).
          </p>
          <p>
            <strong>3. Sincronização Automática:</strong> Novos leads recebidos via webhook do TabuladorMax
            serão automaticamente enriquecidos usando as tabelas de referência.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
