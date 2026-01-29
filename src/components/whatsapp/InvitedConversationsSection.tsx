import { Bell, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { InvitedConversationFull } from '@/hooks/useMyInvitedConversationsFull';
import { AdminConversation } from '@/hooks/useAdminWhatsAppConversations';
import { PriorityBadge } from './PrioritySelector';
import { getEtapaStyle } from '@/lib/etapaColors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InvitedConversationsSectionProps {
  invitedConversations: InvitedConversationFull[];
  onSelectConversation: (conversation: AdminConversation) => void;
  selectedConversation: AdminConversation | null;
}

export function InvitedConversationsSection({
  invitedConversations,
  onSelectConversation,
  selectedConversation,
}: InvitedConversationsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (invitedConversations.length === 0) {
    return null;
  }

  const formatShortTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0 && date.getDate() === now.getDate()) {
        return format(date, 'HH:mm', { locale: ptBR });
      }
      
      if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) {
        return 'Ontem';
      }
      
      if (diffDays < 7) {
        return format(date, 'EEE', { locale: ptBR });
      }
      
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return "";
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "C";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Convert InvitedConversationFull to AdminConversation format for selection
  const toAdminConversation = (inv: InvitedConversationFull): AdminConversation => ({
    phone_number: inv.phone_number,
    bitrix_id: inv.bitrix_id,
    lead_name: inv.lead_name,
    lead_id: inv.bitrix_id ? parseInt(inv.bitrix_id, 10) || null : null,
    last_message_at: inv.last_message_at || '',
    last_message_preview: inv.last_message_preview,
    last_message_direction: null,
    last_customer_message_at: null,
    unread_count: inv.unread_count,
    total_messages: 0,
    is_window_open: inv.is_window_open,
    last_operator_name: null,
    last_operator_photo_url: null,
    lead_etapa: inv.lead_etapa,
    response_status: inv.response_status as 'waiting' | 'never' | 'replied' | null,
    deal_stage_id: null,
    deal_status: null,
    deal_category_id: null,
    deal_count: 0,
    deal_title: null,
    contract_number: null,
    maxsystem_id: null,
  });

  const isSelected = (inv: InvitedConversationFull) => {
    if (!selectedConversation) return false;
    // Use normalized phone comparison for more reliable matching
    const normalizePhone = (phone: string | null) => (phone || '').replace(/\D/g, '');
    return normalizePhone(selectedConversation.phone_number) === normalizePhone(inv.phone_number);
  };

  const totalUnread = invitedConversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="border-b">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-sm text-purple-700 dark:text-purple-300">
                Conversas Convidadas
              </span>
              <Badge variant="secondary" className="bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200">
                {invitedConversations.length}
              </Badge>
              {totalUnread > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5">
                  {totalUnread}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-purple-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-purple-500" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-2 space-y-1 bg-purple-25 dark:bg-purple-950/10">
            {invitedConversations.map((inv) => (
              <button
                key={`${inv.phone_number}-${inv.bitrix_id || 'null'}`}
                onClick={() => onSelectConversation(toAdminConversation(inv))}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors min-w-0 overflow-hidden",
                  "hover:bg-purple-100 dark:hover:bg-purple-900/40",
                  "bg-white dark:bg-card border border-purple-200 dark:border-purple-800",
                  isSelected(inv) && "ring-2 ring-purple-500",
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium",
                      inv.is_window_open
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {getInitials(inv.lead_name)}
                  </div>
                  {/* Window status dot */}
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-card",
                      inv.is_window_open ? "bg-green-500" : "bg-muted-foreground",
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Inviter info */}
                  {inv.inviter_name && (
                    <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 mb-1">
                      <Bell className="h-3 w-3" />
                      <span>Convidado por: {inv.inviter_name}</span>
                    </div>
                  )}

                  {/* Name + Unread + Time */}
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <span className="font-medium truncate min-w-0 flex-1">
                      {inv.lead_name || inv.phone_number}
                    </span>
                    {inv.unread_count > 0 && (
                      <Badge
                        variant="default"
                        className="bg-green-500 hover:bg-green-500 h-5 min-w-5 shrink-0 flex items-center justify-center text-xs text-white"
                      >
                        {inv.unread_count}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatShortTime(inv.last_message_at)}
                    </span>
                  </div>

                  {/* Phone */}
                  {inv.phone_number !== inv.lead_name && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {inv.phone_number}
                    </p>
                  )}

                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {/* URGENT badge - show when priority = 5 */}
                        {inv.priority === 5 && (
                          <Badge variant="destructive" className="gap-1 h-5 text-[10px] font-bold animate-pulse">
                            <AlertTriangle className="h-3 w-3" />
                            URGENTE
                          </Badge>
                        )}
                        
                        {/* Priority badge - show if priority > 0 but not 5 */}
                        {inv.priority > 0 && inv.priority < 5 && (
                          <PriorityBadge priority={inv.priority} size="sm" />
                        )}
                        
                        {/* Etapa */}
                        {inv.lead_etapa && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              getEtapaStyle(inv.lead_etapa).bg,
                              getEtapaStyle(inv.lead_etapa).text,
                            )}
                          >
                            {getEtapaStyle(inv.lead_etapa).label}
                          </span>
                        )}
                      </div>
                </div>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
