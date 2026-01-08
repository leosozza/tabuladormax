import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Search, Loader2, Users } from 'lucide-react';
import { useTelemarketingConversations, TelemarketingConversation } from '@/hooks/useTelemarketingConversations';
import { useState, useEffect, useRef, useCallback } from 'react';
import { WhatsAppChatContainer } from '@/components/whatsapp';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemeSelector } from '@/components/portal-telemarketing/ThemeSelector';
import { supabase } from '@/integrations/supabase/client';
import { useSupervisorTeam } from '@/hooks/useSupervisorTeam';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getLeadPhotoUrl } from '@/lib/leadPhotoUtils';
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

import { isSupervisorCargo } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';

const PortalTelemarketingWhatsApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<TelemarketingConversation | null>(null);
  const [isValidatingContext, setIsValidatingContext] = useState(true);
  const [isValidContext, setIsValidContext] = useState<boolean | null>(null);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<number | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const isSupervisor = context?.cargo ? isSupervisorCargo(context.cargo) : false;

  // Pegar lead da URL se existir
  const searchParams = new URLSearchParams(location.search);
  const leadIdFromUrl = searchParams.get('lead');

  // Validar contexto de forma mais simples e rápida
  useEffect(() => {
    const validateContext = async () => {
      if (!context) {
        setIsValidContext(false);
        setIsValidatingContext(false);
        return;
      }

      try {
        // Usar timeout para evitar travamento
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const { data, error } = await supabase
          .from('telemarketing_operators')
          .select('bitrix_id')
          .eq('bitrix_id', context.bitrix_id)
          .maybeSingle();

        clearTimeout(timeoutId);

        if (error || !data) {
          console.warn('[WhatsApp] Contexto inválido - operador não encontrado:', context.bitrix_id);
          localStorage.removeItem('telemarketing_context');
          localStorage.removeItem('telemarketing_operator');
          setIsValidContext(false);
        } else {
          setIsValidContext(true);
        }
      } catch (e) {
        // Se der erro (timeout ou outro), assumir válido para não bloquear
        console.warn('[WhatsApp] Erro ao validar contexto, assumindo válido:', e);
        setIsValidContext(true);
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

  const {
    conversations,
    totalLoaded,
    isLoading,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasNextPage,
    isFetchingNextPage,
  } = useTelemarketingConversations({
    bitrixTelemarketingId: context?.bitrix_id || 0,
    cargo: context?.cargo,
    commercialProjectId: context?.commercial_project_id,
    teamOperatorIds: isSupervisor ? teamOperatorIds : undefined,
    selectedAgentFilter: isSupervisor ? selectedAgentFilter : undefined,
  });

  // Scroll infinito
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMore();
    }
  }, [loadMore]);

  // Auto-selecionar conversa se lead veio da URL
  useEffect(() => {
    if (leadIdFromUrl && conversations.length > 0 && !selectedConversation) {
      const targetLeadId = parseInt(leadIdFromUrl, 10);
      const found = conversations.find(c => c.lead_id === targetLeadId);
      if (found) {
        setSelectedConversation(found);
      }
    }
  }, [leadIdFromUrl, conversations, selectedConversation]);

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
          <ThemeSelector />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de Conversas */}
        <div className="w-80 border-r bg-card flex flex-col">
          {/* Search & Agent Filter */}
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
            
            {/* Filtro por agente - apenas para supervisores */}
            {isSupervisor && supervisorTeam?.agents && supervisorTeam.agents.length > 0 && (
              <Select 
                value={String(selectedAgentFilter)} 
                onValueChange={(v) => setSelectedAgentFilter(v === 'all' ? 'all' : parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <Users className="w-3 h-3 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os agentes</SelectItem>
                  {supervisorTeam.agents.map(agent => (
                    <SelectItem 
                      key={agent.bitrix_telemarketing_id} 
                      value={String(agent.bitrix_telemarketing_id)}
                    >
                      {agent.bitrix_telemarketing_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Lista com ScrollArea minimalista */}
          <ScrollArea className="flex-1">
            <div 
              ref={scrollRef} 
              onScroll={handleScroll}
              className="h-full"
            >
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
                <>
                  {conversations.map((conv) => {
                    const photoUrl = getLeadPhotoUrl(conv.photo_url);
                    const isPlaceholder = photoUrl.includes('no-photo-placeholder');
                    const convInitials = conv.lead_name
                      .split(' ')
                      .map(n => n[0])
                      .slice(0, 2)
                      .join('')
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
                          {/* Avatar com iniciais ou foto */}
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {!isPlaceholder ? (
                              <img 
                                src={photoUrl} 
                                alt={conv.lead_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-primary">{convInitials}</span>
                            )}
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
                  })}
                  
                  {/* Loading more indicator */}
                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Load more hint */}
                  {hasNextPage && !isFetchingNextPage && (
                    <div className="text-center py-2 text-xs text-muted-foreground">
                      Role para carregar mais
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer com contagem */}
          <div className="p-2 border-t text-xs text-muted-foreground text-center">
            {conversations.length} de {totalLoaded} conversa{totalLoaded !== 1 ? 's' : ''}
            {hasNextPage && ' (mais disponíveis)'}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <WhatsAppChatContainer
              bitrixId={selectedConversation.bitrix_id}
              phoneNumber={selectedConversation.phone_number}
              leadId={selectedConversation.lead_id}
              contactName={selectedConversation.lead_name}
              onClose={() => setSelectedConversation(null)}
              variant="fullscreen"
              commercialProjectId={context?.commercial_project_id}
              conversationId={selectedConversation.conversation_id}
              operatorBitrixId={context?.bitrix_id}
              teamOperatorIds={isSupervisor ? teamOperatorIds : undefined}
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
