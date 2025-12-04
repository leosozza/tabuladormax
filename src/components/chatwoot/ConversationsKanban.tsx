import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, CheckSquare, Square, Filter } from 'lucide-react';
import { ConversationKanbanCard } from './ConversationKanbanCard';
import { ConversationStats } from './ConversationStats';
import { LabelFilter } from './LabelFilter';
import { useAgentConversations, AgentConversation } from '@/hooks/useAgentConversations';
import { useConversationLabels, LabelAssignment } from '@/hooks/useConversationLabels';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ConversationsKanbanProps {
  onSelectConversation: (conversationId: number) => void;
  activeConversationId: number | null;
}

type KanbanCategory = 'open' | 'expiring' | 'closed';

interface KanbanColumn {
  id: KanbanCategory;
  title: string;
  color: string;
  bgColor: string;
}

const columns: KanbanColumn[] = [
  { id: 'open', title: 'Janela Aberta', color: 'text-green-600', bgColor: 'bg-green-500/10' },
  { id: 'expiring', title: 'Expirando', color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
  { id: 'closed', title: 'Janela Fechada', color: 'text-red-600', bgColor: 'bg-red-500/10' },
];

function getKanbanCategory(conversation: AgentConversation): KanbanCategory {
  const { windowStatus } = conversation;
  if (!windowStatus.isOpen) return 'closed';
  if (windowStatus.hoursRemaining !== null && windowStatus.hoursRemaining < 1) return 'expiring';
  return 'open';
}

function hasRecentMessage(conversation: AgentConversation): boolean {
  if (!conversation.last_customer_message_at) return false;
  const lastMsg = new Date(conversation.last_customer_message_at);
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return lastMsg > twoMinutesAgo;
}

export function ConversationsKanban({
  onSelectConversation,
  activeConversationId,
}: ConversationsKanbanProps) {
  const {
    conversations,
    isLoading,
    refetch,
    searchQuery,
    setSearchQuery,
    selectedConversations,
    toggleSelection,
    toggleSelectAll,
    allSelected,
  } = useAgentConversations();

  const { fetchLabelsForConversations } = useConversationLabels();
  
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [conversationLabels, setConversationLabels] = useState<Record<number, LabelAssignment[]>>({});

  useEffect(() => {
    if (conversations.length > 0) {
      const conversationIds = conversations.map(c => c.conversation_id);
      fetchLabelsForConversations(conversationIds).then((labels) => {
        const labelsByConversation: Record<number, LabelAssignment[]> = {};
        labels.forEach((label) => {
          if (!labelsByConversation[label.conversation_id]) {
            labelsByConversation[label.conversation_id] = [];
          }
          labelsByConversation[label.conversation_id].push(label);
        });
        setConversationLabels(labelsByConversation);
      });
    }
  }, [conversations]);

  const filteredConversations = selectedLabelIds.length > 0
    ? conversations.filter((conv) => {
        const convLabels = conversationLabels[conv.conversation_id] || [];
        return selectedLabelIds.some((labelId) =>
          convLabels.some((assignment) => assignment.label_id === labelId)
        );
      })
    : conversations;

  const groupedConversations: Record<KanbanCategory, AgentConversation[]> = {
    open: [],
    expiring: [],
    closed: [],
  };

  filteredConversations.forEach(conv => {
    const category = getKanbanCategory(conv);
    groupedConversations[category].push(conv);
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full border rounded-lg bg-card">
        {/* Compact Header */}
        <div className="p-2 border-b space-y-2">
          <div className="flex items-center justify-between">
            <ConversationStats conversations={conversations} />
            
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleSelectAll}
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {allSelected ? 'Limpar seleção' : 'Selecionar todos'}
                </TooltipContent>
              </Tooltip>

              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant={selectedLabelIds.length > 0 ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Filtrar por etiquetas</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-64 p-2" align="end">
                  <LabelFilter
                    selectedLabelIds={selectedLabelIds}
                    onSelectedLabelsChange={setSelectedLabelIds}
                  />
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {selectedConversations.length > 0 && (
            <p className="text-xs text-center text-primary font-medium">
              {selectedConversations.length} selecionada{selectedConversations.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Kanban Columns */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 h-full p-2">
              {columns.map((column) => (
                <div key={column.id} className={cn('flex flex-col rounded-lg', column.bgColor)}>
                  <div className="p-2 border-b">
                    <h3 className={cn('text-sm font-semibold', column.color)}>
                      {column.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {groupedConversations[column.id].length} conversas
                    </p>
                  </div>
                  
                  <ScrollArea className="flex-1 p-2">
                    <div className="space-y-2">
                      {groupedConversations[column.id].map((conversation) => (
                        <ConversationKanbanCard
                          key={conversation.conversation_id}
                          conversation={conversation}
                          selected={selectedConversations.includes(conversation.conversation_id)}
                          onSelect={() => toggleSelection(conversation.conversation_id)}
                          onClick={() => onSelectConversation(conversation.conversation_id)}
                          isActive={activeConversationId === conversation.conversation_id}
                          labels={conversationLabels[conversation.conversation_id] || []}
                          hasNewMessage={hasRecentMessage(conversation)}
                        />
                      ))}
                      {groupedConversations[column.id].length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhuma conversa
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
