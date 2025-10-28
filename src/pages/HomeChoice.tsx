import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess';
import { ModuleScene } from '@/components/three/ModuleScene';

const HomeChoice: React.FC = () => {
  const navigate = useNavigate();
  const {
    canAccessTelemarketing,
    canAccessScouter,
    canAccessAdmin,
    isAdmin,
    loading
  } = useDepartmentAccess();

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 text-center pt-8 px-4">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
          Maxconnect
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
          Interactive module selection
        </p>
        {isAdmin && (
          <p className="mt-2 text-sm text-blue-400 font-medium">
            ✓ Full access to all modules
          </p>
        )}
      </div>

      {/* Instructions overlay */}
      <div className="absolute bottom-8 left-0 right-0 z-10 text-center px-4">
        <p className="text-sm text-gray-400">
          Click on a module to enter • Drag to rotate • Scroll to zoom
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Maxconnect v2.0 - Three.js Interactive Experience
        </p>
      </div>

      {/* Three.js Scene */}
      <ModuleScene 
        canAccessTelemarketing={canAccessTelemarketing}
        canAccessScouter={canAccessScouter}
        canAccessAdmin={canAccessAdmin}
      />
    </div>
  );
};

export default HomeChoice;
