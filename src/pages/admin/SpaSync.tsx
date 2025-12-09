import { useState, useEffect } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Users, 
  Headphones, 
  Briefcase,
  Copy,
  Check,
  ExternalLink,
  Clock,
  AlertCircle,
  Webhook,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EntityStats {
  count: number;
  lastSync: string | null;
}

interface SyncStatus {
  entityTypeId: number;
  isSyncing: boolean;
  lastResult?: { success: boolean; count: number };
}

const entityTypes = [
  { 
    id: 1096, 
    name: 'Scouters', 
    icon: Users, 
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    description: 'Captadores de leads'
  },
  { 
    id: 1144, 
    name: 'Telemarketing', 
    icon: Headphones, 
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    description: 'Operadores de telemarketing'
  },
  { 
    id: 1156, 
    name: 'Produtores', 
    icon: Briefcase, 
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    description: 'Produtores comerciais'
  },
];

export default function SpaSync() {
  const [stats, setStats] = useState<Record<number, EntityStats>>({});
  const [syncStatus, setSyncStatus] = useState<Record<number, SyncStatus>>({});
  const [syncingAll, setSyncingAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bitrix-spa-webhook`;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Buscar contagem e última sincronização por tipo de entidade
      const promises = entityTypes.map(async (type) => {
        const { count, error } = await supabase
          .from('bitrix_spa_entities')
          .select('*', { count: 'exact', head: true })
          .eq('entity_type_id', type.id);

        const { data: lastItem } = await supabase
          .from('bitrix_spa_entities')
          .select('cached_at')
          .eq('entity_type_id', type.id)
          .order('cached_at', { ascending: false })
          .limit(1)
          .single();

        return {
          typeId: type.id,
          count: count || 0,
          lastSync: lastItem?.cached_at || null,
        };
      });

      const results = await Promise.all(promises);
      const statsMap: Record<number, EntityStats> = {};
      results.forEach((r) => {
        statsMap[r.typeId] = { count: r.count, lastSync: r.lastSync };
      });
      setStats(statsMap);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncIndividual = async (entityTypeId: number) => {
    setSyncStatus((prev) => ({
      ...prev,
      [entityTypeId]: { entityTypeId, isSyncing: true },
    }));

    try {
      const { data, error } = await supabase.functions.invoke('sync-bitrix-spa-entities', {
        body: { entityTypeId },
      });

      if (error) throw error;

      setSyncStatus((prev) => ({
        ...prev,
        [entityTypeId]: {
          entityTypeId,
          isSyncing: false,
          lastResult: { success: true, count: data?.totalSynced || 0 },
        },
      }));

      const typeName = entityTypes.find((t) => t.id === entityTypeId)?.name;
      toast.success(`${data?.totalSynced || 0} ${typeName} sincronizados`);
      loadStats();
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setSyncStatus((prev) => ({
        ...prev,
        [entityTypeId]: {
          entityTypeId,
          isSyncing: false,
          lastResult: { success: false, count: 0 },
        },
      }));
      toast.error('Erro ao sincronizar');
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-bitrix-spa-entities');

      if (error) throw error;

      toast.success(`${data?.totalSynced || 0} entidades sincronizadas`);
      loadStats();
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast.error('Erro ao sincronizar todas as entidades');
    } finally {
      setSyncingAll(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('URL copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Nunca sincronizado';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  return (
    <AdminPageLayout
      title="Central de Sincronização de SPAs"
      description="Sincronize entidades do Bitrix (Scouters, Telemarketing, Produtores)"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cards de Sincronização Individual */}
          <div className="grid md:grid-cols-3 gap-4">
            {entityTypes.map((type) => {
              const Icon = type.icon;
              const status = syncStatus[type.id];
              const entityStats = stats[type.id];
              const isSyncing = status?.isSyncing || false;

              return (
                <Card key={type.id} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${type.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{type.name}</CardTitle>
                          <CardDescription className="text-xs">{type.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Registros:</span>
                      <Badge variant="secondary" className="font-mono">
                        {entityStats?.count || 0}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatLastSync(entityStats?.lastSync || null)}</span>
                    </div>

                    {status?.lastResult && (
                      <div
                        className={`flex items-center gap-2 text-xs ${
                          status.lastResult.success
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {status.lastResult.success ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>
                          {status.lastResult.success
                            ? `${status.lastResult.count} sincronizados`
                            : 'Erro na sincronização'}
                        </span>
                      </div>
                    )}

                    <Button
                      onClick={() => handleSyncIndividual(type.id)}
                      disabled={isSyncing || syncingAll}
                      className="w-full"
                      variant="outline"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Botão Sincronizar Todas */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleSyncAll}
                disabled={syncingAll || Object.values(syncStatus).some((s) => s.isSyncing)}
                className="w-full"
                size="lg"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${syncingAll ? 'animate-spin' : ''}`} />
                {syncingAll ? 'Sincronizando Todas as SPAs...' : 'Sincronizar Todas as SPAs'}
              </Button>
            </CardContent>
          </Card>

          {/* Configuração do Webhook */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Webhook de Saída do Bitrix</CardTitle>
                  <CardDescription className="text-xs">
                    Configure no Bitrix para atualizações automáticas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Como configurar no Bitrix24:</h4>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Acesse Bitrix24 → Aplicativos → Webhooks</li>
                  <li>Crie um novo webhook de saída</li>
                  <li>Cole a URL acima no campo de destino</li>
                  <li>
                    Selecione os eventos:
                    <ul className="ml-4 mt-1 list-disc list-inside">
                      <li>onCrmItemAdd (para Scouters, Telemarketing, Produtores)</li>
                      <li>onCrmItemUpdate</li>
                      <li>onCrmItemDelete</li>
                    </ul>
                  </li>
                  <li>Salve o webhook</li>
                </ol>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <a
                  href="https://maxsystem.bitrix24.com.br/devops/list/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Configurações do Bitrix
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminPageLayout>
  );
}
