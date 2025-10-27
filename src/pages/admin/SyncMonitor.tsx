import { useState, useEffect } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FieldMappingDisplay } from '@/components/sync/FieldMappingDisplay';
import { SyncFieldMappings } from '@/lib/fieldMappingUtils';

interface SyncEvent {
  id: string;
  event_type: string;
  direction: string;
  status: string;
  error_message: string | null;
  created_at: string;
  sync_duration_ms: number | null;
  field_mappings: SyncFieldMappings | null;
  fields_synced_count: number | null;
}

export default function SyncMonitor() {
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSyncEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSyncEvents(data || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast.error('Erro ao carregar eventos de sincronização');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncEvents();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSyncEvents();
    setRefreshing(false);
    toast.success('Eventos atualizados');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'error':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const successCount = syncEvents.filter(e => e.status === 'success').length;
  const errorCount = syncEvents.filter(e => e.status === 'error').length;
  const pendingCount = syncEvents.filter(e => e.status === 'pending').length;

  return (
    <AdminPageLayout
      title="Central de Sincronização"
      description="Monitore sincronizações entre sistemas"
      backTo="/admin"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      }
    >
      {/* Estatísticas */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{successCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sincronizações bem-sucedidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{errorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sincronizações com erro
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando processamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
          <CardDescription>
            Últimas 50 sincronizações registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando eventos...
            </div>
          ) : syncEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum evento de sincronização encontrado
            </div>
          ) : (
            <div className="space-y-3">
              {syncEvents.map((event) => (
                <Collapsible key={event.id}>
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="mt-0.5">{getStatusIcon(event.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {event.event_type || 'Sincronização'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.direction}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                          {event.status}
                        </Badge>
                        {event.fields_synced_count !== null && event.fields_synced_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {event.fields_synced_count} campos
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss')}
                        {event.sync_duration_ms && (
                          <span className="ml-2">• {event.sync_duration_ms}ms</span>
                        )}
                      </p>
                      {event.error_message && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {event.error_message}
                        </p>
                      )}
                      
                      {/* Field Mappings Section */}
                      {event.field_mappings && event.status === 'success' && (
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                          >
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Ver campos sincronizados
                          </Button>
                        </CollapsibleTrigger>
                      )}
                      
                      <CollapsibleContent className="mt-3">
                        {event.field_mappings && (
                          <div className="border-t pt-3">
                            <FieldMappingDisplay mappings={event.field_mappings} />
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
