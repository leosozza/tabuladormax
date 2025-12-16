import { useState } from 'react';
import { useRateLimitMonitor } from '@/hooks/useRateLimitMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Ban, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  RefreshCw,
  Shield,
  Unlock,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function LoopMonitor() {
  const { stats, alerts, blockedNumbers, loading, refresh, unblockNumber, resolveAlert } = useRateLimitMonitor();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleUnblock = async (phoneNumber: string) => {
    setProcessingId(phoneNumber);
    const success = await unblockNumber(phoneNumber);
    if (success) {
      toast.success(`Número ${phoneNumber} desbloqueado`);
    } else {
      toast.error('Erro ao desbloquear número');
    }
    setProcessingId(null);
  };

  const handleResolveAlert = async (alertId: string) => {
    setProcessingId(alertId);
    const success = await resolveAlert(alertId);
    if (success) {
      toast.success('Alerta resolvido');
    } else {
      toast.error('Erro ao resolver alerta');
    }
    setProcessingId(null);
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'RATE_LIMIT_MINUTE': 'Limite/Minuto',
      'RATE_LIMIT_HOUR': 'Limite/Hora',
      'DUPLICATE_CONTENT': 'Conteúdo Duplicado',
      'GLOBAL_RATE_LIMIT': 'Limite Global',
      'NUMBER_BLOCKED': 'Número Bloqueado'
    };
    return labels[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    return severity === 'critical' ? 'destructive' : 'secondary';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Monitor de Loops Anti-Spam
          </h1>
          <p className="text-muted-foreground">
            Monitoramento de rate limiting e detecção de loops no WhatsApp
          </p>
        </div>
        <Button onClick={refresh} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Msgs/Hora</p>
                <p className="text-2xl font-bold">{stats?.messages_last_hour || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Msgs/24h</p>
                <p className="text-2xl font-bold">{stats?.messages_last_24h || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bloqueadas</p>
                <p className="text-2xl font-bold text-destructive">{stats?.blocked_last_hour || 0}</p>
              </div>
              <Ban className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Ativos</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.active_alerts || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold text-destructive">{stats?.critical_alerts || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nº Bloqueados</p>
                <p className="text-2xl font-bold">{stats?.blocked_numbers || 0}</p>
              </div>
              <Ban className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-2">
            <Ban className="h-4 w-4" />
            Bloqueados ({blockedNumbers.length})
          </TabsTrigger>
          <TabsTrigger value="top-senders" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Top Remetentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Loop Detectados</CardTitle>
              <CardDescription>
                Alertas não resolvidos de rate limiting e loops detectados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
                    <p>Nenhum alerta ativo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <AlertTriangle 
                            className={`h-5 w-5 ${
                              alert.severity === 'critical' ? 'text-destructive' : 'text-yellow-500'
                            }`} 
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium">{alert.phone_number}</span>
                              <Badge variant={getSeverityColor(alert.severity)}>
                                {getAlertTypeLabel(alert.alert_type)}
                              </Badge>
                              {alert.severity === 'critical' && (
                                <Badge variant="destructive">Crítico</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(alert.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                              <span>•</span>
                              <span>{alert.message_count} mensagens em {alert.time_window_seconds}s</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={processingId === alert.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolver
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card>
            <CardHeader>
              <CardTitle>Números Bloqueados</CardTitle>
              <CardDescription>
                Números temporariamente bloqueados por excesso de mensagens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {blockedNumbers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
                    <p>Nenhum número bloqueado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedNumbers.map((blocked) => (
                      <div
                        key={blocked.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <Ban className="h-5 w-5 text-destructive" />
                          <div>
                            <span className="font-mono font-medium">{blocked.phone_number}</span>
                            <div className="text-sm text-muted-foreground mt-1">
                              {blocked.reason}
                            </div>
                            {blocked.blocked_until && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                Bloqueado até: {new Date(blocked.blocked_until).toLocaleString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblock(blocked.phone_number)}
                          disabled={processingId === blocked.phone_number}
                        >
                          <Unlock className="h-4 w-4 mr-1" />
                          Desbloquear
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-senders">
          <Card>
            <CardHeader>
              <CardTitle>Top Remetentes (Última Hora)</CardTitle>
              <CardDescription>
                Números com mais mensagens enviadas na última hora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {!stats?.top_senders || stats.top_senders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4" />
                    <p>Nenhuma mensagem na última hora</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.top_senders.map((sender, index) => (
                      <div
                        key={sender.phone_number}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center font-bold
                            ${index === 0 ? 'bg-yellow-500 text-yellow-950' : 
                              index === 1 ? 'bg-gray-300 text-gray-700' : 
                              index === 2 ? 'bg-orange-400 text-orange-950' : 
                              'bg-muted text-muted-foreground'}
                          `}>
                            {index + 1}
                          </div>
                          <span className="font-mono">{sender.phone_number}</span>
                        </div>
                        <Badge variant={sender.count > 20 ? 'destructive' : sender.count > 10 ? 'secondary' : 'outline'}>
                          {sender.count} msgs
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
