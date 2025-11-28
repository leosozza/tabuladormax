import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSyscallConfig } from "@/hooks/useSyscallConfig";
import { Loader2, Terminal, Copy, Check } from "lucide-react";
import { MainLayout } from "@/components/layouts/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function DiscadorConfig() {
  const { config, saveConfig, isSaving, testConnection, isTesting, testProxy, isTestingProxy, connectionLogs } = useSyscallConfig();
  const [apiToken, setApiToken] = useState(config?.api_token || "");
  const [apiUrl, setApiUrl] = useState(config?.api_url || "http://maxfama.syscall.com.br/crm");
  const [defaultRoute, setDefaultRoute] = useState(config?.default_route || "9");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSave = () => {
    saveConfig({ api_token: apiToken, api_url: apiUrl, default_route: defaultRoute });
  };

  const handleTest = () => {
    testConnection();
  };

  const handleTestProxy = () => {
    testProxy();
  };

  const handleCopyLog = (log: any, index: number) => {
    const targetUrl = log.response?.diagnostics?.targetUrl || 'N/A';
    const requestId = log.response?.requestId || 'N/A';
    const statusCode = log.status_code || log.response?.statusCode || 'N/A';
    const method = log.response?.diagnostics?.method || 'GET';
    
    const report = `=== Relatório de Erro Syscall ===
Data/Hora: ${new Date(log.timestamp).toLocaleString('pt-BR')}
Tipo: ${log.type === 'proxy' ? 'PROXY' : 'SYSCALL'}
Status: ${log.success ? 'SUCESSO' : 'ERRO'}

URLs:
- Proxy: ${log.url || 'N/A'}
- Target Syscall: ${targetUrl}

Método: ${method}
Status Code: ${statusCode}
Request ID: ${requestId}
${log.origin_ip ? `IP de Origem: ${log.origin_ip}` : ''}
Tempo: ${log.duration_ms || 'N/A'}ms

${log.error ? `Erro: ${log.error}` : ''}
${log.error_type ? `Tipo do Erro: ${log.error_type}` : ''}
${log.suggestion ? `Sugestão: ${log.suggestion}` : ''}

Resposta Completa:
${JSON.stringify(log.response, null, 2)}

Debug Info:
${JSON.stringify(log.debug, null, 2)}`;

    navigator.clipboard.writeText(report).then(() => {
      setCopiedIndex(index);
      toast.success("Log copiado para área de transferência!");
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(() => {
      toast.error("Erro ao copiar log");
    });
  };

  return (
    <MainLayout
      title="Configuração do Syscall"
      subtitle="Configure a conexão com o discador"
    >
      <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Proxy Syscall
          </CardTitle>
          <CardDescription>
            Servidor intermediário com IP fixo para conexão com Syscall
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted rounded-lg">
            <div>
              <span className="text-muted-foreground">URL do Proxy:</span>
              <div className="font-mono mt-1 font-semibold">https://syscall.ybrasil.com.br</div>
            </div>
            <div>
              <span className="text-muted-foreground">IP Fixo:</span>
              <div className="font-mono mt-1 text-orange-500 font-semibold">72.61.51.225</div>
            </div>
          </div>
          
          <Button variant="outline" onClick={handleTestProxy} disabled={isTestingProxy}>
            {isTestingProxy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            🔍 Testar Proxy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Syscall</CardTitle>
          <CardDescription>Credenciais de acesso à API do discador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">URL da API</Label>
            <Input
              id="api-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://maxfama.syscall.com.br/crm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-token">Token da API</Label>
            <Input
              id="api-token"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Insira o token fornecido pelo Syscall"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-route">Rota Padrão</Label>
            <Input
              id="default-route"
              value={defaultRoute}
              onChange={(e) => setDefaultRoute(e.target.value)}
              placeholder="9"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configuração
            </Button>

            <Button variant="outline" onClick={handleTest} disabled={isTesting || !apiToken}>
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Log de Conexão
          </CardTitle>
          <CardDescription>Histórico de testes de conexão com a API</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border bg-slate-950 p-4 font-mono text-sm">
            {connectionLogs.length > 0 ? (
              <div className="space-y-3">
                {connectionLogs.map((log, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded p-3 border-l-4",
                      log.success
                        ? "bg-green-950/20 border-green-500 text-green-400"
                        : "bg-red-950/20 border-red-500 text-red-400"
                    )}
                  >
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 flex-wrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        log.type === 'proxy' 
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-green-500/20 text-green-400 border border-green-500/30"
                      )}>
                        {log.type === 'proxy' ? 'PROXY' : 'SYSCALL'}
                      </span>
                      {log.error_type && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          log.error_type === 'TIMEOUT' && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
                          log.error_type === 'DNS_ERROR' && "bg-purple-500/20 text-purple-400 border border-purple-500/30",
                          log.error_type === 'CONNECTION_REFUSED' && "bg-red-500/20 text-red-400 border border-red-500/30",
                          log.error_type === 'NETWORK_ERROR' && "bg-orange-500/20 text-orange-400 border border-orange-500/30",
                          log.error_type === 'CONFIGURATION_ERROR' && "bg-pink-500/20 text-pink-400 border border-pink-500/30",
                          !['TIMEOUT', 'DNS_ERROR', 'CONNECTION_REFUSED', 'NETWORK_ERROR', 'CONFIGURATION_ERROR'].includes(log.error_type) && "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                        )}>
                          {log.error_type}
                        </span>
                      )}
                      <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    {log.success ? (
                      <>
                        <div className="font-semibold">✓ Conexão estabelecida</div>
                        <div className="text-xs text-slate-400 mt-2 space-y-1">
                          <div>URL Proxy: {log.url}</div>
                          {log.response?.diagnostics?.targetUrl && (
                            <div>URL Target: {log.response.diagnostics.targetUrl}</div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">
                              {log.response?.diagnostics?.method || 'GET'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {log.status_code}
                            </Badge>
                            {log.response?.requestId && (
                              <span className="text-blue-400">ID: {log.response.requestId}</span>
                            )}
                          </div>
                          <div>Tempo: {log.duration_ms}ms</div>
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                            Ver resposta completa
                          </summary>
                          <pre className="text-xs text-slate-500 mt-2 p-2 bg-slate-900 rounded overflow-x-auto">
                            {JSON.stringify(log.response, null, 2)}
                          </pre>
                        </details>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-6 text-[10px] text-slate-400 hover:text-slate-300"
                          onClick={() => handleCopyLog(log, index)}
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 h-3 w-3" />
                              Copiar para Suporte
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold">✗ Erro: {log.error}</div>
                        {log.suggestion && (
                          <div className="mt-2 text-xs text-yellow-400 bg-yellow-950/20 border border-yellow-500/30 rounded p-2">
                            💡 <span className="font-semibold">Sugestão:</span> {log.suggestion}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-2 space-y-1">
                          {log.url && <div>URL Proxy: {log.url}</div>}
                          {log.response?.diagnostics?.targetUrl && (
                            <div className="text-orange-300 font-semibold">
                              URL Target Syscall: {log.response.diagnostics.targetUrl}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {log.response?.diagnostics?.method && (
                              <Badge variant="destructive" className="text-[10px]">
                                {log.response.diagnostics.method}
                              </Badge>
                            )}
                            {(log.status_code || log.response?.statusCode) && (
                              <Badge variant="destructive" className="text-[10px]">
                                {log.status_code || log.response.statusCode}
                              </Badge>
                            )}
                            {log.response?.requestId && (
                              <span className="text-blue-400 font-semibold">
                                ID: {log.response.requestId}
                              </span>
                            )}
                          </div>
                          {log.origin_ip && (
                            <div className="text-orange-400 font-semibold">
                              IP de origem: {log.origin_ip}
                            </div>
                          )}
                          {log.duration_ms && <div>Tempo: {log.duration_ms}ms</div>}
                        </div>
                        <details className="mt-2" open>
                          <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                            Resposta completa
                          </summary>
                          <pre className="text-xs text-slate-500 mt-2 p-2 bg-slate-900 rounded overflow-x-auto">
                            {JSON.stringify(log.response, null, 2)}
                          </pre>
                        </details>
                        {log.debug && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                              🔍 Debug Info
                            </summary>
                            <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-700">
                              <pre className="text-[10px] text-slate-400 overflow-x-auto">
                                {JSON.stringify(log.debug, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-6 text-[10px] text-red-400 hover:text-red-300"
                          onClick={() => handleCopyLog(log, index)}
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 h-3 w-3" />
                              Copiar para Suporte
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                Nenhum teste realizado ainda. Clique em "Testar Conexão".
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de Agentes</CardTitle>
          <CardDescription>
            Configure o código de agente para cada usuário do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Funcionalidade em desenvolvimento. Por enquanto, configure os mapeamentos diretamente no banco de dados.
          </p>
        </CardContent>
      </Card>
      </div>
    </MainLayout>
  );
}
