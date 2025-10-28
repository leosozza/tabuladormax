import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess';

// 3D Module Card Component
interface ModuleCardProps {
  position: [number, number, number];
  color: string;
  title: string;
  description: string;
  onClick: () => void;
  locked: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ position, color, title, description, onClick, locked }) => {
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
        
        {/* Title Text */}
        <Text
          position={[0, 0.8, 0.2]}
          fontSize={0.25}
          color={locked ? '#888888' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
        >
          {title}
        </Text>
        
        {/* Description Text */}
        <Text
          position={[0, 0.2, 0.2]}
          fontSize={0.12}
          color={locked ? '#666666' : '#dddddd'}
          anchorX="center"
          anchorY="middle"
          maxWidth={2.2}
          textAlign="center"
        >
          {description}
        </Text>
        
        {/* Locked Indicator */}
        {locked && (
          <mesh position={[0, -0.5, 0.2]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#ff6b6b" emissive="#ff0000" emissiveIntensity={0.5} />
          </mesh>
        )}
        
        {/* Click Hint */}
        {!locked && hovered && (
          <Text
            position={[0, -0.8, 0.2]}
            fontSize={0.1}
            color="#4ade80"
            anchorX="center"
            anchorY="middle"
          >
            Clique para acessar
          </Text>
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
  const navigate = useNavigate();
  const {
    canAccessTelemarketing,
    canAccessScouter,
    loading
  } = useDepartmentAccess();

  if (loading) {
    return null;
  }

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
      
      <ambientLight intensity={0.4} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <spotLight position={[-10, -10, -10]} angle={0.3} penumbra={1} intensity={0.5} />
      
      <Environment preset="night" />
      
      <Particles />
      
      {/* Tabulador Module */}
      <ModuleCard
        position={[-3, 0, 0]}
        color="#3b82f6"
        title="Tabulador"
        description="Lead Management & Automation"
        onClick={() => navigate('/lead')}
        locked={!canAccessTelemarketing}
      />
      
      {/* Gestão Scouter Module */}
      <ModuleCard
        position={[3, 0, 0]}
        color="#8b5cf6"
        title="Gestão Scouter"
        description="Scouting Management System"
        onClick={() => navigate('/scouter')}
        locked={!canAccessScouter}
      />
      
      {/* Title Text */}
      <Text
        position={[0, 3.5, 0]}
        fontSize={0.6}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        TabuladorMax
      </Text>
      
      <Text
        position={[0, 2.8, 0]}
        fontSize={0.2}
        color="#aaaaaa"
        anchorX="center"
        anchorY="middle"
      >
        Selecione um módulo para começar
      </Text>
    </>
  );
};

// Main Component
const ThreeModuleSelector: React.FC = () => {
  const { loading } = useDepartmentAccess();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Carregando módulos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-900 relative">
      <Canvas shadows>
        <ModuleSelectorScene />
      </Canvas>
      
      {/* Instructions Overlay */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center z-10">
        <p className="text-white/70 text-sm">
          Use o mouse para rotacionar • Scroll para zoom • Clique nos módulos para acessar
        </p>
      </div>
      
      {/* Back to Classic View Link */}
      <div className="absolute top-8 right-8 z-10">
        <a
          href="/home-choice"
          className="text-white/70 hover:text-white text-sm underline transition-colors"
        >
          Visualização Clássica
        </a>
      </div>
    </div>
  );
};

export default ThreeModuleSelector;
