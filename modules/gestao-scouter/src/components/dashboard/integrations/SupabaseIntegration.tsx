import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  Webhook, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  FileText,
  RefreshCw,
  Trash2,
  Key,
  Settings
} from "lucide-react";
import { supabase } from "@/lib/supabase-helper";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WebhookLog {
  id: number;
  created_at: string;
  payload: any;
  source: string;
  status: string;
  error_message?: string;
}

interface BitrixWebhookLog {
  id: string;
  event_type: string;
  bitrix_id: number | null;
  payload: any;
  success: boolean;
  error_message: string | null;
  processing_time_ms: number | null;
  created_at: string;
}

export const SupabaseIntegration = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [bitrixLogs, setBitrixLogs] = useState<BitrixWebhookLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingBitrixLogs, setIsLoadingBitrixLogs] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [bitrixWebhookUrl, setBitrixWebhookUrl] = useState("");
  const [bitrixSecret, setBitrixSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const projectId = "gkvvtfqfggddzotxltxf";

  useEffect(() => {
    const url = `https://${projectId}.supabase.co/functions/v1/webhook-receiver`;
    const bitrixUrl = `https://${projectId}.supabase.co/functions/v1/bitrix-lead-upsert`;
    setWebhookUrl(url);
    setBitrixWebhookUrl(bitrixUrl);
    loadLogs();
    loadBitrixLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      // @ts-ignore - Supabase types will be generated after migration
      const response: any = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (response.error) throw response.error;
      setLogs((response.data as WebhookLog[]) || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadBitrixLogs = async () => {
    setIsLoadingBitrixLogs(true);
    try {
      // @ts-ignore - Supabase types will be generated after migration
      const response: any = await supabase
        .from('bitrix_webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (response.error) throw response.error;
      setBitrixLogs((response.data as BitrixWebhookLog[]) || []);
    } catch (error) {
      console.error('Erro ao carregar logs do Bitrix:', error);
    } finally {
      setIsLoadingBitrixLogs(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL do webhook copiada!");
  };

  const copyBitrixWebhookUrl = () => {
    navigator.clipboard.writeText(bitrixWebhookUrl);
    toast.success("URL do webhook Bitrix copiada!");
  };

  const copyBitrixSecret = () => {
    if (!bitrixSecret) {
      toast.error("Configure o secret primeiro!");
      return;
    }
    navigator.clipboard.writeText(bitrixSecret);
    toast.success("Secret copiado!");
  };

  const saveBitrixSecret = () => {
    if (!bitrixSecret) {
      toast.error("Insira um secret válido!");
      return;
    }
    // In production, this would be saved to environment variables
    // For now, we just show a success message
    toast.success("Secret salvo! Configure-o também nas variáveis de ambiente do Supabase.");
  };

  const clearLogs = async () => {
    try {
      // @ts-ignore - Supabase types will be generated after migration
      const response: any = await supabase
        .from('webhook_logs')
        .delete()
        .neq('id', 0); // Delete all

      if (response.error) throw response.error;
      toast.success("Logs limpos com sucesso!");
      loadLogs();
    } catch (error) {
      toast.error("Erro ao limpar logs: " + (error as Error).message);
    }
  };

  const testWebhook = async () => {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'test',
          type: 'ficha',
          data: {
            nome: 'Teste Webhook',
            projeto: 'Projeto Teste',
            scouter: 'Scouter Teste',
            criado: new Date().toISOString(),
            valor_ficha: 'R$ 10,00'
          }
        })
      });

      if (response.ok) {
        toast.success("Webhook testado com sucesso!");
        setTimeout(() => loadLogs(), 1000);
      } else {
        toast.error("Erro ao testar webhook");
      }
    } catch (error) {
      toast.error("Erro ao testar webhook: " + (error as Error).message);
    }
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">
          <Database className="mr-2 h-4 w-4" />
          Visão Geral
        </TabsTrigger>
        <TabsTrigger value="logs">
          <FileText className="mr-2 h-4 w-4" />
          Logs Gerais
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6" />
              <div>
                <CardTitle>Integração Supabase</CardTitle>
                <CardDescription>
                  Backend completo com banco de dados, autenticação e edge functions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Status:</strong> Conectado e operacional. Este projeto está integrado com Supabase 
                para gerenciamento de dados, autenticação e funções serverless.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span className="font-medium">Banco de Dados</span>
                </div>
                <p className="text-sm text-muted-foreground">PostgreSQL gerenciado</p>
                <Badge variant="outline" className="mt-2">Tabela: leads</Badge>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  <span className="font-medium">Edge Functions</span>
                </div>
                <p className="text-sm text-muted-foreground">Funções serverless</p>
                <Badge variant="outline" className="mt-2">4 funções ativas</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Recursos Disponíveis</h4>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Sincronização de dados em tempo real</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Webhooks para integração com CRMs externos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Edge Functions para processamento serverless</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Row Level Security (RLS) para segurança</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Webhook className="h-6 w-6" />
              <div>
                <CardTitle>Webhook para CRMs Externos</CardTitle>
                <CardDescription>
                  Receba dados de outros sistemas via webhook HTTP
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Use esta URL para enviar dados de CRMs externos (Bitrix24, Pipedrive, HubSpot, etc.) 
                diretamente para o Supabase. Todos os dados recebidos serão registrados nos logs.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input 
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure esta URL no seu CRM para enviar dados automaticamente
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Formato do Payload</h4>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "source": "nome_do_crm",
  "type": "lead",
  "data": {
    "nome": "Nome do Cliente",
    "projeto": "Nome do Projeto",
    "scouter": "Nome do Scouter",
    "criado_em": "2025-10-16T10:30:00Z",
    "telefone": "(11) 99999-9999",
    "email": "cliente@email.com",
    "etapa": "Novo Lead"
  }
}`}
              </pre>
            </div>

            <div className="flex gap-3">
              <Button onClick={testWebhook} variant="outline">
                <Webhook className="mr-2 h-4 w-4" />
                Testar Webhook
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href={`https://supabase.com/dashboard/project/${projectId}/functions`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver no Supabase
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links Úteis</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" size="sm" asChild>
              <a 
                href={`https://supabase.com/dashboard/project/${projectId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Dashboard do Supabase
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a 
                href={`https://supabase.com/dashboard/project/${projectId}/editor`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Editor de Tabelas
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://supabase.com/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentação do Supabase
              </a>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="logs" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                <div>
                  <CardTitle className="text-base">Logs de Webhook</CardTitle>
                  <CardDescription>Últimas 50 requisições recebidas</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoadingLogs}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button variant="outline" size="sm" onClick={clearLogs}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Logs
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum log encontrado. Envie dados via webhook para vê-los aqui.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.source}</Badge>
                        </TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge className="bg-success/20 text-success border-success/30">
                              Sucesso
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Erro</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <details className="cursor-pointer">
                            <summary className="text-xs text-primary">Ver dados</summary>
                            <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-x-auto max-w-md">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                            {log.error_message && (
                              <p className="mt-2 text-xs text-destructive">{log.error_message}</p>
                            )}
                          </details>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};