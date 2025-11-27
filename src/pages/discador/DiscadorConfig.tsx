import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSyscallConfig } from "@/hooks/useSyscallConfig";
import { Loader2, Terminal } from "lucide-react";
import { MainLayout } from "@/components/layouts/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function DiscadorConfig() {
  const { config, saveConfig, isSaving, testConnection, isTesting, testProxy, isTestingProxy, connectionLogs } = useSyscallConfig();
  const [apiToken, setApiToken] = useState(config?.api_token || "");
  const [apiUrl, setApiUrl] = useState(config?.api_url || "http://maxfama.syscall.com.br/crm");
  const [defaultRoute, setDefaultRoute] = useState(config?.default_route || "9");

  const handleSave = () => {
    saveConfig({ api_token: apiToken, api_url: apiUrl, default_route: defaultRoute });
  };

  const handleTest = () => {
    testConnection();
  };

  const handleTestProxy = () => {
    testProxy();
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
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        log.type === 'proxy' 
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-green-500/20 text-green-400 border border-green-500/30"
                      )}>
                        {log.type === 'proxy' ? 'PROXY' : 'SYSCALL'}
                      </span>
                      <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    {log.success ? (
                      <>
                        <div className="font-semibold">✓ Conexão estabelecida</div>
                        <div className="text-xs text-slate-400 mt-2 space-y-1">
                          <div>URL: {log.url}</div>
                          <div>Tempo: {log.duration_ms}ms</div>
                          <div>Status: {log.status_code}</div>
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                            Ver resposta completa
                          </summary>
                          <pre className="text-xs text-slate-500 mt-2 p-2 bg-slate-900 rounded overflow-x-auto">
                            {JSON.stringify(log.response, null, 2)}
                          </pre>
                        </details>
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
                          {log.url && <div>URL: {log.url}</div>}
                          {log.origin_ip && (
                            <div className="text-orange-400 font-semibold">
                              IP de origem: {log.origin_ip}
                            </div>
                          )}
                          {log.duration_ms && <div>Tempo: {log.duration_ms}ms</div>}
                        </div>
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
