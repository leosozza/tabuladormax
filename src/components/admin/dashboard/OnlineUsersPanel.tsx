/**
 * Online Users Panel
 * Shows online users and scouters with real-time presence
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, UserCheck } from 'lucide-react';
import { useOnlinePresence, OnlineUser } from '@/hooks/useOnlinePresence';

function UserAvatar({ user }: { user: OnlineUser }) {
  const initials = user.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className="h-8 w-8 border-2 border-success">
      <AvatarFallback className="text-xs bg-primary/10 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function OnlineUsersPanel() {
  const { onlineUsers, totalOnline, scoutersOnline, usersOnline } = useOnlinePresence();

  const users = onlineUsers.filter(u => !u.isScouter).slice(0, 5);
  const scouters = onlineUsers.filter(u => u.isScouter).slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Users Online */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Usuários Online
            </CardTitle>
            <Badge variant="secondary" className="bg-success/10 text-success">
              {usersOnline} ativos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum usuário online no momento
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex -space-x-2">
                {users.map((user) => (
                  <UserAvatar key={user.id} user={user} />
                ))}
                {usersOnline > 5 && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                    +{usersOnline - 5}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {users.slice(0, 3).map((user) => (
                  <div key={user.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{user.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scouters Online */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Scouters Online
            </CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {scoutersOnline} ativos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {scouters.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum scouter online no momento
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex -space-x-2">
                {scouters.map((user) => (
                  <UserAvatar key={user.id} user={user} />
                ))}
                {scoutersOnline > 5 && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                    +{scoutersOnline - 5}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {scouters.slice(0, 3).map((user) => (
                  <div key={user.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{user.displayName}</span>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <span className="text-xs text-success">Online</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
