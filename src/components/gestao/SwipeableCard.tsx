import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';
import { useState } from 'react';
import { CheckCircle2, XCircle, Star, SkipForward } from 'lucide-react';
import LeadCard from './LeadCard';

interface SwipeableCardProps {
  lead: any;
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 120;

const directionConfig = {
  left: { 
    action: 'reject', 
    color: 'rgba(239, 68, 68, 0.9)', 
    icon: XCircle,
    label: 'Reprovar'
  },
  right: { 
    action: 'approve', 
    color: 'rgba(34, 197, 94, 0.9)', 
    icon: CheckCircle2,
    label: 'Aprovar'
  },
  up: { 
    action: 'superApprove', 
    color: 'rgba(234, 179, 8, 0.9)', 
    icon: Star,
    label: 'Super Aprovar'
  },
  down: { 
    action: 'skip', 
    color: 'rgba(148, 163, 184, 0.9)', 
    icon: SkipForward,
    label: 'Pular'
  }
};

export default function SwipeableCard({ lead, onSwipe, disabled }: SwipeableCardProps) {
  const [gone, setGone] = useState(false);
  
  const [{ x, y, rotateZ, scale }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotateZ: 0,
    scale: 1,
    config: { tension: 350, friction: 30 }
  }));

  const bind = useDrag(
    ({ active, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy] }) => {
      if (disabled || gone) return;

      const trigger = Math.max(Math.abs(vx), Math.abs(vy)) > 0.5;
      const dir = Math.abs(mx) > Math.abs(my) 
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');

      if (!active && trigger) {
        setGone(true);
        api.start({
          x: dir === 'left' ? -window.innerWidth : dir === 'right' ? window.innerWidth : 0,
          y: dir === 'up' ? -window.innerHeight : dir === 'down' ? window.innerHeight : 0,
          rotateZ: dir === 'left' ? -20 : dir === 'right' ? 20 : 0,
          scale: 0.8,
          config: { duration: 300 },
          onRest: () => {
            onSwipe(dir);
            setTimeout(() => {
              setGone(false);
              api.start({ x: 0, y: 0, rotateZ: 0, scale: 1, immediate: true });
            }, 100);
          }
        });
      } else {
        api.start({
          x: active ? mx : 0,
          y: active ? my : 0,
          rotateZ: active ? mx / 20 : 0,
          scale: active ? 1.05 : 1,
          immediate: active
        });
      }
    },
    { 
      from: () => [x.get(), y.get()],
      bounds: { left: -300, right: 300, top: -300, bottom: 300 },
      rubberband: true
    }
  );

  const getActiveDirection = () => {
    const currentX = x.get();
    const currentY = y.get();
    
    if (Math.abs(currentX) > Math.abs(currentY)) {
      if (Math.abs(currentX) > SWIPE_THRESHOLD) {
        return currentX > 0 ? 'right' : 'left';
      }
    } else {
      if (Math.abs(currentY) > SWIPE_THRESHOLD) {
        return currentY > 0 ? 'down' : 'up';
      }
    }
    return null;
  };

  const activeDir = getActiveDirection();
  const config = activeDir ? directionConfig[activeDir] : null;

  return (
    <div className="relative w-full h-full touch-none select-none">
      <animated.div
        {...bind()}
        style={{
          x: x as any,
          y: y as any,
          rotateZ: rotateZ as any,
          scale: scale as any,
          touchAction: 'none',
          cursor: disabled ? 'not-allowed' : 'grab'
        }}
        className="absolute inset-0"
      >
        {/* Overlay de feedback visual */}
        {config && (
          <div 
            className="absolute inset-0 rounded-lg flex items-center justify-center z-10 pointer-events-none transition-opacity duration-200"
            style={{ 
              backgroundColor: config.color,
              opacity: Math.min(Math.abs(x.get()) / SWIPE_THRESHOLD, Math.abs(y.get()) / SWIPE_THRESHOLD, 0.8)
            }}
          >
            <div className="text-white flex flex-col items-center gap-2">
              <config.icon className="w-16 h-16" strokeWidth={2.5} />
              <span className="text-xl font-bold">{config.label}</span>
            </div>
          </div>
        )}
        
        {/* Card do lead */}
        <div className="relative h-full">
          <LeadCard lead={lead} />
        </div>
      </animated.div>
    </div>
  );
}
