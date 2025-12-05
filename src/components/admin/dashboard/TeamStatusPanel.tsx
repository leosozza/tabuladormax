/**
 * Team Status Panel - Shows online users, scouters in field, telemarketing online + rankings
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Phone, Loader2, Trophy } from 'lucide-react';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function TeamStatusPanel() {
  const { totalOnline, telemarketingOnline } = useOnlinePresence();

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  // Get 30 days ago for telemarketing ranking
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  // Fetch scouters working today (with location records today)
  const { data: scoutersInField, isLoading: loadingScoutersField } = useQuery({
    queryKey: ['scouters-in-field-today-team'],
    queryFn: async () => {
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

  // Fetch Top 5 Scouters today
  const { data: topScouters, isLoading: loadingTopScouters } = useQuery({
    queryKey: ['top-scouters-today', todayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('scouter, ficha_confirmada')
        .not('scouter', 'is', null)
        .gte('criado', todayStart);

      if (error) throw error;

      // Group and count leads + confirmed
      const scouterStats: Record<string, { total: number; confirmadas: number }> = {};
      data?.forEach(lead => {
        if (!lead.scouter) return;
        if (!scouterStats[lead.scouter]) {
          scouterStats[lead.scouter] = { total: 0, confirmadas: 0 };
        }
        scouterStats[lead.scouter].total++;
        if (lead.ficha_confirmada) scouterStats[lead.scouter].confirmadas++;
      });

      return Object.entries(scouterStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
    refetchInterval: 60000,
  });

  // Fetch Top 5 Telemarketing (last 30 days - agendamentos)
  const { data: topTelemarketing, isLoading: loadingTopTelemarketing } = useQuery({
    queryKey: ['top-telemarketing-agendamentos', thirtyDaysAgoStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('responsible')
        .eq('etapa', 'Agendados')
        .not('responsible', 'is', null)
        .gte('data_criacao_agendamento', thirtyDaysAgoStr);

      if (error) throw error;

      // Group and count by telemarketing
      const telemarketingStats: Record<string, number> = {};
      data?.forEach(lead => {
        if (!lead.responsible) return;
        if (!telemarketingStats[lead.responsible]) {
          telemarketingStats[lead.responsible] = 0;
        }
        telemarketingStats[lead.responsible]++;
      });

      return Object.entries(telemarketingStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-4">
      {/* Row 1: 3 Status Cards */}
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

      {/* Row 2: Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Scouters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top 5 Scouters
              </div>
              <Badge variant="outline">hoje</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTopScouters ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : topScouters && topScouters.length > 0 ? (
              <div className="space-y-2">
                {topScouters.map((scouter, index) => (
                  <div key={scouter.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                        {index + 1}.
                      </span>
                      <span className="text-sm truncate max-w-[150px]">{scouter.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {scouter.total} fichas
                      </Badge>
                      <Badge variant="secondary" className="text-xs text-green-600 bg-green-500/10">
                        {scouter.confirmadas} ✓
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado disponível
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Telemarketing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top 5 Telemarketing
              </div>
              <Badge variant="outline">últimos 30 dias</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTopTelemarketing ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : topTelemarketing && topTelemarketing.length > 0 ? (
              <div className="space-y-2">
                {topTelemarketing.map((tm, index) => (
                  <div key={tm.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                        {index + 1}.
                      </span>
                      <span className="text-sm truncate max-w-[180px]">{tm.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {tm.count} agendados
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado disponível
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
