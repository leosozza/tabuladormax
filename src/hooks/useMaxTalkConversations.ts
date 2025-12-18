import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MaxTalkConversation, MaxTalkMessage, MaxTalkMember } from '@/types/maxtalk';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

export function useMaxTalkConversations() {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<MaxTalkConversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Get conversations where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('maxtalk_conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = memberData.map(m => m.conversation_id);

      // Get conversation details
      const { data: convData, error: convError } = await supabase
        .from('maxtalk_conversations')
        .select('*')
        .in('id', conversationIds);

      if (convError) throw convError;

      // Get all members for these conversations
      const { data: allMembers, error: membersError } = await supabase
        .from('maxtalk_conversation_members')
        .select('*')
        .in('conversation_id', conversationIds);

      if (membersError) throw membersError;

      // Get profiles for all members
      const memberUserIds = [...new Set((allMembers || []).map(m => m.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', memberUserIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Get last message for each conversation
      const { data: lastMessages, error: messagesError } = await supabase
        .from('maxtalk_messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Build enriched conversations
      const enrichedConversations: MaxTalkConversation[] = (convData || []).map(conv => {
        const members: MaxTalkMember[] = (allMembers || [])
          .filter(m => m.conversation_id === conv.id)
          .map(m => ({
            ...m,
            role: m.role as 'admin' | 'member',
            profile: profileMap.get(m.user_id) || undefined
          }));
        
        const userMember = members.find(m => m.user_id === user.id);
        const otherMember = conv.type === 'private' 
          ? members.find(m => m.user_id !== user.id)
          : null;
        
        // Find last message for this conversation
        const lastMessage = (lastMessages || []).find(m => m.conversation_id === conv.id);
        
        // Count unread messages
        const unreadCount = userMember?.last_read_at
          ? (lastMessages || []).filter(
              m => m.conversation_id === conv.id && 
                   m.sender_id !== user.id &&
                   new Date(m.created_at) > new Date(userMember.last_read_at!)
            ).length
          : (lastMessages || []).filter(
              m => m.conversation_id === conv.id && m.sender_id !== user.id
            ).length;

        return {
          ...conv,
          type: conv.type as 'private' | 'group',
          members,
          last_message: lastMessage ? {
            ...lastMessage,
            message_type: lastMessage.message_type as 'text' | 'image' | 'file' | 'audio'
          } : null,
          unread_count: unreadCount,
          other_member: otherMember?.profile ? {
            id: otherMember.profile.id,
            display_name: otherMember.profile.display_name,
            avatar_url: null
          } : null
        };
      });

      // Sort by last message date
      enrichedConversations.sort((a, b) => {
        const dateA = a.last_message?.created_at || a.created_at;
        const dateB = b.last_message?.created_at || b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create private conversation (using atomic RPC to avoid duplicates)
  const createPrivateConversation = async (otherUserId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('get_or_create_private_conversation', {
        p_user_id: user.id,
        p_other_user_id: otherUserId
      });

      if (error) throw error;

      await fetchConversations();
      return data; // UUID da conversa (existente ou nova)
    } catch (error) {
      console.error('Error creating private conversation:', error);
      toast.error('Erro ao criar conversa');
      return null;
    }
  };

  // Create group conversation
  const createGroupConversation = async (name: string, memberIds: string[]) => {
    if (!user) return null;

    try {
      const { data: newConv, error: convError } = await supabase
        .from('maxtalk_conversations')
        .insert({
          name,
          type: 'group',
          created_by: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add creator as admin and other members
      const members = [
        { conversation_id: newConv.id, user_id: user.id, role: 'admin' as const },
        ...memberIds.map(id => ({ 
          conversation_id: newConv.id, 
          user_id: id, 
          role: 'member' as const 
        }))
      ];

      const { error: membersError } = await supabase
        .from('maxtalk_conversation_members')
        .insert(members);

      if (membersError) throw membersError;

      await fetchConversations();
      toast.success('Grupo criado!');
      return newConv.id;
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Erro ao criar grupo');
      return null;
    }
  };

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('maxtalk_conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('maxtalk-conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maxtalk_messages'
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maxtalk_conversation_members',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    createPrivateConversation,
    createGroupConversation,
    markAsRead,
    refetch: fetchConversations
  };
}
