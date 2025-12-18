import { useState, useEffect } from 'react';
import { useMaxTalkConversations } from '@/hooks/useMaxTalkConversations';
import { useMaxTalkMessages } from '@/hooks/useMaxTalkMessages';
import { useMaxTalkUsers } from '@/hooks/useMaxTalkUsers';
import { MaxTalkSidebar } from '@/components/maxtalk/MaxTalkSidebar';
import { MaxTalkChatArea } from '@/components/maxtalk/MaxTalkChatArea';
import { MaxTalkNewChatDialog } from '@/components/maxtalk/MaxTalkNewChatDialog';

export default function MaxTalk() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  const { 
    conversations, 
    loading: loadingConversations,
    createPrivateConversation,
    createGroupConversation,
    markAsRead
  } = useMaxTalkConversations();

  const { 
    messages, 
    loading: loadingMessages,
    sendMessage,
    deleteMessage
  } = useMaxTalkMessages(selectedConversationId);

  const { users, loading: loadingUsers } = useMaxTalkUsers();

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversationId) {
      markAsRead(selectedConversationId);
    }
  }, [selectedConversationId, messages.length, markAsRead]);

  const handleCreatePrivate = async (userId: string) => {
    const convId = await createPrivateConversation(userId);
    if (convId) {
      setSelectedConversationId(convId);
    }
  };

  const handleCreateGroup = async (name: string, userIds: string[]) => {
    const convId = await createGroupConversation(name, userIds);
    if (convId) {
      setSelectedConversationId(convId);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background">
      {/* Sidebar */}
      <div className="w-80 shrink-0">
        <MaxTalkSidebar
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          onNewChat={() => setShowNewChat(true)}
          loading={loadingConversations}
        />
      </div>

      {/* Chat Area */}
      <MaxTalkChatArea
        conversation={selectedConversation}
        messages={messages}
        loading={loadingMessages}
        onSendMessage={sendMessage}
        onDeleteMessage={deleteMessage}
      />

      {/* New Chat Dialog */}
      <MaxTalkNewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        users={users}
        loading={loadingUsers}
        onCreatePrivate={handleCreatePrivate}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}
