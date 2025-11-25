import { Phone, Settings, Send, BarChart3, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useSyscallConfig } from "@/hooks/useSyscallConfig";
import { useSyscallAgent } from "@/hooks/useSyscallAgent";
import { AgentStatusWidget } from "@/components/discador/AgentStatusWidget";

export default function DiscadorHub() {
  const navigate = useNavigate();
  const { isConfigured } = useSyscallConfig();
  const { isConfigured: agentConfigured } = useSyscallAgent();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discador Syscall</h1>
          <p className="text-muted-foreground">Gerenciamento de discagem preditiva</p>
        </div>
        <AgentStatusWidget />
      </div>

      {!isConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O token da API do Syscall não está configurado.{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate("/discador/config")}
            >
              Configure aqui
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!agentConfigured && isConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você não possui mapeamento de agente configurado. Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/discador/config")}>
          <CardHeader>
            <Settings className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Configuração</CardTitle>
            <CardDescription>API, Token e Agentes</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/discador/campanhas")}>
          <CardHeader>
            <Phone className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Campanhas</CardTitle>
            <CardDescription>Gerenciar campanhas ativas</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/discador/enviar")}>
          <CardHeader>
            <Send className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Enviar Leads</CardTitle>
            <CardDescription>Selecionar e enviar leads</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/discador/metricas")}>
          <CardHeader>
            <BarChart3 className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Métricas</CardTitle>
            <CardDescription>Performance e conversão</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Leads Discados Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chamadas Atendidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de Atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">0%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
