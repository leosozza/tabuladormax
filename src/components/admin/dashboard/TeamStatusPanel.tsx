/**
 * Team Status Panel - Shows online users, scouters in field, telemarketing online + rankings
 * With interactive drill-down for active scouters
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Phone, Loader2, Trophy, ChevronDown, ExternalLink, X } from 'lucide-react';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useTelemarketingOnline } from '@/hooks/useTelemarketingOnline';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month';

interface PeriodOption {
  key: PeriodKey;
  label: string;
  getRange: () => { start: Date; end: Date };
}

interface ActiveScouter {
  name: string;
  bitrix_id: number;
  last_activity: string;
  leads_today: number;
  location?: string;
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
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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

interface TeamStatusPanelProps {
  sourceFilter?: 'all' | 'scouter' | 'meta';
}

export function TeamStatusPanel({ sourceFilter = 'all' }: TeamStatusPanelProps) {
  const { totalOnline, onlineUsers } = useOnlinePresence();
  const { data: telemarketingOnlineData, isLoading: loadingTelemarketing } = useTelemarketingOnline();
  const telemarketingOnlineCount = telemarketingOnlineData?.length || 0;
  const [scouterPeriod, setScouterPeriod] = useState<PeriodKey>('today');
  const [telemarketingPeriod, setTelemarketingPeriod] = useState<PeriodKey>('today');
  const [showScoutersDialog, setShowScoutersDialog] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [showTelemarketingDialog, setShowTelemarketingDialog] = useState(false);
  const navigate = useNavigate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  const scouterRange = periodOptions.find(p => p.key === scouterPeriod)?.getRange() || periodOptions[0].getRange();
  const telemarketingRange = periodOptions.find(p => p.key === telemarketingPeriod)?.getRange() || periodOptions[0].getRange();

  // Fetch active scouters with details
  const { data: activeScoutersData, isLoading: loadingActiveScouters } = useQuery({
    queryKey: ['active-scouters-detailed'],
    queryFn: async () => {
      // Get unique scouters with location today
      const { data: locations } = await supabase
        .from('scouter_location_history')
        .select('scouter_bitrix_id, scouter_name, recorded_at, address')
        .gte('recorded_at', todayStart)
        .order('recorded_at', { ascending: false });

      if (!locations) return { count: 0, scouters: [] };

      // Group by scouter and get latest location
      const scouterMap = new Map<number, ActiveScouter>();
      
      for (const loc of locations) {
        if (!scouterMap.has(loc.scouter_bitrix_id)) {
          scouterMap.set(loc.scouter_bitrix_id, {
            name: loc.scouter_name,
            bitrix_id: loc.scouter_bitrix_id,
            last_activity: loc.recorded_at,
            leads_today: 0,
            location: loc.address || undefined,
          });
        }
      }

      // Get leads count for each scouter today
      const scouterIds = Array.from(scouterMap.keys());
      if (scouterIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('scouter')
          .gte('criado', todayStart)
          .not('scouter', 'is', null);

        if (leadsData) {
          for (const lead of leadsData) {
            // Try to match scouter name
            for (const [id, scouter] of scouterMap) {
              if (lead.scouter?.toLowerCase().includes(scouter.name.toLowerCase().split(' ')[0])) {
                scouter.leads_today++;
                break;
              }
            }
          }
        }
      }

      const scouters = Array.from(scouterMap.values()).sort((a, b) => 
        new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );

      return { count: scouters.length, scouters };
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
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs font-normal gap-1">
            {currentLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32 z-50 bg-popover">
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
    <>
      <div className="space-y-4">
        {/* Row 1: 3 Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card: Usuários Online */}
          <Card 
            className="border-green-500/20 bg-green-500/5 cursor-pointer hover:bg-green-500/10 transition-colors"
            onClick={() => setShowUsersDialog(true)}
          >
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
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-bold text-green-600">{totalOnline}</div>
                  <p className="text-xs text-muted-foreground mt-1">conectados no sistema</p>
                </div>
                <ExternalLink className="h-4 w-4 text-green-600/50" />
              </div>
            </CardContent>
          </Card>

          {/* Card: Scouters em Campo */}
          <Card 
            className="border-blue-500/20 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-colors"
            onClick={() => setShowScoutersDialog(true)}
          >
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
              <div className="flex items-end justify-between">
                {loadingActiveScouters ? (
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                ) : (
                  <div>
                    <div className="text-4xl font-bold text-blue-600">{activeScoutersData?.count || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">trabalhando em área</p>
                  </div>
                )}
                <ExternalLink className="h-4 w-4 text-blue-600/50" />
              </div>
            </CardContent>
          </Card>

          {/* Card: Telemarketing Online */}
          <Card 
            className="border-purple-500/20 bg-purple-500/5 cursor-pointer hover:bg-purple-500/10 transition-colors"
            onClick={() => setShowTelemarketingDialog(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-purple-600" />
                  Telemarketing Online
                </div>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                  últimas 4h
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                {loadingTelemarketing ? (
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                ) : (
                  <div>
                    <div className="text-4xl font-bold text-purple-600">{telemarketingOnlineCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">ativos nas últimas 4h</p>
                  </div>
                )}
                <ExternalLink className="h-4 w-4 text-purple-600/50" />
              </div>
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

      {/* Dialog: Scouters Ativos */}
      <Dialog open={showScoutersDialog} onOpenChange={setShowScoutersDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Scouters em Campo Hoje
            </DialogTitle>
            <DialogDescription>
              {activeScoutersData?.count || 0} scouters trabalhando hoje
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {activeScoutersData?.scouters.map((scouter) => (
              <div
                key={scouter.bitrix_id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{scouter.name}</h4>
                    {scouter.location && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[250px]">
                        📍 {scouter.location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Última atividade: {formatDistanceToNow(new Date(scouter.last_activity), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {scouter.leads_today} leads
                  </Badge>
                </div>
              </div>
            ))}

            {(!activeScoutersData?.scouters || activeScoutersData.scouters.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum scouter em campo hoje
              </p>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              navigate('/scouter-map');
              setShowScoutersDialog(false);
            }}
          >
            Ver no Mapa
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </DialogContent>
      </Dialog>

      {/* Dialog: Usuários Online */}
      <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Usuários Online
            </DialogTitle>
            <DialogDescription>
              {totalOnline} usuários conectados no momento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.displayName || user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.isTelemarketing ? 'Telemarketing' : user.isScouter ? 'Scouter' : 'Geral'}
                  </p>
                </div>
              </div>
            ))}

            {onlineUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Carregando usuários...
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Telemarketing Online */}
      <Dialog open={showTelemarketingDialog} onOpenChange={setShowTelemarketingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-purple-600" />
              Telemarketing Online
            </DialogTitle>
            <DialogDescription>
              {telemarketingOnlineCount} operadores conectados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {telemarketingOnlineData?.map((tm) => (
              <div key={tm.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{tm.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Última atividade: {formatDistanceToNow(new Date(tm.last_activity_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}

            {telemarketingOnlineCount === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum operador online no momento
              </p>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              navigate('/telemarketing');
              setShowTelemarketingDialog(false);
            }}
          >
            Ir para Telemarketing
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
