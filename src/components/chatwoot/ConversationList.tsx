import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import { ConversationStats } from './ConversationStats';
import { useAgentConversations } from '@/hooks/useAgentConversations';

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
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma conversa encontrada
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Conversas aparecerão aqui quando você tabular leads
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.conversation_id}
              conversation={conversation}
              selected={selectedConversations.includes(conversation.conversation_id)}
              onSelect={() => toggleSelection(conversation.conversation_id)}
              onClick={() => onSelectConversation(conversation.conversation_id)}
              isActive={activeConversationId === conversation.conversation_id}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
