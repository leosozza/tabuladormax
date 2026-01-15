import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Headset, 
  LogOut, 
  Phone, 
  BarChart3, 
  Users,
  User,
  MessageSquare,
  MessageCircle
} from 'lucide-react';
import { TelemarketingOperatorData, isSupervisorCargo } from './TelemarketingAccessKeyForm';
import { ThemeSelector } from './ThemeSelector';

interface TelemarketingPortalLayoutProps {
  operatorData: TelemarketingOperatorData;
  onLogout: () => void;
}

export const TelemarketingPortalLayout = ({ operatorData, onLogout }: TelemarketingPortalLayoutProps) => {
  const navigate = useNavigate();
  const isSupervisor = isSupervisorCargo(operatorData.cargo);
  const initials = operatorData.operator_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Área do perfil - lado esquerdo */}
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-16 rounded-md border-2 border-primary/20 shadow-lg ring-2 ring-primary/10 overflow-hidden bg-primary/10 flex-shrink-0">
                {operatorData.operator_photo ? (
                  <img 
                    src={operatorData.operator_photo} 
                    alt={operatorData.operator_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{initials}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col">
                <h1 className="font-bold text-lg">Olá, {operatorData.operator_name.split(' ')[0]}!</h1>
                <p className="text-sm text-muted-foreground">Portal do Telemarketing</p>
                <Badge variant={isSupervisor ? 'default' : 'secondary'} className="text-xs w-fit mt-1">
                  {isSupervisor ? (
                    <><Users className="w-3 h-3 mr-1" /> Supervisor</>
                  ) : (
                    <><User className="w-3 h-3 mr-1" /> Agente</>
                  )}
                </Badge>
              </div>
            </div>

            {/* Botões - lado direito */}
            <div className="flex items-center gap-1">
              <ThemeSelector />
              <Button variant="ghost" size="icon" onClick={onLogout} title="Sair">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-muted-foreground">
            {isSupervisor 
              ? 'Você tem acesso aos dados de todos os agentes da sua equipe.'
              : 'Acesse suas ferramentas de trabalho abaixo.'
            }
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Tabulador</CardTitle>
              <CardDescription>
                Acesse o sistema de tabulação de leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => {
                  // Salvar contexto do operador antes de navegar (localStorage para persistência)
                  localStorage.setItem('telemarketing_context', JSON.stringify({
                    bitrix_id: operatorData.bitrix_id,
                    cargo: operatorData.cargo,
                    name: operatorData.operator_name,
                    commercial_project_id: operatorData.commercial_project_id
                  }));
                  navigate('/portal-telemarketing/tabulador');
                }}
              >
                Acessar Tabulador
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-2 group-hover:bg-chart-2/20 transition-colors">
                <BarChart3 className="w-6 h-6 text-chart-2" />
              </div>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>
                {isSupervisor 
                  ? 'Visualize métricas de toda a equipe'
                  : 'Acompanhe seu desempenho'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="secondary"
                className="w-full"
                onClick={() => {
                  localStorage.setItem('telemarketing_context', JSON.stringify({
                    bitrix_id: operatorData.bitrix_id,
                    cargo: operatorData.cargo,
                    name: operatorData.operator_name,
                    commercial_project_id: operatorData.commercial_project_id
                  }));
                  navigate('/portal-telemarketing/dashboard');
                }}
              >
                Ver Dashboard
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-2 group-hover:bg-green-500/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                Conversas dos seus leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                className="w-full border-green-500/30 text-green-600 hover:bg-green-500/10"
                onClick={() => {
                  localStorage.setItem('telemarketing_context', JSON.stringify({
                    bitrix_id: operatorData.bitrix_id,
                    cargo: operatorData.cargo,
                    name: operatorData.operator_name,
                    commercial_project_id: operatorData.commercial_project_id
                  }));
                  navigate('/portal-telemarketing/whatsapp');
                }}
              >
                Acessar WhatsApp
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2 group-hover:bg-blue-500/20 transition-colors">
                <MessageCircle className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle>MaxTalk</CardTitle>
              <CardDescription>
                Chat interno da equipe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                className="w-full border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                onClick={() => {
                  localStorage.setItem('telemarketing_context', JSON.stringify({
                    bitrix_id: operatorData.bitrix_id,
                    cargo: operatorData.cargo,
                    name: operatorData.operator_name,
                    commercial_project_id: operatorData.commercial_project_id
                  }));
                  navigate('/portal-telemarketing/maxtalk');
                }}
              >
                Acessar MaxTalk
              </Button>
            </CardContent>
          </Card>

          {isSupervisor && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center mb-2 group-hover:bg-chart-3/20 transition-colors">
                  <Users className="w-6 h-6 text-chart-3" />
                </div>
                <CardTitle>Equipe</CardTitle>
                <CardDescription>
                  Gerencie e acompanhe seus agentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    localStorage.setItem('telemarketing_context', JSON.stringify({
                      bitrix_id: operatorData.bitrix_id,
                      cargo: operatorData.cargo,
                      name: operatorData.operator_name,
                      commercial_project_id: operatorData.commercial_project_id
                    }));
                    navigate('/portal-telemarketing/equipe');
                  }}
                >
                  Gerenciar Equipe
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Card */}
        <Card className="mt-8 bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-primary/10">
                <Headset className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Seu acesso</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  ID Bitrix: {operatorData.bitrix_id} • 
                  Cargo: {isSupervisorCargo(operatorData.cargo) ? 'Supervisor' : 'Agente'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {isSupervisor 
                    ? 'Como supervisor, você pode visualizar dados de todos os agentes da sua equipe.'
                    : 'Como agente, você visualiza apenas seus próprios dados de tabulação.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
