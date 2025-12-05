/**
 * Hook for tracking online user presence using Supabase Realtime
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, Session } from '@supabase/supabase-js';

export interface OnlineUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  isScouter?: boolean;
  isTelemarketing?: boolean;
  onlineAt: string;
}

export function useOnlinePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const setupPresence = async (session: Session) => {
      const user = session.user;
      if (!user) return;

      // Clean up existing channel first
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }

      // Get user profile - defer to avoid deadlock
      setTimeout(async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        // Get user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        const isScouter = roleData?.role === 'agent';

        // Check if user is telemarketing
        const { data: telemarketingMapping } = await supabase
          .from('agent_telemarketing_mapping')
          .select('id')
          .eq('tabuladormax_user_id', user.id)
          .maybeSingle();

        const isTelemarketing = !!telemarketingMapping;

        // Create presence channel
        const presenceChannel = supabase.channel('online-users', {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        const parsePresenceState = (state: Record<string, unknown[]>) => {
          const users: OnlineUser[] = [];
          Object.values(state).forEach((presences) => {
            presences.forEach((p) => {
              const presence = p as Record<string, unknown>;
              if (presence.id) {
                users.push({
                  id: String(presence.id),
                  email: String(presence.email || ''),
                  displayName: String(presence.displayName || 'Usuário'),
                  role: presence.role ? String(presence.role) : undefined,
                  isScouter: Boolean(presence.isScouter),
                  isTelemarketing: Boolean(presence.isTelemarketing),
                  onlineAt: String(presence.onlineAt || new Date().toISOString()),
                });
              }
            });
          });
          return users;
        };

        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel?.presenceState();
            if (state) {
              setOnlineUsers(parsePresenceState(state as Record<string, unknown[]>));
            }
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            setOnlineUsers((current) => {
              const newUsers = [...current];
              (newPresences as unknown[]).forEach((p) => {
                const presence = p as Record<string, unknown>;
                if (presence.id && !newUsers.find(u => u.id === String(presence.id))) {
                  newUsers.push({
                    id: String(presence.id),
                    email: String(presence.email || ''),
                    displayName: String(presence.displayName || 'Usuário'),
                    role: presence.role ? String(presence.role) : undefined,
                    isScouter: Boolean(presence.isScouter),
                    isTelemarketing: Boolean(presence.isTelemarketing),
                    onlineAt: String(presence.onlineAt || new Date().toISOString()),
                  });
                }
              });
              return newUsers;
            });
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            setOnlineUsers((current) => 
              current.filter(user => 
                !(leftPresences as unknown[]).find((p) => {
                  const presence = p as Record<string, unknown>;
                  return presence.id === user.id;
                })
              )
            );
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await presenceChannel?.track({
                id: user.id,
                email: user.email || '',
                displayName: profile?.display_name || user.email || 'Usuário',
                role: roleData?.role || 'agent',
                isScouter: isScouter,
                isTelemarketing: isTelemarketing,
                onlineAt: new Date().toISOString(),
              });
            }
          });

        presenceChannelRef.current = presenceChannel;
        setChannel(presenceChannel);
      }, 0);
    };

    const cleanupPresence = () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
        setChannel(null);
        setOnlineUsers([]);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setupPresence(session);
      } else if (event === 'SIGNED_OUT') {
        cleanupPresence();
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setupPresence(session);
      }
    });

    return () => {
      subscription.unsubscribe();
      cleanupPresence();
    };
  }, []);

  const totalOnline = onlineUsers.length;
  const scoutersOnline = onlineUsers.filter(u => u.isScouter).length;
  const telemarketingOnline = onlineUsers.filter(u => u.isTelemarketing).length;
  const usersOnline = onlineUsers.filter(u => !u.isScouter && !u.isTelemarketing).length;

  return {
    onlineUsers,
    totalOnline,
    scoutersOnline,
    telemarketingOnline,
    usersOnline,
    channel,
  };
}
