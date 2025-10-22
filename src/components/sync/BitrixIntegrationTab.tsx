import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BitrixImportTab } from "./BitrixImportTab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, ExternalLink, ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export function BitrixIntegrationTab() {
  const webhookUrl = "https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/";
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              {/* Lado esquerdo: ícone + texto */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-xl">Integração Bitrix24</CardTitle>
                  <CardDescription>
                    Configure a sincronização bidirecional entre TabuladorMax e Bitrix24
                  </CardDescription>
                </div>
              </div>

              {/* Lado direito: badge + seta */}
              <div className="flex items-center gap-3">
                <Badge className="bg-green-600 hover:bg-green-600">Ativo</Badge>
                <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-6 border-t">
            {/* Alert de status */}
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                ✅ Webhook configurado e ativo
              </AlertDescription>
            </Alert>

            {/* URL do Webhook */}
            <div className="text-sm space-y-2">
              <p><strong>URL do Webhook:</strong></p>
              <code className="block p-2 bg-muted rounded text-xs break-all">
                {webhookUrl}
              </code>
            </div>

            {/* Botão de abrir Bitrix */}
            <Button variant="outline" size="sm" asChild>
              <a href="https://maxsystem.bitrix24.com.br" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Bitrix24
              </a>
            </Button>

            <Separator className="my-6" />

            {/* Importação do Bitrix */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Importar Dados do Bitrix24</h3>
              <BitrixImportTab />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
