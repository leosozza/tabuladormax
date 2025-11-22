import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

export default function StageMappings() {
  const queryClient = useQueryClient();
  const [discoveredStages, setDiscoveredStages] = useState<BitrixStage[]>([]);
  const [pendingMappings, setPendingMappings] = useState<Record<string, string>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});

  // Buscar mapeamentos existentes
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

  // Descobrir stages no Bitrix
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

  // Salvar mapeamentos
  const saveMappingsMutation = useMutation({
    mutationFn: async () => {
      const mappingsToSave = Object.entries(pendingMappings)
        .filter(([_, appStatus]) => appStatus)
        .map(([stageId, appStatus]) => {
          const stage = discoveredStages.find(s => s.STATUS_ID === stageId);
          // Usar nome customizado se existir, senão usar o nome descoberto
          const stageName = customNames[stageId] || stage?.NAME || stageId;
          return {
            entity_type_id: 1096,
            stage_id: stageId,
            stage_name: stageName,
            app_status: appStatus as 'ativo' | 'inativo' | 'standby' | 'blacklist' | 'demissao'
          };
        });

      const { error } = await supabase
        .from('bitrix_stage_mapping')
        .upsert(mappingsToSave, {
          onConflict: 'entity_type_id,stage_id'
        });

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

  // Sincronizar SPA entities
  const syncSpaEntitiesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-bitrix-spa-entities');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.totalSynced} entidades sincronizadas!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar entidades: ${error.message}`);
    }
  });

  // Sincronizar status dos scouters
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

  const handleMappingChange = (stageId: string, appStatus: string) => {
    setPendingMappings(prev => ({
      ...prev,
      [stageId]: appStatus
    }));
  };

  const handleNameChange = (stageId: string, customName: string) => {
    setCustomNames(prev => ({
      ...prev,
      [stageId]: customName
    }));
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
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mapeamento de Stages do Bitrix</h1>
        <p className="text-muted-foreground">
          Configure como as stages do Bitrix são mapeadas para os status dos scouters
        </p>
      </div>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Processo de Sincronização</CardTitle>
          <CardDescription>Siga os passos abaixo para configurar a sincronização completa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Discover Stages */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              1
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">Descobrir Stages no Bitrix</h3>
              <p className="text-sm text-muted-foreground">
                Busca stages diretamente dos scouters cadastrados (bitrix_spa_entities)
              </p>
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
                <Badge variant="secondary" className="ml-2">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {discoveredStages.length} stages encontradas
                </Badge>
              )}
            </div>
          </div>

          {/* Step 2: Map Stages */}
          {discoveredStages.length > 0 && (
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold">Mapear Stages para Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Associe cada stage do Bitrix com um status da aplicação
                  </p>
                </div>
                
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
              </div>
            </div>
          )}

          {/* Step 3: Sync Entities */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              3
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">Sincronizar Entidades SPA</h3>
              <p className="text-sm text-muted-foreground">
                Buscar dados atualizados do Bitrix incluindo os stage_id de cada scouter
              </p>
              <Button
                onClick={() => syncSpaEntitiesMutation.mutate()}
                disabled={syncSpaEntitiesMutation.isPending}
                variant="outline"
              >
                {syncSpaEntitiesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Executar Sincronização
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step 4: Sync Status */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              4
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">Sincronizar Status dos Scouters</h3>
              <p className="text-sm text-muted-foreground">
                Aplicar os mapeamentos configurados e atualizar o status de cada scouter
              </p>
              <Button
                onClick={() => syncScoutersStatusMutation.mutate()}
                disabled={syncScoutersStatusMutation.isPending || !existingMappings || existingMappings.length === 0}
                variant="default"
              >
                {syncScoutersStatusMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Sincronizar Status
                  </>
                )}
              </Button>
              {existingMappings && existingMappings.length === 0 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Configure os mapeamentos primeiro
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
