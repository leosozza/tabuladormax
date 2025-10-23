import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Brain, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIProviderConfigProps {
  onClose: () => void;
}

interface ProviderConfig {
  id?: string;
  provider: string;
  model: string;
  api_key_encrypted?: string;
  is_active: boolean;
  is_default: boolean;
}

const PROVIDERS = [
  { 
    value: 'lovable', 
    label: 'Lovable AI', 
    models: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-5-mini'],
    requiresKey: false
  },
  { 
    value: 'openai', 
    label: 'OpenAI', 
    models: ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'],
    requiresKey: true
  },
  { 
    value: 'gemini', 
    label: 'Google Gemini', 
    models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    requiresKey: true
  },
];

export function AIProviderConfig({ onClose }: AIProviderConfigProps) {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Novo provider sendo adicionado
  const [newProvider, setNewProvider] = useState('lovable');
  const [newModel, setNewModel] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_provider_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Erro ao buscar configs:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const addProvider = async () => {
    if (!newModel) {
      toast.error('Selecione um modelo');
      return;
    }

    const provider = PROVIDERS.find(p => p.value === newProvider);
    if (provider?.requiresKey && !newApiKey) {
      toast.error('API Key é obrigatória para este provider');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('ai_provider_configs')
        .insert({
          user_id: user.id,
          provider: newProvider,
          model: newModel,
          api_key_encrypted: newApiKey || null,
          is_active: true,
          is_default: configs.length === 0 // Primeiro provider é default
        });

      if (error) throw error;

      toast.success('Provider adicionado com sucesso!');
      
      // Limpar form
      setNewProvider('lovable');
      setNewModel('');
      setNewApiKey('');

      await fetchConfigs();
    } catch (error: any) {
      console.error('Erro ao adicionar provider:', error);
      toast.error(error.message || 'Erro ao adicionar provider');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (configId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_provider_configs')
        .update({ is_active: !currentState })
        .eq('id', configId);

      if (error) throw error;

      toast.success(currentState ? 'Provider desativado' : 'Provider ativado');
      await fetchConfigs();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const setAsDefault = async (configId: string) => {
    try {
      // Remover default de todos
      await supabase
        .from('ai_provider_configs')
        .update({ is_default: false })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      // Definir novo default
      const { error } = await supabase
        .from('ai_provider_configs')
        .update({ is_default: true })
        .eq('id', configId);

      if (error) throw error;

      toast.success('Provider padrão atualizado');
      await fetchConfigs();
    } catch (error: any) {
      console.error('Erro ao definir padrão:', error);
      toast.error('Erro ao definir padrão');
    }
  };

  const deleteProvider = async (configId: string) => {
    try {
      const { error } = await supabase
        .from('ai_provider_configs')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      toast.success('Provider removido');
      await fetchConfigs();
    } catch (error: any) {
      console.error('Erro ao remover provider:', error);
      toast.error('Erro ao remover provider');
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.value === newProvider);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Configurar Providers de IA
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure os modelos de IA para análise de erros
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Fechar
        </Button>
      </div>

      {/* Adicionar novo provider */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Provider</CardTitle>
          <CardDescription>Configure um novo provider de IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Provider</Label>
            <Select value={newProvider} onValueChange={(v) => {
              setNewProvider(v);
              setNewModel('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                    {!provider.requiresKey && <Badge className="ml-2" variant="secondary">Gratuito</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProvider && (
            <>
              <div>
                <Label>Modelo</Label>
                <Select value={newModel} onValueChange={setNewModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProvider.models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProvider.requiresKey && (
                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sua API key será armazenada de forma segura
                  </p>
                </div>
              )}
            </>
          )}

          <Button onClick={addProvider} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Adicionar Provider'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de providers configurados */}
      <div className="space-y-2">
        <h3 className="font-medium">Providers Configurados</h3>
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </CardContent>
          </Card>
        ) : configs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum provider configurado ainda
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {configs.map((config) => {
              const provider = PROVIDERS.find(p => p.value === config.provider);
              return (
                <Card key={config.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider?.label || config.provider}</span>
                          {config.is_default && (
                            <Badge variant="default">Padrão</Badge>
                          )}
                          {config.is_active ? (
                            <Badge variant="secondary">Ativo</Badge>
                          ) : (
                            <Badge variant="outline">Inativo</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Modelo: {config.model}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.is_active}
                          onCheckedChange={() => toggleActive(config.id!, config.is_active)}
                        />
                        {!config.is_default && config.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAsDefault(config.id!)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Definir como Padrão
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteProvider(config.id!)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
