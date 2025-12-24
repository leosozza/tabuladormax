import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Save, X, Plus, Clock, MessageSquare, Zap, Cpu, Settings } from 'lucide-react';
import { useBotConfig, useUpsertBotConfig, PERSONALITY_OPTIONS } from '@/hooks/useWhatsAppBot';
import { BotProviderConfig } from './BotProviderConfig';
import { BotToolsManager } from './BotToolsManager';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface BotConfigProps {
  projectId: string;
  projectName?: string;
}

export function BotConfig({ projectId, projectName }: BotConfigProps) {
  const { data: config, isLoading } = useBotConfig(projectId);
  const upsertConfig = useUpsertBotConfig();
  const { settings: systemSettings } = useSystemSettings();

  // Usar valores padrão do sistema
  const defaultProvider = systemSettings?.defaultAIProvider || 'lovable';
  const defaultModel = systemSettings?.defaultAIModel || 'google/gemini-2.5-flash';

  const [formData, setFormData] = useState({
    bot_name: 'Assistente MAX',
    personality: 'amigavel',
    welcome_message: 'Olá! Sou o assistente virtual. Como posso ajudá-lo?',
    fallback_message: 'Desculpe, não entendi. Vou transferir você para um atendente.',
    transfer_keywords: ['atendente', 'humano', 'pessoa', 'reclamação', 'cancelar'],
    operating_hours: {
      start: '08:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo',
      workDays: [1, 2, 3, 4, 5],
    },
    max_messages_before_transfer: 10,
    response_delay_ms: 1500,
    collect_lead_data: true,
    auto_qualify: true,
    is_enabled: false,
    // Novos campos de AI Agent - usar padrão do sistema
    ai_provider: defaultProvider,
    ai_model: defaultModel,
    api_key_secret_name: null as string | null,
    tools_enabled: false,
    available_tools: [] as string[],
  });
  
  // Atualizar formData quando as configurações do sistema carregarem (apenas se não houver config salva)
  useEffect(() => {
    if (!config && systemSettings) {
      setFormData(prev => ({
        ...prev,
        ai_provider: systemSettings.defaultAIProvider || prev.ai_provider,
        ai_model: systemSettings.defaultAIModel || prev.ai_model,
      }));
    }
  }, [systemSettings, config]);

  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    if (config) {
      setFormData({
        bot_name: config.bot_name || 'Assistente MAX',
        personality: config.personality || 'amigavel',
        welcome_message: config.welcome_message || '',
        fallback_message: config.fallback_message || '',
        transfer_keywords: config.transfer_keywords || [],
        operating_hours: config.operating_hours || {
          start: '08:00',
          end: '18:00',
          timezone: 'America/Sao_Paulo',
          workDays: [1, 2, 3, 4, 5],
        },
        max_messages_before_transfer: config.max_messages_before_transfer || 10,
        response_delay_ms: config.response_delay_ms || 1500,
        collect_lead_data: config.collect_lead_data ?? true,
        auto_qualify: config.auto_qualify ?? true,
        is_enabled: config.is_enabled || false,
        // Novos campos
        ai_provider: (config as any).ai_provider || 'lovable',
        ai_model: (config as any).ai_model || 'google/gemini-2.5-flash',
        api_key_secret_name: (config as any).api_key_secret_name || null,
        tools_enabled: (config as any).tools_enabled || false,
        available_tools: (config as any).available_tools || [],
      });
    }
  }, [config]);

  const handleSave = () => {
    upsertConfig.mutate({
      commercial_project_id: projectId,
      ...formData,
    });
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.transfer_keywords.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        transfer_keywords: [...prev.transfer_keywords, newKeyword.trim()],
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      transfer_keywords: prev.transfer_keywords.filter(k => k !== keyword),
    }));
  };

  const toggleWorkDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        workDays: prev.operating_hours.workDays.includes(day)
          ? prev.operating_hours.workDays.filter(d => d !== day)
          : [...prev.operating_hours.workDays, day].sort(),
      },
    }));
  };

  const DAYS = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Bot className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status e Ativação */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-lg">Bot de IA</CardTitle>
                <CardDescription>
                  {projectName || 'Projeto'} - Atendimento automatizado
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {formData.is_enabled ? 'Ativo' : 'Inativo'}
              </span>
              <Switch
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs de Configuração */}
      <Tabs defaultValue="identity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="identity" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Identidade</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Regras</span>
          </TabsTrigger>
          <TabsTrigger value="provider" className="gap-2">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Ferramentas</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Identidade */}
        <TabsContent value="identity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Identidade do Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bot_name">Nome do Bot</Label>
                  <Input
                    id="bot_name"
                    value={formData.bot_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, bot_name: e.target.value }))}
                    placeholder="Ex: Ana, MAX, Assistente"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personality">Personalidade</Label>
                  <Select
                    value={formData.personality}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, personality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONALITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span>{option.emoji}</span>
                            <span>{option.label}</span>
                            <span className="text-muted-foreground text-xs">- {option.description}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
                <Textarea
                  id="welcome_message"
                  value={formData.welcome_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
                  placeholder="Primeira mensagem enviada ao cliente"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fallback_message">Mensagem de Fallback</Label>
                <Textarea
                  id="fallback_message"
                  value={formData.fallback_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, fallback_message: e.target.value }))}
                  placeholder="Quando o bot não sabe responder"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Regras */}
        <TabsContent value="rules" className="space-y-6">
          {/* Regras de Transferência */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Regras de Transferência
              </CardTitle>
              <CardDescription>
                Quando transferir automaticamente para um atendente humano
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Palavras-chave de Transferência</Label>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Adicionar palavra..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.transfer_keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="gap-1">
                      {keyword}
                      <button onClick={() => removeKeyword(keyword)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Máximo de mensagens antes de transferir</Label>
                  <span className="text-sm font-medium">{formData.max_messages_before_transfer}</span>
                </div>
                <Slider
                  value={[formData.max_messages_before_transfer]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, max_messages_before_transfer: value }))}
                  min={3}
                  max={30}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Após {formData.max_messages_before_transfer} mensagens, transfere para atendente
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Horário de Funcionamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={formData.operating_hours.start}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      operating_hours: { ...prev.operating_hours, start: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={formData.operating_hours.end}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      operating_hours: { ...prev.operating_hours, end: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias de Funcionamento</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.operating_hours.workDays.includes(day.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleWorkDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opções Avançadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opções Avançadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Coletar dados do lead</Label>
                  <p className="text-xs text-muted-foreground">Bot tenta coletar nome, interesse, etc</p>
                </div>
                <Switch
                  checked={formData.collect_lead_data}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, collect_lead_data: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Qualificação automática</Label>
                  <p className="text-xs text-muted-foreground">Identificar leads quentes automaticamente</p>
                </div>
                <Switch
                  checked={formData.auto_qualify}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_qualify: checked }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Delay entre respostas</Label>
                  <span className="text-sm font-medium">{formData.response_delay_ms}ms</span>
                </div>
                <Slider
                  value={[formData.response_delay_ms]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, response_delay_ms: value }))}
                  min={500}
                  max={5000}
                  step={100}
                />
                <p className="text-xs text-muted-foreground">
                  Simula digitação humana ({(formData.response_delay_ms / 1000).toFixed(1)}s)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Provedor de IA */}
        <TabsContent value="provider">
          <BotProviderConfig
            provider={formData.ai_provider}
            model={formData.ai_model}
            apiKeySecretName={formData.api_key_secret_name}
            toolsEnabled={formData.tools_enabled}
            onProviderChange={(value) => setFormData(prev => ({ ...prev, ai_provider: value }))}
            onModelChange={(value) => setFormData(prev => ({ ...prev, ai_model: value }))}
            onApiKeySecretNameChange={(value) => setFormData(prev => ({ ...prev, api_key_secret_name: value }))}
            onToolsEnabledChange={(value) => setFormData(prev => ({ ...prev, tools_enabled: value }))}
          />
        </TabsContent>

        {/* Tab: Ferramentas */}
        <TabsContent value="tools">
          <BotToolsManager
            projectId={projectId}
            availableTools={formData.available_tools}
            onAvailableToolsChange={(tools) => setFormData(prev => ({ ...prev, available_tools: tools }))}
          />
        </TabsContent>
      </Tabs>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsertConfig.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {upsertConfig.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
