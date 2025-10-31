import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import './hero3d.css';

interface CardConfig {
  title: string;
  description: string;
  route: string;
  icon: string;
  color: string;
  angle: number;
}

const CARDS: CardConfig[] = [
  {
    title: 'Telemarketing',
    description: 'Lead Management & Automation',
    route: '/telemarketing',
    icon: '📞',
    color: '#2563eb',
    angle: 0,
  },
  {
    title: 'Scouter',
    description: 'Scouting Management System',
    route: '/scouter',
    icon: '🎯',
    color: '#7c3aed',
    angle: Math.PI / 2,
  },
  {
    title: 'Agendamento',
    description: 'Gestão de Negociações',
    route: '/agenciamento',
    icon: '🤝',
    color: '#059669',
    angle: Math.PI,
  },
  {
    title: 'Administrativo',
    description: 'Gestão do Sistema',
    route: '/admin',
    icon: '🏢',
    color: '#ea580c',
    angle: (3 * Math.PI) / 2,
  },
];

const Hero3D: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const webglContainerRef = useRef<HTMLDivElement | null>(null);
  const css3dContainerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !webglContainerRef.current || !css3dContainerRef.current) return;

    const container = containerRef.current;
    const webglContainer = webglContainerRef.current;
    const css3dContainer = css3dContainerRef.current;

    // Setup scenes
    const scene = new THREE.Scene();
    const css3dScene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 200, 800);

    // WebGL Renderer for particles
    const webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    webglRenderer.setSize(window.innerWidth, window.innerHeight);
    webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    webglRenderer.setClearColor(0x000000, 0);
    webglContainer.appendChild(webglRenderer.domElement);

    // CSS3D Renderer for DOM cards
    const css3dRenderer = new CSS3DRenderer();
    css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    css3dContainer.appendChild(css3dRenderer.domElement);

    // OrbitControls bound to CSS3D renderer
    const controls = new OrbitControls(camera, css3dRenderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 400;
    controls.maxDistance = 1200;
    controls.maxPolarAngle = Math.PI / 1.8;
    controls.minPolarAngle = Math.PI / 3;

    // Create sparse WebGL starfield
    const starCount = 800;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 600 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      starSizes[i] = Math.random() * 2 + 0.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Create CSS3D cards in a subtle ring
    const radius = 350;
    const cardElements: { element: HTMLDivElement; css3dObject: CSS3DObject; config: CardConfig }[] = [];

    CARDS.forEach((config) => {
      const element = document.createElement('div');
      element.className = 'hero3d-card';
      element.style.borderColor = config.color;

      const icon = document.createElement('div');
      icon.className = 'hero3d-card-icon';
      icon.textContent = config.icon;

      const title = document.createElement('div');
      title.className = 'hero3d-card-title';
      title.textContent = config.title;

      const description = document.createElement('div');
      description.className = 'hero3d-card-description';
      description.textContent = config.description;

      const cta = document.createElement('button');
      cta.className = 'hero3d-card-cta';
      cta.textContent = 'Enter →';
      cta.style.backgroundColor = config.color;

      element.appendChild(icon);
      element.appendChild(title);
      element.appendChild(description);
      element.appendChild(cta);

      const css3dObject = new CSS3DObject(element);
      const x = Math.sin(config.angle) * radius;
      const z = Math.cos(config.angle) * radius;
      css3dObject.position.set(x, 0, z);
      css3dObject.lookAt(0, 0, 0);

      css3dScene.add(css3dObject);
      cardElements.push({ element, css3dObject, config });
    });

    // Hover and tilt effects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredCard: typeof cardElements[0] | null = null;

    const onMouseMove = (event: MouseEvent) => {
      if (animatingRef.current) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Manual intersection check for CSS3D objects
      let newHovered: typeof cardElements[0] | null = null;
      const cameraPos = camera.position;

      for (const card of cardElements) {
        const cardPos = card.css3dObject.position;
        const toCard = new THREE.Vector3().subVectors(cardPos, cameraPos).normalize();
        const rayDir = raycaster.ray.direction;
        const angle = toCard.angleTo(rayDir);

        // Simple distance-based hover detection
        if (angle < 0.15) {
          newHovered = card;
          break;
        }
      }

      // Update hover state
      if (newHovered !== hoveredCard) {
        if (hoveredCard) {
          hoveredCard.element.style.transform = 'scale(1)';
          hoveredCard.element.classList.remove('hovered');
        }
        if (newHovered) {
          newHovered.element.style.transform = 'scale(1.05)';
          newHovered.element.classList.add('hovered');
        }
        hoveredCard = newHovered;
      }

      // Tilt effect for hovered card
      if (hoveredCard) {
        const tiltX = (event.clientY / window.innerHeight - 0.5) * 10;
        const tiltY = (event.clientX / window.innerWidth - 0.5) * -10;
        hoveredCard.element.style.transform = `scale(1.05) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }

      // Update tooltip
      if (tooltipRef.current) {
        if (hoveredCard) {
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = `${event.clientX}px`;
          tooltipRef.current.style.top = `${event.clientY - 40}px`;
          tooltipRef.current.textContent = hoveredCard.config.title;
        } else {
          tooltipRef.current.style.display = 'none';
        }
      }
    };

    // Shared camera fly-in animation function
    const flyToCard = (targetPos: THREE.Vector3, targetRoute: string) => {
      animatingRef.current = true;
      
      const direction = targetPos.clone().normalize();
      const cameraTarget = targetPos.clone().add(direction.multiplyScalar(-200));

      const startPos = camera.position.clone();
      const startFov = camera.fov;
      const targetFov = 40;
      const duration = 1500;
      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-in-out
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : -1 + (4 - 2 * progress) * progress;

        camera.position.lerpVectors(startPos, cameraTarget, eased);
        camera.fov = startFov + (targetFov - startFov) * eased;
        camera.updateProjectionMatrix();
        camera.lookAt(targetPos);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          navigate(targetRoute);
        }
      };

      animate();
    };

    // Click handling with camera fly-in
    const onClick = () => {
      if (!hoveredCard || animatingRef.current) return;
      flyToCard(hoveredCard.css3dObject.position.clone(), hoveredCard.config.route);
    };

    window.addEventListener('mousemove', onMouseMove);
    css3dRenderer.domElement.addEventListener('click', onClick);

    // Handle CTA button clicks - use Map for O(1) lookup
    const cardMap = new Map(cardElements.map(card => [card.element, card]));
    
    cardElements.forEach(({ element }) => {
      const cta = element.querySelector('.hero3d-card-cta') as HTMLButtonElement;
      if (cta) {
        cta.addEventListener('click', (e) => {
          e.stopPropagation();
          if (animatingRef.current) return;

          const card = cardMap.get(element);
          if (!card) return;

          flyToCard(card.css3dObject.position.clone(), card.config.route);
        });
      }
    });

    // Animation loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Slow rotation of stars
      stars.rotation.y += 0.0002;

      controls.update();
      webglRenderer.render(scene, camera);
      css3dRenderer.render(css3dScene, camera);
    };

    animate();

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      webglRenderer.setSize(window.innerWidth, window.innerHeight);
      css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      css3dRenderer.domElement.removeEventListener('click', onClick);
      cancelAnimationFrame(animationFrameId);

      // Dispose geometries and materials
      starGeometry.dispose();
      starMaterial.dispose();

      // Dispose controls
      controls.dispose();

      // Remove renderers
      if (webglContainer && webglRenderer.domElement.parentElement === webglContainer) {
        webglContainer.removeChild(webglRenderer.domElement);
      }
      if (css3dContainer && css3dRenderer.domElement.parentElement === css3dContainer) {
        css3dContainer.removeChild(css3dRenderer.domElement);
      }

      webglRenderer.dispose();
      // Note: CSS3DRenderer is DOM-based and doesn't have a dispose method
      // Removing its DOM element is sufficient for cleanup
    };
  }, [navigate]);

  return (
    <div ref={containerRef} className="hero3d-root">
      <div className="hero3d-stars-css"></div>
      <div ref={webglContainerRef} className="hero3d-webgl"></div>
      <div ref={css3dContainerRef} className="hero3d-css3d"></div>
      <div ref={tooltipRef} className="hero3d-tooltip"></div>
    </div>
  );
};

export default Hero3D;
