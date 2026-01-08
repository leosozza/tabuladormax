import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Search, Loader2, User, Users } from 'lucide-react';
import { useTelemarketingConversations, TelemarketingConversation } from '@/hooks/useTelemarketingConversations';
import { useState, useEffect } from 'react';
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

const SUPERVISOR_CARGO = '10620';

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
  const isSupervisor = context?.cargo === SUPERVISOR_CARGO;

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

  const {
    conversations,
    isLoading,
    searchQuery,
    setSearchQuery,
  } = useTelemarketingConversations({
    bitrixTelemarketingId: context?.bitrix_id || 0,
    cargo: context?.cargo,
    commercialProjectId: context?.commercial_project_id,
    teamOperatorIds: isSupervisor ? teamOperatorIds : undefined,
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
          <ThemeSelector />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de Conversas */}
        <div className="w-80 border-r bg-card flex flex-col">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
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
              conversations.map((conv) => (
                <div
                  key={conv.lead_id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversation?.lead_id === conv.lead_id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {conv.photo_url ? (
                        <img 
                          src={conv.photo_url} 
                          alt={conv.lead_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
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
              ))
            )}
          </div>

          {/* Footer com contagem */}
          <div className="p-2 border-t text-xs text-muted-foreground text-center">
            {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
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
