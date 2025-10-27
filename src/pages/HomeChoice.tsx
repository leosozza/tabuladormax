import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Target, Lock, Building2, Handshake } from 'lucide-react';
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess';
import { TelemarketingAccessModal } from '@/components/telemarketing/TelemarketingAccessModal';
import { AdminAccessModal } from '@/components/admin/AdminAccessModal';

const HomeChoice: React.FC = () => {
  const navigate = useNavigate();
  const {
    canAccessTelemarketing,
    canAccessScouter,
    canAccessAdmin,
    isAdmin,
    loading
  } = useDepartmentAccess();

  const [telemarketingModalOpen, setTelemarketingModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // Redirecionamento automático se só tem acesso a um módulo
  React.useEffect(() => {
    if (!loading && !isAdmin) {
      if (canAccessTelemarketing && !canAccessScouter && !canAccessAdmin) {
        navigate('/lead', { replace: true });
      } else if (canAccessScouter && !canAccessTelemarketing && !canAccessAdmin) {
        navigate('/scouter', { replace: true });
      } else if (canAccessAdmin && !canAccessTelemarketing && !canAccessScouter) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [loading, canAccessTelemarketing, canAccessScouter, canAccessAdmin, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Subtle geometric background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
      
      <div className="max-w-6xl w-full relative z-10 px-4">
        {/* Minimal Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight">
            Maxconnect
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Conectando ambientes de trabalhos da Max Fama
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card Telemarketing */}
          <Card 
            className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
              canAccessTelemarketing 
                ? 'cursor-pointer border-primary/20 hover:border-primary/50' 
                : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={() => canAccessTelemarketing && setTelemarketingModalOpen(true)}
          >
            {!canAccessTelemarketing && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Telemarketing</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Gestão de Leads e Atendimento
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Gestão completa de leads e conversões
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Dashboard com métricas e KPIs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Importação e sincronização de dados
                </li>
              </ul>
              <Button 
                variant={canAccessTelemarketing ? "default" : "outline"}
                className="w-full"
                size="lg"
                disabled={!canAccessTelemarketing}
              >
                {canAccessTelemarketing ? 'Acessar' : 'Sem Acesso'}
              </Button>
            </CardContent>
          </Card>

          {/* Card Scouter */}
          <Card 
            className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
              canAccessScouter 
                ? 'cursor-pointer border-primary/20 hover:border-primary/50' 
                : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={() => canAccessScouter && navigate('/scouter')}
          >
            {!canAccessScouter && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Gestão Scouter</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Gestão de Scouts e Abordagens
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  Gerenciamento de scouts em campo
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  Mapas e áreas de abordagem
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  Análise de performance e relatórios
                </li>
              </ul>
              <Button 
                variant={canAccessScouter ? "default" : "outline"}
                className="w-full"
                size="lg"
                disabled={!canAccessScouter}
              >
                {canAccessScouter ? 'Acessar' : 'Sem Acesso'}
              </Button>
            </CardContent>
          </Card>

          {/* Card Agenciamento */}
          <Card 
            className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer border-primary/20 hover:border-primary/50"
            onClick={() => navigate('/agenciamento')}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                  <Handshake className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Agenciamento</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Gestão de Negociações
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  Gestão completa de negociações
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  Cálculos automáticos e condições comerciais
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  Integração com produtos Bitrix24
                </li>
              </ul>
              <Button 
                variant="default"
                className="w-full"
                size="lg"
              >
                Acessar
              </Button>
            </CardContent>
          </Card>

          {/* Card Administrativo */}
          <Card 
            className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
              canAccessAdmin 
                ? 'cursor-pointer border-primary/20 hover:border-primary/50' 
                : 'opacity-50 cursor-not-allowed'
            }`}
            onClick={() => canAccessAdmin && setAdminModalOpen(true)}
          >
            {!canAccessAdmin && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                  <Building2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl">Administrativo</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Gestão do Sistema
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                  Gestão de usuários e permissões
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                  Configurações e integrações
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                  Monitoramento e diagnósticos
                </li>
              </ul>
              <Button 
                variant={canAccessAdmin ? "default" : "outline"}
                className="w-full"
                size="lg"
                disabled={!canAccessAdmin}
              >
                {canAccessAdmin ? 'Acessar' : 'Sem Acesso'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {isAdmin && (
          <div className="mt-12 text-center">
            <p className="text-sm text-primary font-medium">
              Acesso completo a todos os módulos
            </p>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Maxconnect v2.0</p>
        </div>
      </div>

      {/* Modals */}
      <TelemarketingAccessModal 
        open={telemarketingModalOpen} 
        onOpenChange={setTelemarketingModalOpen} 
      />
      <AdminAccessModal 
        open={adminModalOpen} 
        onOpenChange={setAdminModalOpen} 
      />
    </div>
  );
};

export default HomeChoice;
