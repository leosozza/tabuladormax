import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BitrixImportTab } from "./BitrixImportTab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BitrixIntegrationTab() {
  const webhookUrl = "https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/";

  return (
    <div className="space-y-6">
      {/* Seção de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Configuração Bitrix24</CardTitle>
          <CardDescription>
            Status da integração com o Bitrix24
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              ✅ Webhook configurado e ativo
            </AlertDescription>
          </Alert>

          <div className="text-sm space-y-2">
            <p><strong>URL do Webhook:</strong></p>
            <code className="block p-2 bg-muted rounded text-xs break-all">
              {webhookUrl}
            </code>
          </div>

          <Button variant="outline" size="sm" asChild>
            <a href="https://maxsystem.bitrix24.com.br" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Bitrix24
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Seção de Importação */}
      <BitrixImportTab />
    </div>
  );
}
