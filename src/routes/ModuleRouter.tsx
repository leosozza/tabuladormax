import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomeChoice from '@/pages/HomeChoice';

// Lazy load the module apps
const TabuladorApp = lazy(() => import('@/modules/tabulador/App'));
const GestaoScouterApp = lazy(() => import('@/modules/gestao/App'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
      <p className="text-gray-600">Carregando módulo...</p>
    </div>
  </div>
);

// Error boundary fallback component
const ErrorFallback = ({ moduleName }: { moduleName: string }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center p-8 max-w-md">
      <div className="text-red-500 text-5xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold mb-2">Erro ao carregar módulo</h2>
      <p className="text-gray-600 mb-4">
        O módulo <strong>{moduleName}</strong> não pôde ser carregado.
      </p>
      <p className="text-sm text-gray-500">
        Verifique se o módulo foi corretamente integrado e se o arquivo App.tsx existe.
      </p>
      <button
        onClick={() => window.location.href = '/'}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Voltar para Home
      </button>
    </div>
  </div>
);

/**
 * ModuleRouter - Routes and lazy loads the different application modules
 * 
 * Routes:
 * - / : HomeChoice page for selecting between modules
 * - /tabulador/* : Tabulador module (existing app)
 * - /scouter/* or /gestao/* : Gestão Scouter module
 */
const ModuleRouter: React.FC = () => {
  return (
    <Routes>
      {/* Home choice page */}
      <Route path="/" element={<HomeChoice />} />

      {/* Tabulador module */}
      <Route
        path="/tabulador/*"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <React.Suspense fallback={<ErrorFallback moduleName="Tabulador" />}>
              <TabuladorApp />
            </React.Suspense>
          </Suspense>
        }
      />

      {/* Gestão Scouter module - accessible via /scouter or /gestao */}
      <Route
        path="/scouter/*"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <React.Suspense fallback={<ErrorFallback moduleName="Gestão Scouter" />}>
              <GestaoScouterApp />
            </React.Suspense>
          </Suspense>
        }
      />
      <Route
        path="/gestao/*"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <React.Suspense fallback={<ErrorFallback moduleName="Gestão Scouter" />}>
              <GestaoScouterApp />
            </React.Suspense>
          </Suspense>
        }
      />

      {/* Catch-all for unmatched routes - redirect to home */}
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
