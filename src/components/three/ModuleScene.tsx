import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
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

type Shard = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotVel: THREE.Vector3;
  size: number;
};

const Explosion: React.FC<{
  color: string;
  active: boolean;
  duration?: number;
  onComplete?: () => void;
}> = ({ color, active, duration = 0.85, onComplete }) => {
  const groupRef = useRef<THREE.Group>(null);
  const shardCount = 42;
  const shards = useMemo<Shard[]>(() => {
    const arr: Shard[] = [];
    for (let i = 0; i < shardCount; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      const speed = 3 + Math.random() * 3;
      arr.push({
        position: new THREE.Vector3(0, 0, 0),
        velocity: dir.multiplyScalar(speed),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        ),
        size: 0.08 + Math.random() * 0.22
      });
    }
    return arr;
  }, []);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = 0;
  }, [active]);

  useFrame((_, dt) => {
    if (!active || !groupRef.current) return;
    progressRef.current += dt / duration;
    const p = Math.min(progressRef.current, 1);
    shards.forEach((s, i) => {
      s.position.addScaledVector(s.velocity, dt);
      const m = meshesRef.current[i];
      if (!m) return;
      m.position.copy(s.position);
      m.rotation.x += s.rotVel.x * dt;
      m.rotation.y += s.rotVel.y * dt;
      m.rotation.z += s.rotVel.z * dt;
      const mat = materialsRef.current[i];
      if (mat) { mat.opacity = 1 - p; }
      const scale = s.size * (1 - p * 0.4);
      m.scale.setScalar(scale);
    });
    if (p >= 1 && onComplete) onComplete();
  });

  return (
    <group ref={groupRef} visible={active}>
      {shards.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshesRef.current[i] = el; }}
          position={[0, 0, 0]}
          castShadow
        >
          <boxGeometry args={[s.size, s.size, s.size]} />
          <meshStandardMaterial
            ref={(el) => { if (el) materialsRef.current[i] = el; }}
            color={color}
            metalness={0.35}
            roughness={0.35}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </group>
  );
};

const ModuleBox: React.FC<ModuleBoxProps> = ({
  position,
  color,
  label,
  description,
  route,
  icon,
  isAccessible,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [exploding, setExploding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const el = document.body;
    if (!el) return;
    if (hovered && isAccessible && !exploding) {
      el.style.cursor = 'pointer';
    } else {
      el.style.cursor = '';
    }
    return () => { el.style.cursor = ''; };
  }, [hovered, isAccessible, exploding]);

  useFrame((state, dt) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.12;
    const baseSpin = hovered ? 0.015 : 0.003;
    meshRef.current.rotation.y += baseSpin;
    const tx = hovered ? state.pointer.y * 0.18 : 0;
    const ty = hovered ? -state.pointer.x * 0.28 : 0;
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, tx, 0.12);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, ty * 0.3, 0.12);
    
    if (exploding && materialRef.current) {
      const mat = materialRef.current;
      mat.transparent = true;
      mat.opacity = Math.max(0, mat.opacity - dt * 2);
      const s = Math.max(0, (meshRef.current.scale.x || 1) - dt * 1.8);
      meshRef.current.scale.setScalar(s);
    }
  });
  const handleClick = () => {
    if (!isAccessible || exploding) return;
    setExploding(true);
  };
  const distanceFactor = 10;
  
  const labelStyle: React.CSSProperties = {
    pointerEvents: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ffffff',
    fontWeight: 700,
    textShadow: '0 2px 12px rgba(0,0,0,0.6)',
    fontSize: 'clamp(14px, 1.6vw, 20px)',
    letterSpacing: 0.2,
    filter: isAccessible ? 'none' : 'grayscale(1) opacity(0.6)'
  };
  
  const iconStyle: React.CSSProperties = {
    fontSize: 'clamp(18px, 2.2vw, 28px)',
    lineHeight: 1
  };
  
  const descriptionStyle: React.CSSProperties = {
    pointerEvents: 'none',
    color: isAccessible ? '#cfcfcf' : '#7b7b7b',
    textAlign: 'center',
    fontSize: 'clamp(10px, 1.2vw, 14px)',
    maxWidth: 220
  };
  
  const lockStyle: React.CSSProperties = {
    pointerEvents: 'none',
    color: '#ff6868',
    fontSize: 'clamp(10px, 1.1vw, 13px)',
    fontWeight: 600
  };
  
  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[2.4, 2.4, 0.32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={isAccessible ? color : '#3a3a3a'}
          metalness={0.5}
          roughness={0.15}
          emissive={isAccessible ? color : '#000000'}
          emissiveIntensity={hovered && isAccessible ? 0.35 : 0.12}
          opacity={1}
        />
      </mesh>

      {/* Central icon sphere */}
      {isAccessible && (
        <mesh position={[0, 0, 0.25]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial
            color={hovered ? "#ffffff" : color}
            emissive={color}
            emissiveIntensity={hovered ? 1.2 : 0.6}
            metalness={0.7}
            roughness={0.15}
          />
        </mesh>
      )}

      {/* Glowing particles on hover */}
      {hovered && isAccessible && (
        <>
          {[[-1.2, 1.2], [1.2, 1.2], [-1.2, -1.2], [1.2, -1.2]].map((pos, i) => (
            <mesh key={i} position={[pos[0], pos[1], 0.25]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.5}
                toneMapped={false}
              />
            </mesh>
          ))}
        </>
      )}

      <Explosion color={color} active={exploding} duration={0.85} onComplete={() => navigate(route)} />
      <Html center transform distanceFactor={distanceFactor} position={[0, 1.6, 0]}>
        <div style={labelStyle}>
          <span style={iconStyle}>{icon}</span>
          <span>{label}</span>
        </div>
      </Html>
      <Html center transform distanceFactor={distanceFactor} position={[0, -1.7, 0]}>
        <div style={descriptionStyle}>{description}</div>
      </Html>
      {!isAccessible && (
        <Html center transform distanceFactor={distanceFactor} position={[0, -2.1, 0]}>
          <div style={lockStyle}>🔒 Sem acesso</div>
        </Html>
      )}
    </group>
  );
};

function BackgroundStars({ count = 700 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, [count]);
  useFrame((state) => { if (pointsRef.current) { pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02; } });
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#ffffff" transparent opacity={0.55} />
    </points>
  );
}

interface ModuleSceneProps {
  canAccessTelemarketing: boolean;
  canAccessScouter: boolean;
  canAccessAdmin: boolean;
}

export const ModuleScene: React.FC<ModuleSceneProps> = ({ canAccessTelemarketing, canAccessScouter, canAccessAdmin }) => {
  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 0, 14], fov: 60 }} dpr={[1, 2]} shadows style={{ background: 'linear-gradient(to bottom, #0a0a1a, #1a1a2e)' }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[12, 12, 12]} intensity={1.2} castShadow />
        <pointLight position={[-10, -8, -6]} intensity={0.6} color="#5555ff" />
        <spotLight position={[0, 15, 0]} angle={0.5} intensity={0.4} penumbra={1} castShadow />
        <BackgroundStars />
        
        <ModuleBox 
          position={[-7, 0, 0]} 
          color="#2563eb" 
          label="Tabulador" 
          description="Lead Management & Automation" 
          route="/lead" 
          icon="📞" 
          isAccessible={canAccessTelemarketing}
        />
        <ModuleBox 
          position={[-2.3, 0, 0]} 
          color="#7c3aed" 
          label="Gestão Scouter" 
          description="Scouting Management System" 
          route="/scouter" 
          icon="🎯" 
          isAccessible={canAccessScouter}
        />
        <ModuleBox 
          position={[2.3, 0, 0]} 
          color="#059669" 
          label="Agenciamento" 
          description="Gestão de Negociações" 
          route="/agenciamento" 
          icon="🤝" 
          isAccessible={true}
        />
        <ModuleBox 
          position={[7, 0, 0]} 
          color="#ea580c" 
          label="Administrativo" 
          description="Gestão do Sistema" 
          route="/admin" 
          icon="🏢" 
          isAccessible={canAccessAdmin}
        />
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          enableRotate={true} 
          minDistance={10} 
          maxDistance={20}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2.5}
        />
      </Canvas>
    </div>
  );
};

export default ModuleScene;