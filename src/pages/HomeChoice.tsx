import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * HomeChoice - Initial landing page for choosing between application modules
 * 
 * Provides navigation to:
 * - Tabulador: The existing lead management system
 * - Gestão Scouter: The new scouting management system
 */
const HomeChoice: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bem-vindo ao Sistema Integrado
          </h1>
          <p className="text-lg text-gray-600">
            Escolha o módulo que deseja acessar
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tabulador Card */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-blue-500">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                📊 Tabulador
              </CardTitle>
              <CardDescription className="text-base">
                Sistema de Gestão de Leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Gerencie leads, configurações de sincronização, mapeamento de agentes e muito mais.
              </p>
              <ul className="text-sm text-gray-600 mb-6 space-y-2">
                <li>✓ Gestão de leads e contatos</li>
                <li>✓ Integração com Bitrix24</li>
                <li>✓ Importação de CSV</li>
                <li>✓ Controle de permissões</li>
                <li>✓ Monitoramento de sincronização</li>
              </ul>
              <Button 
                onClick={() => navigate('/tabulador')}
                className="w-full"
                size="lg"
              >
                Acessar Tabulador
              </Button>
            </CardContent>
          </Card>

          {/* Gestão Scouter Card */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-green-500">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                🔍 Gestão Scouter
              </CardTitle>
              <CardDescription className="text-base">
                Sistema de Gestão de Scouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Gerencie scouts, avaliações, relatórios e acompanhamento de desempenho.
              </p>
              <ul className="text-sm text-gray-600 mb-6 space-y-2">
                <li>✓ Cadastro e gestão de scouts</li>
                <li>✓ Avaliações e relatórios</li>
                <li>✓ Dashboard de desempenho</li>
                <li>✓ Acompanhamento de atividades</li>
                <li>✓ Análises e métricas</li>
              </ul>
              <Button 
                onClick={() => navigate('/scouter')}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Acessar Gestão Scouter
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Sistema Integrado v1.0 - Tabulador + Gestão Scouter</p>
        </div>
      </div>
    </div>
  );
};

export default HomeChoice;
