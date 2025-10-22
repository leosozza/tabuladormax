import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Database, 
  Info, 
  Save, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  BookOpen,
  TestTube,
  Link as LinkIcon,
  ChevronDown
} from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { GestaoScouterExportTab } from "./GestaoScouterExportTab";
import { IntegrationInstructionsDialog } from "./IntegrationInstructionsDialog";

interface GestaoScouterConfig {
  id: string;
  project_url: string;
  anon_key: string;
  active: boolean;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function IntegrationTab() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Form state
  const [projectUrl, setProjectUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [active, setActive] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [configId, setConfigId] = useState<string | null>(null);

  // Fetch existing configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['gestao-scouter-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_scouter_config')
        .select('*')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return data as GestaoScouterConfig | null;
    },
    refetchInterval: 30000,
  });

  // Load configuration into form when fetched
  useEffect(() => {
    if (config) {
      setProjectUrl(config.project_url || "");
      setAnonKey(config.anon_key || "");
      setActive(config.active ?? true);
      setSyncEnabled(config.sync_enabled ?? true);
      setConfigId(config.id);
    }
  }, [config]);

  const handleSaveConfig = async () => {
    // Validate inputs
    if (!projectUrl.trim()) {
      toast.error("URL do projeto é obrigatória");
      return;
    }

    if (!anonKey.trim()) {
      toast.error("Anon Key é obrigatória");
      return;
    }

    // Validate URL format
    try {
      new URL(projectUrl);
    } catch {
      toast.error("URL do projeto inválida");
      return;
    }

    setSaving(true);
    try {
      const configData = {
        project_url: projectUrl.trim(),
        anon_key: anonKey.trim(),
        active,
        sync_enabled: syncEnabled,
      };

      if (configId) {
        // Update existing config
        const { error } = await supabase
          .from('gestao_scouter_config')
          .update(configData)
          .eq('id', configId);

        if (error) throw error;
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('gestao_scouter_config')
          .insert([configData])
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
      }

      toast.success("Configuração salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['gestao-scouter-config'] });
    } catch (error: unknown) {
      console.error("Erro ao salvar configuração:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleTestIntegration = async () => {
    if (!projectUrl.trim() || !anonKey.trim()) {
      toast.error("Configure a URL do projeto e Anon Key antes de testar");
      return;
    }

    // Salvar configuração antes de testar (se ainda não foi salva)
    if (!configId) {
      toast.info("Salvando configuração antes de testar...");
      await handleSaveConfig();
    }

    setTesting(true);
    try {
      // ✅ Usar Edge Function dedicada para validação completa
      const { data, error } = await supabase.functions.invoke(
        "validate-gestao-scouter-config"
      );

      if (error) throw error;

      if (data.valid) {
        toast.success("✅ Conexão validada com sucesso!", {
          description: "Todos os testes passaram"
        });
      } else {
        const errorList = data.errors.join("\n");
        const warningList = data.warnings.length > 0 
          ? `\n\nAvisos:\n${data.warnings.join("\n")}` 
          : "";
        
        toast.error("❌ Validação falhou", {
          description: errorList + warningList
        });
      }

      // Mostrar detalhes dos checks no console
      console.log("📊 Resultado da validação:", {
        credentials: data.checks?.credentials,
        connection: data.checks?.connection,
        tableAccess: data.checks?.tableAccess,
        tableStructure: data.checks?.tableStructure,
      });

    } catch (error: unknown) {
      console.error("Erro ao validar integração:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`❌ Falha na validação: ${errorMessage}`);
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = () => {
    if (!config) {
      return <Badge variant="outline">Não Configurado</Badge>;
    }

    if (!active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }

    if (!syncEnabled) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300">
        Sincronização Pausada
      </Badge>;
    }

    return <Badge className="bg-green-600">Ativo</Badge>;
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Database className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">Integração Gestão Scouter</CardTitle>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Sobre esta integração</h4>
                            <p className="text-sm text-muted-foreground">
                              A sincronização permite que leads do TabuladorMax sejam automaticamente 
                              enviados para a tabela "leads" do projeto Gestão Scouter, e vice-versa. 
                              As atualizações são bidirecionais e automáticas quando habilitadas.
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <CardDescription>
                      Configure a sincronização bidirecional entre TabuladorMax e Gestão Scouter
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge()}
                  <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6 pt-6 border-t">
              {/* Configuração da Conexão */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <LinkIcon className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Configuração da Conexão</h3>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="projectUrl">URL do Projeto Gestão Scouter</Label>
                      <Input
                        id="projectUrl"
                        type="url"
                        placeholder="https://seu-projeto.supabase.co"
                        value={projectUrl}
                        onChange={(e) => setProjectUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        URL completa do projeto Supabase (ex: https://xxxxx.supabase.co)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="anonKey">Anon Key (chave pública)</Label>
                      <Input
                        id="anonKey"
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={anonKey}
                        onChange={(e) => setAnonKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Chave anon (pública) do projeto Gestão Scouter para autenticação
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="active">Integração Ativa</Label>
                          <p className="text-xs text-muted-foreground">
                            Desative para manter a configuração sem usar a integração
                          </p>
                        </div>
                        <Switch
                          id="active"
                          checked={active}
                          onCheckedChange={setActive}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="syncEnabled">Sincronização Automática</Label>
                          <p className="text-xs text-muted-foreground">
                            Ative para sincronizar automaticamente novos leads e atualizações
                          </p>
                        </div>
                        <Switch
                          id="syncEnabled"
                          checked={syncEnabled}
                          onCheckedChange={setSyncEnabled}
                          disabled={!active}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button
                        onClick={handleTestIntegration}
                        disabled={testing || !projectUrl || !anonKey}
                        variant="outline"
                        className="flex-1"
                      >
                        {testing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testando...
                          </>
                        ) : (
                          <>
                            <TestTube className="mr-2 h-4 w-4" />
                            Testar Integração
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => setShowInstructions(true)}
                        variant="outline"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Instruções
                      </Button>

                      <Button
                        onClick={handleSaveConfig}
                        disabled={saving}
                        className="flex-1"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Configuração
                          </>
                        )}
                      </Button>
                    </div>

                    {config && (
                      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                        <p>Configuração criada em: {new Date(config.created_at).toLocaleString('pt-BR')}</p>
                        <p>Última atualização: {new Date(config.updated_at).toLocaleString('pt-BR')}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Status da Sincronização */}
              {config && active && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold">Status da Sincronização</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className={`text-2xl font-bold ${active ? 'text-green-600' : 'text-gray-400'}`}>
                          {active ? '✓' : '✗'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Integração</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className={`text-2xl font-bold ${syncEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {syncEnabled ? '✓' : '✗'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Sincronização</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">→</div>
                        <p className="text-xs text-muted-foreground mt-1">Para Gestão</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">←</div>
                        <p className="text-xs text-muted-foreground mt-1">Do Gestão</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Exportação em Lote */}
              <Separator />
              <GestaoScouterExportTab />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Instructions Dialog */}
      <IntegrationInstructionsDialog
        open={showInstructions}
        onOpenChange={setShowInstructions}
      />
    </>
  );
}