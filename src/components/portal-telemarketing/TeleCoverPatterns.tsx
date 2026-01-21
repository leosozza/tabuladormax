import { cn } from '@/lib/utils';

export type CoverPattern = 'circles' | 'lines' | 'dots' | 'waves' | 'triangles' | 'grid';

interface PatternProps {
  className?: string;
}

const CirclesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="80" fill="url(#circleGrad)" />
    <circle cx="350" cy="150" r="100" fill="url(#circleGrad)" />
    <circle cx="200" cy="180" r="40" fill="hsl(var(--primary))" fillOpacity="0.1" />
    <circle cx="320" cy="30" r="30" fill="hsl(var(--primary))" fillOpacity="0.08" />
  </svg>
);

const LinesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
      </linearGradient>
    </defs>
    <line x1="0" y1="40" x2="400" y2="60" stroke="url(#lineGrad)" strokeWidth="2" />
    <line x1="0" y1="80" x2="400" y2="100" stroke="url(#lineGrad)" strokeWidth="3" />
    <line x1="0" y1="120" x2="400" y2="140" stroke="url(#lineGrad)" strokeWidth="2" />
    <line x1="0" y1="160" x2="400" y2="180" stroke="url(#lineGrad)" strokeWidth="1.5" />
  </svg>
);

const DotsPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    {[...Array(8)].map((_, row) =>
      [...Array(16)].map((_, col) => (
        <circle
          key={`${row}-${col}`}
          cx={25 + col * 25}
          cy={25 + row * 25}
          r={2 + Math.random() * 2}
          fill="hsl(var(--primary))"
          fillOpacity={0.05 + Math.random() * 0.1}
        />
      ))
    )}
  </svg>
);

const WavesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="waveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
      </linearGradient>
    </defs>
    <path d="M0,100 Q100,50 200,100 T400,100 L400,200 L0,200 Z" fill="url(#waveGrad)" />
    <path d="M0,130 Q100,80 200,130 T400,130 L400,200 L0,200 Z" fill="hsl(var(--primary))" fillOpacity="0.08" />
    <path d="M0,160 Q100,110 200,160 T400,160 L400,200 L0,200 Z" fill="hsl(var(--primary))" fillOpacity="0.05" />
  </svg>
);

const TrianglesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <polygon points="0,200 100,50 200,200" fill="hsl(var(--primary))" fillOpacity="0.08" />
    <polygon points="150,200 250,80 350,200" fill="hsl(var(--primary))" fillOpacity="0.1" />
    <polygon points="300,200 400,100 400,200" fill="hsl(var(--primary))" fillOpacity="0.06" />
    <polygon points="50,0 100,80 0,80" fill="hsl(var(--primary))" fillOpacity="0.05" />
    <polygon points="350,0 400,60 300,60" fill="hsl(var(--primary))" fillOpacity="0.07" />
  </svg>
);

const GridPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeOpacity="0.15" />
      </pattern>
    </defs>
    <rect width="400" height="200" fill="url(#gridPattern)" />
    <rect x="60" y="40" width="80" height="80" fill="hsl(var(--primary))" fillOpacity="0.06" rx="4" />
    <rect x="280" y="100" width="60" height="60" fill="hsl(var(--primary))" fillOpacity="0.08" rx="4" />
  </svg>
);

export const coverPatterns: Record<CoverPattern, { component: React.FC<PatternProps>; label: string }> = {
  circles: { component: CirclesPattern, label: 'Círculos' },
  lines: { component: LinesPattern, label: 'Linhas' },
  dots: { component: DotsPattern, label: 'Pontos' },
  waves: { component: WavesPattern, label: 'Ondas' },
  triangles: { component: TrianglesPattern, label: 'Triângulos' },
  grid: { component: GridPattern, label: 'Grade' },
};

interface TeleCoverPatternProps {
  pattern: CoverPattern;
  className?: string;
}

export const TeleCoverPattern = ({ pattern, className }: TeleCoverPatternProps) => {
  const PatternComponent = coverPatterns[pattern].component;
  return <PatternComponent className={className} />;
};
