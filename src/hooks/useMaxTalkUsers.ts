import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MaxTalkUser } from '@/types/maxtalk';
import { User } from '@supabase/supabase-js';

export function useMaxTalkUsers() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<MaxTalkUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .neq('id', currentUser.id)
          .order('display_name');

        if (error) throw error;
        
        // Map to MaxTalkUser format
        const mappedUsers: MaxTalkUser[] = (data || []).map(u => ({
          id: u.id,
          display_name: u.display_name,
          avatar_url: null,
          email: u.email || undefined
        }));
        
        setUsers(mappedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  return { users, loading };
}
