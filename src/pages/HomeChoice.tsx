import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import './home-choice.css';

// Planet configuration with links
const LINKS = {
  'Telemarketing': '/lead',
  'Scouter': '/scouter',
  'Agendamento': '/agenciamento',
  'Administrativo': '/admin'
};

interface Planet {
  name: string;
  color: number;
  size: number;
  distance: number;
  speed: number;
  angle: number;
  mesh?: THREE.Mesh;
  label?: HTMLDivElement;
  ringMesh?: THREE.Mesh;
}

// Animation constants
const TEXT_ROTATION_SPEED = 0.0005;
const TEXT_OFFSET_MAX = 1.0;
const PARTICLE_COUNT = 5000; // Reduced for better performance

// Create canvas texture with text label (MAXFAMA)
const makeSunLabelTexture = (text: string, width: number, height: number): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create fiery sun base texture with radial gradient
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.1, '#ffff00');
  gradient.addColorStop(0.3, '#ffaa00');
  gradient.addColorStop(0.5, '#ff6600');
  gradient.addColorStop(0.7, '#ff3300');
  gradient.addColorStop(1, '#880000');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add noise/texture for fiery effect
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 3;
    const opacity = Math.random() * 0.3;
    
    ctx.fillStyle = `rgba(255, 200, 0, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw text label in the equator region (middle of canvas)
  ctx.font = `bold ${height / 8}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw text with glow effect
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, width / 2, height / 2);
  
  // Draw text again for stronger effect
  ctx.shadowBlur = 10;
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

const HomeChoice: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Create sun with text label texture
    const sunTexture = makeSunLabelTexture('MAXFAMA', 2048, 1024);
    const sunGeometry = new THREE.SphereGeometry(2, 64, 64);
    
    // Sun shader with text mapping and rotation
    const sunUniforms = {
      uTextMap: { value: sunTexture },
      uTextOffset: { value: 0.0 },
      uTextStrength: { value: 0.7 },
      uTime: { value: 0.0 },
      uEmissiveColor: { value: new THREE.Color(0xff6600) },
      uEmissiveIntensity: { value: 0.8 }
    };

    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: sunUniforms,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTextMap;
        uniform float uTextOffset;
        uniform float uTextStrength;
        uniform float uTime;
        uniform vec3 uEmissiveColor;
        uniform float uEmissiveIntensity;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // Noise functions for FBM
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        // FBM (Fractional Brownian Motion)
        float fbm(vec3 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          for(int i = 0; i < 4; i++) {
            value += amplitude * snoise(p * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        // Domain warping
        vec3 domainWarp(vec3 p, float time) {
          vec3 q = vec3(
            fbm(p + vec3(0.0, 0.0, time * 0.1)),
            fbm(p + vec3(5.2, 1.3, time * 0.1)),
            fbm(p + vec3(3.1, 4.7, time * 0.1))
          );
          vec3 r = vec3(
            fbm(p + 4.0 * q + vec3(1.7, 9.2, time * 0.15)),
            fbm(p + 4.0 * q + vec3(8.3, 2.8, time * 0.15)),
            fbm(p + 4.0 * q + vec3(4.5, 6.1, time * 0.15))
          );
          return p + r * 0.3;
        }
        
        void main() {
          // Apply domain warping for fiery effect
          vec3 warpedPos = domainWarp(vPosition * 2.0, uTime);
          float noise = fbm(warpedPos);
          
          // Sample the sun texture with rotating offset
          vec2 uv = vUv;
          uv.x = fract(uv.x + uTextOffset);
          vec4 texColor = texture2D(uTextMap, uv);
          
          // Create fiery base color with noise
          vec3 sunColor1 = vec3(1.0, 0.9, 0.0);  // bright yellow
          vec3 sunColor2 = vec3(1.0, 0.4, 0.0);  // orange
          vec3 sunColor3 = vec3(0.8, 0.1, 0.0);  // red
          
          float noiseValue = noise * 0.5 + 0.5;
          vec3 fireColor = mix(sunColor3, sunColor2, noiseValue);
          fireColor = mix(fireColor, sunColor1, pow(noiseValue, 2.0));
          
          // Blend text with fiery surface
          vec3 finalColor = mix(fireColor, texColor.rgb, texColor.a * uTextStrength);
          
          // Apply emissive glow
          vec3 emissive = uEmissiveColor * uEmissiveIntensity;
          finalColor += emissive * 0.3;
          
          // Add intensity based on surface normal for depth
          float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
          finalColor *= 0.7 + 0.3 * intensity;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    // Call needsUpdate after assigning texture as per requirements
    sunMaterial.needsUpdate = true;
    scene.add(sun);

    // Sun corona/glow with enhanced shader
    const coronaGeometry = new THREE.SphereGeometry(2.5, 64, 64);
    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.3 },
        p: { value: 4.5 },
        glowColor: { value: new THREE.Color(0xff6600) }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float c;
        uniform float p;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
          gl_FragColor = vec4(glowColor, intensity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    scene.add(corona);

    // Planet factory with procedural textures
    const createPlanetTexture = (baseColor: THREE.Color, seed: number): THREE.DataTexture => {
      const size = 512;
      const data = new Uint8Array(size * size * 4);
      
      // Simple noise-based procedural texture
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const x = i / size;
          const y = j / size;
          
          // Generate noise pattern
          const noise1 = Math.sin(x * 10.0 + seed) * Math.cos(y * 10.0 + seed);
          const noise2 = Math.sin(x * 20.0 + seed * 2) * Math.cos(y * 20.0 + seed * 2);
          const noise = (noise1 + noise2 * 0.5) * 0.5 + 0.5;
          
          // Apply to color
          const idx = (i + j * size) * 4;
          data[idx] = baseColor.r * 255 * (0.7 + noise * 0.3);
          data[idx + 1] = baseColor.g * 255 * (0.7 + noise * 0.3);
          data[idx + 2] = baseColor.b * 255 * (0.7 + noise * 0.3);
          data[idx + 3] = 255;
        }
      }
      
      const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      texture.needsUpdate = true;
      return texture;
    };
    
    const createPlanet = (planet: Planet): THREE.Mesh => {
      const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
      const baseColor = new THREE.Color(planet.color);
      const texture = createPlanetTexture(baseColor, planet.angle);
      
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        color: planet.color,
        metalness: 0.5,
        roughness: 0.3,
        emissive: planet.color,
        emissiveIntensity: 0.3
      });
      
      return new THREE.Mesh(geometry, material);
    };

    // Planet configuration with realistic colors and sizes
    const planets: Planet[] = [
      { name: 'Telemarketing', color: 0x3b82f6, size: 0.5, distance: 6, speed: 0.5, angle: 0 },
      { name: 'Scouter', color: 0x8b5cf6, size: 0.5, distance: 6, speed: 0.5, angle: Math.PI / 2 },
      { name: 'Agendamento', color: 0x10b981, size: 0.5, distance: 6, speed: 0.5, angle: Math.PI },
      { name: 'Administrativo', color: 0xef4444, size: 0.5, distance: 6, speed: 0.5, angle: (3 * Math.PI) / 2 }
    ];

    // Create planets and labels
    planets.forEach((planet) => {
      const mesh = createPlanet(planet);
      scene.add(mesh);
      planet.mesh = mesh;

      // Create hover ring (initially invisible)
      const ringGeometry = new THREE.RingGeometry(planet.size * 1.2, planet.size * 1.5, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: planet.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      scene.add(ring);
      planet.ringMesh = ring;

      // Create label
      const label = document.createElement('div');
      label.className = 'planet-label';
      label.textContent = planet.name;
      label.style.position = 'absolute';
      label.style.pointerEvents = 'none';
      container.appendChild(label);
      planet.label = label;
    });

    // Raycaster for hover detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredPlanet: Planet | null = null;

    const onMouseMove = (event: MouseEvent) => {
      if (animatingRef.current) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        planets.map((p) => p.mesh!).filter(Boolean)
      );

      // Reset all rings
      planets.forEach((planet) => {
        if (planet.ringMesh) {
          (planet.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      });

      if (intersects.length > 0) {
        const found = planets.find((p) => p.mesh === intersects[0].object);
        if (found) {
          hoveredPlanet = found;
          // Show ring glow
          if (found.ringMesh) {
            (found.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
          }
          // Show tooltip
          if (tooltipRef.current) {
            tooltipRef.current.textContent = found.name;
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.style.left = event.clientX + 10 + 'px';
            tooltipRef.current.style.top = event.clientY + 10 + 'px';
          }
          document.body.style.cursor = 'pointer';
        }
      } else {
        hoveredPlanet = null;
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        document.body.style.cursor = 'default';
      }
    };

    const onClick = () => {
      if (animatingRef.current || !hoveredPlanet) return;

      const planet = hoveredPlanet;
      const link = LINKS[planet.name as keyof typeof LINKS];
      
      if (!link) return;

      animatingRef.current = true;
      document.body.style.cursor = 'default';
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }

      // Fly-in animation
      const startPos = camera.position.clone();
      const targetPos = planet.mesh!.position.clone().normalize().multiplyScalar(3);
      const duration = 1500;
      const startTime = Date.now();

      const animateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

        camera.position.lerpVectors(startPos, targetPos, eased);
        camera.lookAt(planet.mesh!.position);

        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        } else {
          navigate(link);
        }
      };

      animateCamera();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Rotate sun and increment text offset for rotating label
      sun.rotation.y += 0.001;
      sunUniforms.uTextOffset.value += TEXT_ROTATION_SPEED;
      if (sunUniforms.uTextOffset.value > TEXT_OFFSET_MAX) {
        sunUniforms.uTextOffset.value = 0.0;
      }
      
      // Update time uniform for FBM animation
      sunUniforms.uTime.value += 0.01;

      // Update planet positions
      planets.forEach((planet) => {
        planet.angle += planet.speed * 0.01;
        const x = Math.cos(planet.angle) * planet.distance;
        const z = Math.sin(planet.angle) * planet.distance;
        
        if (planet.mesh) {
          planet.mesh.position.set(x, 0, z);
          planet.mesh.rotation.y += 0.02;
        }

        if (planet.ringMesh) {
          planet.ringMesh.position.set(x, 0, z);
          planet.ringMesh.lookAt(camera.position);
        }

        // Update label position
        if (planet.label && planet.mesh) {
          const vector = planet.mesh.position.clone();
          vector.project(camera);
          
          const screenX = (vector.x * 0.5 + 0.5) * window.innerWidth;
          const screenY = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
          
          planet.label.style.left = screenX + 'px';
          planet.label.style.top = screenY + 50 + 'px';
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationId);
      
      // Dispose planet resources
      planets.forEach((planet) => {
        if (planet.label) {
          planet.label.remove();
        }
        if (planet.mesh) {
          planet.mesh.geometry.dispose();
          (planet.mesh.material as THREE.Material).dispose();
        }
        if (planet.ringMesh) {
          planet.ringMesh.geometry.dispose();
          (planet.ringMesh.material as THREE.Material).dispose();
        }
      });
      
      if (container) {
        container.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      sunTexture.dispose();
      sunGeometry.dispose();
      sunMaterial.dispose();
      coronaGeometry.dispose();
      coronaMaterial.dispose();
    };
  }, [navigate]);

  return (
    <div className="home-choice-container">
      <div className="watermark">Maxconnect</div>
      <div className="stars-overlay"></div>
      <div ref={containerRef} className="canvas-container"></div>
      <div ref={tooltipRef} className="planet-tooltip"></div>
    </div>
  );
};

export default HomeChoice;
