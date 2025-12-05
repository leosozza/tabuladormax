/**
 * Online Users Panel - Compact single card
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
    <Avatar className="h-7 w-7 border-2 border-green-500">
      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function OnlineUsersPanel() {
  const { onlineUsers, scoutersOnline, usersOnline } = useOnlinePresence();

  const users = onlineUsers.filter(u => !u.isScouter).slice(0, 3);
  const scouters = onlineUsers.filter(u => u.isScouter).slice(0, 3);

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
                  <UserAvatar key={user.id} user={user} />
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
              <span className="text-xs font-medium">Scouters</span>
            </div>
            <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-primary/10 text-primary">
              {scoutersOnline}
            </Badge>
          </div>
          {scouters.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum scouter online</p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {scouters.map((user) => (
                  <UserAvatar key={user.id} user={user} />
                ))}
              </div>
              {scouters[0] && (
                <span className="text-xs text-muted-foreground truncate">
                  {scouters[0].displayName}{scouters.length > 1 && ` +${scoutersOnline - 1}`}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
