/**
 * Team Status Panel - Shows online users, scouters in field, telemarketing online + rankings
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Phone, Loader2, Trophy, ChevronDown } from 'lucide-react';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month';

interface PeriodOption {
  key: PeriodKey;
  label: string;
  getRange: () => { start: Date; end: Date };
}

const periodOptions: PeriodOption[] = [
  {
    key: 'today',
    label: 'Hoje',
    getRange: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'yesterday',
    label: 'Ontem',
    getRange: () => {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'week',
    label: 'Esta semana',
    getRange: () => {
      const start = new Date();
      const dayOfWeek = start.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as first day
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'month',
    label: 'Mês atual',
    getRange: () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
];

export function TeamStatusPanel() {
  const { totalOnline, telemarketingOnline } = useOnlinePresence();
  const [scouterPeriod, setScouterPeriod] = useState<PeriodKey>('today');
  const [telemarketingPeriod, setTelemarketingPeriod] = useState<PeriodKey>('today');

  // Get today's date range for scouters in field
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  // Get date ranges based on selected periods
  const scouterRange = periodOptions.find(p => p.key === scouterPeriod)?.getRange() || periodOptions[0].getRange();
  const telemarketingRange = periodOptions.find(p => p.key === telemarketingPeriod)?.getRange() || periodOptions[0].getRange();

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

  // Fetch Top 5 Scouters using RPC
  const { data: topScouters, isLoading: loadingTopScouters } = useQuery({
    queryKey: ['top-scouters-rpc', scouterPeriod],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_scouters', {
        p_start_date: scouterRange.start.toISOString(),
        p_end_date: scouterRange.end.toISOString(),
      });

      if (error) throw error;
      return data as { name: string; total: number; confirmadas: number }[];
    },
    refetchInterval: 60000,
  });

  // Fetch Top 5 Telemarketing using RPC
  const { data: topTelemarketing, isLoading: loadingTopTelemarketing } = useQuery({
    queryKey: ['top-telemarketing-rpc', telemarketingPeriod],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_telemarketing', {
        p_start_date: telemarketingRange.start.toISOString(),
        p_end_date: telemarketingRange.end.toISOString(),
      });

      if (error) throw error;
      return data as { name: string; count: number }[];
    },
    refetchInterval: 60000,
  });

  const PeriodSelector = ({ 
    value, 
    onChange 
  }: { 
    value: PeriodKey; 
    onChange: (key: PeriodKey) => void;
  }) => {
    const currentLabel = periodOptions.find(p => p.key === value)?.label || 'Hoje';
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-accent transition-colors flex items-center gap-1"
          >
            {currentLabel}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {periodOptions.map((option) => (
            <DropdownMenuItem
              key={option.key}
              onClick={() => onChange(option.key)}
              className={value === option.key ? 'bg-accent' : ''}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

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
              <PeriodSelector value={scouterPeriod} onChange={setScouterPeriod} />
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
              <PeriodSelector value={telemarketingPeriod} onChange={setTelemarketingPeriod} />
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
