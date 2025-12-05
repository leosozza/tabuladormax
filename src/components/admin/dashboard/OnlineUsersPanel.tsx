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

  // Fetch active scouters from database (scouters with recent activity)
  const { data: activeScouters } = useQuery({
    queryKey: ['active-scouters'],
    queryFn: async () => {
      // Get scouters with activity in last 24 hours or status ativo
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('scouters')
        .select('id, name, last_activity_at, status')
        .eq('status', 'ativo')
        .gte('last_activity_at', twentyFourHoursAgo)
        .order('last_activity_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const users = onlineUsers.filter(u => !u.isScouter).slice(0, 3);
  const scoutersCount = activeScouters?.length || 0;
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
              <span className="text-xs font-medium">Scouters Ativos</span>
            </div>
            <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-primary/10 text-primary">
              {scoutersCount}
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
                  {displayScouters[0].name.split(' ')[0]}{scoutersCount > 1 && ` +${scoutersCount - 1}`}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
