import { useState } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  ExternalLink,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  Activity,
  FileText,
  Settings,
  TestTube,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGupshupStats, useGupshupMessages, useGupshupConnection } from '@/hooks/useGupshupStats';
import { useAllGupshupTemplates } from '@/hooks/useGupshupTemplates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WEBHOOK_URL = 'https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/gupshup-webhook';

export default function GupshupIntegration() {
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [sendingTestMessage, setSendingTestMessage] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGupshupStats();
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useGupshupMessages();
  const { data: connectionStatus, refetch: refetchConnection } = useGupshupConnection();
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = useAllGupshupTemplates();

  const handleSyncTemplates = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-gupshup-templates');
      
      if (error) throw error;
      
      toast.success(`${data?.synced || 0} templates sincronizados`);
      refetchTemplates();
      refetchStats();
    } catch (err: any) {
      console.error('Erro ao sincronizar templates:', err);
      toast.error(err.message || 'Erro ao sincronizar templates');
    } finally {
      setSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await refetchConnection();
      if (connectionStatus?.connected) {
        toast.success('Conexão com Gupshup estabelecida!');
      } else {
        toast.error(connectionStatus?.error || 'Falha na conexão');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao testar conexão');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          test: true,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        toast.success('Webhook respondeu corretamente!');
      } else {
        toast.error(`Webhook retornou status ${response.status}`);
      }
    } catch (err: any) {
      toast.error('Erro ao testar webhook: ' + err.message);
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone) {
      toast.error('Informe um número de telefone');
      return;
    }

    setSendingTestMessage(true);
    try {
      const { data, error } = await supabase.functions.invoke('gupshup-send-message', {
        body: {
          phoneNumber: testPhone.replace(/\D/g, ''),
          message: `🔧 Mensagem de teste enviada em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
          type: 'text'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Mensagem de teste enviada!');
      } else {
        toast.error(data?.error || 'Falha ao enviar mensagem');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem de teste');
    } finally {
      setSendingTestMessage(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'read':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Entregue</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Enviado</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Falhou</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminPageLayout
      title="Integração Gupshup (WhatsApp)"
      description="Configure e monitore a integração com WhatsApp via Gupshup"
      backTo="/admin"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refetchStats(); refetchMessages(); refetchTemplates(); }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      }
    >
      {/* Status Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {connectionStatus?.connected ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${connectionStatus?.connected ? 'text-green-600' : 'text-red-600'}`}>
              {connectionStatus?.connected ? 'Conectado' : 'Desconectado'}
            </div>
            {connectionStatus?.sourceNumber && (
              <p className="text-xs text-muted-foreground mt-1">
                Número: {connectionStatus.sourceNumber}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Total de Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.messagesLast24h || 0} nas últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Taxa de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.deliveryRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.deliveredMessages || 0} de {stats?.sentMessages || 0} entregues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats?.templatesApproved || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats?.templatesTotal || 0} aprovados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="webhook">
            <Settings className="w-4 h-4 mr-2" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Templates ({templates?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="diagnostics">
            <TestTube className="w-4 h-4 mr-2" />
            Diagnósticos
          </TabsTrigger>
          <TabsTrigger value="logs">
            <MessageSquare className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Mensagens por Direção</CardTitle>
                <CardDescription>Distribuição de mensagens enviadas e recebidas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-blue-600" />
                    <span>Enviadas (Outbound)</span>
                  </div>
                  <span className="text-xl font-bold">{stats?.sentMessages || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    <span>Recebidas (Inbound)</span>
                  </div>
                  <span className="text-xl font-bold">{stats?.receivedMessages || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status das Mensagens</CardTitle>
                <CardDescription>Breakdown por status de entrega</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>Entregues</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{stats?.deliveredMessages || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span>Pendentes</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">{stats?.pendingMessages || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>Falhas</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{stats?.failedMessages || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Webhook */}
        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Webhook</CardTitle>
              <CardDescription>
                Configure este URL no painel do Gupshup para receber mensagens de entrada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input 
                    value={WEBHOOK_URL} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(WEBHOOK_URL)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Instruções de Configuração</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Acesse o painel do Gupshup: <a href="https://www.gupshup.io/developer/home" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">gupshup.io <ExternalLink className="w-3 h-3" /></a></li>
                    <li>Navegue até sua aplicação WhatsApp</li>
                    <li>Em "Webhook URL", cole a URL acima</li>
                    <li>Selecione os eventos: Message, Message Delivery Status</li>
                    <li>Salve as configurações</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTestWebhook}
                  disabled={testingWebhook}
                >
                  {testingWebhook ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Testar Webhook
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Templates */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Templates WhatsApp</CardTitle>
                <CardDescription>
                  Templates aprovados para envio de mensagens
                </CardDescription>
              </div>
              <Button onClick={handleSyncTemplates} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sincronizar Templates
              </Button>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : templates?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum template encontrado. Clique em "Sincronizar Templates" para importar.
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {templates?.map((template) => (
                      <div 
                        key={template.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.display_name}</span>
                            <Badge 
                              variant="outline" 
                              className={template.status === 'APPROVED' 
                                ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                                : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                              }
                            >
                              {template.status}
                            </Badge>
                            <Badge variant="outline">{template.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {template.template_body}
                          </p>
                        </div>
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded ml-2">
                          {template.element_name}
                        </code>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Diagnósticos */}
        <TabsContent value="diagnostics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Testar Conexão API</CardTitle>
                <CardDescription>Verifica se as credenciais Gupshup estão corretas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${connectionStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{connectionStatus?.connected ? 'API conectada' : 'API desconectada'}</span>
                </div>
                {connectionStatus?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{connectionStatus.error}</AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="w-full"
                >
                  {testingConnection ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wifi className="w-4 h-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enviar Mensagem de Teste</CardTitle>
                <CardDescription>Envia uma mensagem de teste para verificar o envio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testPhone">Número de Telefone</Label>
                  <Input 
                    id="testPhone"
                    placeholder="5511999999999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: código do país + DDD + número (sem espaços ou símbolos)
                  </p>
                </div>
                <Button 
                  onClick={handleSendTestMessage}
                  disabled={sendingTestMessage || !testPhone}
                  className="w-full"
                >
                  {sendingTestMessage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Mensagem de Teste
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Checklist de Configuração</CardTitle>
              <CardDescription>Verifique se todas as configurações estão corretas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  {connectionStatus?.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span>Credenciais API (GUPSHUP_API_KEY, GUPSHUP_APP_ID)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  {stats && stats.templatesApproved > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                  <span>Templates sincronizados ({stats?.templatesApproved || 0} aprovados)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  {stats && stats.receivedMessages > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                  <span>Webhook recebendo mensagens ({stats?.receivedMessages || 0} recebidas)</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  {connectionStatus?.sourceNumber ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                  <span>Número de origem configurado {connectionStatus?.sourceNumber && `(${connectionStatus.sourceNumber})`}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Histórico de Mensagens</CardTitle>
                <CardDescription>Últimas mensagens enviadas e recebidas</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchMessages()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem registrada ainda.
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {messages?.map((msg: any) => (
                      <div 
                        key={msg.id} 
                        className={`p-3 border rounded-lg ${
                          msg.direction === 'inbound' 
                            ? 'border-l-4 border-l-green-500 bg-green-500/5' 
                            : 'border-l-4 border-l-blue-500 bg-blue-500/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {msg.direction === 'inbound' ? (
                              <ArrowDownLeft className="w-4 h-4 text-green-600" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="font-medium">
                              {msg.direction === 'inbound' ? 'Recebida' : 'Enviada'}
                            </span>
                            {getStatusBadge(msg.status)}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">{msg.message_content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Tel: {msg.phone_number}</span>
                          {msg.template_id && <span>Template: {msg.template_id}</span>}
                          {msg.gupshup_message_id && <span>ID: {msg.gupshup_message_id}</span>}
                        </div>
                        {msg.error_message && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertDescription className="text-xs">{msg.error_message}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
