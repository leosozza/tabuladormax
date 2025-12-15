import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Headset, 
  LogOut, 
  Phone, 
  BarChart3, 
  Users,
  User
} from 'lucide-react';
import { TelemarketingOperatorData } from './TelemarketingAccessKeyForm';

interface TelemarketingPortalLayoutProps {
  operatorData: TelemarketingOperatorData;
  onLogout: () => void;
}

export const TelemarketingPortalLayout = ({ operatorData, onLogout }: TelemarketingPortalLayoutProps) => {
  const isSupervisor = operatorData.cargo === 'supervisor';
  const initials = operatorData.operator_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Headset className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Portal do Telemarketing</h1>
              <p className="text-sm text-muted-foreground">
                {isSupervisor ? 'Supervisão' : 'Operador'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={operatorData.operator_photo || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="font-medium text-sm">{operatorData.operator_name}</p>
                <Badge variant={isSupervisor ? 'default' : 'secondary'} className="text-xs">
                  {isSupervisor ? (
                    <><Users className="w-3 h-3 mr-1" /> Supervisor</>
                  ) : (
                    <><User className="w-3 h-3 mr-1" /> Agente</>
                  )}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout} title="Sair">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">
            Olá, {operatorData.operator_name.split(' ')[0]}!
          </h2>
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
                  // Salvar contexto do operador antes de navegar
                  sessionStorage.setItem('telemarketing_context', JSON.stringify({
                    bitrix_id: operatorData.bitrix_id,
                    cargo: operatorData.cargo,
                    name: operatorData.operator_name
                  }));
                  window.location.href = '/telemarketing';
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
                  sessionStorage.setItem('telemarketing_context', JSON.stringify({
                    bitrix_id: operatorData.bitrix_id,
                    cargo: operatorData.cargo,
                    name: operatorData.operator_name
                  }));
                  window.location.href = '/dashboard';
                }}
              >
                Ver Dashboard
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
                  disabled
                >
                  Em breve
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
                  Cargo: {operatorData.cargo === 'supervisor' ? 'Supervisor' : 'Agente'}
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
