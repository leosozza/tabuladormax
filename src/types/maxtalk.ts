export interface MaxTalkConversation {
  id: string;
  name: string | null;
  type: 'private' | 'group';
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  members?: MaxTalkMember[];
  last_message?: MaxTalkMessage | null;
  unread_count?: number;
  other_member?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface MaxTalkMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  last_read_at: string | null;
  joined_at: string;
  // Joined from profiles
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url?: string | null;
  };
}

export interface MaxTalkMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio';
  media_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  // Joined from profiles
  sender?: {
    id: string;
    display_name: string | null;
    avatar_url?: string | null;
  };
  reply_to?: MaxTalkMessage | null;
}

export interface MaxTalkUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string;
  is_online?: boolean;
}
