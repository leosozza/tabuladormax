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
      uEmissiveColor: { value: new THREE.Color(0xff6600) },
      uEmissiveIntensity: { value: 0.8 },
      uTime: { value: 0.0 }
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
        #ifdef GL_ES
        precision highp float;
        #endif
        
        uniform sampler2D uTextMap;
        uniform float uTextOffset;
        uniform vec3 uEmissiveColor;
        uniform float uEmissiveIntensity;
        uniform float uTime;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // FBM noise functions for realistic sun surface
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        // Fractal Brownian Motion
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for(int i = 0; i < 6; i++) {
            value += amplitude * noise(p * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
          }
          
          return value;
        }
        
        // Domain warping for more organic patterns
        vec2 domainWarp(vec2 p) {
          vec2 q = vec2(fbm(p + vec2(0.0, 0.0)), fbm(p + vec2(5.2, 1.3)));
          return vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
        }
        
        void main() {
          // Sample the sun texture with rotating offset for MAXFAMA label
          vec2 uv = vUv;
          uv.x = fract(uv.x + uTextOffset);
          
          vec4 texColor = texture2D(uTextMap, uv);
          
          // Create FBM-based sun surface with domain warping
          vec2 warpedUv = domainWarp(vUv * 3.0 + uTextOffset * 0.5 + uTime * 0.02);
          float pattern = fbm(vUv * 5.0 + warpedUv * 2.0 + uTime * 0.05);
          
          // Create fiery color gradient based on noise
          vec3 sunColor1 = vec3(1.0, 0.8, 0.2); // bright yellow
          vec3 sunColor2 = vec3(1.0, 0.4, 0.0); // orange
          vec3 sunColor3 = vec3(0.8, 0.1, 0.0); // dark red
          
          vec3 fbmColor = mix(sunColor3, sunColor2, pattern);
          fbmColor = mix(fbmColor, sunColor1, pow(pattern, 2.0));
          
          // Blend text label with FBM surface
          vec3 finalColor = mix(fbmColor, texColor.rgb, texColor.a * 0.7);
          
          // Apply emissive glow
          vec3 emissive = uEmissiveColor * uEmissiveIntensity;
          finalColor += emissive * 0.3;
          
          // Add brightness variation based on normal (limb darkening)
          float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          finalColor += fresnel * vec3(1.0, 0.5, 0.0) * 0.3;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
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

    // Planet configuration with realistic colors and sizes
    const planets: Planet[] = [
      { name: 'Telemarketing', color: 0x3b82f6, size: 0.5, distance: 6, speed: 0.5, angle: 0 },
      { name: 'Scouter', color: 0x8b5cf6, size: 0.5, distance: 6, speed: 0.5, angle: Math.PI / 2 },
      { name: 'Agendamento', color: 0x10b981, size: 0.5, distance: 6, speed: 0.5, angle: Math.PI },
      { name: 'Administrativo', color: 0xef4444, size: 0.5, distance: 6, speed: 0.5, angle: (3 * Math.PI) / 2 }
    ];

    // Create planets and labels with procedural textures
    planets.forEach((planet) => {
      const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
      
      // Create procedural planet shader
      const planetMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(planet.color) },
          uTime: { value: 0 }
        },
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
          #ifdef GL_ES
          precision highp float;
          #endif
          
          uniform vec3 uColor;
          uniform float uTime;
          
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          // Simple noise function
          float hash(vec3 p) {
            return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
          }
          
          float noise3D(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            return mix(
              mix(
                mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
                mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
                f.y
              ),
              mix(
                mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
                mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
                f.y
              ),
              f.z
            );
          }
          
          void main() {
            // Procedural surface pattern
            float pattern = noise3D(vPosition * 8.0);
            pattern = pattern * 0.5 + 0.5;
            
            // Add secondary detail layer
            float detail = noise3D(vPosition * 20.0) * 0.3;
            
            // Combine patterns
            vec3 baseColor = uColor;
            vec3 darkColor = uColor * 0.5;
            vec3 finalColor = mix(darkColor, baseColor, pattern + detail);
            
            // Add rim lighting
            float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
            finalColor += fresnel * uColor * 0.4;
            
            // Add subtle emissive
            finalColor += uColor * 0.1;
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `
      });
      
      const mesh = new THREE.Mesh(geometry, planetMaterial);
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
      sunUniforms.uTime.value += 0.01;
      if (sunUniforms.uTextOffset.value > TEXT_OFFSET_MAX) {
        sunUniforms.uTextOffset.value = 0.0;
      }

      // Update planet positions
      planets.forEach((planet) => {
        planet.angle += planet.speed * 0.01;
        const x = Math.cos(planet.angle) * planet.distance;
        const z = Math.sin(planet.angle) * planet.distance;
        
        if (planet.mesh) {
          planet.mesh.position.set(x, 0, z);
          planet.mesh.rotation.y += 0.02;
          
          // Update time uniform for procedural animation
          const material = planet.mesh.material as THREE.ShaderMaterial;
          if (material.uniforms && material.uniforms.uTime) {
            material.uniforms.uTime.value += 0.01;
          }
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
