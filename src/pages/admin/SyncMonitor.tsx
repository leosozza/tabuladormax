import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Settings2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FieldMappingDisplay } from '@/components/sync/FieldMappingDisplay';
import { SyncFieldMappings } from '@/lib/fieldMappingUtils';
import { getBitrixFieldLabel } from '@/lib/fieldLabelUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const navigate = useNavigate();
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedErrorEvent, setSelectedErrorEvent] = useState<SyncEvent | null>(null);

  const loadSyncEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sync_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      console.log('📊 sync_events carregados:', data?.length || 0);
      
      // ✅ FASE 3.3: Mensagem útil quando não há eventos
      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum evento encontrado. Verifique permissões RLS se você é admin/manager.');
      }
      
      // Cast field_mappings from Json to SyncFieldMappings
      const typedData: SyncEvent[] = (data || []).map((event: any) => ({
        ...event,
        field_mappings: event.field_mappings as SyncFieldMappings | null,
        fields_synced_count: event.fields_synced_count ?? null
      }));
      setSyncEvents(typedData);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast.error('Erro ao carregar eventos de sincronização');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncEvents();
    
    // ✅ Subscrever a mudanças em tempo real
    const channel = supabase
      .channel('sync-events-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sync_events'
        },
        (payload) => {
          console.log('🔔 Novo evento de sync:', payload);
          // Adicionar novo evento à lista (máximo 50)
          setSyncEvents(prev => [payload.new as SyncEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
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

  const copyErrorDetails = () => {
    if (!selectedErrorEvent) return;
    
    const errorDetails = `
=== ERRO DE SINCRONIZAÇÃO ===
ID do Evento: ${selectedErrorEvent.id}
Tipo: ${selectedErrorEvent.event_type}
Direção: ${selectedErrorEvent.direction}
Status: ${selectedErrorEvent.status}
Data/Hora: ${format(new Date(selectedErrorEvent.created_at), 'dd/MM/yyyy HH:mm:ss')}
Duração: ${selectedErrorEvent.sync_duration_ms || 'N/A'}ms

MENSAGEM DE ERRO:
${selectedErrorEvent.error_message || 'Nenhuma mensagem de erro disponível'}

DADOS BRUTOS DO EVENTO:
${JSON.stringify(selectedErrorEvent, null, 2)}
    `.trim();
    
    navigator.clipboard.writeText(errorDetails);
    toast.success('Detalhes do erro copiados para área de transferência');
  };

  return (
    <AdminPageLayout
      title="Central de Sincronização"
      description="Monitore sincronizações entre sistemas"
      backTo="/admin"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/bitrix-integration')}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Configurar Integração
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
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
                        <Badge 
                          className={`text-xs ${getStatusColor(event.status)} ${event.status === 'error' ? 'cursor-pointer hover:opacity-80' : ''}`}
                          onClick={() => event.status === 'error' && setSelectedErrorEvent(event)}
                        >
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

      {/* Dialog de Detalhes do Erro */}
      <Dialog open={!!selectedErrorEvent} onOpenChange={(open) => !open && setSelectedErrorEvent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Detalhes do Erro de Sincronização
            </DialogTitle>
            <DialogDescription>
              Copie esses detalhes para compartilhar ou depurar o problema
            </DialogDescription>
          </DialogHeader>

          {selectedErrorEvent && (
            <div className="space-y-4">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Evento</p>
                  <p className="font-medium">{selectedErrorEvent.event_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Direção</p>
                  <p className="font-medium">{selectedErrorEvent.direction}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">
                    {format(new Date(selectedErrorEvent.created_at), 'dd/MM/yyyy HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="font-medium">{selectedErrorEvent.sync_duration_ms || 'N/A'}ms</p>
                </div>
              </div>

              {/* Mensagem de Erro */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Mensagem de Erro</h4>
                </div>
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <pre className="text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap font-mono">
                    {selectedErrorEvent.error_message || 'Nenhuma mensagem de erro disponível'}
                  </pre>
                </div>
              </div>

              {/* Dados Brutos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Dados Brutos (JSON)</h4>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg max-h-64 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedErrorEvent, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Botão de Copiar */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedErrorEvent(null)}>
                  Fechar
                </Button>
                <Button onClick={copyErrorDetails}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Todos os Detalhes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}
