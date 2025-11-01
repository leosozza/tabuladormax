// src/pages/HubPanels.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type Panel = {
  title: string;
  emoji: string;
  description: string;
  route: string;
};

const PANELS: Panel[] = [
  { title: "Telemarketing",  emoji: "📞", description: "Captação e gestão de leads.",            route: "/telemarketing" },
  { title: "Scouter",        emoji: "🎯", description: "Mapeamento e prospecção de talentos.",   route: "/scouter" },
  { title: "Agenciamento",   emoji: "🤝", description: "Organização e controle de horários.",    route: "/agenciamento" },
  { title: "Administrativo", emoji: "🏢", description: "Gestão e acompanhamento interno.",       route: "/admin" },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function HubPanels() {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  const reduceMotion = useMemo(
    () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const vxRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const wheelLockRef = useRef(0);

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
    else track.scrollTo({ left, behavior: "smooth" });
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
    if (["ArrowRight", "PageDown"].includes(e.key)) {
      e.preventDefault();
      goTo(index + 1);
    } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
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
    const onEnter = () => (el.style.transition = "transform 150ms ease");
    const onLeave = () => {
      el.style.transition = "transform 350ms ease";
      el.style.transform = "";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  };

  const onCardClick = (route: string, cardEl: HTMLDivElement) => {
    if (!reduceMotion) {
      cardEl.animate(
        [
          { transform: cardEl.style.transform || "none" },
          { transform: "perspective(900px) translateZ(80px) scale(1.06)" },
        ],
        { duration: 180, easing: "cubic-bezier(0.22,1,0.36,1)" }
      );
    }
    setTimeout(() => navigate(route), reduceMotion ? 0 : 160);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onPointerDown = (e: PointerEvent) => {
      isDownRef.current = true;
      track.setPointerCapture(e.pointerId);
      startXRef.current = e.clientX;
      startScrollLeftRef.current = track.scrollLeft;
      vxRef.current = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDownRef.current) return;
      const dx = startXRef.current - e.clientX;
      track.scrollLeft = startScrollLeftRef.current + dx;
      vxRef.current = dx;
    };
    const onPointerUp = () => {
      if (!isDownRef.current) return;
      isDownRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      runInertia();
    };
    track.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      track.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [index, reduceMotion]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    panelElsRef.current.forEach((el) => el && cleanups.push(attachTilt(el)));
    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div className="hub-viewport">
      <div ref={trackRef} className="hub-track">
        {PANELS.map((p, i) => (
          <section key={p.title} className="panel">
            <div className="panel-content" ref={(el) => el && (panelElsRef.current[i] = el)}>
              <button
                onClick={(e) =>
                  onCardClick(p.route, e.currentTarget.parentElement as HTMLDivElement)
                }
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
              >
                <div style={{ fontSize: "4.2rem" }}>{p.emoji}</div>
                <h1 style={{ fontSize: "3rem", margin: "0.5rem 0" }}>{p.title}</h1>
                <p style={{ opacity: 0.8, fontSize: "1.1rem" }}>{p.description}</p>
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
