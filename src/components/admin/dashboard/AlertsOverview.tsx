/**
 * Alerts Overview Panel - Interactive with drill-down
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  X
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

interface AlertDetail {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  action?: {
    label: string;
    path?: string;
    onClick?: () => void;
  };
}

export function AlertsOverview() {
  const [selectedType, setSelectedType] = useState<'critical' | 'warning' | 'info' | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['alerts-overview-detailed'],
    queryFn: async () => {
      // Sync errors
      const { count: syncErrors } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('has_sync_errors', true);

      // Pending sync (recent only)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: pendingSync } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('sync_status', 'pending')
        .gte('criado', sevenDaysAgo);

      // Leads without photo
      const { count: noPhoto } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .is('photo_url', null)
        .gte('criado', sevenDaysAgo);

      // Leads pending confirmation
      const { count: pendingConfirmation } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ficha_confirmada', false)
        .not('data_agendamento', 'is', null)
        .gte('criado', sevenDaysAgo);

      const details: AlertDetail[] = [];

      // Critical alerts
      if ((syncErrors || 0) > 100) {
        details.push({
          id: 'sync-errors-critical',
          type: 'critical',
          title: 'Muitos Erros de Sincronização',
          description: `${syncErrors} leads com erros de sync. Isso pode indicar problemas com a integração Bitrix.`,
          count: syncErrors || 0,
          action: {
            label: 'Ver Leads com Erro',
            path: '/admin/sync-errors',
          },
        });
      }

      // Warning alerts
      if ((pendingSync || 0) > 50) {
        details.push({
          id: 'pending-sync',
          type: 'warning',
          title: 'Sincronização Pendente',
          description: `${pendingSync} leads aguardando sincronização nos últimos 7 dias.`,
          count: pendingSync || 0,
          action: {
            label: 'Forçar Sincronização',
            onClick: () => {
              queryClient.invalidateQueries({ queryKey: ['leads'] });
            },
          },
        });
      }

      if ((noPhoto || 0) > 20) {
        details.push({
          id: 'no-photo',
          type: 'warning',
          title: 'Leads sem Foto',
          description: `${noPhoto} leads recentes sem foto cadastrada.`,
          count: noPhoto || 0,
          action: {
            label: 'Ver Leads sem Foto',
            path: '/scouter/leads?filter=no_photo',
          },
        });
      }

      // Info alerts
      if ((pendingConfirmation || 0) > 10) {
        details.push({
          id: 'pending-confirmation',
          type: 'info',
          title: 'Fichas Pendentes de Confirmação',
          description: `${pendingConfirmation} fichas agendadas aguardando confirmação.`,
          count: pendingConfirmation || 0,
          action: {
            label: 'Ver Fichas',
            path: '/gestao-scouter',
          },
        });
      }

      return {
        details,
        summary: {
          critical: details.filter(d => d.type === 'critical').length,
          warning: details.filter(d => d.type === 'warning').length,
          info: details.filter(d => d.type === 'info').length,
        },
      };
    },
    refetchInterval: 120000,
  });

  const total = (alerts?.summary.critical || 0) + (alerts?.summary.warning || 0) + (alerts?.summary.info || 0);
  const hasAlerts = total > 0;

  const filteredAlerts = selectedType 
    ? alerts?.details.filter(d => d.type === selectedType) || []
    : [];

  const handleAction = (alert: AlertDetail) => {
    if (alert.action?.path) {
      navigate(alert.action.path);
    } else if (alert.action?.onClick) {
      alert.action.onClick();
    }
    setSelectedType(null);
  };

  const typeConfig = {
    critical: { 
      label: 'Críticos', 
      icon: AlertCircle, 
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
    },
    warning: { 
      label: 'Avisos', 
      icon: AlertTriangle, 
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
    },
    info: { 
      label: 'Informações', 
      icon: Info, 
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/30',
    },
  };

  return (
    <>
      <Card className={`h-full ${alerts?.summary.critical ? 'border-destructive/50' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Alertas do Sistema
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
              <Badge 
                variant={alerts?.summary.critical ? 'destructive' : 'outline'} 
                className={`text-xs ${alerts?.summary.critical ? 'animate-pulse' : ''}`}
              >
                {total} {total === 1 ? 'alerta' : 'alertas'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasAlerts ? (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Sistema estável</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(['critical', 'warning', 'info'] as const).map((type) => {
                const config = typeConfig[type];
                const count = alerts?.summary[type] || 0;
                const Icon = config.icon;
                
                return (
                  <button
                    key={type}
                    onClick={() => count > 0 && setSelectedType(type)}
                    disabled={count === 0}
                    className={`text-center p-2 rounded ${config.bg} transition-all ${
                      count > 0 ? 'cursor-pointer hover:scale-105 hover:ring-2 ring-offset-2 ring-offset-background' : 'opacity-50 cursor-not-allowed'
                    } ${count > 0 ? `ring-${type === 'critical' ? 'destructive' : type === 'warning' ? 'yellow-500' : 'primary'}` : ''}`}
                  >
                    <Icon className={`h-4 w-4 ${config.color} mx-auto mb-1`} />
                    <p className={`text-lg font-bold ${config.color}`}>
                      {isLoading ? '-' : count}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{config.label}</p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedType !== null} onOpenChange={(open) => !open && setSelectedType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedType && (
                <>
                  {(() => {
                    const Icon = typeConfig[selectedType].icon;
                    return <Icon className={`h-5 w-5 ${typeConfig[selectedType].color}`} />;
                  })()}
                  {typeConfig[selectedType!].label}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {filteredAlerts.length} {filteredAlerts.length === 1 ? 'alerta encontrado' : 'alertas encontrados'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${typeConfig[alert.type].bg} ${typeConfig[alert.type].border}`}
              >
                <h4 className="font-medium text-sm mb-1">{alert.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>
                {alert.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => handleAction(alert)}
                  >
                    {alert.action.label}
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
