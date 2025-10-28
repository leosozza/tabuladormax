import React from 'react';
import { ModuleScene } from '@/components/three/ModuleScene';

const ModuleSceneDemo: React.FC = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 text-center pt-8 px-4">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
          Maxconnect
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
          Interactive module selection - Demo Mode
        </p>
        <div className="mt-2 inline-block bg-blue-500/20 border border-blue-500 text-blue-300 px-4 py-2 rounded-lg text-sm">
          Demo Version - All modules unlocked
        </div>
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

      {/* Three.js Scene - All modules accessible for demo */}
      <ModuleScene 
        canAccessTelemarketing={true}
        canAccessScouter={true}
        canAccessAdmin={true}
      />
    </div>
  );
};

export default ModuleSceneDemo;
