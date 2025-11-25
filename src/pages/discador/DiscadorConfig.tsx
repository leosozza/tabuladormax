import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSyscallConfig } from "@/hooks/useSyscallConfig";
import { Loader2 } from "lucide-react";

export default function DiscadorConfig() {
  const { config, saveConfig, isSaving, testConnection, isTesting } = useSyscallConfig();
  const [apiToken, setApiToken] = useState(config?.api_token || "");
  const [apiUrl, setApiUrl] = useState(config?.api_url || "http://maxfama.syscall.com.br/crm");
  const [defaultRoute, setDefaultRoute] = useState(config?.default_route || "9");

  const handleSave = () => {
    saveConfig({ api_token: apiToken, api_url: apiUrl, default_route: defaultRoute });
  };

  const handleTest = () => {
    testConnection();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuração do Syscall</h1>
        <p className="text-muted-foreground">Configure a conexão com o discador</p>
      </div>

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
  );
}
