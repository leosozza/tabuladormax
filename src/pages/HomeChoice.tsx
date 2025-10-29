import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import './home-choice.css';

// Planet configuration with links (keeps the "vínculo com lovable" routes)
const LINKS = {
  Telemarketing: '/lead',
  Scouter: '/scouter',
  Agendamento: '/agenciamento',
  Administrativo: '/admin'
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
const PARTICLE_COUNT = 5000; // Reduced for performance

// Procedural texture parameters (kept for planet generator even if simple)
const PLANET_BASE_SCALE = 8.0;
const PLANET_BASE_MULTIPLIER = 0.5;
const PLANET_DETAIL_SCALE = 20.0;
const PLANET_DETAIL_MULTIPLIER = 0.3;

// Create canvas texture with text label (MAXFAMA)
const makeSunLabelTexture = (text: string, width: number, height: number): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Fiery radial gradient base
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.1, '#ffff00');
  gradient.addColorStop(0.3, '#ffaa00');
  gradient.addColorStop(0.5, '#ff6600');
  gradient.addColorStop(0.7, '#ff3300');
  gradient.addColorStop(1, '#880000');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add noisy particles for texture
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 3;
    const opacity = Math.random() * 0.25;

    ctx.fillStyle = `rgba(255, ${150 + Math.floor(Math.random() * 100)}, 0, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw text label in the middle with glow
  ctx.font = `bold ${Math.floor(height / 8)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, width / 2, height / 2);
  ctx.shadowBlur = 10;
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
};

const HomeChoice: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Sun texture and geometry
    const sunTexture = makeSunLabelTexture('MAXFAMA', 2048, 1024);
    const sunGeometry = new THREE.SphereGeometry(2, 64, 64);

    // Sun shader: FBM-like surface + rotating text label
    // The shader below uses snoise-based FBM helper and domain warping to produce a fiery surface.
    const sunUniforms: any = {
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
        precision highp float;
        uniform sampler2D uTextMap;
        uniform float uTextOffset;
        uniform float uTextStrength;
        uniform float uTime;
        uniform vec3 uEmissiveColor;
        uniform float uEmissiveIntensity;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        // Classic 3D simplex/snoise helpers (adapted)
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
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
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

        // FBM using snoise
        float fbm(vec3 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          // 4 octaves is a good balance
          for (int i = 0; i < 4; i++) {
            value += amplitude * snoise(p * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }

        // Domain warp to get more organic fiery shapes
        vec3 domainWarp(vec3 p, float time) {
          vec3 q = vec3(
            fbm(p + vec3(0.0, 0.0, time * 0.12)),
            fbm(p + vec3(5.2, 1.3, time * 0.12)),
            fbm(p + vec3(3.1, 4.7, time * 0.12))
          );
          vec3 r = vec3(
            fbm(p + 4.0 * q + vec3(1.7, 9.2, time * 0.18)),
            fbm(p + 4.0 * q + vec3(8.3, 2.8, time * 0.18)),
            fbm(p + 4.0 * q + vec3(4.5, 6.1, time * 0.18))
          );
          return p + r * 0.35;
        }

        void main() {
          // Compute warped noise based on 3D position + time for animation
          vec3 warped = domainWarp(vPosition * 1.8, uTime);
          float n = fbm(warped);

          // Sample the text map (repeat horizontally) for MAXFAMA "belt"
          vec2 uv = vUv;
          uv.x = fract(uv.x + uTextOffset);
          vec4 textColor = texture2D(uTextMap, uv);

          // Build fiery colors using noise
          vec3 col1 = vec3(1.0, 0.9, 0.0);
          vec3 col2 = vec3(1.0, 0.45, 0.0);
          vec3 col3 = vec3(0.8, 0.12, 0.0);
          float noiseValue = clamp(n * 0.5 + 0.5, 0.0, 1.0);
          vec3 fire = mix(col3, col2, noiseValue);
          fire = mix(fire, col1, pow(noiseValue, 2.0));

          // Blend text (use text alpha and uTextStrength to control dominance)
          vec3 blended = mix(fire, textColor.rgb, textColor.a * uTextStrength);

          // Emissive + rim for depth
          vec3 emissive = uEmissiveColor * uEmissiveIntensity * 0.3;
          float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          blended += fresnel * vec3(1.0, 0.55, 0.0) * 0.28;
          blended += emissive;

          // Slight intensity modulation by surface normal
          float intensity = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
          blended *= 0.7 + 0.3 * intensity;

          gl_FragColor = vec4(blended, 1.0);
        }
      `
    });

    sunMaterial.needsUpdate = true;
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Corona/glow
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

    // Planet procedural texture generator (simple DataTexture)
    const createPlanetTexture = (baseColor: THREE.Color, seed: number): THREE.DataTexture => {
      const size = 512;
      const data = new Uint8Array(size * size * 4);

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = x / size;
          const v = y / size;

          // Two-layer sin/cos noise to create bands/patches (cheap)
          const n1 = Math.sin(u * 10 + seed) * Math.cos(v * 10 + seed);
          const n2 = Math.sin(u * 20 + seed * 1.7) * Math.cos(v * 20 + seed * 1.7);
          let noise = (n1 + 0.5 * n2) * 0.5 + 0.5;
          noise = Math.min(Math.max(noise, 0), 1);

          const idx = (x + y * size) * 4;
          data[idx] = Math.floor(baseColor.r * 255 * (0.7 + noise * 0.3));
          data[idx + 1] = Math.floor(baseColor.g * 255 * (0.7 + noise * 0.3));
          data[idx + 2] = Math.floor(baseColor.b * 255 * (0.7 + noise * 0.3));
          data[idx + 3] = 255;
        }
      }

      const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      tex.needsUpdate = true;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    const createPlanet = (planet: Planet): THREE.Mesh => {
      const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
      const baseColor = new THREE.Color(planet.color);
      const texture = createPlanetTexture(baseColor, planet.angle + Math.random() * 10);

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        color: planet.color,
        metalness: 0.3,
        roughness: 0.7,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0.0
      });

      return new THREE.Mesh(geometry, material);
    };

    // Planet list
    const planets: Planet[] = [
      { name: 'Telemarketing', color: 0x3b82f6, size: 0.6, distance: 6, speed: 0.5, angle: 0 },
      { name: 'Scouter', color: 0x8b5cf6, size: 0.6, distance: 8, speed: 0.38, angle: Math.PI / 2 },
      { name: 'Agendamento', color: 0x10b981, size: 0.6, distance: 10, speed: 0.3, angle: Math.PI },
      { name: 'Administrativo', color: 0xef4444, size: 0.6, distance: 12, speed: 0.22, angle: (3 * Math.PI) / 2 }
    ];

    // Create planets, rings and labels
    planets.forEach((planet) => {
      const mesh = createPlanet(planet);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      scene.add(mesh);
      planet.mesh = mesh;

      // Hover ring
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

      // Label (HTML element)
      const label = document.createElement('div');
      label.className = 'planet-label';
      label.textContent = planet.name;
      label.style.position = 'absolute';
      label.style.pointerEvents = 'none';
      label.style.transform = 'translate(-50%, -50%)';
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
      const intersects = raycaster.intersectObjects(planets.map((p) => p.mesh!).filter(Boolean));

      // Reset rings
      planets.forEach((p) => {
        if (p.ringMesh) {
          (p.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      });

      if (intersects.length > 0) {
        const found = planets.find((p) => p.mesh === intersects[0].object);
        if (found) {
          hoveredPlanet = found;
          if (found.ringMesh) {
            (found.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
          }
          if (tooltipRef.current) {
            tooltipRef.current.textContent = found.name;
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.style.left = event.clientX + 12 + 'px';
            tooltipRef.current.style.top = event.clientY + 12 + 'px';
          }
          document.body.style.cursor = 'pointer';
        }
      } else {
        hoveredPlanet = null;
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
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
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';

      // Fly in animation: move camera towards planet
      const startPos = camera.position.clone();
      const targetPos = planet.mesh!.position.clone().normalize().multiplyScalar(3.0);
      const duration = 1500;
      const startTime = performance.now();

      const animateCamera = (t: number) => {
        const elapsed = t - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

        camera.position.lerpVectors(startPos, targetPos, eased);
        camera.lookAt(planet.mesh!.position);

        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        } else {
          // navigate to the linked route
          navigate(link);
        }
      };

      requestAnimationFrame(animateCamera);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    // Animation loop
    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Rotate sun and update its uniforms for animation
      sun.rotation.y += 0.0012;
      sunUniforms.uTextOffset.value += TEXT_ROTATION_SPEED;
      if (sunUniforms.uTextOffset.value > TEXT_OFFSET_MAX) sunUniforms.uTextOffset.value = 0.0;
      sunUniforms.uTime.value += 0.01;

      // Update planets: orbit + rotation + labels + rings
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

        // Update label position in screen space
        if (planet.label && planet.mesh) {
          const vector = planet.mesh.position.clone();
          vector.project(camera);

          const screenX = (vector.x * 0.5 + 0.5) * window.innerWidth;
          const screenY = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

          planet.label.style.left = `${screenX}px`;
          planet.label.style.top = `${screenY + 50}px`;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize handling
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

      // Dispose resources: geometries, textures, materials, dom labels
      planets.forEach((planet) => {
        if (planet.label) {
          planet.label.remove();
        }
        if (planet.mesh) {
          if ((planet.mesh.material as any).map) {
            ((planet.mesh.material as any).map as THREE.Texture).dispose();
          }
          planet.mesh.geometry.dispose();
          (planet.mesh.material as THREE.Material).dispose();
        }
        if (planet.ringMesh) {
          planet.ringMesh.geometry.dispose();
          (planet.ringMesh.material as THREE.Material).dispose();
        }
      });

      // Dispose sun and corona
      sunTexture.dispose();
      sunGeometry.dispose();
      sunMaterial.dispose();
      coronaGeometry.dispose();
      coronaMaterial.dispose();

      if (container && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [navigate]);

  return (
    <div className="home-choice-container">
      <div className="watermark">Maxconnect</div>
      <div className="stars-overlay"></div>
      <div ref={containerRef} className="canvas-container"></div>
      <div ref={tooltipRef} className="planet-tooltip" style={{ display: 'none' }}></div>
    </div>
  );
};

export default HomeChoice;