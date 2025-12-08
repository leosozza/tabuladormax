/**
 * System Status Panel - Interactive with drill-down actions
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Zap, 
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings,
  Activity
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type StatusType = 'healthy' | 'warning' | 'critical';

interface StatusItem {
  id: string;
  icon: typeof RefreshCw;
  label: string;
  status: StatusType;
  value: string;
  subValue: string;
  details: {
    description: string;
    suggestions: string[];
    actions: Array<{
      label: string;
      onClick: () => void;
    }>;
  };
}

export function SystemStatusPanel() {
  const [selectedItem, setSelectedItem] = useState<StatusItem | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['system-status-detailed'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { count: pendingSync } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('sync_status', 'pending')
        .gte('criado', sevenDaysAgo);

      const { count: syncErrors } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('has_sync_errors', true)
        .gte('criado', sevenDaysAgo);

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: syncs24h } = await supabase
        .from('sync_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);

      // Multiple latency tests for accuracy
      const latencies: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        await supabase.from('profiles').select('id').limit(1);
        latencies.push(Math.round(performance.now() - start));
      }
      const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

      return {
        pending: pendingSync || 0,
        errors: syncErrors || 0,
        latency: avgLatency,
        syncs24h: syncs24h || 0,
      };
    },
    refetchInterval: 60000,
  });

  const getStatus = (): StatusType => {
    if ((data?.errors || 0) > 100) return 'critical';
    if ((data?.pending || 0) > 50) return 'warning';
    return 'healthy';
  };

  const status = getStatus();
  const statusConfig = {
    healthy: { label: 'Operacional', color: 'text-green-500', bg: 'bg-green-500/10' },
    warning: { label: 'Atenção', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    critical: { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  const handleForceSync = async () => {
    toast.info('Iniciando ressincronização...');
    await queryClient.invalidateQueries({ queryKey: ['leads'] });
    toast.success('Cache de leads atualizado');
  };

  const items: StatusItem[] = [
    { 
      id: 'sync',
      icon: RefreshCw, 
      label: 'Sincronização', 
      status: data?.errors === 0 ? 'healthy' : 'warning' as StatusType, 
      value: `Pendentes: ${data?.pending || 0}`, 
      subValue: `Com ${data?.errors || 0} erros`,
      details: {
        description: 'Status da sincronização entre o sistema e o Bitrix24.',
        suggestions: data?.errors && data.errors > 0 ? [
          'Verifique a conexão com o Bitrix24',
          'Revise os leads com erro de sync',
          'Execute uma ressincronização forçada',
        ] : [
          'Sistema sincronizando normalmente',
          'Nenhuma ação necessária',
        ],
        actions: [
          {
            label: 'Ver Leads com Erro',
            onClick: () => navigate('/admin/sync-errors'),
          },
          {
            label: 'Forçar Ressincronização',
            onClick: handleForceSync,
          },
          {
            label: 'Config. de Mapeamento',
            onClick: () => navigate('/admin/bitrix-mapping'),
          },
        ],
      },
    },
    { 
      id: 'syncs24h',
      icon: Zap, 
      label: 'Syncs 24h', 
      status: 'healthy' as StatusType, 
      value: `${data?.syncs24h || 0} eventos`, 
      subValue: 'Últimas 24h',
      details: {
        description: 'Volume de eventos de sincronização nas últimas 24 horas.',
        suggestions: [
          `${data?.syncs24h || 0} sincronizações realizadas`,
          'Média esperada: 500-2000 eventos/dia',
          data?.syncs24h && data.syncs24h < 100 ? 'Volume baixo - verificar integrações' : 'Volume normal de atividade',
        ],
        actions: [
          {
            label: 'Ver Histórico de Sync',
            onClick: () => toast.info('Funcionalidade em desenvolvimento'),
          },
        ],
      },
    },
    { 
      id: 'database',
      icon: Database, 
      label: 'Database', 
      status: (data?.latency || 0) > 200 ? 'warning' : 'healthy' as StatusType, 
      value: `Latência: ${data?.latency || 0}ms`, 
      subValue: (data?.latency || 0) > 200 ? 'Lento' : 'Saudável',
      details: {
        description: 'Tempo de resposta do banco de dados.',
        suggestions: (data?.latency || 0) > 200 ? [
          'Latência acima do ideal (>200ms)',
          'Pode indicar sobrecarga ou problema de rede',
          'Considere otimizar consultas pesadas',
          'Verifique índices das tabelas principais',
        ] : [
          'Latência dentro do esperado (<200ms)',
          'Performance do banco está saudável',
        ],
        actions: (data?.latency || 0) > 200 ? [
          {
            label: 'Otimizar Consultas',
            onClick: () => toast.info('Acesse o painel de administração para otimizações'),
          },
          {
            label: 'Limpar Cache',
            onClick: async () => {
              queryClient.clear();
              toast.success('Cache local limpo');
              await refetch();
            },
          },
          {
            label: 'Testar Novamente',
            onClick: () => refetch(),
          },
        ] : [
          {
            label: 'Testar Novamente',
            onClick: () => refetch(),
          },
        ],
      },
    },
  ];

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Status do Sistema
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Badge variant="outline" className={`${statusConfig[status].color} text-xs`}>
                {status === 'healthy' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {status !== 'healthy' && <AlertCircle className="h-3 w-3 mr-1" />}
                {statusConfig[status].label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => {
            const cfg = statusConfig[item.status];
            const hasIssue = item.status !== 'healthy';
            
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all hover:bg-accent/50 ${
                  hasIssue ? 'cursor-pointer' : 'cursor-pointer'
                }`}
              >
                <div className={`p-1.5 rounded ${cfg.bg}`}>
                  <item.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{item.label}</span>
                    <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{isLoading ? '...' : item.value}</span>
                    <span>{isLoading ? '...' : item.subValue}</span>
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && (
                <>
                  <selectedItem.icon className={`h-5 w-5 ${statusConfig[selectedItem.status].color}`} />
                  {selectedItem.label}
                  <Badge variant="outline" className={`${statusConfig[selectedItem.status].color} text-xs ml-auto`}>
                    {statusConfig[selectedItem.status].label}
                  </Badge>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.details.description}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium mb-1">{selectedItem.value}</div>
                <div className="text-xs text-muted-foreground">{selectedItem.subValue}</div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Diagnóstico:</h4>
                <ul className="space-y-1">
                  {selectedItem.details.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Ações:</h4>
                {selectedItem.details.actions.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs justify-between"
                    onClick={() => {
                      action.onClick();
                      setSelectedItem(null);
                    }}
                  >
                    {action.label}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
