import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Users, 
  Headphones, 
  Briefcase,
  Copy,
  Check,
  ExternalLink,
  Clock,
  AlertCircle,
  Webhook,
  Loader2,
  Play,
  CheckCircle2,
  LayoutGrid,
  GitBranch
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EntityStats {
  count: number;
  lastSync: string | null;
}

interface SyncStatus {
  entityTypeId: number;
  isSyncing: boolean;
  lastResult?: { success: boolean; count: number };
}

interface BitrixStage {
  STATUS_ID: string;
  NAME: string;
  ENTITY_ID: string;
  SORT?: number;
  scouter_count?: number;
  examples?: string[];
}

interface StageMapping {
  id: string;
  entity_type_id: number;
  stage_id: string;
  stage_name: string;
  app_status: 'ativo' | 'inativo' | 'standby' | 'blacklist' | 'demissao';
}

const entityTypes = [
  { 
    id: 1096, 
    name: 'Scouters', 
    icon: Users, 
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    description: 'Captadores de leads'
  },
  { 
    id: 1144, 
    name: 'Telemarketing', 
    icon: Headphones, 
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    description: 'Operadores de telemarketing'
  },
  { 
    id: 1156, 
    name: 'Produtores', 
    icon: Briefcase, 
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    description: 'Produtores comerciais'
  },
];

export default function BitrixSync() {
  const queryClient = useQueryClient();
  
  // State for Sync tab
  const [stats, setStats] = useState<Record<number, EntityStats>>({});
  const [syncStatus, setSyncStatus] = useState<Record<number, SyncStatus>>({});
  const [syncingAll, setSyncingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State for Mappings tab
  const [discoveredStages, setDiscoveredStages] = useState<BitrixStage[]>([]);
  const [pendingMappings, setPendingMappings] = useState<Record<string, string>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  
  // State for Webhook tab
  const [copied, setCopied] = useState(false);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bitrix-spa-webhook`;

  // Existing mappings query
  const { data: existingMappings, isLoading: loadingMappings } = useQuery({
    queryKey: ['stage-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitrix_stage_mapping')
        .select('*')
        .eq('entity_type_id', 1096)
        .order('stage_name');
      
      if (error) throw error;
      return data as StageMapping[];
    }
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const promises = entityTypes.map(async (type) => {
        const { count } = await supabase
          .from('bitrix_spa_entities')
          .select('*', { count: 'exact', head: true })
          .eq('entity_type_id', type.id);

        const { data: lastItem } = await supabase
          .from('bitrix_spa_entities')
          .select('cached_at')
          .eq('entity_type_id', type.id)
          .order('cached_at', { ascending: false })
          .limit(1)
          .single();

        return {
          typeId: type.id,
          count: count || 0,
          lastSync: lastItem?.cached_at || null,
        };
      });

      const results = await Promise.all(promises);
      const statsMap: Record<number, EntityStats> = {};
      results.forEach((r) => {
        statsMap[r.typeId] = { count: r.count, lastSync: r.lastSync };
      });
      setStats(statsMap);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  // Mutations
  const discoverMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('discover-bitrix-stages');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success && data.stages) {
        setDiscoveredStages(data.stages);
        toast.success(`${data.stages.length} stages descobertas no Bitrix!`);
      } else {
        toast.error('Nenhuma stage encontrada no Bitrix');
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao descobrir stages: ${error.message}`);
    }
  });

  const saveMappingsMutation = useMutation({
    mutationFn: async () => {
      const mappingsToSave = Object.entries(pendingMappings)
        .filter(([_, appStatus]) => appStatus)
        .map(([stageId, appStatus]) => {
          const stage = discoveredStages.find(s => s.STATUS_ID === stageId);
          const stageName = customNames[stageId] || stage?.NAME || stageId;
          return {
            entity_type_id: 1096,
            stage_id: stageId,
            stage_name: stageName,
            app_status: appStatus as StageMapping['app_status']
          };
        });

      const { error } = await supabase
        .from('bitrix_stage_mapping')
        .upsert(mappingsToSave, { onConflict: 'entity_type_id,stage_id' });

      if (error) throw error;
      return mappingsToSave.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['stage-mappings'] });
      setPendingMappings({});
      toast.success(`${count} mapeamentos salvos com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar mapeamentos: ${error.message}`);
    }
  });

  const syncScoutersStatusMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-scouters-status');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scouters'] });
      toast.success(`${data.updated} scouters atualizados!`);
      if (data.skipped > 0) {
        toast.warning(`${data.skipped} scouters ignorados (stage não mapeada)`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar status: ${error.message}`);
    }
  });

  const handleSyncIndividual = async (entityTypeId: number) => {
    setSyncStatus((prev) => ({
      ...prev,
      [entityTypeId]: { entityTypeId, isSyncing: true },
    }));

    try {
      const { data, error } = await supabase.functions.invoke('sync-bitrix-spa-entities', {
        body: { entityTypeId },
      });

      if (error) throw error;

      setSyncStatus((prev) => ({
        ...prev,
        [entityTypeId]: {
          entityTypeId,
          isSyncing: false,
          lastResult: { success: true, count: data?.totalSynced || 0 },
        },
      }));

      const typeName = entityTypes.find((t) => t.id === entityTypeId)?.name;
      toast.success(`${data?.totalSynced || 0} ${typeName} sincronizados`);
      loadStats();
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setSyncStatus((prev) => ({
        ...prev,
        [entityTypeId]: {
          entityTypeId,
          isSyncing: false,
          lastResult: { success: false, count: 0 },
        },
      }));
      toast.error('Erro ao sincronizar');
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-bitrix-spa-entities');
      if (error) throw error;
      toast.success(`${data?.totalSynced || 0} entidades sincronizadas`);
      loadStats();
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast.error('Erro ao sincronizar todas as entidades');
    } finally {
      setSyncingAll(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('URL copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Nunca sincronizado';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  const handleMappingChange = (stageId: string, appStatus: string) => {
    setPendingMappings(prev => ({ ...prev, [stageId]: appStatus }));
  };

  const handleNameChange = (stageId: string, customName: string) => {
    setCustomNames(prev => ({ ...prev, [stageId]: customName }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-blue-500';
      case 'inativo': return 'bg-purple-500';
      case 'standby': return 'bg-cyan-500';
      case 'blacklist': return 'bg-gray-800';
      case 'demissao': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'inativo': return 'Inativo';
      case 'standby': return 'Standby';
      case 'blacklist': return 'Black-list';
      case 'demissao': return 'Demissão';
      default: return status;
    }
  };

  return (
    <AdminPageLayout
      title="Central de Sincronização Bitrix"
      description="Sincronize entidades, configure mapeamentos de stages e webhooks"
    >
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="mappings" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Mapeamentos</span>
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            <span className="hidden sm:inline">Webhook</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Cards de Sincronização Individual */}
              <div className="grid md:grid-cols-3 gap-4">
                {entityTypes.map((type) => {
                  const Icon = type.icon;
                  const status = syncStatus[type.id];
                  const entityStats = stats[type.id];
                  const isSyncing = status?.isSyncing || false;

                  return (
                    <Card key={type.id} className="relative overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-lg ${type.color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{type.name}</CardTitle>
                              <CardDescription className="text-xs">{type.description}</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Registros:</span>
                          <Badge variant="secondary" className="font-mono">
                            {entityStats?.count || 0}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatLastSync(entityStats?.lastSync || null)}</span>
                        </div>

                        {status?.lastResult && (
                          <div
                            className={`flex items-center gap-2 text-xs ${
                              status.lastResult.success
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {status.lastResult.success ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            <span>
                              {status.lastResult.success
                                ? `${status.lastResult.count} sincronizados`
                                : 'Erro na sincronização'}
                            </span>
                          </div>
                        )}

                        <Button
                          onClick={() => handleSyncIndividual(type.id)}
                          disabled={isSyncing || syncingAll}
                          className="w-full"
                          variant="outline"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Botões de Ação */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <Button
                    onClick={handleSyncAll}
                    disabled={syncingAll || Object.values(syncStatus).some((s) => s.isSyncing)}
                    className="w-full"
                    size="lg"
                  >
                    <RefreshCw className={`w-5 h-5 mr-2 ${syncingAll ? 'animate-spin' : ''}`} />
                    {syncingAll ? 'Sincronizando Todas as SPAs...' : 'Sincronizar Todas as SPAs'}
                  </Button>
                  
                  <Button
                    onClick={() => syncScoutersStatusMutation.mutate()}
                    disabled={syncScoutersStatusMutation.isPending || !existingMappings || existingMappings.length === 0}
                    variant="secondary"
                    className="w-full"
                    size="lg"
                  >
                    {syncScoutersStatusMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sincronizando Status...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Sincronizar Status dos Scouters
                      </>
                    )}
                  </Button>
                  {existingMappings && existingMappings.length === 0 && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm justify-center">
                      <AlertCircle className="h-4 w-4" />
                      Configure os mapeamentos primeiro na aba "Mapeamentos"
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB: Mapeamentos */}
        <TabsContent value="mappings" className="space-y-6">
          {/* Step 1: Discover Stages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                  1
                </div>
                Descobrir Stages no Bitrix
              </CardTitle>
              <CardDescription>
                Busca stages diretamente dos scouters cadastrados (bitrix_spa_entities)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Button
                onClick={() => discoverMutation.mutate()}
                disabled={discoverMutation.isPending}
                variant="outline"
              >
                {discoverMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Descobrir Stages
                  </>
                )}
              </Button>
              {discoveredStages.length > 0 && (
                <Badge variant="secondary">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {discoveredStages.length} stages encontradas
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Map Stages */}
          {discoveredStages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                    2
                  </div>
                  Mapear Stages para Status
                </CardTitle>
                <CardDescription>
                  Associe cada stage do Bitrix com um status da aplicação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {discoveredStages.map((stage) => {
                    const existingMapping = existingMappings?.find(m => m.stage_id === stage.STATUS_ID);
                    const currentValue = pendingMappings[stage.STATUS_ID] || existingMapping?.app_status || '';
                    
                    return (
                      <div key={stage.STATUS_ID} className="flex flex-col gap-3 p-4 border rounded-lg bg-card">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Nome descoberto:</p>
                              <p className="font-medium">{stage.NAME}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Nome customizado (editável):</p>
                              <input
                                type="text"
                                placeholder="Editar nome amigável (opcional)"
                                value={customNames[stage.STATUS_ID] ?? stage.NAME}
                                onChange={(e) => handleNameChange(stage.STATUS_ID, e.target.value)}
                                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">ID Técnico: {stage.STATUS_ID}</p>
                            {stage.scouter_count && (
                              <p className="text-xs text-muted-foreground">
                                📊 {stage.scouter_count} scouter{stage.scouter_count !== 1 ? 's' : ''}
                                {stage.examples && stage.examples.length > 0 && (
                                  <span className="ml-2">
                                    (ex: {stage.examples.slice(0, 2).join(', ')})
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="w-[200px] space-y-2">
                            <p className="text-xs text-muted-foreground">Status do app:</p>
                            {existingMapping && !pendingMappings[stage.STATUS_ID] && (
                              <Badge className={getStatusColor(existingMapping.app_status)}>
                                {getStatusLabel(existingMapping.app_status)}
                              </Badge>
                            )}
                            <Select
                              value={currentValue}
                              onValueChange={(value) => handleMappingChange(stage.STATUS_ID, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ativo">Ativo</SelectItem>
                                <SelectItem value="inativo">Inativo</SelectItem>
                                <SelectItem value="standby">Standby</SelectItem>
                                <SelectItem value="demissao">Demissão</SelectItem>
                                <SelectItem value="blacklist">Black-list</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={() => saveMappingsMutation.mutate()}
                  disabled={Object.keys(pendingMappings).length === 0 || saveMappingsMutation.isPending}
                  className="w-full"
                >
                  {saveMappingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Salvar Mapeamentos ({Object.keys(pendingMappings).length})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Existing Mappings */}
          {existingMappings && existingMappings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mapeamentos Configurados</CardTitle>
                <CardDescription>Status dos mapeamentos atualmente salvos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {existingMappings.map((mapping) => (
                    <div key={mapping.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">{mapping.stage_name}</div>
                        <div className="text-xs text-muted-foreground">{mapping.stage_id}</div>
                      </div>
                      <Badge className={getStatusColor(mapping.app_status)}>
                        {getStatusLabel(mapping.app_status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Webhook */}
        <TabsContent value="webhook" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Webhook de Saída do Bitrix</CardTitle>
                  <CardDescription className="text-xs">
                    Configure no Bitrix para atualizações automáticas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Como configurar no Bitrix24:</h4>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Acesse Bitrix24 → Aplicativos → Webhooks</li>
                  <li>Crie um novo webhook de saída</li>
                  <li>Cole a URL acima no campo de destino</li>
                  <li>
                    Selecione os eventos:
                    <ul className="ml-4 mt-1 list-disc list-inside">
                      <li>onCrmItemAdd (para Scouters, Telemarketing, Produtores)</li>
                      <li>onCrmItemUpdate</li>
                      <li>onCrmItemDelete</li>
                    </ul>
                  </li>
                  <li>Salve o webhook</li>
                </ol>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <a
                  href="https://maxsystem.bitrix24.com.br/devops/list/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Configurações do Bitrix
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
