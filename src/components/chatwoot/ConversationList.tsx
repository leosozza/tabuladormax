import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import { ConversationStats } from './ConversationStats';
import { LabelFilter } from './LabelFilter';
import { useAgentConversations } from '@/hooks/useAgentConversations';
import { useConversationLabels, LabelAssignment } from '@/hooks/useConversationLabels';

interface ConversationListProps {
  onSelectConversation: (conversationId: number) => void;
  activeConversationId: number | null;
}

export function ConversationList({
  onSelectConversation,
  activeConversationId,
}: ConversationListProps) {
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
    <div className="flex flex-col h-full border-r bg-card">
      {/* Stats */}
      <div className="p-4 border-b">
        <ConversationStats conversations={conversations} />
      </div>

      {/* Search & Actions */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtro de Labels */}
        <LabelFilter
          selectedLabelIds={selectedLabelIds}
          onSelectedLabelsChange={setSelectedLabelIds}
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="flex-1"
          >
            {allSelected ? (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Limpar
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                Selecionar todos
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {selectedConversations.length > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            {selectedConversations.length} conversa{selectedConversations.length !== 1 ? 's' : ''} selecionada{selectedConversations.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">Carregando conversas...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {selectedLabelIds.length > 0 
                ? 'Nenhuma conversa com estas etiquetas'
                : 'Nenhuma conversa encontrada'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedLabelIds.length > 0
                ? 'Tente remover alguns filtros'
                : 'Conversas aparecerão aqui quando você tabular leads'}
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
  );
}
