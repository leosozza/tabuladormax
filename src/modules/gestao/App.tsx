// Gestão Scouter Module Entry Point - Placeholder
// This file should be replaced when the gestao-scouter code is integrated
// The real App component from gestao-scouter should be exported here as default

import React from 'react';

const GestaoScouterApp: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-2xl">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold mb-4">Gestão Scouter Module</h1>
        <p className="text-gray-600 mb-6">
          Este é um placeholder para o módulo Gestão Scouter.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Para desenvolvedores:</strong> Execute o script de merge ou copie o código do gestao-scouter
            para esta pasta e substitua este arquivo App.tsx pelo componente principal do gestao-scouter.
          </p>
        </div>
        <div className="text-left bg-gray-100 rounded-lg p-4">
          <p className="text-sm font-mono mb-2">
            ./scripts/merge_gestao_into_tabuladormax.sh /path/to/gestao-scouter
          </p>
          <p className="text-xs text-gray-600">ou</p>
          <p className="text-sm font-mono mt-2">
            git subtree add --prefix=src/modules/gestao [repo-url] [branch] --squash
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Voltar para Home
        </button>
      </div>
    </div>
  );
};

export default GestaoScouterApp;
