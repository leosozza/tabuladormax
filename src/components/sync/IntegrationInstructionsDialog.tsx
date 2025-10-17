import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Database, 
  Code, 
  Settings, 
  Zap,
  Copy,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface IntegrationInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationInstructionsDialog({
  open,
  onOpenChange,
}: IntegrationInstructionsDialogProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência`);
  };

  const triggerSQL = `-- Trigger para sincronizar fichas → TabuladorMax
CREATE OR REPLACE FUNCTION sync_ficha_to_tabuladormax()
RETURNS TRIGGER AS $$
DECLARE
  tabuladormax_url TEXT := 'https://seu-tabuladormax.supabase.co/functions/v1/sync-from-gestao-scouter';
  service_role_key TEXT := 'SEU_SERVICE_ROLE_KEY_DO_TABULADORMAX';
BEGIN
  -- Evitar loop de sincronização
  IF NEW.sync_source = 'tabuladormax' THEN
    RETURN NEW;
  END IF;

  -- Chamar Edge Function do TabuladorMax
  PERFORM
    net.http_post(
      url := tabuladormax_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'ficha', row_to_json(NEW),
        'source', 'gestao_scouter'
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
CREATE TRIGGER sync_ficha_after_insert_update
  AFTER INSERT OR UPDATE ON fichas
  FOR EACH ROW
  EXECUTE FUNCTION sync_ficha_to_tabuladormax();`;

  const tableSchema = `-- Estrutura da tabela fichas (espelho da tabela leads)
CREATE TABLE IF NOT EXISTS public.fichas (
  id UUID PRIMARY KEY,
  name TEXT,
  responsible TEXT,
  age INTEGER,
  address TEXT,
  scouter TEXT,
  photo_url TEXT,
  date_modify TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Campos adicionais
  bitrix_telemarketing_id TEXT,
  commercial_project_id TEXT,
  responsible_user_id BIGINT,
  celular TEXT,
  telefone_trabalho TEXT,
  telefone_casa TEXT,
  etapa TEXT,
  fonte TEXT,
  criado TIMESTAMPTZ,
  nome_modelo TEXT,
  local_abordagem TEXT,
  ficha_confirmada BOOLEAN,
  data_criacao_ficha TIMESTAMPTZ,
  data_confirmacao_ficha TIMESTAMPTZ,
  presenca_confirmada BOOLEAN,
  compareceu BOOLEAN,
  cadastro_existe_foto BOOLEAN,
  valor_ficha NUMERIC,
  data_criacao_agendamento TIMESTAMPTZ,
  horario_agendamento TIME,
  data_agendamento DATE,
  gerenciamento_funil TEXT,
  status_fluxo TEXT,
  etapa_funil TEXT,
  etapa_fluxo TEXT,
  funil_fichas TEXT,
  status_tabulacao TEXT,
  maxsystem_id_ficha TEXT,
  gestao_scouter TEXT,
  op_telemarketing TEXT,
  data_retorno_ligacao TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  sync_source TEXT,
  sync_status TEXT
);`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Settings className="w-6 h-6" />
            Instruções de Configuração da Integração
          </DialogTitle>
          <DialogDescription>
            Passo a passo completo para configurar a sincronização bidirecional entre TabuladorMax e Gestão Scouter
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Visão Geral */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Como funciona:</strong> A sincronização é bidirecional e automática. 
                Quando um lead é criado ou atualizado no TabuladorMax, ele é sincronizado 
                para a tabela "fichas" do Gestão Scouter. O inverso também acontece: quando 
                uma ficha é atualizada no Gestão Scouter, ela sincroniza de volta para o TabuladorMax.
              </AlertDescription>
            </Alert>

            {/* Passo 1 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Badge className="mb-2">Passo 1</Badge>
                      <h3 className="font-semibold text-lg">Criar tabela "fichas" no Gestão Scouter</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        A tabela fichas é o espelho da tabela leads do TabuladorMax
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">SQL Schema</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(tableSchema, "Schema SQL")}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">{tableSchema}</pre>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Execute este SQL no SQL Editor do projeto Gestão Scouter
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Passo 2 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Code className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Badge className="mb-2">Passo 2</Badge>
                      <h3 className="font-semibold text-lg">Configurar Trigger no Gestão Scouter</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        O trigger detecta mudanças na tabela fichas e sincroniza de volta para o TabuladorMax
                      </p>
                    </div>

                    <Alert className="bg-yellow-500/10 border-yellow-500/20">
                      <AlertDescription className="text-sm">
                        <strong>⚠️ Importante:</strong> Você precisa substituir as variáveis:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li><code>https://seu-tabuladormax.supabase.co</code> pela URL do TabuladorMax</li>
                          <li><code>SEU_SERVICE_ROLE_KEY_DO_TABULADORMAX</code> pela service role key do TabuladorMax</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">SQL Trigger</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(triggerSQL, "Trigger SQL")}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">{triggerSQL}</pre>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Execute este SQL no SQL Editor do projeto Gestão Scouter
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Passo 3 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Settings className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Badge className="mb-2">Passo 3</Badge>
                      <h3 className="font-semibold text-lg">Configurar credenciais nesta página</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Preencha os campos de configuração acima com as credenciais do Gestão Scouter
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">URL do Projeto</p>
                          <p className="text-xs text-muted-foreground">
                            Encontre em Settings → API → Project URL no Gestão Scouter
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Anon Key</p>
                          <p className="text-xs text-muted-foreground">
                            Encontre em Settings → API → Project API keys → anon/public no Gestão Scouter
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Passo 4 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Zap className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Badge className="mb-2">Passo 4</Badge>
                      <h3 className="font-semibold text-lg">Testar e Ativar</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Teste a conexão e ative a sincronização
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <p className="text-sm">Clique em "Testar Integração" para verificar a conexão</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <p className="text-sm">Ative os switches "Integração Ativa" e "Sincronização Automática"</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <p className="text-sm">Clique em "Salvar Configuração"</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <p className="text-sm">A partir de agora, todos os leads serão sincronizados automaticamente!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações Adicionais */}
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <strong>Dica:</strong> A sincronização usa resolução de conflitos baseada em timestamps. 
                Se houver atualizações simultâneas, a versão mais recente sempre prevalece, evitando 
                loops infinitos de sincronização.
              </AlertDescription>
            </Alert>

            <Separator />

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Observação:</strong> Esta integração requer que ambos os projetos estejam acessíveis via internet.</p>
              <p><strong>Segurança:</strong> As credenciais são armazenadas de forma segura no banco de dados e nunca são expostas no frontend.</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
