import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MaxTalkMessage } from '@/types/maxtalk';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

export function useMaxTalkMessages(conversationId: string | null) {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<MaxTalkMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;

    setLoading(true);
    try {
      // Fetch messages
      const { data: messagesData, error } = await supabase
        .from('maxtalk_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get unique sender IDs
      const senderIds = [...new Set((messagesData || []).map(m => m.sender_id))];
      
      // Fetch profiles for senders
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Enrich messages with sender info
      const enrichedMessages: MaxTalkMessage[] = (messagesData || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as 'text' | 'image' | 'file' | 'audio',
        sender: profileMap.get(msg.sender_id) ? {
          id: profileMap.get(msg.sender_id)!.id,
          display_name: profileMap.get(msg.sender_id)!.display_name,
          avatar_url: null
        } : undefined
      }));

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  // Send text message
  const sendMessage = async (content: string) => {
    if (!conversationId || !user || !content.trim()) return false;

    try {
      const { error } = await supabase
        .from('maxtalk_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      return false;
    }
  };

  // Send media message
  const sendMediaMessage = async (content: string, mediaUrl: string, type: 'image' | 'file' | 'audio') => {
    if (!conversationId || !user) return false;

    try {
      const { error } = await supabase
        .from('maxtalk_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: type,
          media_url: mediaUrl
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending media:', error);
      toast.error('Erro ao enviar mídia');
      return false;
    }
  };

  // Edit message
  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('maxtalk_messages')
        .update({ 
          content: newContent.trim(),
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Erro ao editar mensagem');
      return false;
    }
  };

  // Delete message (soft delete)
  const deleteMessage = async (messageId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('maxtalk_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao deletar mensagem');
      return false;
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      return;
    }

    fetchMessages();

    const channel = supabase
      .channel(`maxtalk-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maxtalk_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage: MaxTalkMessage = {
            ...payload.new as any,
            message_type: (payload.new as any).message_type as 'text' | 'image' | 'file' | 'audio',
            sender: profile ? {
              id: profile.id,
              display_name: profile.display_name,
              avatar_url: null
            } : undefined
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'maxtalk_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.deleted_at) {
            setMessages(prev => prev.filter(m => m.id !== updated.id));
          } else {
            setMessages(prev => prev.map(m => 
              m.id === updated.id ? { ...m, ...updated } : m
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    sendMediaMessage,
    editMessage,
    deleteMessage,
    refetch: fetchMessages
  };
}
