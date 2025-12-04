import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, CheckSquare, Square, Filter } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import { ConversationStats } from './ConversationStats';
import { LabelFilter } from './LabelFilter';
import { AgentConversation } from '@/hooks/useAgentConversations';
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

interface ConversationListProps {
  onSelectConversation: (conversationId: number) => void;
  activeConversationId: number | null;
  conversations: AgentConversation[];
  isLoading: boolean;
  refetch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedConversations: number[];
  toggleSelection: (id: number) => void;
  toggleSelectAll: () => void;
  allSelected: boolean;
}

export function ConversationList({
  onSelectConversation,
  activeConversationId,
  conversations,
  isLoading,
  refetch,
  searchQuery,
  setSearchQuery,
  selectedConversations,
  toggleSelection,
  toggleSelectAll,
  allSelected,
}: ConversationListProps) {
  const { fetchLabelsForConversations } = useConversationLabels();
  
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [conversationLabels, setConversationLabels] = useState<Record<number, LabelAssignment[]>>({});

  // Buscar labels para as conversas visíveis
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

  // Filtrar conversas por labels selecionadas
  const filteredConversations = selectedLabelIds.length > 0
    ? conversations.filter((conv) => {
        const convLabels = conversationLabels[conv.conversation_id] || [];
        return selectedLabelIds.some((labelId) =>
          convLabels.some((assignment) => assignment.label_id === labelId)
        );
      })
    : conversations;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full border rounded-lg bg-card overflow-hidden">
        {/* Compact Header: Stats + Actions */}
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

          {/* Search */}
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

        {/* Conversations List */}
        <ScrollArea className="flex-1 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {selectedLabelIds.length > 0 
                  ? 'Nenhuma conversa com estas etiquetas'
                  : 'Nenhuma conversa encontrada'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.conversation_id}
                conversation={conversation}
                selected={selectedConversations.includes(conversation.conversation_id)}
                onSelect={() => toggleSelection(conversation.conversation_id)}
                onClick={() => onSelectConversation(conversation.conversation_id)}
                isActive={activeConversationId === conversation.conversation_id}
                labels={conversationLabels[conversation.conversation_id] || []}
              />
            ))
          )}
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
