import { useState, useEffect } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Key, 
  MoreVertical, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Check,
  Eye,
  Clock,
  Activity,
  Shield,
  FileText,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
  usage_count: number;
}

interface UsageLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number | null;
  response_time_ms: number | null;
  ip_address: string | null;
  created_at: string;
}

const AVAILABLE_SCOPES = [
  { value: '*', label: 'Acesso Total', description: 'Acesso a todos os endpoints' },
  { value: 'scouter', label: 'Scouter App', description: 'API do aplicativo Scouter' },
  { value: 'leads:read', label: 'Leads (Leitura)', description: 'Visualizar leads' },
  { value: 'leads:write', label: 'Leads (Escrita)', description: 'Criar e editar leads' },
  { value: 'flows', label: 'Flows', description: 'Gerenciar fluxos de automação' },
  { value: 'bitrix', label: 'Bitrix24', description: 'Integração com Bitrix' },
  { value: 'chatwoot', label: 'Chatwoot', description: 'Integração com Chatwoot' },
];

export default function ApiKeyManagement() {
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formScopes, setFormScopes] = useState<string[]>(['*']);
  const [formRateLimit, setFormRateLimit] = useState(60);
  const [formExpiresAt, setFormExpiresAt] = useState('');

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Sessão expirada');
        return;
      }

      const { data, error } = await supabase.functions.invoke('api-key-management', {
        body: { action: 'list' }
      });

      if (error) throw error;
      if (data.success) {
        setApiKeys(data.data || []);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Erro ao buscar API Keys:', err);
      toast.error('Erro ao carregar API Keys');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!formName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('api-key-management', {
        body: {
          action: 'generate',
          name: formName.trim(),
          description: formDescription.trim() || null,
          scopes: formScopes,
          rate_limit: formRateLimit,
          expires_at: formExpiresAt || null
        }
      });

      if (error) throw error;
      if (data.success) {
        setGeneratedKey(data.data.api_key);
        setShowGenerateDialog(false);
        setShowKeyDialog(true);
        resetForm();
        fetchApiKeys();
        toast.success('API Key gerada com sucesso!');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Erro ao gerar API Key:', err);
      toast.error(err.message || 'Erro ao gerar API Key');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('api-key-management', {
        body: { action: 'revoke', key_id: keyId }
      });

      if (error) throw error;
      if (data.success) {
        toast.success('API Key revogada');
        fetchApiKeys();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Erro ao revogar API Key:', err);
      toast.error('Erro ao revogar API Key');
    }
  };

  const handleRotate = async (keyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('api-key-management', {
        body: { action: 'rotate', key_id: keyId }
      });

      if (error) throw error;
      if (data.success) {
        setGeneratedKey(data.data.api_key);
        setShowKeyDialog(true);
        fetchApiKeys();
        toast.success('API Key rotacionada!');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Erro ao rotacionar API Key:', err);
      toast.error('Erro ao rotacionar API Key');
    }
  };

  const handleViewUsage = async (keyId: string) => {
    setSelectedKeyId(keyId);
    setLoadingLogs(true);
    setShowUsageDialog(true);

    try {
      const { data, error } = await supabase.functions.invoke('api-key-management', {
        body: { action: 'get_usage', key_id: keyId }
      });

      if (error) throw error;
      if (data.success) {
        setUsageLogs(data.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao buscar logs:', err);
      toast.error('Erro ao carregar logs de uso');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      toast.success('Chave copiada!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormScopes(['*']);
    setFormRateLimit(60);
    setFormExpiresAt('');
  };

  const toggleScope = (scope: string) => {
    if (scope === '*') {
      setFormScopes(['*']);
    } else {
      const newScopes = formScopes.filter(s => s !== '*');
      if (newScopes.includes(scope)) {
        setFormScopes(newScopes.filter(s => s !== scope));
      } else {
        setFormScopes([...newScopes, scope]);
      }
    }
  };

  return (
    <AdminPageLayout
      title="Gerenciamento de API Keys"
      description="Crie e gerencie chaves de acesso à API"
    >
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/admin/api-docs')} className="gap-2">
          <FileText className="w-4 h-4" />
          Ver Documentação
        </Button>

        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gerar Nova API Key</DialogTitle>
              <DialogDescription>
                Crie uma nova chave de acesso para integrações externas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: App Mobile, Integração CRM"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição opcional..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Escopos de Acesso</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <div
                      key={scope.value}
                      className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                      onClick={() => toggleScope(scope.value)}
                    >
                      <Checkbox
                        checked={formScopes.includes(scope.value) || (scope.value !== '*' && formScopes.includes('*'))}
                        disabled={scope.value !== '*' && formScopes.includes('*')}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{scope.label}</p>
                        <p className="text-xs text-muted-foreground">{scope.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rateLimit">Rate Limit (req/min)</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    min={1}
                    max={1000}
                    value={formRateLimit}
                    onChange={(e) => setFormRateLimit(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expira em</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar API Key'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Key Reveal Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Sua API Key
            </DialogTitle>
            <DialogDescription>
              Esta é a única vez que você verá esta chave. Copie e guarde em local seguro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                {generatedKey}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleCopyKey}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ Guarde esta chave em um local seguro. Não será possível visualizá-la novamente.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>
              Entendi, já copiei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Logs Dialog */}
      <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Logs de Uso</DialogTitle>
            <DialogDescription>
              Últimas requisições feitas com esta API Key
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px]">
            {loadingLogs ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : usageLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log de uso encontrado
              </div>
            ) : (
              <div className="space-y-2">
                {usageLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.method}</Badge>
                        <code className="text-xs">{log.endpoint}</code>
                      </div>
                      <Badge
                        variant={log.status_code && log.status_code < 400 ? 'default' : 'destructive'}
                      >
                        {log.status_code || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</span>
                      {log.response_time_ms && <span>{log.response_time_ms}ms</span>}
                      {log.ip_address && <span>{log.ip_address}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* API Keys List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma API Key</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira API Key para começar a integrar sistemas externos.
            </p>
            <Button onClick={() => setShowGenerateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Criar API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map((key) => (
            <Card key={key.id} className={!key.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{key.name}</CardTitle>
                      <Badge variant={key.is_active ? 'default' : 'secondary'}>
                        {key.is_active ? 'Ativa' : 'Revogada'}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-xs">
                      {key.key_prefix}...
                    </CardDescription>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={!key.is_active}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewUsage(key.id)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Logs de Uso
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRotate(key.id)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Rotacionar Chave
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Revogar
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revogar API Key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Todas as integrações usando esta chave
                              deixarão de funcionar imediatamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevoke(key.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revogar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Escopos</p>
                      <p className="font-medium">
                        {key.scopes.includes('*') ? 'Acesso Total' : key.scopes.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Rate Limit</p>
                      <p className="font-medium">{key.rate_limit_per_minute} req/min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Último Uso</p>
                      <p className="font-medium">
                        {key.last_used_at
                          ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true, locale: ptBR })
                          : 'Nunca usada'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Requisições</p>
                      <p className="font-medium">{key.usage_count.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {key.expires_at && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="outline" className="text-xs">
                      Expira em {format(new Date(key.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
