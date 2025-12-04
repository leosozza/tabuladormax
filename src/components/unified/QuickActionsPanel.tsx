import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, Target, DollarSign, FileText, Settings } from "lucide-react";

export function QuickActionsPanel() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Gestão de Leads",
      description: "Visualizar e gerenciar leads",
      icon: Users,
      path: "/scouter/leads",
      color: "text-blue-600",
    },
    {
      label: "Scouters",
      description: "Performance dos scouters",
      icon: Target,
      path: "/scouter/scouters",
      color: "text-green-600",
    },
    {
      label: "Agenciamento",
      description: "Negociações comerciais",
      icon: DollarSign,
      path: "/agenciamento",
      color: "text-emerald-600",
    },
    {
      label: "Relatórios",
      description: "Exportar relatórios",
      icon: FileText,
      path: "/scouter/relatorios",
      color: "text-purple-600",
    },
    {
      label: "Administração",
      description: "Configurações do sistema",
      icon: Settings,
      path: "/admin",
      color: "text-orange-600",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
        <CardDescription>Acesso direto às principais funcionalidades</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.path}
                variant="outline"
                className="h-auto flex flex-col items-start p-4 hover:border-primary/50"
                onClick={() => navigate(action.path)}
              >
                <div className="flex items-center gap-2 mb-2 w-full">
                  <Icon className={`h-5 w-5 ${action.color}`} />
                  <span className="font-semibold">{action.label}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {action.description}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
