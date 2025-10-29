import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

// Comet component that follows mouse/touch with trail
type TailParticle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  scale: number;
};

const Comet: React.FC = () => {
  const { camera, size, scene } = useThree();
  const cometRef = useRef<THREE.Sprite | null>(null);
  const mouseTarget = useRef(new THREE.Vector3(0, 0, 0));
  const cometPos = useRef(new THREE.Vector3(0, 0, 0));
  const tail = useRef<TailParticle[]>([]);
  const lastEmit = useRef(0);
  const worldPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Track mouse/touch position
  useEffect(() => {
    const pointerToWorld = (clientX: number, clientY: number) => {
      const x = (clientX / size.width) * 2 - 1;
      const y = -(clientY / size.height) * 2 + 1;
      raycaster.setFromCamera({ x, y }, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(worldPlane, intersection);
      return intersection;
    };

    const onMove = (e: PointerEvent | TouchEvent) => {
      if ('touches' in e && e.touches[0]) {
        const touch = e.touches[0];
        const pos = pointerToWorld(touch.clientX, touch.clientY);
        if (pos) mouseTarget.current.copy(pos);
      } else if ('clientX' in e) {
        const pos = pointerToWorld(e.clientX, e.clientY);
        if (pos) mouseTarget.current.copy(pos);
      }
    };

    window.addEventListener('pointermove', onMove as any);
    window.addEventListener('touchmove', onMove as any, { passive: true });
    
    return () => {
      window.removeEventListener('pointermove', onMove as any);
      window.removeEventListener('touchmove', onMove as any);
    };
  }, [camera, size, raycaster, worldPlane]);

  useFrame((state, dt) => {
    if (!cometRef.current) return;

    // Smoothly follow mouse
    cometPos.current.lerp(mouseTarget.current, 0.18);
    cometRef.current.position.copy(cometPos.current);

    // Spawn trail particles
    const now = state.clock.elapsedTime * 1000;
    if (now - lastEmit.current > 16) { // ~60 fps
      const scale = 0.28 + Math.random() * 0.18;
      tail.current.push({
        position: cometPos.current.clone(),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, 0),
        life: 1.0,
        scale
      });
      lastEmit.current = now;
    }

    // Update and cleanup tail particles
    for (let i = tail.current.length - 1; i >= 0; i--) {
      const p = tail.current[i];
      p.life -= dt * 1.2;
      p.position.add(p.velocity);
      p.scale *= 0.995;
      
      if (p.life <= 0) {
        tail.current.splice(i, 1);
      }
    }
  });

  return (
    <>
      <sprite ref={cometRef} scale={[0.22, 0.22, 1]}>
        <spriteMaterial color={0xffffff} opacity={1} depthWrite={false} transparent />
      </sprite>
      {tail.current.map((p, i) => (
        <sprite key={`trail-${i}`} position={p.position} scale={[p.scale, p.scale, 1]}>
          <spriteMaterial color={0xbfeee7} opacity={Math.max(p.life, 0)} depthWrite={false} transparent />
        </sprite>
      ))}
    </>
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
  const iconGroupRef = useRef<THREE.Group>(null);
  const orbitingGroupRef = useRef<THREE.Group>(null);
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
    
    // Animate icon group
    if (iconGroupRef.current) {
      iconGroupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      if (hovered) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
        iconGroupRef.current.scale.setScalar(scale);
      } else {
        iconGroupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
    
    // Animate orbiting particles
    if (orbitingGroupRef.current && isAccessible) {
      orbitingGroupRef.current.rotation.z = state.clock.elapsedTime * 0.8;
    }
    
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
      {/* Invisible clickable mesh for interaction - no visible geometry */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Central icon - Large glossy sphere with icon inside */}
      {isAccessible && (
        <group ref={iconGroupRef} position={[0, 0, 0.25]}>
          {/* Main glossy sphere */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.9, 64, 64]} />
            <meshPhysicalMaterial
              color={color}
              emissive={color}
              emissiveIntensity={hovered ? 0.4 : 0.2}
              metalness={0.1}
              roughness={0.05}
              transmission={0.3}
              thickness={0.5}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
              transparent={true}
              opacity={0.9}
            />
          </mesh>

          {/* Icon symbol inside sphere - Phone for Tabulador */}
          {icon === "📞" && (
            <>
              <mesh position={[0, 0.15, 0]} rotation={[0, 0, -Math.PI / 6]}>
                <cylinderGeometry args={[0.18, 0.18, 0.45, 32]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#ffffff"
                  emissiveIntensity={hovered ? 1.2 : 0.7}
                  metalness={0.3}
                  roughness={0.3}
                />
              </mesh>
              <mesh position={[0.1, 0.35, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#ffffff"
                  emissiveIntensity={hovered ? 1.3 : 0.8}
                  metalness={0.3}
                  roughness={0.3}
                />
              </mesh>
            </>
          )}
          
          {/* Icon symbol - Target for Gestão Scouter */}
          {icon === "🎯" && (
            <>
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.4, 0.05, 16, 32]} />
                <meshStandardMaterial
                  color="#ff4444"
                  emissive="#ff4444"
                  emissiveIntensity={hovered ? 1.2 : 0.7}
                  metalness={0.3}
                  roughness={0.3}
                />
              </mesh>
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.25, 0.04, 16, 32]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#ffffff"
                  emissiveIntensity={hovered ? 1.3 : 0.8}
                  metalness={0.3}
                  roughness={0.3}
                />
              </mesh>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial
                  color="#ff4444"
                  emissive="#ff4444"
                  emissiveIntensity={hovered ? 1.4 : 0.9}
                  metalness={0.3}
                  roughness={0.3}
                />
              </mesh>
            </>
          )}
          
          {/* Icon symbol - Grid for Agenciamento */}
          {icon === "🤝" && (
            <>
              {/* Grid pattern - 2x2 */}
              {[-0.18, 0.18].map((x, xi) => 
                [-0.18, 0.18].map((y, yi) => (
                  <mesh key={`grid-${xi}-${yi}`} position={[x, y, 0]}>
                    <boxGeometry args={[0.28, 0.28, 0.08]} />
                    <meshStandardMaterial
                      color="#ffffff"
                      emissive="#ffffff"
                      emissiveIntensity={hovered ? 1.2 : 0.7}
                      metalness={0.3}
                      roughness={0.3}
                    />
                  </mesh>
                ))
              )}
            </>
          )}
          
          {/* Icon symbol - Tools for Administrativo */}
          {icon === "🏢" && (
            <>
              {/* Wrench */}
              <mesh position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.12, 0.5, 0.08]} />
                <meshStandardMaterial
                  color="#cccccc"
                  emissive="#cccccc"
                  emissiveIntensity={hovered ? 1.2 : 0.7}
                  metalness={0.5}
                  roughness={0.3}
                />
              </mesh>
              <mesh position={[-0.15, 0.3, 0]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.2, 0.08, 0.08]} />
                <meshStandardMaterial
                  color="#cccccc"
                  emissive="#cccccc"
                  emissiveIntensity={hovered ? 1.2 : 0.7}
                  metalness={0.5}
                  roughness={0.3}
                />
              </mesh>
              {/* Gear */}
              <mesh position={[0.18, 0, 0]}>
                <torusGeometry args={[0.18, 0.05, 8, 8]} />
                <meshStandardMaterial
                  color="#cccccc"
                  emissive="#cccccc"
                  emissiveIntensity={hovered ? 1.2 : 0.7}
                  metalness={0.5}
                  roughness={0.3}
                />
              </mesh>
              <mesh position={[0.18, 0, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial
                  color="#cccccc"
                  emissive="#cccccc"
                  emissiveIntensity={hovered ? 1.3 : 0.8}
                  metalness={0.5}
                  roughness={0.3}
                />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Always-visible orbiting particles around the icon */}
      {isAccessible && (
        <group ref={orbitingGroupRef} position={[0, 0, 0.25]}>
          {/* Ring of larger orbiting particles */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 1.35;
            return (
              <mesh 
                key={`orbit-${i}`} 
                position={[
                  Math.cos(angle) * radius, 
                  Math.sin(angle) * radius, 
                  0
                ]}
              >
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={hovered ? 2.5 : 1.8}
                  toneMapped={false}
                  transparent
                  opacity={hovered ? 1.0 : 0.9}
                />
              </mesh>
            );
          })}
          {/* Additional smaller particles for depth */}
          {[0, 1, 2, 3].map((i) => {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const radius = 1.55;
            return (
              <mesh 
                key={`orbit-small-${i}`} 
                position={[
                  Math.cos(angle) * radius, 
                  Math.sin(angle) * radius, 
                  0
                ]}
              >
                <sphereGeometry args={[0.08, 12, 12]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={hovered ? 2.0 : 1.4}
                  toneMapped={false}
                  transparent
                  opacity={hovered ? 0.9 : 0.7}
                />
              </mesh>
            );
          })}
        </group>
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

function BackgroundStars({ count = 1500 }) {
  const layer1Ref = useRef<THREE.Points>(null);
  const layer2Ref = useRef<THREE.Points>(null);
  const layer3Ref = useRef<THREE.Points>(null);
  
  const createStarLayer = (layerCount: number, radiusMin: number, radiusMax: number) => {
    const pos = new Float32Array(layerCount * 3);
    const siz = new Float32Array(layerCount);
    for (let i = 0; i < layerCount; i++) {
      // Create spherical star field distribution
      const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
      
      // Variable star sizes based on distance (closer = larger)
      const distanceFactor = 1 - (radius - radiusMin) / (radiusMax - radiusMin);
      siz[i] = 0.03 + Math.random() * 0.1 * distanceFactor;
    }
    return { positions: pos, sizes: siz };
  };
  
  const layer1 = useMemo(() => createStarLayer(count / 3, 15, 25), [count]);
  const layer2 = useMemo(() => createStarLayer(count / 3, 25, 35), [count]);
  const layer3 = useMemo(() => createStarLayer(count / 3, 35, 45), [count]);
  
  useFrame((state) => {
    // Multi-layer parallax effect - each layer rotates at different speed
    if (layer1Ref.current) {
      layer1Ref.current.rotation.y = state.clock.elapsedTime * 0.025;
      layer1Ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
    }
    if (layer2Ref.current) {
      layer2Ref.current.rotation.y = state.clock.elapsedTime * 0.018;
      layer2Ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
    if (layer3Ref.current) {
      layer3Ref.current.rotation.y = state.clock.elapsedTime * 0.012;
      layer3Ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.03;
    }
  });
  
  return (
    <>
      {/* Near layer - fastest, brightest */}
      <points ref={layer1Ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count / 3} array={layer1.positions} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={count / 3} array={layer1.sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.05} 
          color="#ffffff" 
          transparent 
          opacity={0.8}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </points>
      
      {/* Mid layer */}
      <points ref={layer2Ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count / 3} array={layer2.positions} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={count / 3} array={layer2.sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.04} 
          color="#ffffff" 
          transparent 
          opacity={0.6}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </points>
      
      {/* Far layer - slowest, dimmest */}
      <points ref={layer3Ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count / 3} array={layer3.positions} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={count / 3} array={layer3.sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.03} 
          color="#ffffff" 
          transparent 
          opacity={0.4}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </points>
    </>
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
        <Comet />
        
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