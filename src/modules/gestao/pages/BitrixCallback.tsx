import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const cleanDomain = (input: string) =>
  input.replace(/^https?:\/\//, "").replace(/\/+$/, "");

const BitrixCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    const stateParam = searchParams.get("state");

    if (errorParam) {
      setError(`Erro na autorização: ${errorDesc || errorParam}`);
      setLoading(false);
      return;
    }

    // Tentar obter domain/client_id/client_secret via query OU via state (base64 JSON)
    let domain = searchParams.get("domain") || "";
    let clientId = searchParams.get("client_id") || "";
    let clientSecret = searchParams.get("client_secret") || "";

    if (stateParam) {
      try {
        const decoded = atob(stateParam);
        const parsed = JSON.parse(decoded) as {
          domain?: string;
          client_id?: string;
          client_secret?: string;
        };
        domain = domain || parsed.domain || "";
        clientId = clientId || parsed.client_id || "";
        clientSecret = clientSecret || parsed.client_secret || "";
      } catch (e) {
        console.warn("Falha ao decodificar/parsing state:", e);
      }
    }

    if (!code) {
      setError("Código de autorização ausente na URL de callback");
      setLoading(false);
      return;
    }

    if (!domain || !clientId || !clientSecret) {
      setError(
        "Parâmetros obrigatórios ausentes na URL de callback (domain/client_id/client_secret)"
      );
      setLoading(false);
      return;
    }

    // Trocar o código de autorização pelos tokens
    exchangeCodeForTokens(code, cleanDomain(domain), clientId, clientSecret);
  }, [searchParams]);

  const exchangeCodeForTokens = async (
    code: string,
    domain: string,
    clientId: string,
    clientSecret: string
  ) => {
    try {
      const tokenUrl = `https://${domain}/oauth/token/`;
      const redirectUri = `${window.location.origin}/bitrix-callback`;

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri, // manter igual ao usado na autorização
        }),
      });

      if (!response.ok) {
        // tentar extrair erro detalhado
        let message = `Erro HTTP: ${response.status}`;
        try {
          const maybeJson = await response.json();
          if (maybeJson?.error || maybeJson?.error_description) {
            message = maybeJson.error_description || maybeJson.error || message;
          }
        } catch {
          // manter mensagem padrão
        }
        throw new Error(message);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      setTokens(data);
    } catch (err: any) {
      setError(`Erro ao obter tokens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`,
    });
  };

  const goToIntegrations = () => {
    navigate("/dashboard?panel=integrations");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Processando autorização...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {error ? (
              <XCircle className="h-6 w-6 text-red-500" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
            Callback OAuth Bitrix24
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : tokens ? (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Autorização realizada com sucesso! Use as informações abaixo
                  para configurar a integração.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Access Token:</label>
                  <div className="flex gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                      {tokens.access_token}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(tokens.access_token!, "Access Token")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Refresh Token (IMPORTANTE):
                  </label>
                  <div className="flex gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                      {tokens.refresh_token}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(tokens.refresh_token!, "Refresh Token")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este é o token que você deve usar na configuração da
                    integração
                  </p>
                </div>

                {tokens.expires_in && (
                  <div>
                    <label className="text-sm font-medium">Expira em:</label>
                    <p className="text-sm text-muted-foreground">
                      {tokens.expires_in} segundos (
                      {Math.round(tokens.expires_in / 3600)} horas)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={goToIntegrations}>Ir para Integrações</Button>
                <Button variant="outline" onClick={() => window.close()}>
                  Fechar Janela
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default BitrixCallback;
