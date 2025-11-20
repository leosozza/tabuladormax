import { cn } from "@/lib/utils";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function CircularProgress({ 
  percentage, 
  size = 60, 
  strokeWidth = 6,
  className 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Gradiente colorido baseado na porcentagem
  const getGradientColors = () => {
    if (percentage <= 20) return { start: '#3B82F6', end: '#8B5CF6' }; // Azul -> Roxo
    if (percentage <= 40) return { start: '#8B5CF6', end: '#EC4899' }; // Roxo -> Rosa
    if (percentage <= 60) return { start: '#EC4899', end: '#F59E0B' }; // Rosa -> Laranja
    if (percentage <= 80) return { start: '#F59E0B', end: '#10B981' }; // Laranja -> Verde
    return { start: '#10B981', end: '#FBBF24' }; // Verde -> Amarelo (100%)
  };

  const colors = getGradientColors();
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
        
        {/* Background circle (cinza) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        
        {/* Progress circle (gradiente colorido) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {/* Porcentagem no centro */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-foreground">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}
