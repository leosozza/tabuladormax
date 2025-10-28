import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls, Box } from '@react-three/drei';
import * as THREE from 'three';

interface ModuleBoxProps {
  position: [number, number, number];
  color: string;
  label: string;
  description: string;
  route: string;
  icon: string;
  isAccessible: boolean;
}

const ModuleBox: React.FC<ModuleBoxProps> = ({ 
  position, 
  color, 
  label, 
  description, 
  route, 
  icon,
  isAccessible 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
      
      // Rotate on hover
      if (hovered) {
        meshRef.current.rotation.y += 0.02;
      }
    }
  });

  const handleClick = () => {
    if (isAccessible) {
      navigate(route);
    }
  };

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={[2, 2, 2]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={hovered && isAccessible ? color : isAccessible ? new THREE.Color(color).multiplyScalar(0.8) : '#555'}
          roughness={0.3}
          metalness={0.6}
          emissive={hovered && isAccessible ? color : '#000'}
          emissiveIntensity={hovered && isAccessible ? 0.3 : 0}
        />
      </Box>
      
      {/* Label */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color={isAccessible ? '#ffffff' : '#888888'}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      
      {/* Icon/Emoji */}
      <Text
        position={[0, 0, 1.1]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {icon}
      </Text>
      
      {/* Description */}
      <Text
        position={[0, -1.5, 0]}
        fontSize={0.15}
        color={isAccessible ? '#cccccc' : '#666666'}
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
      >
        {description}
      </Text>
      
      {!isAccessible && (
        <Text
          position={[0, -1.9, 0]}
          fontSize={0.12}
          color="#ff6666"
          anchorX="center"
          anchorY="middle"
        >
          🔒 Sem Acesso
        </Text>
      )}
    </group>
  );
};

interface BackgroundStarsProps {
  count?: number;
}

const BackgroundStars: React.FC<BackgroundStarsProps> = ({ count = 200 }) => {
  const points = useRef<THREE.Points>(null);

  const particlesPosition = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
};

interface ModuleSceneProps {
  canAccessTelemarketing: boolean;
  canAccessScouter: boolean;
  canAccessAdmin: boolean;
}

export const ModuleScene: React.FC<ModuleSceneProps> = ({
  canAccessTelemarketing,
  canAccessScouter,
  canAccessAdmin
}) => {
  return (
    <div className="w-full h-screen">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: 'linear-gradient(to bottom, #0a0a1a, #1a1a2e)' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4444ff" />
        <spotLight
          position={[0, 10, 0]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          castShadow
        />
        
        {/* Background Stars */}
        <BackgroundStars count={300} />
        
        {/* Module Boxes */}
        <ModuleBox
          position={[-3, 0, 0]}
          color="#3b82f6"
          label="Tabulador"
          description="Lead management and automation"
          route="/lead"
          icon="📞"
          isAccessible={canAccessTelemarketing}
        />
        
        <ModuleBox
          position={[3, 0, 0]}
          color="#8b5cf6"
          label="Gestão Scouter"
          description="Scouting management system"
          route="/scouter"
          icon="🎯"
          isAccessible={canAccessScouter}
        />
        
        <ModuleBox
          position={[0, 3, -2]}
          color="#10b981"
          label="Agenciamento"
          description="Gestão de Negociações"
          route="/agenciamento"
          icon="🤝"
          isAccessible={true}
        />
        
        <ModuleBox
          position={[0, -3, -2]}
          color="#f59e0b"
          label="Administrativo"
          description="Gestão do Sistema"
          route="/admin"
          icon="🏢"
          isAccessible={canAccessAdmin}
        />
        
        {/* Controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={15}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};
