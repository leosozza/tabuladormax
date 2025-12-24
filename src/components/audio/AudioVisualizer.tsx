import React, { useRef, useEffect, useCallback } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  mode: 'listening' | 'speaking' | 'processing' | 'idle';
  getFrequencyData: () => Uint8Array;
  voiceLevel?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  mode,
  getFrequencyData,
  voiceLevel = 0,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  const getColor = useCallback(() => {
    switch (mode) {
      case 'listening':
        return { primary: '#22C55E', secondary: '#4ADE80', glow: 'rgba(34, 197, 94, 0.5)' };
      case 'speaking':
        return { primary: '#8B5CF6', secondary: '#A78BFA', glow: 'rgba(139, 92, 246, 0.5)' };
      case 'processing':
        return { primary: '#F59E0B', secondary: '#FBBF24', glow: 'rgba(245, 158, 11, 0.5)' };
      default:
        return { primary: '#3B82F6', secondary: '#60A5FA', glow: 'rgba(59, 130, 246, 0.3)' };
    }
  }, [mode]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const colors = getColor();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update phase for animation
    phaseRef.current += 0.03;

    if (!isActive || mode === 'idle') {
      // Draw idle state - gentle wave based on voiceLevel
      const amplitude = 5 + voiceLevel * 30;
      
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const y = centerY + Math.sin(x * 0.02 + phaseRef.current) * amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, colors.secondary + '40');
      gradient.addColorStop(0.5, colors.primary);
      gradient.addColorStop(1, colors.secondary + '40');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2 + voiceLevel * 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Add glow when voice is detected
      if (voiceLevel > 0.02) {
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 10 + voiceLevel * 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
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
      const dotCount = 12;
      const radius = Math.min(width, height) * 0.35;
      
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2 + time * 2;
        const x = width / 2 + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.4;
        const dotSize = 4 + Math.sin(time * 4 + i) * 2;
        const opacity = 0.4 + Math.sin(time * 3 + i * 0.5) * 0.4;
        
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${opacity})`;
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Add spinning trail
      ctx.beginPath();
      ctx.arc(width / 2, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Create gradient for waves
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, colors.secondary + '60');
    gradient.addColorStop(0.3, colors.primary);
    gradient.addColorStop(0.5, colors.secondary);
    gradient.addColorStop(0.7, colors.primary);
    gradient.addColorStop(1, colors.secondary + '60');

    // Draw smooth wave visualization
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 20;

    // Draw multiple layered waves for depth
    for (let layer = 0; layer < 3; layer++) {
      const layerOpacity = 1 - layer * 0.3;
      const layerOffset = layer * 2;

      // Top wave
      ctx.beginPath();
      for (let i = 0; i <= barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * frequencyData.length);
        const value = (frequencyData[dataIndex] || 0) / 255;
        const enhancedValue = Math.pow(value, 0.8); // Enhance lower values
        const barHeight = enhancedValue * maxBarHeight * (1 - layer * 0.2);
        const x = i * barWidth;
        const y = centerY - barHeight / 2 - layerOffset;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevDataIndex = Math.floor(((i - 1) / barCount) * frequencyData.length);
          const prevValue = Math.pow((frequencyData[prevDataIndex] || 0) / 255, 0.8);
          const prevY = centerY - (prevValue * maxBarHeight * (1 - layer * 0.2)) / 2 - layerOffset;
          const prevX = (i - 1) * barWidth;
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      ctx.strokeStyle = gradient;
      ctx.globalAlpha = layerOpacity;
      ctx.lineWidth = 3 - layer;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Bottom wave (mirrored)
      ctx.beginPath();
      for (let i = 0; i <= barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * frequencyData.length);
        const value = (frequencyData[dataIndex] || 0) / 255;
        const enhancedValue = Math.pow(value, 0.8);
        const barHeight = enhancedValue * maxBarHeight * (1 - layer * 0.2);
        const x = i * barWidth;
        const y = centerY + barHeight / 2 + layerOffset;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevDataIndex = Math.floor(((i - 1) / barCount) * frequencyData.length);
          const prevValue = Math.pow((frequencyData[prevDataIndex] || 0) / 255, 0.8);
          const prevY = centerY + (prevValue * maxBarHeight * (1 - layer * 0.2)) / 2 + layerOffset;
          const prevX = (i - 1) * barWidth;
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    animationRef.current = requestAnimationFrame(draw);
  }, [isActive, mode, getFrequencyData, getColor, voiceLevel]);

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
