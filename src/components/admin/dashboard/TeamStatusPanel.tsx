/**
 * Team Status Panel - Shows online users, scouters in field, and telemarketing online
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Phone, Loader2 } from 'lucide-react';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function TeamStatusPanel() {
  const { totalOnline, onlineUsers, telemarketingOnline } = useOnlinePresence();

  // Fetch scouters working today (with location records today)
  const { data: scoutersInField, isLoading: loadingScoutersField } = useQuery({
    queryKey: ['scouters-in-field-today-team'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();

      const { data, error } = await supabase
        .from('scouter_location_history')
        .select('scouter_bitrix_id')
        .gte('recorded_at', todayStart);

      if (error) throw error;

      const uniqueIds = new Set((data || []).map(d => d.scouter_bitrix_id));
      return uniqueIds.size;
    },
    refetchInterval: 60000,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card: Usuários Online */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              Usuários Online
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              tempo real
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600">{totalOnline}</div>
          <p className="text-xs text-muted-foreground mt-1">conectados no sistema</p>
        </CardContent>
      </Card>

      {/* Card: Scouters em Campo */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Scouters em Campo
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
              hoje
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingScoutersField ? (
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          ) : (
            <div className="text-4xl font-bold text-blue-600">{scoutersInField || 0}</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">trabalhando em área</p>
        </CardContent>
      </Card>

      {/* Card: Telemarketing Online */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-purple-600" />
              Telemarketing Online
            </div>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
              tempo real
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-purple-600">{telemarketingOnline}</div>
          <p className="text-xs text-muted-foreground mt-1">conectados agora</p>
        </CardContent>
      </Card>
    </div>
  );
}
