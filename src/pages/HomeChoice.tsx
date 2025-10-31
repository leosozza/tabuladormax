import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './home-choice.css';

const LINKS = {
  Telemarketing: '/telemarketing',
  Scouter: '/scouter',
  Agenciamento: '/agenciamento',
  Administrativo: '/admin'
};

const SOL_R = 7.5;

interface PlanetConfig {
  label: string;
  kind: string;
  color: number;
  radius: number;
  speed: number;
  tilt: number;
  link: string;
}

interface PlanetGroup extends THREE.Group {
  userData: {
    label: string;
    link: string;
    ring: THREE.Mesh;
    title: THREE.Sprite;
    radius: number;
    speed: number;
    tilt: number;
    angle: number;
    clouds?: THREE.Mesh | null;
    spin: number;
  };
}

// Noise utilities
function makeNoise2D(seed = 1337) {
  let s = seed >>> 0;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0, s / 4294967296);
  const grad = new Float32Array(256 * 2);
  for (let i = 0; i < 256; i++) {
    const a = rand() * Math.PI * 2;
    grad[i * 2] = Math.cos(a);
    grad[i * 2 + 1] = Math.sin(a);
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i] = (rand() * 256) | 0;
  
  function dot(ix: number, iy: number, x: number, y: number) {
    const g = (perm[(ix + perm[iy & 255]) & 255] << 1);
    return grad[g] * (x - ix) + grad[g + 1] * (y - iy);
  }
  function fade(t: number) { return t * t * (3 - 2 * t); }
  function noise(x: number, y: number) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fade(fx), v = fade(fy);
    const n00 = dot(ix, iy, x, y), n10 = dot(ix + 1, iy, x, y);
    const n01 = dot(ix, iy + 1, x, y), n11 = dot(ix + 1, iy + 1, x, y);
    const nx0 = n00 + u * (n10 - n00), nx1 = n01 + u * (n11 - n01);
    return nx0 + v * (nx1 - nx0);
  }
  return (x: number, y: number) => noise(x, y);
}

function fbm2(noise: (x: number, y: number) => number, x: number, y: number, oct = 5, gain = 0.5, lac = 2.0) {
  let a = 1, f = 1, sum = 0, amp = 0;
  for (let i = 0; i < oct; i++) {
    sum += a * (noise(x * f, y * f) * 0.5 + 0.5);
    amp += a;
    a *= gain;
    f *= lac;
  }
  return sum / amp;
}

// Sun label removed - now using sprite above

// Planet textures
function textureRock({ w = 512, h = 256, base = '#935f3b', vein = '#c98b5a', seed = 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const n = makeNoise2D(seed);
  const img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h;
    const e = fbm2(n, u * 6, v * 6, 5, 0.5, 2.1);
    const t = e;
    const r = (parseInt(base.slice(1, 3), 16) * (1 - t) + parseInt(vein.slice(1, 3), 16) * t) | 0;
    const g = (parseInt(base.slice(3, 5), 16) * (1 - t) + parseInt(vein.slice(3, 5), 16) * t) | 0;
    const b = (parseInt(base.slice(5, 7), 16) * (1 - t) + parseInt(vein.slice(5, 7), 16) * t) | 0;
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const bump = map.clone();
  bump.needsUpdate = true;
  return { map, bump };
}

function textureGasGiant({ w = 512, h = 256, bands = ['#e1c8a7', '#d4b893', '#caa980', '#c19c73', '#b18b62'], seed = 2 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const n = makeNoise2D(seed);
  for (let y = 0; y < h; y++) {
    const v = y / h, t = v * bands.length, idx = Math.min(bands.length - 1, Math.max(0, Math.floor(t)));
    ctx.fillStyle = bands[idx];
    ctx.fillRect(0, y, w, 1);
  }
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const warp = fbm2(n, x / w * 8, y / h * 1.2, 4, 0.55, 2.1) * 8;
    const sx = Math.min(w - 1, Math.max(0, Math.floor(x + warp - 4)));
    const i = (y * w + x) * 4, si = (y * w + sx) * 4;
    d[i] = d[si]; d[i + 1] = d[si + 1]; d[i + 2] = d[si + 2];
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = THREE.RepeatWrapping;
  return { map };
}

function textureEarthLike({ w = 512, h = 256, seed = 3 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const n = makeNoise2D(seed);
  const img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h;
    const e = fbm2(n, u * 3, v * 3, 5, 0.5, 2.0);
    const m = fbm2(n, u * 8 + 2.3, v * 8 - 1.7, 3, 0.5, 2.2);
    let R, G, B;
    if (e < 0.45) {
      const t = (e / 0.45);
      R = 20 * (1 - t) + 20 * t; G = 60 * (1 - t) + 120 * t; B = 120 * (1 - t) + 200 * t;
    } else {
      const t = (e - 0.45) / 0.55;
      if (t > 0.82) { R = 240; G = 240; B = 240; }
      else {
        const dry = [150, 115, 65], wet = [40, 120, 40];
        R = dry[0] * (1 - m) + wet[0] * m; G = dry[1] * (1 - m) + wet[1] * m; B = dry[2] * (1 - m) + wet[2] * m;
      }
    }
    const i = (y * w + x) * 4;
    d[i] = R | 0; d[i + 1] = G | 0; d[i + 2] = B | 0; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = THREE.RepeatWrapping;
  const cc = document.createElement('canvas');
  cc.width = w; cc.height = h;
  const cx = cc.getContext('2d')!;
  const img2 = cx.createImageData(w, h), d2 = img2.data;
  const n2 = makeNoise2D(seed + 99);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h;
    const cl = fbm2(n2, u * 5, v * 5, 5, 0.55, 2.1);
    const a = Math.pow(Math.max(0, cl - 0.55), 2.0) * 255;
    const i = (y * w + x) * 4;
    d2[i] = 255; d2[i + 1] = 255; d2[i + 2] = 255; d2[i + 3] = a | 0;
  }
  cx.putImageData(img2, 0, 0);
  const clouds = new THREE.CanvasTexture(cc);
  clouds.wrapS = THREE.RepeatWrapping;
  const bump = map.clone();
  bump.needsUpdate = true;
  return { map, clouds, bump };
}

function labelSprite(text: string) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);
  ctx.font = '700 98px Inter, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, 0, S, 0);
  grad.addColorStop(0, '#ff66cc');
  grad.addColorStop(1, '#6aa7ff');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(255,255,255,.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  ctx.fillText(text, S / 2, S / 2);
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
}

const HomeChoice: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
    camera.position.set(0, 1.6, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 12;
    controls.maxDistance = 80;
    controls.rotateSpeed = 0.5;

    scene.add(new THREE.AmbientLight(0x4a8dff, 0.25));
    const sunLight = new THREE.PointLight(0xffa200, 2.2, 300, 2.0);
    scene.add(sunLight);

    // 3D Stars
    const starsGeo = new THREE.BufferGeometry();
    const N = 1600;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 160 * Math.cbrt(Math.random());
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.12,
      color: 0x9bb7ff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    scene.add(new THREE.Points(starsGeo, starsMat));

    // Sun
    const sun = new THREE.Group();
    scene.add(sun);

    const sunUniforms = {
      uTime: { value: 0 },
      uNoiseScale: { value: 2.2 },
      uWarp: { value: 0.35 },
      uRimPower: { value: 2.2 },
      uEmissiveBoost: { value: 0.85 },
      uColCore: { value: new THREE.Color(0xfff0b0) },
      uColMid: { value: new THREE.Color(0xffa942) },
      uColEdge: { value: new THREE.Color(0xde3a05) }
    };

    const sunVertex = `
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main(){
        vec4 wp = modelMatrix * vec4(position,1.0);
        vPosW = wp.xyz;
        vNormalW = normalize((modelMatrix * vec4(normal,0.0)).xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;

    const sunFragment = `
      precision highp float;
      uniform float uTime;
      uniform float uNoiseScale;
      uniform float uWarp;
      uniform float uRimPower;
      uniform float uEmissiveBoost;
      uniform vec3 uColCore, uColMid, uColEdge;
  // Label uniforms removed
      varying vec3 vNormalW;
      varying vec3 vPosW;

      vec3 hash3(vec3 p){
        p = vec3(dot(p,vec3(127.1,311.7,74.7)),
                 dot(p,vec3(269.5,183.3,246.1)),
                 dot(p,vec3(113.5,271.9,124.6)));
        return -1. + 2.*fract(sin(p)*43758.5453);
      }
      float noise(vec3 p){
        vec3 i=floor(p), f=fract(p);
        vec3 u=f*f*(3.-2.*f);
        float n000=dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0));
        float n100=dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0));
        float n010=dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0));
        float n110=dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0));
        float n001=dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1));
        float n101=dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1));
        float n011=dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1));
        float n111=dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1));
        return mix(mix(mix(n000,n100,u.x), mix(n010,n110,u.x), u.y),
                   mix(mix(n001,n101,u.x), mix(n011,n111,u.x), u.y), u.z);
      }
      float fbm(vec3 p){
        float a=0.5, f=0.0;
        for(int i=0;i<6;i++){ f+=a*noise(p); p*=2.0; a*=0.5; }
        return f;
      }

  // dirToEquirect removed

      void main(){
        vec3 n = normalize(vNormalW);
        vec3 p = normalize(vPosW) * uNoiseScale;
        vec3 w = vec3(
          fbm(p + vec3( 0.0, uTime*0.35, 1.2)),
          fbm(p + vec3( 1.7, uTime*0.28, -0.6)),
          fbm(p + vec3(-1.3, uTime*0.22, 0.0))
        );
        vec3 pw = p + uWarp * w;
        float base  = fbm(pw*1.7);
        float cells = fbm(pw*3.4 - w*0.8);
        float f = clamp(base*0.75 + cells*0.55, 0.0, 1.0);
        f = smoothstep(0.25, 0.95, f);
        vec3 col = mix(uColMid, uColEdge, f);
        col = mix(uColCore, col, smoothstep(0.15, 0.85, f));
        float viewZ = abs(n.z);
        float rim   = pow(1.0 - viewZ, uRimPower);
        float dark  = 1.0 - rim*0.35;
        col *= dark;
        col += vec3(1.0,0.55,0.15) * rim * 0.50;
        float emissive = 0.7 + 0.6*f;
        gl_FragColor = vec4(col * emissive * uEmissiveBoost, 1.0);
      }
    `;

    const sunMat = new THREE.ShaderMaterial({
      vertexShader: sunVertex,
      fragmentShader: sunFragment,
      uniforms: sunUniforms
    });
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SOL_R, 160, 160), sunMat);
    sun.add(sunMesh);

    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(SOL_R * 1.20, 96, 96),
      new THREE.MeshBasicMaterial({
        color: 0xff8c3a,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
sun.add(sunGlow);
sunLight.position.copy(sun.position);

// Add MAXFAMA label above the sun
const sunLabel = labelSprite('MAXFAMA');
sunLabel.position.set(0, SOL_R + 1.8, 0);
sun.add(sunLabel);

    // Planet factory
    function makePlanetReal(config: PlanetConfig, i: number): PlanetGroup {
      const group = new THREE.Group() as PlanetGroup;
      let sphere: THREE.Mesh;
      let cloudsMesh: THREE.Mesh | null = null;

      if (config.kind === 'earth') {
        const tx = textureEarthLike({});
        sphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 64, 64), new THREE.MeshStandardMaterial({ map: tx.map, bumpMap: tx.bump, bumpScale: 0.08, metalness: 0.0, roughness: 0.95 }));
        group.add(sphere);
        cloudsMesh = new THREE.Mesh(new THREE.SphereGeometry(1.205, 64, 64), new THREE.MeshStandardMaterial({ map: tx.clouds, transparent: true, opacity: 0.9, depthWrite: false }));
        group.add(cloudsMesh);
        group.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 64, 64), new THREE.MeshBasicMaterial({ color: 0x6aa7ff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })));
      } else if (config.kind === 'mars') {
        const tx = textureRock({ base: '#7b3f24', vein: '#c57d56', seed: 5 });
        sphere = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 64), new THREE.MeshStandardMaterial({ map: tx.map, bumpMap: tx.bump, bumpScale: 0.12, roughness: 0.95, metalness: 0.0 }));
        group.add(sphere);
      } else if (config.kind === 'saturn') {
        const tx = textureGasGiant({});
        sphere = new THREE.Mesh(new THREE.SphereGeometry(1.35, 64, 64), new THREE.MeshStandardMaterial({ map: tx.map, roughness: 0.8, metalness: 0.0 }));
        group.add(sphere);
        const ringGeo = new THREE.RingGeometry(2.2, 3.2, 128);
        const rc = document.createElement('canvas'); rc.width = 1024; rc.height = 1024;
        const rctx = rc.getContext('2d')!; const grd = rctx.createRadialGradient(512, 512, 350, 512, 512, 512);
        grd.addColorStop(0.0, 'rgba(255,255,255,0.0)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
        grd.addColorStop(0.65, 'rgba(255,255,255,0.15)'); grd.addColorStop(1.0, 'rgba(255,255,255,0.0)');
        rctx.fillStyle = grd; rctx.fillRect(0, 0, 1024, 1024);
        const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(rc), transparent: true, side: THREE.DoubleSide, opacity: 0.9 }));
        ringMesh.rotation.x = Math.PI / 2; group.add(ringMesh);
      } else {
        const tx = textureGasGiant({ bands: ['#76a7ff', '#5f97ff', '#4c85ee', '#3b73d8', '#315fc1'], seed: 7 });
        sphere = new THREE.Mesh(new THREE.SphereGeometry(1.25, 64, 64), new THREE.MeshStandardMaterial({ map: tx.map, roughness: 0.9, metalness: 0.0 }));
        group.add(sphere);
      }

      const ringHover = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.75, 48), new THREE.MeshBasicMaterial({ color: config.color || 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      ringHover.rotation.x = Math.PI / 2; group.add(ringHover);
      const title = labelSprite(config.label); title.position.set(0, -2.1, 0); group.add(title);
      const orbit = new THREE.Mesh(new THREE.RingGeometry(config.radius - 0.03, config.radius + 0.03, 200), new THREE.MeshBasicMaterial({ color: 0x6aa7ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
      orbit.rotation.x = Math.PI / 2 + config.tilt; scene.add(orbit);
      group.userData = { label: config.label, link: config.link, ring: ringHover, title, radius: config.radius, speed: config.speed, tilt: config.tilt, angle: i * Math.PI / 2, clouds: cloudsMesh, spin: (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1) };
      scene.add(group);
      return group;
    }

    const planets = [
      { label: 'Telemarketing', kind: 'earth', color: 0x6aa7ff, radius: SOL_R + 8, speed: 0.18, tilt: 0.12, link: LINKS.Telemarketing },
      { label: 'Scouter', kind: 'mars', color: 0xff66cc, radius: SOL_R + 11, speed: 0.15, tilt: -0.22, link: LINKS.Scouter },
      { label: 'Agenciamento', kind: 'saturn', color: 0xbf85ff, radius: SOL_R + 14, speed: 0.12, tilt: 0.30, link: LINKS.Agenciamento },
      { label: 'Administrativo', kind: 'neptune', color: 0x8fb6ff, radius: SOL_R + 17, speed: 0.10, tilt: -0.36, link: LINKS.Administrativo }
    ].map(makePlanetReal);

    // Hover & click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered: PlanetGroup | null = null;
    let pressed: PlanetGroup | null = null;

    function screenPos(obj: THREE.Object3D) {
      const v = obj.getWorldPosition(new THREE.Vector3()).clone().project(camera);
      return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
    }

    function setHover(p: PlanetGroup, over: boolean) {
      (p.userData.ring.material as THREE.MeshBasicMaterial).opacity = over ? 0.9 : 0;
      (p.userData.title.material as THREE.SpriteMaterial).opacity = over ? 1 : 0.9;
      renderer.domElement.style.cursor = over ? 'pointer' : 'grab';
      if (tooltipRef.current) {
        tooltipRef.current.style.display = over ? 'block' : 'none';
        if (over) {
          const s = screenPos(p);
          tooltipRef.current.textContent = p.userData.label;
          tooltipRef.current.style.left = s.x + 'px';
          tooltipRef.current.style.top = s.y + 'px';
        }
      }
    }

    function pick(e: MouseEvent) {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(
        planets.map((p) => p.children[0]),
        false
      );
      return hits[0] ? (hits[0].object.parent as PlanetGroup) : null;
    }

    const onMouseMove = (e: MouseEvent) => {
      const h = pick(e);
      if (h !== hovered) {
        if (hovered) setHover(hovered, false);
        if (h) setHover(h, true);
        hovered = h;
      }
      if (hovered && tooltipRef.current) {
        const s = screenPos(hovered);
        tooltipRef.current.style.left = s.x + 'px';
        tooltipRef.current.style.top = s.y + 'px';
      }
    };

    renderer.domElement.addEventListener('pointerdown', () => {
      pressed = hovered;
      renderer.domElement.style.cursor = 'grabbing';
    });

    function flyToPlanet(planet: PlanetGroup, url: string, duration = 1300) {
      const camStart = camera.position.clone();
      const target = planet.getWorldPosition(new THREE.Vector3());
      const dir = target.clone().sub(sun.position).normalize();
      const camEnd = target.clone().add(dir.multiplyScalar(2.2));
      const fovStart = camera.fov,
        fovEnd = 36;
      const t0 = performance.now();
      (function anim() {
        const k = Math.min(1, (performance.now() - t0) / duration);
        const ease = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k;
        camera.position.lerpVectors(camStart, camEnd, ease);
        camera.fov = fovStart + (fovEnd - fovStart) * ease;
        camera.updateProjectionMatrix();
        camera.lookAt(target);
        if (k < 1) requestAnimationFrame(anim);
        else navigate(url || '#');
      })();
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('pointerup', () => {
      renderer.domElement.style.cursor = 'grab';
      if (pressed && hovered && hovered === pressed) flyToPlanet(hovered, hovered.userData.link);
      pressed = null;
    });

    // Animation loop
    const clock = new THREE.Clock();
    let animationId = 0;
    function tick() {
      animationId = requestAnimationFrame(tick);
      const dt = clock.getDelta();
      
      sunUniforms.uTime.value += dt;
      (sunGlow.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(performance.now() * 0.001) * 0.05;

      planets.forEach((p) => {
        p.userData.angle += dt * p.userData.speed;
        const a = p.userData.angle,
          r = p.userData.radius,
          tilt = p.userData.tilt;
        const x = r * Math.cos(a),
          z = r * Math.sin(a),
          y = r * Math.sin(a) * Math.sin(tilt);
        p.position.set(x, y, z);
        p.rotation.y += p.userData.spin * dt;
        if (p.userData.clouds) p.userData.clouds.rotation.y += 0.03 * dt;
        const below = new THREE.Vector3(0, -2.1, 0).applyQuaternion(p.quaternion);
        p.userData.title.position.copy(below);
        p.userData.title.lookAt(camera.position);
      });

      controls.update();
      renderer.render(scene, camera);
    }
    tick();

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
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationId);

      planets.forEach((p) => {
        p.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });

      starsGeo.dispose();
      starsMat.dispose();
      sunMat.dispose();
      (sunGlow.material as THREE.Material).dispose();
      controls.dispose();

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