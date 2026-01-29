import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, MessageSquare, Sparkles, Save, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  useOperatorsWithConversations,
  useOperatorConversations,
  useConversationMessages,
} from '@/hooks/useOperatorConversations';
import { useSystemUsers } from '@/hooks/useSystemUsers';
import { useAIAgents } from '@/hooks/useAIAgents';

interface AIAgent {
  id: string;
  name: string;
}

interface ConversationTrainingGeneratorProps {
  agents: AIAgent[];
}

export function ConversationTrainingGenerator({ agents }: ConversationTrainingGeneratorProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '14' | '30' | 'custom'>('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [generatedTraining, setGeneratedTraining] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trainingTitle, setTrainingTitle] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const { data: users, isLoading: loadingUsers } = useSystemUsers();
  const { data: operatorStats } = useOperatorsWithConversations();
  
  // Criar mapa de contagem de mensagens por nome
  const messageCountMap = useMemo(() => {
    const map = new Map<string, number>();
    operatorStats?.forEach((op) => {
      map.set(op.sender_name, op.message_count);
    });
    return map;
  }, [operatorStats]);
  
  const selectedUser = useMemo(() => users?.find((u) => u.id === selectedUserId), [users, selectedUserId]);
  const selectedOperatorName = selectedUser?.display_name || null;

  // Calcular datas baseado na seleção
  const { startDate, endDate } = useMemo(() => {
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate),
      };
    }
    const days = parseInt(dateRange, 10);
    return {
      startDate: subDays(new Date(), days),
      endDate: new Date(),
    };
  }, [dateRange, customStartDate, customEndDate]);

  const { data: conversations, isLoading: loadingConversations } = useOperatorConversations(
    selectedOperatorName,
    startDate,
    endDate
  );

  const { data: conversationMessages } = useConversationMessages(Array.from(selectedPhones));

  const togglePhone = (phone: string) => {
    const newSet = new Set(selectedPhones);
    if (newSet.has(phone)) {
      newSet.delete(phone);
    } else {
      newSet.add(phone);
    }
    setSelectedPhones(newSet);
  };

  const selectAll = () => {
    if (!conversations) return;
    setSelectedPhones(new Set(conversations.map((c) => c.phone_number)));
  };

  const deselectAll = () => {
    setSelectedPhones(new Set());
  };

  const handleGenerate = async () => {
    if (!selectedOperatorName || selectedPhones.size === 0) {
      toast.error('Selecione pelo menos uma conversa');
      return;
    }

    if (!conversationMessages || conversationMessages.length === 0) {
      toast.error('Nenhuma mensagem encontrada nas conversas selecionadas');
      return;
    }

    setIsGenerating(true);
    setGeneratedTraining('');

    try {
      // Agrupar mensagens por telefone
      const groupedConversations = Array.from(selectedPhones).map((phone) => ({
        phone_number: phone,
        messages: conversationMessages
          .filter((m) => m.phone_number === phone)
          .map((m) => ({
            direction: m.direction,
            content: m.content,
            sender_name: m.sender_name,
            created_at: m.created_at,
          })),
      }));

      const { data, error } = await supabase.functions.invoke('generate-training-from-conversations', {
        body: {
          conversations: groupedConversations,
          operatorName: selectedOperatorName,
        },
      });

      if (error) throw error;

      if (data?.training) {
        setGeneratedTraining(data.training);
        setTrainingTitle(`Padrões de ${selectedOperatorName} - ${format(new Date(), 'dd/MM/yyyy')}`);
        toast.success(`Treinamento gerado a partir de ${data.conversations_analyzed} conversas`);
      }
    } catch (err) {
      console.error('Erro ao gerar treinamento:', err);
      toast.error('Erro ao gerar treinamento com IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedTraining || !trainingTitle || !selectedAgentId) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from('ai_agents_training').insert({
        agent_id: selectedAgentId,
        title: trainingTitle,
        content: generatedTraining,
        category: 'conversas',
        priority: 50,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Treinamento salvo com sucesso!');
      setGeneratedTraining('');
      setTrainingTitle('');
      setSelectedPhones(new Set());
    } catch (err) {
      console.error('Erro ao salvar treinamento:', err);
      toast.error('Erro ao salvar treinamento');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Gerar Treinamento de Conversas
          </CardTitle>
          <CardDescription>
            Analise conversas reais de operadores para criar treinamentos personalizados para agentes de IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção de Operador */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              1. Selecione o Operador
            </Label>
            {loadingUsers ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um operador..." />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => {
                    const displayName = user.display_name || user.email || 'Sem nome';
                    const msgCount = messageCountMap.get(user.display_name || '') || 0;
                    return (
                      <SelectItem key={user.id} value={user.id}>
                        {displayName} {msgCount > 0 && <span className="text-muted-foreground">({msgCount} msgs)</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Período */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              2. Período
            </Label>
            <div className="flex gap-2 flex-wrap">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {dateRange === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </>
              )}
            </div>
          </div>

          {/* Lista de Conversas */}
          {selectedOperatorName && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>3. Conversas do Operador</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Selecionar Todas
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Limpar
                  </Button>
                </div>
              </div>

              {loadingConversations ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : conversations && conversations.length > 0 ? (
                <ScrollArea className="h-64 border rounded-md p-2">
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.phone_number}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          selectedPhones.has(conv.phone_number)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => togglePhone(conv.phone_number)}
                      >
                        <Checkbox
                          checked={selectedPhones.has(conv.phone_number)}
                          onCheckedChange={() => togglePhone(conv.phone_number)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{conv.phone_number}</span>
                            {conv.contact_name && (
                              <span className="text-muted-foreground">- {conv.contact_name}</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {conv.operator_messages} mensagens enviadas • {conv.client_messages} recebidas
                          </div>
                          {conv.first_message_preview && (
                            <div className="text-sm mt-1 truncate text-muted-foreground italic">
                              &quot;{conv.first_message_preview}...&quot;
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(conv.last_message), 'dd/MM', { locale: ptBR })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conversa encontrada para este operador no período selecionado
                </div>
              )}

              {selectedPhones.size > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedPhones.size} conversa(s) selecionada(s)
                  </span>
                  <Button onClick={handleGenerate} disabled={isGenerating}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Gerando...' : 'Gerar Treinamento com IA'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview do Treinamento Gerado */}
      {generatedTraining && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Treinamento Gerado
            </CardTitle>
            <CardDescription>
              Revise e edite o treinamento antes de salvar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={generatedTraining}
              onChange={(e) => setGeneratedTraining(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título do Treinamento</Label>
                <Input
                  value={trainingTitle}
                  onChange={(e) => setTrainingTitle(e.target.value)}
                  placeholder="Ex: Padrões do Fabio - Atendimento Geral"
                />
              </div>
              <div className="space-y-2">
                <Label>Agente de IA</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o agente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving || !trainingTitle || !selectedAgentId}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Treinamento'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
