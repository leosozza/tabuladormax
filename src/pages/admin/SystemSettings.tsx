import { useState, useEffect } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Volume2, Save, Cpu, Mic, Check, X, Zap, Wrench, Key } from 'lucide-react';
import { useSystemSettings, ELEVENLABS_VOICES, VoiceKey } from '@/hooks/useSystemSettings';

export default function SystemSettings() {
  const { settings, isLoading, aiProviders, saveSettings, isSaving, testVoice } = useSystemSettings();
  
  const [selectedVoice, setSelectedVoice] = useState<VoiceKey>('laura');
  const [selectedProvider, setSelectedProvider] = useState<string>('lovable');
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.5-flash');
  const [isTesting, setIsTesting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sincronizar com configurações carregadas
  useEffect(() => {
    if (settings) {
      setSelectedVoice(settings.defaultVoice);
      setSelectedProvider(settings.defaultAIProvider);
      setSelectedModel(settings.defaultAIModel);
    }
  }, [settings]);

  // Detectar mudanças
  useEffect(() => {
    if (settings) {
      const changed = 
        selectedVoice !== settings.defaultVoice ||
        selectedProvider !== settings.defaultAIProvider ||
        selectedModel !== settings.defaultAIModel;
      setHasChanges(changed);
    }
  }, [selectedVoice, selectedProvider, selectedModel, settings]);

  // Obter modelos do provedor selecionado
  const currentProvider = aiProviders.find(p => p.name === selectedProvider);
  const availableModels = currentProvider?.models || [];

  // Quando trocar de provedor, resetar modelo
  useEffect(() => {
    if (currentProvider && availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      setSelectedModel(currentProvider.default_model || availableModels[0]);
    }
  }, [selectedProvider, currentProvider, availableModels, selectedModel]);

  const handleTestVoice = async () => {
    setIsTesting(true);
    try {
      await testVoice(selectedVoice);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveSettings({
      defaultVoice: selectedVoice,
      defaultAIProvider: selectedProvider,
      defaultAIModel: selectedModel,
    });
  };

  if (isLoading) {
    return (
      <AdminPageLayout
        title="Configurações de IA & Voz"
        description="Carregando configurações..."
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title="Configurações de IA & Voz"
      description="Configure os provedores padrão do sistema"
    >
      <div className="space-y-6">
        {/* ElevenLabs TTS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <CardTitle>ElevenLabs - Text-to-Speech</CardTitle>
            </div>
            <CardDescription>
              Configure a voz padrão para síntese de fala do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Voz Padrão</Label>
                <Select value={selectedVoice} onValueChange={(v) => setSelectedVoice(v as VoiceKey)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma voz" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ELEVENLABS_VOICES).map(([key, voice]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span>{voice.name}</span>
                          <span className="text-muted-foreground text-xs">({voice.gender})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={handleTestVoice}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4 mr-2" />
                  )}
                  Testar Voz
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <Check className="h-3 w-3 mr-1" />
                API Configurada
              </Badge>
              <span className="text-muted-foreground">
                Voz selecionada: {ELEVENLABS_VOICES[selectedVoice]?.name}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Provedor de IA */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <CardTitle>Provedor de IA Padrão</CardTitle>
            </div>
            <CardDescription>
              Configure o provedor e modelo de IA padrão para assistentes do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiProviders.map((provider) => (
                      <SelectItem key={provider.id} value={provider.name}>
                        <div className="flex items-center gap-2">
                          <span>{provider.display_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {currentProvider && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentProvider.is_free && (
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        Gratuito
                      </Badge>
                    )}
                    {currentProvider.supports_tools && (
                      <Badge variant="secondary" className="text-xs">
                        <Wrench className="h-3 w-3 mr-1" />
                        Suporta Tools
                      </Badge>
                    )}
                    {currentProvider.requires_api_key && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/20">
                        <Key className="h-3 w-3 mr-1" />
                        Requer API Key
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            size="lg"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </AdminPageLayout>
  );
}
