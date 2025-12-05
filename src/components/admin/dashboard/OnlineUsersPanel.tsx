/**
 * Online Users Panel - Shows users and scouters online
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, UserCheck } from 'lucide-react';
import { useOnlinePresence, OnlineUser } from '@/hooks/useOnlinePresence';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className="h-7 w-7 border-2 border-green-500">
      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function OnlineUsersPanel() {
  const { onlineUsers, usersOnline } = useOnlinePresence();

  // Fetch scouters working today (with location records today)
  const { data: activeScouters } = useQuery({
    queryKey: ['active-scouters-today'],
    queryFn: async () => {
      // Get today's start
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();

      // Get unique scouters with location records today
      const { data: locationData, error: locError } = await supabase
        .from('scouter_location_history')
        .select('scouter_bitrix_id, scouter_name')
        .gte('recorded_at', todayStart)
        .order('recorded_at', { ascending: false });

      if (locError) throw locError;

      // Get unique scouters
      const uniqueScouters = new Map<number, string>();
      (locationData || []).forEach(loc => {
        if (!uniqueScouters.has(loc.scouter_bitrix_id)) {
          uniqueScouters.set(loc.scouter_bitrix_id, loc.scouter_name);
        }
      });

      return Array.from(uniqueScouters.entries()).slice(0, 10).map(([id, name]) => ({
        id: id.toString(),
        name,
      }));
    },
    refetchInterval: 60000,
  });

  // Get total count of scouters working today
  const { data: scoutersCount } = useQuery({
    queryKey: ['active-scouters-today-count'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();

      const { data, error } = await supabase
        .from('scouter_location_history')
        .select('scouter_bitrix_id')
        .gte('recorded_at', todayStart);

      if (error) throw error;

      // Count unique scouters
      const uniqueIds = new Set((data || []).map(d => d.scouter_bitrix_id));
      return uniqueIds.size;
    },
    refetchInterval: 60000,
  });

  const users = onlineUsers.filter(u => !u.isScouter).slice(0, 3);
  const totalScouters = scoutersCount || 0;
  const displayScouters = activeScouters?.slice(0, 3) || [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Usuários Online
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Users Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Usuários</span>
            </div>
            <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-green-500/10 text-green-600">
              {usersOnline}
            </Badge>
          </div>
          {users.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum usuário online</p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {users.map((user) => (
                  <UserAvatar key={user.id} name={user.displayName} />
                ))}
              </div>
              {users[0] && (
                <span className="text-xs text-muted-foreground truncate">
                  {users[0].displayName}{users.length > 1 && ` +${usersOnline - 1}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Scouters Section */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Scouters em Campo</span>
            </div>
            <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-primary/10 text-primary">
              {totalScouters}
            </Badge>
          </div>
          {displayScouters.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum scouter ativo</p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {displayScouters.map((scouter) => (
                  <UserAvatar key={scouter.id} name={scouter.name} />
                ))}
              </div>
              {displayScouters[0] && (
                <span className="text-xs text-muted-foreground truncate">
                  {displayScouters[0].name.split(' ')[0]}{totalScouters > 1 && ` +${totalScouters - 1}`}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
