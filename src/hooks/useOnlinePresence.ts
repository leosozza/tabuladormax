/**
 * Hook for tracking online user presence using Supabase Realtime
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface OnlineUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  isScouter?: boolean;
  onlineAt: string;
}

export function useOnlinePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    let presenceChannel: RealtimeChannel | null = null;

    const setupPresence = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
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

      const isScouter = roleData?.role === 'agent'; // Scouters typically have agent role

      // Create presence channel
      presenceChannel = supabase.channel('online-users', {
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
              onlineAt: new Date().toISOString(),
            });
          }
        });

      setChannel(presenceChannel);
    };

    setupPresence();

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, []);

  const totalOnline = onlineUsers.length;
  const scoutersOnline = onlineUsers.filter(u => u.isScouter).length;
  const usersOnline = onlineUsers.filter(u => !u.isScouter).length;

  return {
    onlineUsers,
    totalOnline,
    scoutersOnline,
    usersOnline,
    channel,
  };
}
