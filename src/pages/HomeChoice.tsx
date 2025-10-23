import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Target } from 'lucide-react';

const HomeChoice: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-shift"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(17,24,39,0.05),rgba(17,24,39,0))]"></div>
      
      <div className="max-w-5xl w-full relative z-10 animate-fade-in">
        {/* Header with bounce animation */}
        <div className="text-center mb-12 animate-slide-down">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient-x">
            Sistema Integrado
          </h1>
          <p className="text-xl text-muted-foreground animate-fade-in animation-delay-200">
            Escolha o módulo para começar
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Tabulador Card */}
          <Card 
            className="group relative overflow-hidden border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer animate-scale-in animation-delay-300"
            onClick={() => navigate('/tabulador')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-500/10 rounded-xl group-hover:animate-bounce">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-3xl">Telemarketing</CardTitle>
              </div>
              <CardDescription className="text-base">
                Sistema de Gestão de Leads
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative">
              <p className="text-muted-foreground mb-6">
                Gerencie leads, configurações de sincronização, mapeamento de agentes e muito mais.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Gestão de leads e contatos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Integração com Bitrix24
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Importação de CSV
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Controle de permissões
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Monitoramento de sincronização
                </li>
              </ul>
              <Button 
                className="w-full group-hover:translate-y-[-2px] transition-transform"
                size="lg"
              >
                Acessar Tabulador
              </Button>
            </CardContent>
          </Card>

          {/* Gestão Scouter Card */}
          <Card 
            className="group relative overflow-hidden border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer animate-scale-in animation-delay-400"
            onClick={() => navigate('/scouter')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-green-500/10 rounded-xl group-hover:animate-bounce">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-3xl">Gestão de Leads</CardTitle>
              </div>
              <CardDescription className="text-base">
                Sistema de Gestão de Scouts
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative">
              <p className="text-muted-foreground mb-6">
                Gerencie scouts, avaliações, relatórios e acompanhamento de desempenho.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Cadastro e gestão de scouts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Avaliações e relatórios
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Dashboard de desempenho
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Acompanhamento de atividades
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Análises e métricas
                </li>
              </ul>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 group-hover:translate-y-[-2px] transition-transform"
                size="lg"
              >
                Acessar Gestão de Leads
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground animate-fade-in animation-delay-500">
          <p>Sistema Integrado v2.0 - Tabulador + Gestão Scouter</p>
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(10%, 10%) scale(1.1); }
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-gradient-shift {
          animation: gradient-shift 15s ease infinite;
        }
        
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradient-x 3s linear infinite;
        }
        
        .animate-slide-down {
          animation: slide-down 0.6s ease-out;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: both;
        }
        
        .animation-delay-300 {
          animation-delay: 0.3s;
          animation-fill-mode: both;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
          animation-fill-mode: both;
        }
        
        .animation-delay-500 {
          animation-delay: 0.5s;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
};

export default HomeChoice;
