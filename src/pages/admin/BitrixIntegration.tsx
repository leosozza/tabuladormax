import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Download, AlertTriangle, CheckCircle2, TrendingUp, Activity, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SupabaseBasedMappingTable } from '@/components/bitrix/SupabaseBasedMappingTable';
import { FieldComparison } from '@/components/bitrix/FieldComparison';
import { SyncTestPanel } from '@/components/bitrix/SyncTestPanel';
import { BitrixFieldMappingDragDrop } from '@/components/bitrix/BitrixFieldMappingDragDrop';
import { MappingPreview } from '@/components/bitrix/MappingPreview';

export default function BitrixIntegration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mappings, setMappings] = useState<any[]>([]);
  const [bitrixFields, setBitrixFields] = useState<any[]>([]);
  const [supabaseFields, setSupabaseFields] = useState<any[]>([]);
  const [syncConfig, setSyncConfig] = useState<any>(null);
  const [fixingProjects, setFixingProjects] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);
  const [stats, setStats] = useState({
    totalMappings: 0,
    activeMappings: 0,
    withTransform: 0,
    unmappedBitrix: 0,
    unmappedSupabase: 0
  });

  const loadData = async () => {
    try {
      // Carregar mapeamentos (apenas ativos) da tabela unificada
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('unified_field_config')
        .select('*')
        .eq('sync_active', true)
        .order('supabase_field', { ascending: true })
        .order('sync_priority', { ascending: true });

      if (mappingsError) throw mappingsError;
      setMappings(mappingsData || []);

      // Carregar campos do Bitrix
      const { data: bitrixData, error: bitrixError } = await supabase.functions.invoke('get-bitrix-fields');
      
      if (bitrixError) throw bitrixError;
      setBitrixFields(bitrixData?.fields || []);

      // Carregar campos do Supabase (tabela leads)
      const { data: supabaseData, error: supabaseError } = await supabase
        .rpc('get_leads_schema');

      if (supabaseError) throw supabaseError;
      setSupabaseFields(supabaseData || []);

      // Carregar configuração de sincronização
      const { data: configData } = await supabase
        .from('bitrix_sync_config')
        .select('*')
        .eq('active', true)
        .maybeSingle();

      setSyncConfig(configData);

      // Calcular estatísticas
      const activeMappings = mappingsData?.filter((m: any) => m.sync_active) || [];
      const mappedBitrixFields = new Set(activeMappings.map((m: any) => m.bitrix_field).filter(Boolean));
      const mappedSupabaseFields = new Set(activeMappings.map((m: any) => m.supabase_field));

      setStats({
        totalMappings: mappingsData?.length || 0,
        activeMappings: activeMappings.length,
        withTransform: activeMappings.filter((m: any) => m.transform_function).length,
        unmappedBitrix: (bitrixData?.fields?.length || 0) - mappedBitrixFields.size,
        unmappedSupabase: (supabaseData?.length || 0) - mappedSupabaseFields.size
      });

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados da integração');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Dados atualizados');
  };

  const handleImportFields = async () => {
    try {
      setRefreshing(true);
      
      // Forçar reload dos campos do Bitrix com force_refresh
      const { data, error } = await supabase.functions.invoke('get-bitrix-fields', {
        body: { force_refresh: true }
      });
      
      if (error) throw error;
      
      setBitrixFields(data?.fields || []);
      toast.success(`${data?.fields?.length || 0} campos atualizados do Bitrix`);
      
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar campos:', error);
      toast.error('Erro ao atualizar campos do Bitrix');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncSpaEntities = async () => {
    try {
      setRefreshing(true);
      toast.info('Sincronizando entidades SPA (Scouters, Projetos, Telemarketing)...');
      
      const { data, error } = await supabase.functions.invoke('sync-bitrix-spa-entities');
      
      if (error) throw error;
      
      toast.success(data?.message || 'Entidades SPA sincronizadas com sucesso');
      
      if (data?.errors && data.errors.length > 0) {
        console.warn('Erros na sincronização:', data.errors);
        toast.warning(`${data.errors.length} erro(s) encontrado(s). Verifique o console.`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar entidades SPA:', error);
      toast.error('Erro ao sincronizar entidades SPA');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFixCommercialProjects = async () => {
    setFixingProjects(true);
    setFixResult(null);
    
    try {
      toast.info('🔧 Iniciando correção de projetos comerciais...');
      
      const { data, error } = await supabase.functions.invoke(
        'fix-commercial-project-ids',
        { method: 'POST' }
      );

      if (error) throw error;

      if (data?.success) {
        setFixResult(data);
        toast.success(`✅ Correção concluída! ${data.fixed} leads atualizados`);
      } else {
        throw new Error(data?.error || 'Falha ao executar correção');
      }
    } catch (error: any) {
      console.error('❌ Erro ao corrigir projetos:', error);
      toast.error(error.message || 'Erro ao executar correção de projetos');
    } finally {
      setFixingProjects(false);
    }
  };

  return (
    <AdminPageLayout
      title="Central de Integração Bitrix ↔ Supabase"
      description="Configure e monitore a sincronização de campos entre sistemas"
      backTo="/admin"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/sync-monitor')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Central de Sincronização
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportFields}
            disabled={refreshing}
          >
            <Download className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar Campos Bitrix
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncSpaEntities}
            disabled={refreshing}
          >
            <Activity className="w-4 h-4 mr-2" />
            Sincronizar SPAs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      }
    >
      {/* Estatísticas */}
      <div className="grid md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Mapeamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalMappings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Configurados no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.activeMappings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em uso na sincronização
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Com Transformação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.withTransform}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aplicando conversão de tipo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Bitrix Não Mapeado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.unmappedBitrix}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Campos sem mapeamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Supabase Não Mapeado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.unmappedSupabase}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Colunas sem mapeamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="mappings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mappings">
            Mapeamentos ({stats.activeMappings})
          </TabsTrigger>
          <TabsTrigger value="fields">
            Campos Disponíveis
          </TabsTrigger>
          <TabsTrigger value="analysis">
            Análise
          </TabsTrigger>
          <TabsTrigger value="tools">
            Ferramentas
          </TabsTrigger>
          <TabsTrigger value="test">
            Testes
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Mapeamentos */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de Campos</CardTitle>
              <CardDescription>
                Configure como os campos são sincronizados entre Bitrix e Supabase
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando mapeamentos...
                </div>
              ) : (
                <SupabaseBasedMappingTable />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 2: Campos Disponíveis */}
        <TabsContent value="fields" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Comparação de Campos</h3>
              <p className="text-sm text-muted-foreground">
                Visualize todos os campos disponíveis em ambos os sistemas
              </p>
            </div>
            <Button onClick={handleImportFields} disabled={refreshing}>
              <Download className="w-4 h-4 mr-2" />
              Atualizar Campos do Bitrix
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando campos...
            </div>
          ) : (
            <FieldComparison
              bitrixFields={bitrixFields}
              supabaseFields={supabaseFields}
              mappings={mappings.filter(m => m.active)}
            />
          )}
        </TabsContent>

        {/* Aba 3: Análise */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Campos Não Mapeados - Bitrix</CardTitle>
                <CardDescription>
                  {stats.unmappedBitrix} campos do Bitrix sem mapeamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {bitrixFields
                    .filter(field => !mappings.some(m => m.active && m.bitrix_field === field.field_id))
                    .map((field) => (
                      <Alert key={field.field_id}>
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{field.field_id}</code>
                          <span className="ml-2">{field.field_title}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{field.field_type}</Badge>
                        </AlertDescription>
                      </Alert>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campos Não Mapeados - Supabase</CardTitle>
                <CardDescription>
                  {stats.unmappedSupabase} colunas do Supabase sem mapeamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {supabaseFields
                    .filter(field => !mappings.some(m => m.active && m.tabuladormax_field === field.column_name))
                    .map((field) => (
                      <Alert key={field.column_name}>
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{field.column_name}</code>
                          <Badge variant="outline" className="ml-2 text-xs">{field.data_type}</Badge>
                        </AlertDescription>
                      </Alert>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba 4: Ferramentas */}
        <TabsContent value="tools" className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Correção de Projetos Comerciais
              </CardTitle>
              <CardDescription>
                Sincroniza o campo commercial_project_id com base no PARENT_ID_1120 do Bitrix.
                Use esta ferramenta se houver leads com projetos incorretos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fixResult && (
                <div className="mb-4 p-4 bg-background rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total de leads processados:</span>
                    <span className="font-semibold">{fixResult.total_leads}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">✅ Corrigidos:</span>
                    <span className="font-semibold text-green-600">{fixResult.fixed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">⏭️ Pulados (já corretos):</span>
                    <span className="font-semibold text-blue-600">{fixResult.skipped}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">❌ Erros:</span>
                    <span className="font-semibold text-red-600">{fixResult.errors}</span>
                  </div>
                  {fixResult.error_details && fixResult.error_details.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Ver detalhes dos erros ({fixResult.error_details.length})
                      </summary>
                      <div className="mt-2 p-2 bg-red-500/10 rounded text-xs font-mono max-h-40 overflow-y-auto">
                        {fixResult.error_details.map((err: any, idx: number) => (
                          <div key={idx} className="mb-1">
                            Lead {err.lead_id}: {err.error}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
              
              <Button
                onClick={handleFixCommercialProjects}
                disabled={fixingProjects}
                size="lg"
                className="w-full"
              >
                {fixingProjects ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Corrigindo projetos...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Executar Correção de Projetos
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 5: Testes */}
        <TabsContent value="test" className="space-y-4">
          <SyncTestPanel />
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
