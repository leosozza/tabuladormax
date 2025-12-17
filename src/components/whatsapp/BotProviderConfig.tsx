import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cpu, Zap, DollarSign, Key, Info, Sparkles } from 'lucide-react';
import { useAIProviders, type AIProvider } from '@/hooks/useAIProviders';

interface BotProviderConfigProps {
  provider: string;
  model: string;
  apiKeySecretName: string | null;
  toolsEnabled: boolean;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onApiKeySecretNameChange: (name: string | null) => void;
  onToolsEnabledChange: (enabled: boolean) => void;
}

export function BotProviderConfig({
  provider,
  model,
  apiKeySecretName,
  toolsEnabled,
  onProviderChange,
  onModelChange,
  onApiKeySecretNameChange,
  onToolsEnabledChange,
}: BotProviderConfigProps) {
  const { data: providers, isLoading } = useAIProviders();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);

  useEffect(() => {
    if (providers) {
      const found = providers.find(p => p.name === provider);
      setSelectedProvider(found || null);
      
      // Se o modelo atual não pertence ao provider, selecionar o padrão
      if (found && !found.models.some(m => m.id === model)) {
        onModelChange(found.default_model || found.models[0]?.id || '');
      }
    }
  }, [providers, provider, model, onModelChange]);

  const handleProviderChange = (value: string) => {
    onProviderChange(value);
    const newProvider = providers?.find(p => p.name === value);
    if (newProvider) {
      setSelectedProvider(newProvider);
      onModelChange(newProvider.default_model || newProvider.models[0]?.id || '');
      
      // Limpar API key se não precisar
      if (!newProvider.requires_api_key) {
        onApiKeySecretNameChange(null);
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Cpu className="h-6 w-6 animate-pulse text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seleção de Provedor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Provedor de IA
          </CardTitle>
          <CardDescription>
            Escolha qual serviço de IA será usado pelo bot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provedor</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um provedor..." />
              </SelectTrigger>
              <SelectContent>
                {providers?.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    <div className="flex items-center gap-2">
                      <span>{p.display_name}</span>
                      {p.is_free && (
                        <Badge variant="secondary" className="text-xs">Gratuito</Badge>
                      )}
                      {!p.requires_api_key && (
                        <Badge variant="outline" className="text-xs">Sem API Key</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProvider && (
            <>
              {/* Info do Provedor */}
              <div className="flex flex-wrap gap-2">
                {selectedProvider.is_free && (
                  <Badge variant="secondary" className="gap-1">
                    <DollarSign className="h-3 w-3" />
                    Gratuito
                  </Badge>
                )}
                {selectedProvider.supports_tools && (
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Suporta Ferramentas
                  </Badge>
                )}
                {!selectedProvider.requires_api_key && (
                  <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-200">
                    <Sparkles className="h-3 w-3" />
                    Incluído no Plano
                  </Badge>
                )}
              </div>

              {/* Seleção de Modelo */}
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={model} onValueChange={onModelChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProvider.models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span>{m.name}</span>
                          {m.description && (
                            <span className="text-xs text-muted-foreground">{m.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* API Key */}
              {selectedProvider.requires_api_key && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Nome da Secret (API Key)
                  </Label>
                  <Input
                    value={apiKeySecretName || ''}
                    onChange={(e) => onApiKeySecretNameChange(e.target.value || null)}
                    placeholder={`Ex: ${selectedProvider.name.toUpperCase()}_API_KEY`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Configure a API key como secret no Supabase com este nome
                  </p>
                </div>
              )}

              {/* Alerta para provedores que precisam de API key */}
              {selectedProvider.requires_api_key && !apiKeySecretName && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Para usar {selectedProvider.display_name}, configure uma API key.
                    Crie uma conta em {selectedProvider.base_url.replace('/v1', '').replace('https://api.', '')} e adicione a chave como secret.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modo Agente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Modo Agente (Tool Calling)
          </CardTitle>
          <CardDescription>
            Permite que o bot execute ações automatizadas como atualizar Bitrix, chamar webhooks, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar Ferramentas</Label>
              <p className="text-xs text-muted-foreground">
                O bot poderá executar ações além de responder mensagens
              </p>
            </div>
            <Switch
              checked={toolsEnabled}
              onCheckedChange={onToolsEnabledChange}
              disabled={selectedProvider && !selectedProvider.supports_tools}
            />
          </div>

          {selectedProvider && !selectedProvider.supports_tools && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {selectedProvider.display_name} não suporta ferramentas (tool calling).
                Escolha outro provedor para usar o modo agente.
              </AlertDescription>
            </Alert>
          )}

          {toolsEnabled && (
            <Alert className="mt-4 bg-primary/5 border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription>
                Configure as ferramentas na aba "Ferramentas do Agente" para definir quais ações o bot pode executar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
