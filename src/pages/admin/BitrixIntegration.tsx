import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus, Download, AlertTriangle, CheckCircle2, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FieldMappingTable } from '@/components/bitrix/FieldMappingTable';
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
  const [stats, setStats] = useState({
    totalMappings: 0,
    activeMappings: 0,
    withTransform: 0,
    unmappedBitrix: 0,
    unmappedSupabase: 0
  });

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMapping, setNewMapping] = useState({
    bitrix_field: '',
    tabuladormax_field: '',
    transform_function: null as string | null,
    priority: 0,
    active: true
  });

  const loadData = async () => {
    try {
      // Carregar mapeamentos (apenas ativos)
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('bitrix_field_mappings')
        .select('*')
        .eq('active', true)
        .order('tabuladormax_field', { ascending: true })
        .order('priority', { ascending: true });

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
      const activeMappings = mappingsData?.filter((m: any) => m.active) || [];
      const mappedBitrixFields = new Set(activeMappings.map((m: any) => m.bitrix_field));
      const mappedSupabaseFields = new Set(activeMappings.map((m: any) => m.tabuladormax_field));

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

  const handleAddMapping = async () => {
    if (!newMapping.bitrix_field || !newMapping.tabuladormax_field) {
      toast.error('Selecione os campos Bitrix e Supabase');
      return;
    }

    try {
      const { error } = await supabase
        .from('bitrix_field_mappings')
        .insert([newMapping]);

      if (error) throw error;

      toast.success('Mapeamento adicionado');
      setShowAddDialog(false);
      setNewMapping({
        bitrix_field: '',
        tabuladormax_field: '',
        transform_function: null,
        priority: 0,
        active: true
      });
      await loadData();
    } catch (error) {
      console.error('Erro ao adicionar mapeamento:', error);
      toast.error('Erro ao adicionar mapeamento');
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
          <TabsTrigger value="test">
            Testes
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Mapeamentos */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mapeamento de Campos</CardTitle>
                  <CardDescription>
                    Configure como os campos são sincronizados entre Bitrix e Supabase
                  </CardDescription>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Mapeamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Mapeamento</DialogTitle>
                      <DialogDescription>
                        Conecte um campo do Bitrix com uma coluna do Supabase
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Campo Bitrix</Label>
                        <Select
                          value={newMapping.bitrix_field}
                          onValueChange={(value) => setNewMapping({ ...newMapping, bitrix_field: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o campo do Bitrix" />
                          </SelectTrigger>
                          <SelectContent>
                            {bitrixFields.map((field) => (
                              <SelectItem key={field.field_id} value={field.field_id}>
                                {field.field_title} ({field.field_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Campo Supabase</Label>
                        <Select
                          value={newMapping.tabuladormax_field}
                          onValueChange={(value) => setNewMapping({ ...newMapping, tabuladormax_field: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a coluna do Supabase" />
                          </SelectTrigger>
                          <SelectContent>
                            {supabaseFields.map((field) => (
                              <SelectItem key={field.column_name} value={field.column_name}>
                                {field.column_name} ({field.data_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Transformação (opcional)</Label>
                        <Select
                          value={newMapping.transform_function || 'none'}
                          onValueChange={(value) => setNewMapping({ 
                            ...newMapping, 
                            transform_function: value === 'none' ? null : value 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            <SelectItem value="toNumber">toNumber</SelectItem>
                            <SelectItem value="toString">toString</SelectItem>
                            <SelectItem value="toBoolean">toBoolean</SelectItem>
                            <SelectItem value="toDate">toDate</SelectItem>
                            <SelectItem value="toTimestamp">toTimestamp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Prioridade (para fallback)</Label>
                        <Input
                          type="number"
                          value={newMapping.priority}
                          onChange={(e) => setNewMapping({ ...newMapping, priority: parseInt(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Menor número = maior prioridade. Use para definir campos alternativos.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddMapping}>
                        Adicionar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando mapeamentos...
                </div>
              ) : (
                <FieldMappingTable
                  mappings={mappings}
                  bitrixFields={bitrixFields}
                  supabaseFields={supabaseFields}
                  onUpdate={loadData}
                />
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

        {/* Aba 4: Testes */}
        <TabsContent value="test" className="space-y-4">
          <SyncTestPanel />
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
