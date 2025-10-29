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

const HomeChoice: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current; // Store ref for cleanup

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

    // Create fiery sun with procedural canvas texture
    const createSunTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Create radial gradient for fiery sun
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.1, '#ffff00');
      gradient.addColorStop(0.3, '#ffaa00');
      gradient.addColorStop(0.5, '#ff6600');
      gradient.addColorStop(0.7, '#ff3300');
      gradient.addColorStop(1, '#880000');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add noise/texture
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = Math.random() * 3;
        const opacity = Math.random() * 0.3;
        
        ctx.fillStyle = `rgba(255, 200, 0, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      return new THREE.CanvasTexture(canvas);
    };

    const sunTexture = createSunTexture();
    const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: sunTexture,
      emissive: new THREE.Color(0xff6600),
      emissiveIntensity: 0.8
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Sun corona/glow
    const coronaGeometry = new THREE.SphereGeometry(2.5, 32, 32);
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

    // Planet configuration
    const planets: Planet[] = [
      { name: 'Telemarketing', color: 0x3b82f6, size: 0.5, distance: 6, speed: 0.5, angle: 0 },
      { name: 'Scouter', color: 0x8b5cf6, size: 0.5, distance: 6, speed: 0.5, angle: Math.PI / 2 },
      { name: 'Agendamento', color: 0x10b981, size: 0.5, distance: 6, speed: 0.5, angle: Math.PI },
      { name: 'Administrativo', color: 0xef4444, size: 0.5, distance: 6, speed: 0.5, angle: (3 * Math.PI) / 2 }
    ];

    // Create planets and labels
    planets.forEach((planet) => {
      const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: planet.color,
        metalness: 0.5,
        roughness: 0.3,
        emissive: planet.color,
        emissiveIntensity: 0.3
      });
      const mesh = new THREE.Mesh(geometry, material);
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

      // Rotate sun
      sun.rotation.y += 0.001;

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
      
      planets.forEach((planet) => {
        if (planet.label) {
          planet.label.remove();
        }
      });
      
      if (container) {
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
      <div ref={tooltipRef} className="planet-tooltip"></div>
    </div>
  );
};

export default HomeChoice;
