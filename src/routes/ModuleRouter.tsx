import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomeChoice from '@/pages/HomeChoice';
import TabuladorApp from '@/App';

// Páginas do Gestão Scouter (simples)
import GestaoHome from '@/pages/gestao/Home';
import GestaoLeads from '@/pages/gestao/Leads';
import GestaoScouters from '@/pages/gestao/Scouters';

const ModuleRouter: React.FC = () => {
  return (
    <Routes>
      {/* Página inicial - escolha de módulo */}
      <Route path="/" element={<HomeChoice />} />

      {/* Módulo Tabulador - todas as rotas /tabulador/* */}
      <Route path="/tabulador/*" element={<TabuladorApp />} />

      {/* Módulo Gestão Scouter - rotas simples */}
      <Route path="/scouter" element={<GestaoHome />} />
      <Route path="/scouter/leads" element={<GestaoLeads />} />
      <Route path="/scouter/scouters" element={<GestaoScouters />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Página não encontrada</h2>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Voltar para Home
              </button>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

export default ModuleRouter;
