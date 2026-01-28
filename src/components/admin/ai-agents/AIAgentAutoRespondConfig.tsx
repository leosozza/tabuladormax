import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, Zap, Clock, MessageSquare, Save, ChevronDown, Filter, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AIAgent } from '@/hooks/useAIAgents';

interface AutoRespondFilters {
  etapas: string[];
  response_status: string[];
  window_status: 'all' | 'open' | 'closed';
}

interface AIAgentAutoRespondConfigProps {
  agent: AIAgent;
  onUpdate: () => void;
}

const ETAPA_OPTIONS = [
  { value: 'UC_DDVFX3', label: 'Lead a Qualificar' },
  { value: 'UC_AU7EMM', label: 'Triagem' },
  { value: 'UC_SARR07', label: 'Em Agendamento' },
  { value: 'UC_QWPO2W', label: 'Agendados' },
  { value: 'UC_MWJM5G', label: 'Retornar Ligação' },
  { value: 'UC_DMLQB7', label: 'Reagendar' },
  { value: 'UC_8WYI7Q', label: 'StandBy' },
  { value: 'Lead convertido', label: 'Convertidos' },
  { value: 'CONVERTED', label: 'Convertidos (Alt)' },
];

const RESPONSE_STATUS_OPTIONS = [
  { value: 'waiting', label: 'Aguardando resposta' },
  { value: 'never', label: 'Sem resposta' },
  { value: 'replied', label: 'Lead respondeu' },
];

export function AIAgentAutoRespondConfig({ agent, onUpdate }: AIAgentAutoRespondConfigProps) {
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  // Auto-respond config
  const [autoRespondEnabled, setAutoRespondEnabled] = useState(false);
  const [filters, setFilters] = useState<AutoRespondFilters>({
    etapas: [],
    response_status: ['waiting', 'never'],
    window_status: 'open',
  });
  const [cooldownMinutes, setCooldownMinutes] = useState(5);
  const [maxResponses, setMaxResponses] = useState(10);
  
  // Window proactive config
  const [windowProactiveEnabled, setWindowProactiveEnabled] = useState(false);
  const [windowProactiveHours, setWindowProactiveHours] = useState(2);
  const [windowProactiveMessage, setWindowProactiveMessage] = useState(
    'Olá! Só passando para ver se você tem alguma dúvida ou se posso ajudar com algo mais. 😊'
  );

  // Load saved config
  useEffect(() => {
    if (agent) {
      // Parse stored config with safe defaults
      const storedFilters = (agent as any).auto_respond_filters as AutoRespondFilters || {
        etapas: [],
        response_status: ['waiting', 'never'],
        window_status: 'open',
      };
      
      setAutoRespondEnabled((agent as any).auto_respond_enabled || false);
      setFilters({
        etapas: storedFilters.etapas || [],
        response_status: storedFilters.response_status || ['waiting', 'never'],
        window_status: storedFilters.window_status || 'open',
      });
      setCooldownMinutes((agent as any).auto_respond_cooldown_minutes || 5);
      setMaxResponses((agent as any).max_auto_responses_per_conversation || 10);
      setWindowProactiveEnabled((agent as any).window_proactive_enabled || false);
      setWindowProactiveHours((agent as any).window_proactive_hours || 2);
      setWindowProactiveMessage((agent as any).window_proactive_message || 
        'Olá! Só passando para ver se você tem alguma dúvida ou se posso ajudar com algo mais. 😊');
    }
  }, [agent]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({
          auto_respond_enabled: autoRespondEnabled,
          auto_respond_filters: filters as any,
          auto_respond_cooldown_minutes: cooldownMinutes,
          max_auto_responses_per_conversation: maxResponses,
          window_proactive_enabled: windowProactiveEnabled,
          window_proactive_hours: windowProactiveHours,
          window_proactive_message: windowProactiveMessage,
        })
        .eq('id', agent.id);

      if (error) throw error;
      
      toast.success('Configurações salvas!');
      onUpdate();
    } catch (err) {
      console.error('Error saving auto-respond config:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const toggleEtapa = (etapa: string) => {
    setFilters(prev => ({
      ...prev,
      etapas: prev.etapas.includes(etapa)
        ? prev.etapas.filter(e => e !== etapa)
        : [...prev.etapas, etapa],
    }));
  };

  const toggleResponseStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      response_status: prev.response_status.includes(status)
        ? prev.response_status.filter(s => s !== status)
        : [...prev.response_status, status],
    }));
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${autoRespondEnabled ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <CardTitle className="text-sm">Auto-Resposta</CardTitle>
                {autoRespondEnabled && (
                  <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-700">
                    <Bot className="h-3 w-3" />
                    Ativa
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription className="text-xs">
              Configure respostas automáticas com filtros
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Main Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <Label className="font-medium">Ativar respostas automáticas</Label>
                  <p className="text-xs text-muted-foreground">
                    IA responde automaticamente quando filtros são atendidos
                  </p>
                </div>
              </div>
              <Switch
                checked={autoRespondEnabled}
                onCheckedChange={setAutoRespondEnabled}
              />
            </div>

            {autoRespondEnabled && (
              <>
                <Separator />

                {/* Filters Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <Label className="font-medium">Responder apenas quando:</Label>
                  </div>

                  {/* Etapas */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Etapas do lead</Label>
                    <div className="flex flex-wrap gap-2">
                      {ETAPA_OPTIONS.map((opt) => (
                        <Badge
                          key={opt.value}
                          variant={filters.etapas.includes(opt.value) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleEtapa(opt.value)}
                        >
                          {opt.label}
                        </Badge>
                      ))}
                    </div>
                    {filters.etapas.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhuma selecionada = todas as etapas</p>
                    )}
                  </div>

                  {/* Response Status */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Status da resposta</Label>
                    <div className="space-y-2">
                      {RESPONSE_STATUS_OPTIONS.map((opt) => (
                        <div key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`resp-${opt.value}`}
                            checked={filters.response_status.includes(opt.value)}
                            onCheckedChange={() => toggleResponseStatus(opt.value)}
                          />
                          <Label htmlFor={`resp-${opt.value}`} className="text-sm cursor-pointer">
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Window Status */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Janela 24h</Label>
                    <RadioGroup
                      value={filters.window_status}
                      onValueChange={(v) => setFilters(prev => ({ ...prev, window_status: v as any }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="open" id="window-open" />
                        <Label htmlFor="window-open" className="cursor-pointer">Apenas abertas</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="all" id="window-all" />
                        <Label htmlFor="window-all" className="cursor-pointer">Todas</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator />

                {/* Limits */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    <Label className="font-medium">Limites de segurança</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Cooldown entre respostas</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={cooldownMinutes}
                          onChange={(e) => setCooldownMinutes(parseInt(e.target.value) || 5)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">minutos</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Máx. respostas por conversa</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={maxResponses}
                          onChange={(e) => setMaxResponses(parseInt(e.target.value) || 10)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">respostas</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Window Proactive Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <Label className="font-medium">Mensagem proativa (janela expirando)</Label>
                    <p className="text-xs text-muted-foreground">
                      Envia mensagem quando a janela 24h estiver próxima de fechar
                    </p>
                  </div>
                </div>
                <Switch
                  checked={windowProactiveEnabled}
                  onCheckedChange={setWindowProactiveEnabled}
                />
              </div>

              {windowProactiveEnabled && (
                <div className="space-y-3 pl-4 border-l-2 border-orange-200">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Enviar quando janela tiver menos de</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={windowProactiveHours}
                      onChange={(e) => setWindowProactiveHours(parseInt(e.target.value) || 2)}
                      className="w-16"
                    />
                    <span className="text-sm text-muted-foreground">horas</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Mensagem a enviar</Label>
                    <Textarea
                      value={windowProactiveMessage}
                      onChange={(e) => setWindowProactiveMessage(e.target.value)}
                      rows={3}
                      placeholder="Mensagem que será enviada..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
