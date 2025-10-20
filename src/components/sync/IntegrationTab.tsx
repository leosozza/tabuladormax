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
  Link as LinkIcon
} from "lucide-react";
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

    setTesting(true);
    try {
      // Create a temporary Supabase client with the provided credentials
      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(projectUrl.trim(), anonKey.trim());

      // Try to query a simple table to test connection
      const { error } = await testClient
        .from('leads')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          toast.error("Tabela 'leads' não encontrada no projeto Gestão Scouter");
        } else {
          throw error;
        }
        return;
      }

      toast.success("✅ Conexão estabelecida com sucesso!");
    } catch (error: unknown) {
      console.error("Erro ao testar integração:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`❌ Falha na conexão: ${errorMessage}`);
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
    <div className="space-y-6">
      {/* Header com status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração Gestão Scouter</CardTitle>
                <CardDescription>
                  Configure a sincronização bidirecional entre TabuladorMax e Gestão Scouter
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
      </Card>

      {/* Alert informativo */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Sobre esta integração:</strong> A sincronização permite que leads do TabuladorMax 
          sejam automaticamente enviados para a tabela "leads" do projeto Gestão Scouter, e vice-versa. 
          As atualizações são bidirecionais e automáticas quando habilitadas.
        </AlertDescription>
      </Alert>

      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Configuração da Conexão
          </CardTitle>
          <CardDescription>
            Insira as credenciais do projeto Supabase Gestão Scouter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Status da Sincronização */}
      {config && active && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Status da Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Instructions Dialog */}
      <IntegrationInstructionsDialog
        open={showInstructions}
        onOpenChange={setShowInstructions}
      />
    </div>
  );
}
