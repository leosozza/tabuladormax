import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MessageSquare, Search, Loader2, Users, CalendarDays, Send } from 'lucide-react';
import { useTelemarketingConversations, TelemarketingConversation } from '@/hooks/useTelemarketingConversations';
import { useState, useEffect, useMemo } from 'react';
import { WhatsAppChatContainer } from '@/components/whatsapp';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemeSelector } from '@/components/portal-telemarketing/ThemeSelector';
import { supabase } from '@/integrations/supabase/client';
import { useSupervisorTeam } from '@/hooks/useSupervisorTeam';

interface TelemarketingContext {
  bitrix_id: number;
  cargo: string;
  name: string;
  commercial_project_id?: string;
}

type StoredTelemarketingOperator = {
  bitrix_id: number;
  cargo: string;
  operator_name: string;
  operator_photo?: string | null;
  commercial_project_id?: string;
};

// Cargos com privilégios de supervisão
const SUPERVISOR_CARGOS = ['10620', '10626', '10627'];
const isSupervisorCargo = (cargo: string) => SUPERVISOR_CARGOS.includes(cargo);

const PortalTelemarketingWhatsApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<TelemarketingConversation | null>(null);
  const [isValidatingContext, setIsValidatingContext] = useState(true);
  const [isValidContext, setIsValidContext] = useState<boolean | null>(null);

  // Ler contexto do localStorage
  const getContext = (): { context: TelemarketingContext | null; operatorPhoto: string | null } => {
    try {
      const savedContext = localStorage.getItem('telemarketing_context');
      if (savedContext) {
        const ctx = JSON.parse(savedContext) as TelemarketingContext;
        const savedOperator = localStorage.getItem('telemarketing_operator');
        const operatorData = savedOperator ? JSON.parse(savedOperator) as StoredTelemarketingOperator : null;
        return { 
          context: {
            ...ctx,
            commercial_project_id: operatorData?.commercial_project_id || ctx.commercial_project_id,
          }, 
          operatorPhoto: operatorData?.operator_photo || null 
        };
      }

      const savedOperator = localStorage.getItem('telemarketing_operator');
      if (savedOperator) {
        const operator = JSON.parse(savedOperator) as StoredTelemarketingOperator;
        return {
          context: {
            bitrix_id: operator.bitrix_id,
            cargo: operator.cargo,
            name: operator.operator_name,
            commercial_project_id: operator.commercial_project_id,
          },
          operatorPhoto: operator.operator_photo || null,
        };
      }
      return { context: null, operatorPhoto: null };
    } catch {
      return { context: null, operatorPhoto: null };
    }
  };

  const { context, operatorPhoto } = getContext();
  const isSupervisor = isSupervisorCargo(context?.cargo || '');

  // Validar que o bitrix_id existe na tabela telemarketing_operators
  useEffect(() => {
    const validateContext = async () => {
      if (!context) {
        setIsValidContext(false);
        setIsValidatingContext(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('telemarketing_operators')
          .select('bitrix_id')
          .eq('bitrix_id', context.bitrix_id)
          .maybeSingle();

        if (error || !data) {
          console.warn('[WhatsApp] Contexto inválido - operador não encontrado:', context.bitrix_id);
          localStorage.removeItem('telemarketing_context');
          localStorage.removeItem('telemarketing_operator');
          setIsValidContext(false);
        } else {
          setIsValidContext(true);
        }
      } catch (e) {
        console.error('[WhatsApp] Erro ao validar contexto:', e);
        setIsValidContext(false);
      } finally {
        setIsValidatingContext(false);
      }
    };

    validateContext();
  }, [context?.bitrix_id]);

  // Buscar equipe do supervisor
  const { data: supervisorTeam } = useSupervisorTeam(
    context?.commercial_project_id || null,
    isSupervisor ? context?.bitrix_id || null : null
  );
  const teamOperatorIds = supervisorTeam?.agents.map(a => a.bitrix_telemarketing_id) || [];
  
  // Estado para filtrar por agente específico (supervisores)
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  
  // Estado para filtrar por data de agendamento (todos os operadores)
  const [agendamentoFilter, setAgendamentoFilter] = useState<string>('all');
  
  // IDs a usar no filtro - se selecionou um agente específico, usa só ele
  const filteredOperatorIds = useMemo(() => {
    if (!isSupervisor) return undefined;
    if (selectedAgentFilter === 'all') return teamOperatorIds;
    return [parseInt(selectedAgentFilter, 10)];
  }, [isSupervisor, selectedAgentFilter, teamOperatorIds]);

  const {
    conversations,
    isLoading,
    isLoadingStats,
    searchQuery,
    setSearchQuery,
    totalLeads,
  } = useTelemarketingConversations({
    bitrixTelemarketingId: context?.bitrix_id || 0,
    cargo: context?.cargo,
    commercialProjectId: context?.commercial_project_id,
    teamOperatorIds: filteredOperatorIds,
    agendamentoFilter,
  });

  // Mostrar loading enquanto valida
  if (isValidatingContext) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando sessão...</p>
        </div>
      </div>
    );
  }

  // Redireciona se não tem contexto ou contexto inválido
  if (!context || isValidContext === false) {
    const redirectTarget = `${location.pathname}${location.search}`;
    return <Navigate to={`/portal-telemarketing?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  const initials = context.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/portal-telemarketing')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        
        {/* Foto retangular 3x4 */}
        <div className="relative w-9 h-12 rounded-md border-2 border-primary/20 shadow overflow-hidden bg-primary/10 flex-shrink-0">
          {operatorPhoto ? (
            <img 
              src={operatorPhoto} 
              alt={context.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{context.name}</span>
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
            <MessageSquare className="w-3 h-3 mr-1" />
            WhatsApp
          </Badge>
          {isSupervisor && (
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
              <Users className="w-3 h-3 mr-1" />
              Supervisor
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/portal-telemarketing/envio-lote')}
            className="gap-2 ml-auto"
          >
            <Send className="w-4 h-4" />
            Envio em Lote
          </Button>
          <ThemeSelector />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de Conversas */}
        <div className="w-80 border-r bg-card flex flex-col">
          {/* Search e Filtros */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Filtro por data de agendamento - disponível para todos */}
            <Select value={agendamentoFilter} onValueChange={setAgendamentoFilter}>
              <SelectTrigger className="h-8 text-xs">
                <CalendarDays className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Agendado em" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os leads</SelectItem>
                <SelectItem value="today">Agendados hoje</SelectItem>
                <SelectItem value="yesterday">Agendados ontem</SelectItem>
                <SelectItem value="3days">Últimos 3 dias</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Filtro por agente - apenas supervisores */}
            {isSupervisor && supervisorTeam && supervisorTeam.agents.length > 0 && (
              <Select value={selectedAgentFilter} onValueChange={setSelectedAgentFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Filtrar por agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os agentes</SelectItem>
                  {supervisorTeam.agents.map((agent) => (
                    <SelectItem key={agent.bitrix_telemarketing_id} value={String(agent.bitrix_telemarketing_id)}>
                      {agent.bitrix_telemarketing_name || `Agente ${agent.bitrix_telemarketing_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              conversations.map((conv) => {
                // Gerar iniciais do nome do lead
                const leadInitials = conv.lead_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();
                  
                return (
                  <div
                    key={conv.lead_id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation?.lead_id === conv.lead_id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar com foto ou iniciais */}
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {conv.photo_url ? (
                          <img 
                            src={conv.photo_url} 
                            alt={conv.lead_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Se a imagem falhar, esconder e mostrar iniciais
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        {/* Mostrar iniciais se não tem foto ou como fallback */}
                        <span className={`text-sm font-semibold text-primary ${conv.photo_url ? 'hidden' : ''}`}>
                          {leadInitials}
                        </span>
                      </div>
                      
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{conv.lead_name}</p>
                        {conv.last_message_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message_preview || conv.phone_number || 'Sem telefone'}
                          </p>
                          {isSupervisor && conv.telemarketing_name && (
                            <p className="text-[10px] text-purple-500 truncate">
                              Agente: {conv.telemarketing_name}
                            </p>
                          )}
                        </div>
                        {conv.unread_count > 0 && (
                          <Badge variant="default" className="ml-2 h-5 min-w-5 text-xs">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })
            )}
          </div>

          {/* Footer com contagem */}
          <div className="p-2 border-t text-xs text-muted-foreground text-center space-y-1">
            <div>{conversations.length} conversa{conversations.length !== 1 ? 's' : ''}</div>
            {agendamentoFilter !== 'all' && (
              <div className="text-[10px]">
                {totalLeads} lead{totalLeads !== 1 ? 's' : ''} no filtro
              </div>
            )}
            {isLoadingStats && (
              <div className="flex items-center justify-center gap-1 text-[10px]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Carregando prévias...
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <WhatsAppChatContainer
              bitrixId={selectedConversation.bitrix_id}
              phoneNumber={selectedConversation.phone_number}
              contactName={selectedConversation.lead_name}
              onClose={() => setSelectedConversation(null)}
              variant="fullscreen"
              commercialProjectId={context?.commercial_project_id}
              conversationId={selectedConversation.conversation_id}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Selecione uma conversa</p>
                <p className="text-sm">Escolha um lead na lista para ver as mensagens</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalTelemarketingWhatsApp;
