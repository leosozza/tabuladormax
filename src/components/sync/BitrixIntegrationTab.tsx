import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BitrixImportTab } from "./BitrixImportTab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, ExternalLink, ChevronDown, Zap, Info, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { BitrixFieldMappingDialog } from "./BitrixFieldMappingDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function BitrixIntegrationTab() {
  const webhookUrl = "https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/";
  const [isOpen, setIsOpen] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  // Buscar estatísticas dos mapeamentos
  const { data: mappingStats } = useQuery({
    queryKey: ['bitrix-mapping-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitrix_field_mappings')
        .select('*');
      
      if (error) throw error;
      
      const uniqueFields = new Set(data?.map(m => m.tabuladormax_field) || []);
      const lastUpdate = data?.length > 0 
        ? new Date(Math.max(...data.map(m => new Date(m.updated_at).getTime()))).toLocaleString('pt-BR')
        : 'Nunca';
      
      return {
        count: uniqueFields.size,
        lastUpdate
      };
    }
  });

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
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">Integração Bitrix24</CardTitle>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Sobre esta integração</h4>
                          <p className="text-sm text-muted-foreground">
                            A integração com Bitrix24 permite sincronização bidirecional de leads, 
                            projetos comerciais e telemarketings entre TabuladorMax e Bitrix24. 
                            Todas as atualizações são automáticas via webhook.
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
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

            {/* Seção de Mapeamento de Campos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Mapeamento de Campos</h3>
              <p className="text-sm text-muted-foreground">
                Configure como os campos do Bitrix são mapeados para o TabuladorMax
              </p>
              
              <Button 
                variant="outline" 
                onClick={() => setShowMappingDialog(true)}
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurar Mapeamento de Campos
              </Button>
              
              {/* Mostrar resumo dos mapeamentos atuais */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="text-sm space-y-1">
                    <p><strong>Campos mapeados:</strong> {mappingStats?.count || 0}</p>
                    <p className="text-muted-foreground text-xs">
                      Última atualização: {mappingStats?.lastUpdate || 'Nunca'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-6" />

            {/* Importação do Bitrix */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Importar Dados do Bitrix24</h3>
              <BitrixImportTab />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Dialog de mapeamento */}
      <BitrixFieldMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        onSave={() => {
          // Invalidar cache para atualizar estatísticas
        }}
      />
    </Collapsible>
  );
}
