import { useState, useMemo, useEffect } from "react";
import {
  Search,
  MessageCircle,
  Clock,
  Filter,
  RefreshCw,
  User,
  MessageSquareWarning,
  MessageSquareOff,
  MessageSquareReply,
  Handshake,
  CheckCircle2,
  Archive,
  ChevronDown,
  ChevronUp,
  Headphones,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AdminConversation,
  WindowFilter,
  ResponseFilter,
  DealStatusFilter,
  ClosedFilter,
  useAdminWhatsAppConversations,
} from "@/hooks/useAdminWhatsAppConversations";

// Storage key for persisting filters
const FILTERS_STORAGE_KEY = 'whatsapp-admin-filters';
const FILTERS_COLLAPSED_KEY = 'whatsapp-admin-filters-collapsed';

interface SavedFilters {
  windowFilter: WindowFilter;
  responseFilter: ResponseFilter;
  etapaFilter: string;
  dealStatusFilter: DealStatusFilter;
  closedFilter: ClosedFilter;
}

const loadSavedFilters = (): Partial<SavedFilters> => {
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveFilters = (filters: SavedFilters) => {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage errors
  }
};

const loadCollapsedState = (): boolean => {
  try {
    return localStorage.getItem(FILTERS_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

const saveCollapsedState = (collapsed: boolean) => {
  try {
    localStorage.setItem(FILTERS_COLLAPSED_KEY, String(collapsed));
  } catch {
    // Ignore storage errors
  }
};
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getEtapaStyle } from "@/lib/etapaColors";
import { ClientDetailsModal } from "./ClientDetailsModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyInvitedConversations, InvitedConversation } from "@/hooks/useMyInvitedConversations";
import { TagBadge } from "./TagBadge";
import { PriorityBadge } from "./PrioritySelector";
import { InvitedBadge } from "./InvitedBadge";

// Deal status display config
const DEAL_STATUS_CONFIG = {
  won: {
    label: "Contrato fechado",
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    icon: "✅",
  },
  lost: { label: "Não fechou", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: "❌" },
  open: { label: "Em negociação", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: "🔄" },
};

// Response status display config
const RESPONSE_STATUS_CONFIG = {
  waiting: {
    label: "Aguardando resposta",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    icon: MessageSquareWarning,
  },
  never: {
    label: "Sem resposta",
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    icon: MessageSquareOff,
  },
  replied: {
    label: "Lead respondeu",
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    icon: MessageSquareReply,
  },
  in_progress: {
    label: "Em Atendimento",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    icon: Headphones,
  },
};

// Common etapa options for filter
const ETAPA_OPTIONS = [
  { value: "all", label: "Todas as fases" },
  { value: "UC_DDVFX3", label: "Lead a Qualificar" },
  { value: "UC_AU7EMM", label: "Triagem" },
  { value: "UC_SARR07", label: "Em Agendamento" },
  { value: "UC_QWPO2W", label: "Agendados" },
  { value: "UC_MWJM5G", label: "Retornar Ligação" },
  { value: "UC_DMLQB7", label: "Reagendar" },
  { value: "UC_8WYI7Q", label: "StandBy" },
  { value: "Lead convertido", label: "Convertidos" },
];

interface AdminConversationListProps {
  selectedConversation: AdminConversation | null;
  onSelectConversation: (conversation: AdminConversation) => void;
}

export function AdminConversationList({ selectedConversation, onSelectConversation }: AdminConversationListProps) {
  // Load saved filters on mount
  const savedFilters = loadSavedFilters();
  
  const [search, setSearch] = useState("");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>(savedFilters.windowFilter || "all");
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>(savedFilters.responseFilter || "all");
  const [etapaFilter, setEtapaFilter] = useState<string>(savedFilters.etapaFilter || "all");
  const [dealStatusFilter, setDealStatusFilter] = useState<DealStatusFilter>(savedFilters.dealStatusFilter || "all");
  const [closedFilter, setClosedFilter] = useState<ClosedFilter>(savedFilters.closedFilter || "active");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState<AdminConversation | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(loadCollapsedState());

  // Persist filters whenever they change
  useEffect(() => {
    saveFilters({
      windowFilter,
      responseFilter,
      etapaFilter,
      dealStatusFilter,
      closedFilter,
    });
  }, [windowFilter, responseFilter, etapaFilter, dealStatusFilter, closedFilter]);

  // Persist collapsed state
  useEffect(() => {
    saveCollapsedState(filtersCollapsed);
  }, [filtersCollapsed]);

  // Check if any filter is active (not default)
  const hasActiveFilters = windowFilter !== "all" || responseFilter !== "all" || 
    etapaFilter !== "all" || dealStatusFilter !== "all" || closedFilter !== "active";

  // Fetch closed conversations count
  const { data: closedCount = 0 } = useQuery({
    queryKey: ['closed-conversations-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('whatsapp_conversation_closures' as any)
        .select('*', { count: 'exact', head: true })
        .is('reopened_at', null);
      
      if (error) return 0;
      return count || 0;
    },
    staleTime: 60000,
  });

  const handleDoubleClick = (conv: AdminConversation) => {
    setSelectedForDetails(conv);
    setDetailsModalOpen(true);
  };

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  };

  const { conversations, isLoading, isLoadingMore, error, stats, refetch, loadMore, hasMore, totalCount } =
    useAdminWhatsAppConversations({
      search: debouncedSearch,
      windowFilter,
      responseFilter,
      etapaFilter: etapaFilter === "all" ? null : etapaFilter,
      dealStatusFilter,
      closedFilter,
      limit: 50,
    });

  // Fetch invited conversations for current user
  const { data: myInvitedConversations = [] } = useMyInvitedConversations();
  
  // Create a map for quick lookup
  const invitedConversationsMap = useMemo(() => {
    const map = new Map<string, InvitedConversation>();
    myInvitedConversations.forEach(inv => {
      map.set(inv.phone_number, inv);
    });
    return map;
  }, [myInvitedConversations]);

  const getConversationKey = (conv: AdminConversation) => {
    // Combine phone_number + bitrix_id to ensure unique keys
    // This prevents duplicates when same phone has entries with/without bitrix_id
    const phone = conv.phone_number || '';
    const bitrix = conv.bitrix_id || '';
    return `${phone}-${bitrix}` || 'unknown';
  };

  const isSelected = (conv: AdminConversation) => {
    if (!selectedConversation) return false;
    return getConversationKey(conv) === getConversationKey(selectedConversation);
  };

  const formatShortTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Hoje: mostrar horário (14:30)
      if (diffDays === 0 && date.getDate() === now.getDate()) {
        return format(date, 'HH:mm', { locale: ptBR });
      }
      
      // Ontem
      if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) {
        return 'Ontem';
      }
      
      // Esta semana: dia da semana (Seg, Ter, etc)
      if (diffDays < 7) {
        return format(date, 'EEE', { locale: ptBR });
      }
      
      // Mais antigo: data curta (12/01)
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return "";
    }
  };

  const getDisplayTitle = (conv: AdminConversation) =>
    conv.deal_title || conv.lead_name || conv.phone_number || "Contato";


  const getInitials = (name: string | null) => {
    if (!name || name === "Contato") return "C";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card">
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

        {/* Collapsible Filters */}
        <Collapsible open={!filtersCollapsed} onOpenChange={(open) => setFiltersCollapsed(!open)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex items-center justify-between h-8 px-2"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm">Filtros</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="h-5 text-xs">
                    Ativos
                  </Badge>
                )}
              </div>
              {filtersCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-3 pt-2">
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
                  <SelectItem value="in_progress">Em Atendimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Etapa and Deal Status Filters Row */}
            <div className="flex gap-2">
              {/* Etapa Filter */}
              <Select
                value={etapaFilter}
                onValueChange={(v) => {
                  setEtapaFilter(v);
                  // Reset deal filter when changing away from converted leads
                  if (v !== "Lead convertido") {
                    setDealStatusFilter("all");
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Fase" />
                </SelectTrigger>
                <SelectContent>
                  {ETAPA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Deal Status Filter - Only show for converted leads */}
              {etapaFilter === "Lead convertido" && (
                <Select value={dealStatusFilter} onValueChange={(v) => setDealStatusFilter(v as DealStatusFilter)}>
                  <SelectTrigger className="flex-1">
                    <Handshake className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="won">✅ Contrato Fechado</SelectItem>
                    <SelectItem value="lost">❌ Não Fechou</SelectItem>
                    <SelectItem value="open">🔄 Em Negociação</SelectItem>
                    <SelectItem value="no_deal">📋 Sem Deal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Closed Conversations Filter */}
            <div className="flex items-center justify-between py-2 px-1 rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Encerradas
                  {closedCount > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {closedCount}
                    </Badge>
                  )}
                </span>
              </div>
              <Select value={closedFilter} onValueChange={(v) => setClosedFilter(v as ClosedFilter)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Ativas
                    </span>
                  </SelectItem>
                  <SelectItem value="closed">
                    <span className="flex items-center gap-1">
                      <Archive className="h-3 w-3 text-muted-foreground" />
                      Encerradas
                    </span>
                  </SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1 min-h-0">
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
          ) : error ? (
            // Error state with retry option
            <div className="text-center py-8 px-4">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-destructive opacity-70" />
              <p className="text-destructive font-medium mb-2">
                Não foi possível carregar as conversas
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="mb-3"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
              <details className="text-left text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <summary className="cursor-pointer mb-1">Detalhes técnicos</summary>
                <code className="break-all">
                  {error instanceof Error ? error.message : String(error)}
                </code>
              </details>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <>
              {conversations.map((conv) => {
                const invitedInfo = conv.phone_number ? invitedConversationsMap.get(conv.phone_number) : null;
                
                return (
                <div key={getConversationKey(conv)} className="relative">
                  {/* Invited highlight badge - above the conversation */}
                  {invitedInfo && invitedInfo.inviter_name && (
                    <div className="px-3 pt-2">
                      <InvitedBadge inviterName={invitedInfo.inviter_name} />
                    </div>
                  )}
                  <button
                    onClick={() => onSelectConversation(conv)}
                    onDoubleClick={() => handleDoubleClick(conv)}
                    className={cn(
                      // overflow-hidden + min-w-0 force child truncation to work correctly
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors min-w-0 overflow-hidden",
                      "hover:bg-accent",
                      isSelected(conv) && "bg-accent",
                      invitedInfo && "ring-2 ring-purple-500/50 ring-inset",
                    )}
                  >
                  {/* Avatar with window indicator and response status dot */}
                  <div className="relative">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium",
                        conv.is_window_open
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {getInitials(conv.lead_name)}
                    </div>
                    {/* Window status dot (bottom-right) */}
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                        conv.is_window_open ? "bg-green-500" : "bg-muted-foreground",
                      )}
                    />
                    {/* Response status dot (top-right) - only for waiting/never */}
                    {conv.response_status === 'waiting' && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-background" />
                    )}
                    {conv.response_status === 'never' && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Name + Unread badge + Timestamp */}
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <span className="font-medium truncate min-w-0 flex-1">
                        {getDisplayTitle(conv)}
                      </span>
                      {conv.unread_count > 0 && (
                        <Badge
                          variant="default"
                          className="bg-green-500 hover:bg-green-500 h-5 min-w-5 shrink-0 flex items-center justify-center text-xs text-white"
                        >
                          {conv.unread_count}
                        </Badge>
                      )}
                      <span className="text-xs text-foreground/60 whitespace-nowrap shrink-0 min-w-fit">
                        {conv.last_message_at ? formatShortTime(conv.last_message_at) : ''}
                      </span>
                    </div>

                    {/* Responsible name if deal_title is shown */}
                    {conv.deal_title && conv.lead_name && conv.deal_title !== conv.lead_name && (
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">Resp: {conv.lead_name}</span>
                    )}

                    {/* Phone number if different from name */}
                    {conv.phone_number && conv.phone_number !== getDisplayTitle(conv) && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">{conv.phone_number}</p>
                    )}

                    {/* Etapa, Deal Status, and Priority badges */}
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {/* Priority badge - show if invited with priority > 0 */}
                      {invitedInfo && invitedInfo.priority > 0 && (
                        <PriorityBadge priority={invitedInfo.priority} size="sm" />
                      )}
                      
                      {/* Etapa badge */}
                      {conv.lead_etapa && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded",
                            getEtapaStyle(conv.lead_etapa).bg,
                            getEtapaStyle(conv.lead_etapa).text,
                          )}
                        >
                          {getEtapaStyle(conv.lead_etapa).label}
                        </span>
                      )}

                      {/* Deal status badge - only show for converted leads */}
                      {etapaFilter === "Lead convertido" &&
                        conv.deal_status &&
                        DEAL_STATUS_CONFIG[conv.deal_status] && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              DEAL_STATUS_CONFIG[conv.deal_status].color,
                            )}
                          >
                            {DEAL_STATUS_CONFIG[conv.deal_status].icon} {DEAL_STATUS_CONFIG[conv.deal_status].label}
                          </span>
                        )}
                    </div>

                    {/* Operator indicator */}
                    {conv.last_operator_name && (
                      <div className="flex items-center gap-1.5 mt-1 min-w-0">
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
                        <span className="text-xs text-muted-foreground truncate min-w-0">{conv.last_operator_name}</span>
                      </div>
                    )}
                  </div>
                </button>
                </div>
              );
              })}

              {/* Load more button */}
              {hasMore && (
                <Button variant="outline" className="w-full mt-2" onClick={loadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? "Carregando..." : `Carregar mais conversas (${conversations.length}/${totalCount})`}
                </Button>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Client Details Modal */}
      <ClientDetailsModal
        conversation={selectedForDetails}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </div>
  );
}
