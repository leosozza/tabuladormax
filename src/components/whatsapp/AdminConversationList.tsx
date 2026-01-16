import { useState, useMemo } from 'react';
import { Search, MessageCircle, Clock, Filter, RefreshCw, User, MessageSquareWarning, MessageSquareOff, MessageSquareReply } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AdminConversation, WindowFilter, ResponseFilter, useAdminWhatsAppConversations } from '@/hooks/useAdminWhatsAppConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getEtapaStyle } from '@/lib/etapaColors';

// Response status display config
const RESPONSE_STATUS_CONFIG = {
  waiting: { label: 'Aguardando resposta', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', icon: MessageSquareWarning },
  never: { label: 'Sem resposta', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: MessageSquareOff },
  replied: { label: 'Lead respondeu', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: MessageSquareReply }
};

// Common etapa options for filter
const ETAPA_OPTIONS = [
  { value: '', label: 'Todas as fases' },
  { value: 'UC_DDVFX3', label: 'Lead a Qualificar' },
  { value: 'UC_AU7EMM', label: 'Triagem' },
  { value: 'UC_SARR07', label: 'Em Agendamento' },
  { value: 'UC_QWPO2W', label: 'Agendados' },
  { value: 'UC_MWJM5G', label: 'Retornar Ligação' },
  { value: 'UC_DMLQB7', label: 'Reagendar' },
  { value: 'UC_8WYI7Q', label: 'StandBy' },
  { value: 'Lead convertido', label: 'Convertidos' },
];

interface AdminConversationListProps {
  selectedConversation: AdminConversation | null;
  onSelectConversation: (conversation: AdminConversation) => void;
}

export function AdminConversationList({
  selectedConversation,
  onSelectConversation
}: AdminConversationListProps) {
  const [search, setSearch] = useState('');
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('all');
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>('all');
  const [etapaFilter, setEtapaFilter] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  };

  const { conversations, isLoading, isLoadingMore, stats, refetch, loadMore, hasMore, totalCount } = useAdminWhatsAppConversations({
    search: debouncedSearch,
    windowFilter,
    responseFilter,
    etapaFilter: etapaFilter || null,
    limit: 50
  });

  const getConversationKey = (conv: AdminConversation) => 
    conv.phone_number || conv.bitrix_id || 'unknown';

  const isSelected = (conv: AdminConversation) => {
    if (!selectedConversation) return false;
    return getConversationKey(conv) === getConversationKey(selectedConversation);
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return '';
    }
  };

  const getInitials = (name: string | null) => {
    if (!name || name === 'Contato') return 'C';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full border-r bg-card">
      {/* Header with Stats */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Conversas</h2>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <MessageCircle className="h-3 w-3" />
            {stats.total}
          </Badge>
          <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
            <Clock className="h-3 w-3" />
            {stats.openWindows} abertas
          </Badge>
          {stats.unread > 0 && (
            <Badge variant="destructive" className="gap-1">
              {stats.unread} não lidas
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters Row */}
        <div className="flex gap-2">
          {/* Window Filter */}
          <Select value={windowFilter} onValueChange={(v) => setWindowFilter(v as WindowFilter)}>
            <SelectTrigger className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Janela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="open">Abertas (24h)</SelectItem>
              <SelectItem value="closed">Fechadas</SelectItem>
            </SelectContent>
          </Select>

          {/* Response Filter */}
          <Select value={responseFilter} onValueChange={(v) => setResponseFilter(v as ResponseFilter)}>
            <SelectTrigger className="flex-1">
              <MessageSquareWarning className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Resposta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="waiting">Aguardando</SelectItem>
              <SelectItem value="never">Sem resposta</SelectItem>
              <SelectItem value="replied">Respondeu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Etapa Filter */}
        <Select value={etapaFilter} onValueChange={setEtapaFilter}>
          <SelectTrigger className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por fase" />
          </SelectTrigger>
          <SelectContent>
            {ETAPA_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <>
              {conversations.map((conv) => (
                <button
                  key={getConversationKey(conv)}
                  onClick={() => onSelectConversation(conv)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                    "hover:bg-accent",
                    isSelected(conv) && "bg-accent"
                  )}
                >
                  {/* Avatar with window indicator */}
                  <div className="relative">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium",
                      conv.is_window_open 
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {getInitials(conv.lead_name)}
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                      conv.is_window_open ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        {conv.lead_name || conv.phone_number || 'Contato'}
                      </span>
                      {conv.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {conv.last_message_direction === 'inbound' ? '← ' : '→ '}
                        {conv.last_message_preview || 'Sem mensagens'}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>

                    {/* Phone number if different from name */}
                    {conv.lead_name && conv.phone_number && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {conv.phone_number}
                      </p>
                    )}

                    {/* Etapa and Response Status badges */}
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {/* Etapa badge */}
                      {conv.lead_etapa && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          getEtapaStyle(conv.lead_etapa).bg,
                          getEtapaStyle(conv.lead_etapa).text
                        )}>
                          {getEtapaStyle(conv.lead_etapa).label}
                        </span>
                      )}
                      
                      {/* Response status badge */}
                      {conv.response_status && RESPONSE_STATUS_CONFIG[conv.response_status] && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5",
                          RESPONSE_STATUS_CONFIG[conv.response_status].color
                        )}>
                          {(() => {
                            const Icon = RESPONSE_STATUS_CONFIG[conv.response_status!].icon;
                            return <Icon className="h-2.5 w-2.5" />;
                          })()}
                          {RESPONSE_STATUS_CONFIG[conv.response_status].label}
                        </span>
                      )}
                    </div>

                    {/* Operator indicator */}
                    {conv.last_operator_name && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {conv.last_operator_photo_url ? (
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={conv.last_operator_photo_url} alt={conv.last_operator_name} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {getInitials(conv.last_operator_name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {conv.last_operator_name}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {/* Load more button */}
              {hasMore && (
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Carregando...' : `Carregar mais (${conversations.length}/${totalCount})`}
                </Button>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
