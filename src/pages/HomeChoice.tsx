import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './home-choice.css';

type Panel = {
  title: string;
  emoji: string;
  description: string;
  route: string;
};

const PANELS: Panel[] = [
  { title: 'Telemarketing', emoji: '📞', description: 'Captação e gestão de leads.', route: '/telemarketing' },
  { title: 'Cadastro', emoji: '📋', description: 'Cadastro e atualização de fichas.', route: '/cadastro' },
  { title: 'Scouter', emoji: '🎯', description: 'Mapeamento e prospecção de talentos.', route: '/scouter' },
  { title: 'Agenciamento', emoji: '🤝', description: 'Organização e controle de horários.', route: '/agenciamento' },
  { title: 'Administrativo', emoji: '🏢', description: 'Gestão e acompanhamento interno.', route: '/admin' }
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const HomeChoice: React.FC = () => {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  const reduceMotion = useMemo(
    () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const vxRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const wheelLockRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const panelElsRef = useRef<HTMLDivElement[]>([]);

  const snapToNearest = () => {
    const track = trackRef.current;
    if (!track) return;
    const w = window.innerWidth;
    const target = Math.round(track.scrollLeft / w);
    goTo(target);
  };

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const max = PANELS.length - 1;
    const next = clamp(i, 0, max);
    setIndex(next);
    const left = next * window.innerWidth;
    if (reduceMotion) track.scrollLeft = left;
    else track.scrollTo({ left, behavior: 'smooth' });
  };

  const runInertia = () => {
    const track = trackRef.current;
    if (!track) return;
    const step = () => {
      if (Math.abs(vxRef.current) < 0.5) {
        rafRef.current = null;
        snapToNearest();
        return;
      }
      track.scrollLeft += vxRef.current;
      vxRef.current *= 0.92;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const onWheel = (e: WheelEvent) => {
    if (Date.now() < wheelLockRef.current) return;
    if (Math.abs(e.deltaY) > 18) {
      goTo(index + (e.deltaY > 0 ? 1 : -1));
      wheelLockRef.current = Date.now() + 280;
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowRight', 'PageDown'].includes(e.key)) {
      e.preventDefault();
      goTo(index + 1);
    } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  const attachTilt = (el: HTMLDivElement) => {
    const maxTilt = 6;
    const onMove = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (ev.clientX - cx) / (rect.width / 2);
      const dy = (ev.clientY - cy) / (rect.height / 2);
      const rx = clamp(-dy * maxTilt, -maxTilt, maxTilt);
      const ry = clamp(dx * maxTilt, -maxTilt, maxTilt);
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0) scale(1.02)`;
    };
    const onEnter = () => (el.style.transition = 'transform 150ms ease');
    const onLeave = () => {
      el.style.transition = 'transform 350ms ease';
      el.style.transform = '';
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  };

  const onCardClick = (e: React.MouseEvent, route: string, cardEl: HTMLDivElement) => {
    // Prevent navigation if user was dragging
    if (hasDraggedRef.current) {
      e.preventDefault();
      return;
    }
    
    if (!reduceMotion) {
      cardEl.animate(
        [
          { transform: cardEl.style.transform || 'none' },
          { transform: 'perspective(900px) translateZ(80px) scale(1.06)' }
        ],
        { duration: 180, easing: 'cubic-bezier(0.22,1,0.36,1)' }
      );
    }
    setTimeout(() => navigate(route), reduceMotion ? 0 : 160);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const pointerIdRef = { current: -1 };
    
    const onPointerDown = (e: PointerEvent) => {
      isDownRef.current = true;
      hasDraggedRef.current = false;
      pointerIdRef.current = e.pointerId;
      startXRef.current = e.clientX;
      startScrollLeftRef.current = track.scrollLeft;
      vxRef.current = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDownRef.current) return;
      const dx = startXRef.current - e.clientX;
      
      // Mark as dragged if moved more than 10px
      if (Math.abs(dx) > 10 && !hasDraggedRef.current) {
        hasDraggedRef.current = true;
        track.setPointerCapture(pointerIdRef.current);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      }
      
      if (hasDraggedRef.current) {
        track.scrollLeft = startScrollLeftRef.current + dx;
        vxRef.current = dx;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!isDownRef.current) return;
      isDownRef.current = false;
      
      if (hasDraggedRef.current) {
        track.releasePointerCapture(pointerIdRef.current);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        runInertia();
        // Reset drag flag after animation starts
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 50);
      } else {
        // If not dragged, reset immediately
        hasDraggedRef.current = false;
      }
    };
    track.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      track.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [index, reduceMotion]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    panelElsRef.current.forEach((el) => el && cleanups.push(attachTilt(el)));
    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div className="home-choice-container">
      <div className="watermark">Maxconnect</div>
      <div className="stars-overlay"></div>
      <div ref={trackRef} className="canvas-container">
        {PANELS.map((p, i) => (
          <section key={p.title} className="panel">
            <div className="panel-content" ref={(el) => el && (panelElsRef.current[i] = el)}>
              <button
                onClick={(e) => onCardClick(e, p.route, e.currentTarget.parentElement as HTMLDivElement)}
                className="panel-button"
                aria-label={`Abrir ${p.title}`}
              >
                <div className="panel-emoji">{p.emoji}</div>
                <h1 className="panel-title">{p.title}</h1>
                <p className="panel-description">{p.description}</p>
              </button>
            </div>
          </section>
        ))}
      </div>
      <nav className="panel-navigation" aria-label="Navegação de painéis">
        {PANELS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`nav-dot ${i === index ? 'active' : ''}`}
            aria-label={`Ir para painel ${i + 1}`}
          />
        ))}
      </nav>
    </div>
  );
};

export default HomeChoice;
