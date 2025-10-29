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

  // Handle dissolve effect for mobile touch
  React.useEffect(() => {
    const logo = document.getElementById('maxconnect-logo');
    if (!logo) return;

    const onEnter = () => logo.classList.add('is-dissolving');
    const onLeave = () => logo.classList.remove('is-dissolving');

    logo.addEventListener('pointerdown', onEnter);
    window.addEventListener('pointerup', onLeave);

    return () => {
      logo.removeEventListener('pointerdown', onEnter);
      window.removeEventListener('pointerup', onLeave);
    };
  }, []);

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
      {/* SVG Filter for dissolve effect */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <filter id="fx-dissolve">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feDisplacementMap in="SourceGraphic" in2="mono" scale="16" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feBlend in="displaced" in2="mono" mode="multiply" />
        </filter>
      </svg>

      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 text-center pt-8 px-4">
        <h1 
          id="maxconnect-logo"
          data-text="Maxconnect"
          className="text-5xl md:text-6xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight transition-all duration-600 ease-in-out hover:opacity-0 hover:translate-y-[-4px] hover:tracking-wider"
          style={{
            position: 'relative',
            lineHeight: 1,
            pointerEvents: 'auto',
            cursor: 'default'
          }}
        >
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

      <style>{`
        #maxconnect-logo::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, rgb(96, 165, 250), rgb(192, 132, 252), rgb(244, 114, 182));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: url(#fx-dissolve);
          opacity: 0;
          transition: opacity 0.6s ease;
        }
        
        #maxconnect-logo:hover::after,
        #maxconnect-logo.is-dissolving::after {
          opacity: 1;
        }
        
        @supports not (filter: url(#fx-dissolve)) {
          #maxconnect-logo::after {
            filter: blur(2px) contrast(120%);
          }
        }
      `}</style>

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
