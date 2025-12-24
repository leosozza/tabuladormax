import React, { useRef, useEffect, useCallback } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  mode: 'listening' | 'speaking' | 'processing' | 'idle';
  getFrequencyData: () => Uint8Array;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  mode,
  getFrequencyData,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const getColor = useCallback(() => {
    switch (mode) {
      case 'listening':
        return { primary: '#3B82F6', secondary: '#60A5FA', glow: 'rgba(59, 130, 246, 0.5)' };
      case 'speaking':
        return { primary: '#8B5CF6', secondary: '#A78BFA', glow: 'rgba(139, 92, 246, 0.5)' };
      case 'processing':
        return { primary: '#F59E0B', secondary: '#FBBF24', glow: 'rgba(245, 158, 11, 0.5)' };
      default:
        return { primary: '#6B7280', secondary: '#9CA3AF', glow: 'rgba(107, 114, 128, 0.3)' };
    }
  }, [mode]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const colors = getColor();

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!isActive || mode === 'idle') {
      // Draw idle state - subtle pulse
      const time = Date.now() / 1000;
      const pulse = Math.sin(time * 2) * 0.1 + 0.9;
      
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2 * pulse;
      ctx.stroke();
      
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    const frequencyData = getFrequencyData();
    const barCount = 64;
    const barWidth = width / barCount;
    const maxBarHeight = height * 0.8;

    // Processing mode - rotating dots
    if (mode === 'processing') {
      const time = Date.now() / 1000;
      const dotCount = 8;
      const radius = Math.min(width, height) * 0.3;
      
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2 + time * 2;
        const x = width / 2 + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.5;
        const dotSize = 4 + Math.sin(time * 4 + i) * 2;
        const opacity = 0.5 + Math.sin(time * 3 + i * 0.5) * 0.5;
        
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${opacity})`;
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Draw smooth wave visualization
    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * frequencyData.length);
      const value = frequencyData[dataIndex] / 255;
      const barHeight = value * maxBarHeight;
      
      const x = i * barWidth + barWidth / 2;
      const y1 = centerY - barHeight / 2;
      const y2 = centerY + barHeight / 2;

      // Draw as smooth curve
      if (i === 0) {
        ctx.moveTo(x, y1);
      } else {
        const prevX = (i - 1) * barWidth + barWidth / 2;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, ctx.canvas.height / 2 - (frequencyData[Math.floor(((i - 1) / barCount) * frequencyData.length)] / 255) * maxBarHeight / 2, cpX, (y1 + ctx.canvas.height / 2 - (frequencyData[Math.floor(((i - 1) / barCount) * frequencyData.length)] / 255) * maxBarHeight / 2) / 2);
      }
    }

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, colors.secondary);
    gradient.addColorStop(0.5, colors.primary);
    gradient.addColorStop(1, colors.secondary);

    // Draw top wave
    ctx.beginPath();
    for (let i = 0; i <= barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * frequencyData.length);
      const value = (frequencyData[dataIndex] || 0) / 255;
      const barHeight = value * maxBarHeight;
      const x = i * barWidth;
      const y = centerY - barHeight / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevDataIndex = Math.floor(((i - 1) / barCount) * frequencyData.length);
        const prevValue = (frequencyData[prevDataIndex] || 0) / 255;
        const prevY = centerY - (prevValue * maxBarHeight) / 2;
        const prevX = (i - 1) * barWidth;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
      }
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw bottom wave (mirrored)
    ctx.beginPath();
    for (let i = 0; i <= barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * frequencyData.length);
      const value = (frequencyData[dataIndex] || 0) / 255;
      const barHeight = value * maxBarHeight;
      const x = i * barWidth;
      const y = centerY + barHeight / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevDataIndex = Math.floor(((i - 1) / barCount) * frequencyData.length);
        const prevValue = (frequencyData[prevDataIndex] || 0) / 255;
        const prevY = centerY + (prevValue * maxBarHeight) / 2;
        const prevX = (i - 1) * barWidth;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
      }
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Add glow effect
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 20;

    animationRef.current = requestAnimationFrame(draw);
  }, [isActive, mode, getFrequencyData, getColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-32 ${className}`}
      style={{ width: '100%', height: '128px' }}
    />
  );
};
