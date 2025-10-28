import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// 3D Module Card Component
interface ModuleCardProps {
  position: [number, number, number];
  color: string;
  title: string;
  description: string;
  onClick: () => void;
  locked: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ position, color, onClick, locked }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
      
      // Scale on hover
      const targetScale = hovered && !locked ? 1.15 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      
      // Gentle rotation
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        <mesh
          ref={meshRef}
          onClick={locked ? undefined : onClick}
          onPointerOver={() => !locked && setHovered(true)}
          onPointerOut={() => setHovered(false)}
          castShadow
        >
          <boxGeometry args={[2.5, 3, 0.3]} />
          <meshStandardMaterial
            color={locked ? '#555555' : color}
            metalness={0.5}
            roughness={0.2}
            emissive={locked ? '#000000' : color}
            emissiveIntensity={hovered && !locked ? 0.3 : 0.1}
          />
        </mesh>
        
        {/* Locked Indicator */}
        {locked && (
          <mesh position={[0, -0.5, 0.2]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#ff6b6b" emissive="#ff0000" emissiveIntensity={0.5} />
          </mesh>
        )}
        
        {/* Click Hint - Glowing sphere */}
        {!locked && hovered && (
          <mesh position={[0, -0.8, 0.2]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={1} />
          </mesh>
        )}
      </group>
    </Float>
  );
};

// Background Particles Component
const Particles: React.FC = () => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 500;

  const positions = React.useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.3} />
    </points>
  );
};

// Main Scene Component
const ModuleSelectorScene: React.FC = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} />
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        minDistance={5}
        maxDistance={15}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 3}
      />
      
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1.2} castShadow />
      <spotLight position={[-10, -10, -10]} angle={0.3} penumbra={1} intensity={0.6} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#ffffff" />
      
      <Particles />
      
      {/* Tabulador Module */}
      <ModuleCard
        position={[-3, 0, 0]}
        color="#3b82f6"
        title="Tabulador"
        description="Lead Management & Automation"
        onClick={() => alert('Demo: Tabulador module would navigate to /lead')}
        locked={false}
      />
      
      {/* Gestão Scouter Module */}
      <ModuleCard
        position={[3, 0, 0]}
        color="#8b5cf6"
        title="Gestão Scouter"
        description="Scouting Management System"
        onClick={() => alert('Demo: Gestão Scouter module would navigate to /scouter')}
        locked={false}
      />
    </>
  );
};

// Main Component
const ThreeModuleSelectorDemo: React.FC = () => {
  return (
    <div className="h-screen w-screen bg-gray-900 relative">
      {/* Title Overlay */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-center z-10 pointer-events-none">
        <h1 className="text-6xl font-bold text-white mb-2 tracking-tight">TabuladorMax</h1>
        <p className="text-lg text-gray-400">Selecione um módulo para começar</p>
      </div>
      
      <Canvas shadows>
        <ModuleSelectorScene />
      </Canvas>
      
      {/* Module Labels Overlay */}
      <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none">
        <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/50 rounded-lg px-6 py-4">
          <h2 className="text-2xl font-bold text-blue-300 mb-1">Tabulador</h2>
          <p className="text-sm text-blue-200">Lead Management & Automation</p>
        </div>
      </div>
      
      <div className="absolute top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none">
        <div className="bg-purple-500/20 backdrop-blur-sm border border-purple-500/50 rounded-lg px-6 py-4">
          <h2 className="text-2xl font-bold text-purple-300 mb-1">Gestão Scouter</h2>
          <p className="text-sm text-purple-200">Scouting Management System</p>
        </div>
      </div>
      
      {/* Instructions Overlay */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center z-10">
        <p className="text-white/70 text-sm">
          Use o mouse para rotacionar • Scroll para zoom • Clique nos módulos para acessar
        </p>
      </div>
      
      {/* Demo Badge */}
      <div className="absolute top-8 right-8 z-10">
        <div className="bg-blue-500/20 border border-blue-500 text-blue-300 px-4 py-2 rounded-lg text-sm">
          Demo Version
        </div>
      </div>
    </div>
  );
};

export default ThreeModuleSelectorDemo;
