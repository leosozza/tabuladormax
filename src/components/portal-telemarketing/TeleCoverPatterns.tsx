import { cn } from '@/lib/utils';

export type CoverPattern = 
  | 'circles' | 'lines' | 'dots' | 'waves' | 'triangles' | 'grid'
  | 'purple-circles' | 'purple-waves' 
  | 'green-dots' | 'green-lines'
  | 'blue-triangles' | 'blue-grid'
  | 'mixed-bubbles' | 'mixed-stripes' | 'mixed-mosaic' | 'mixed-flow';

interface PatternProps {
  className?: string;
}

// === PADRÕES PRIMARY (TEAL/CYAN) ===
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
    <circle cx="40" cy="40" r="3" fill="hsl(var(--primary))" fillOpacity="0.15" />
    <circle cx="100" cy="60" r="4" fill="hsl(var(--primary))" fillOpacity="0.12" />
    <circle cx="160" cy="30" r="2" fill="hsl(var(--primary))" fillOpacity="0.18" />
    <circle cx="220" cy="80" r="5" fill="hsl(var(--primary))" fillOpacity="0.1" />
    <circle cx="280" cy="50" r="3" fill="hsl(var(--primary))" fillOpacity="0.14" />
    <circle cx="340" cy="70" r="4" fill="hsl(var(--primary))" fillOpacity="0.11" />
    <circle cx="60" cy="120" r="4" fill="hsl(var(--primary))" fillOpacity="0.13" />
    <circle cx="120" cy="150" r="3" fill="hsl(var(--primary))" fillOpacity="0.16" />
    <circle cx="180" cy="130" r="5" fill="hsl(var(--primary))" fillOpacity="0.09" />
    <circle cx="240" cy="160" r="2" fill="hsl(var(--primary))" fillOpacity="0.17" />
    <circle cx="300" cy="140" r="4" fill="hsl(var(--primary))" fillOpacity="0.12" />
    <circle cx="360" cy="170" r="3" fill="hsl(var(--primary))" fillOpacity="0.14" />
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

// === PADRÕES ROXO (PURPLE) ===
const PurpleCirclesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="purpleCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.08" />
      </linearGradient>
    </defs>
    <circle cx="80" cy="80" r="90" fill="url(#purpleCircleGrad)" />
    <circle cx="320" cy="120" r="70" fill="url(#purpleCircleGrad)" />
    <circle cx="200" cy="30" r="35" fill="#a855f7" fillOpacity="0.1" />
    <circle cx="380" cy="40" r="25" fill="#7c3aed" fillOpacity="0.12" />
  </svg>
);

const PurpleWavesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="purpleWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.03" />
      </linearGradient>
    </defs>
    <path d="M0,80 Q80,30 160,80 T320,80 T400,80 L400,200 L0,200 Z" fill="url(#purpleWaveGrad)" />
    <path d="M0,120 Q80,70 160,120 T320,120 T400,120 L400,200 L0,200 Z" fill="#a855f7" fillOpacity="0.1" />
    <path d="M0,160 Q80,120 160,160 T320,160 T400,160 L400,200 L0,200 Z" fill="#7c3aed" fillOpacity="0.06" />
  </svg>
);

// === PADRÕES VERDE (GREEN) ===
const GreenDotsPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <circle cx="30" cy="30" r="4" fill="#22c55e" fillOpacity="0.18" />
    <circle cx="90" cy="70" r="5" fill="#16a34a" fillOpacity="0.14" />
    <circle cx="150" cy="40" r="3" fill="#22c55e" fillOpacity="0.2" />
    <circle cx="210" cy="90" r="6" fill="#16a34a" fillOpacity="0.12" />
    <circle cx="270" cy="55" r="4" fill="#22c55e" fillOpacity="0.16" />
    <circle cx="330" cy="80" r="5" fill="#16a34a" fillOpacity="0.13" />
    <circle cx="380" cy="35" r="3" fill="#22c55e" fillOpacity="0.17" />
    <circle cx="50" cy="130" r="5" fill="#16a34a" fillOpacity="0.15" />
    <circle cx="110" cy="160" r="4" fill="#22c55e" fillOpacity="0.18" />
    <circle cx="170" cy="140" r="6" fill="#16a34a" fillOpacity="0.11" />
    <circle cx="230" cy="170" r="3" fill="#22c55e" fillOpacity="0.19" />
    <circle cx="290" cy="150" r="5" fill="#16a34a" fillOpacity="0.14" />
    <circle cx="350" cy="180" r="4" fill="#22c55e" fillOpacity="0.16" />
  </svg>
);

const GreenLinesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="greenLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
        <stop offset="50%" stopColor="#16a34a" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.06" />
      </linearGradient>
    </defs>
    <line x1="0" y1="35" x2="400" y2="55" stroke="url(#greenLineGrad)" strokeWidth="2.5" />
    <line x1="0" y1="75" x2="400" y2="95" stroke="url(#greenLineGrad)" strokeWidth="3.5" />
    <line x1="0" y1="115" x2="400" y2="135" stroke="url(#greenLineGrad)" strokeWidth="2.5" />
    <line x1="0" y1="155" x2="400" y2="175" stroke="url(#greenLineGrad)" strokeWidth="2" />
  </svg>
);

// === PADRÕES AZUL (BLUE) ===
const BlueTrianglesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <polygon points="20,200 120,60 220,200" fill="#3b82f6" fillOpacity="0.1" />
    <polygon points="180,200 280,90 380,200" fill="#2563eb" fillOpacity="0.12" />
    <polygon points="320,200 400,120 400,200" fill="#3b82f6" fillOpacity="0.08" />
    <polygon points="0,200 0,140 60,200" fill="#2563eb" fillOpacity="0.09" />
    <polygon points="80,0 130,70 30,70" fill="#3b82f6" fillOpacity="0.07" />
    <polygon points="320,0 370,50 270,50" fill="#2563eb" fillOpacity="0.08" />
  </svg>
);

const BlueGridPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="blueGridPattern" width="35" height="35" patternUnits="userSpaceOnUse">
        <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#3b82f6" strokeWidth="0.6" strokeOpacity="0.18" />
      </pattern>
    </defs>
    <rect width="400" height="200" fill="url(#blueGridPattern)" />
    <rect x="40" y="30" width="70" height="70" fill="#3b82f6" fillOpacity="0.08" rx="6" />
    <rect x="260" y="90" width="90" height="70" fill="#2563eb" fillOpacity="0.1" rx="6" />
    <rect x="150" y="120" width="50" height="50" fill="#3b82f6" fillOpacity="0.06" rx="4" />
  </svg>
);

// === PADRÕES MISTOS (4 CORES) ===
const MixedBubblesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    {/* Teal */}
    <circle cx="60" cy="50" r="45" fill="hsl(var(--primary))" fillOpacity="0.12" />
    <circle cx="340" cy="160" r="25" fill="hsl(var(--primary))" fillOpacity="0.1" />
    {/* Purple */}
    <circle cx="150" cy="140" r="55" fill="#a855f7" fillOpacity="0.1" />
    <circle cx="380" cy="40" r="20" fill="#7c3aed" fillOpacity="0.12" />
    {/* Green */}
    <circle cx="280" cy="80" r="40" fill="#22c55e" fillOpacity="0.11" />
    <circle cx="30" cy="170" r="18" fill="#16a34a" fillOpacity="0.13" />
    {/* Blue */}
    <circle cx="200" cy="30" r="30" fill="#3b82f6" fillOpacity="0.12" />
    <circle cx="100" cy="100" r="22" fill="#2563eb" fillOpacity="0.09" />
  </svg>
);

const MixedStripesPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <rect x="0" y="0" width="400" height="50" fill="hsl(var(--primary))" fillOpacity="0.08" />
    <rect x="0" y="50" width="400" height="50" fill="#a855f7" fillOpacity="0.08" />
    <rect x="0" y="100" width="400" height="50" fill="#22c55e" fillOpacity="0.08" />
    <rect x="0" y="150" width="400" height="50" fill="#3b82f6" fillOpacity="0.08" />
    {/* Accent lines */}
    <line x1="0" y1="25" x2="400" y2="25" stroke="hsl(var(--primary))" strokeWidth="1" strokeOpacity="0.15" />
    <line x1="0" y1="75" x2="400" y2="75" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.15" />
    <line x1="0" y1="125" x2="400" y2="125" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.15" />
    <line x1="0" y1="175" x2="400" y2="175" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.15" />
  </svg>
);

const MixedMosaicPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    {/* Row 1 */}
    <rect x="10" y="10" width="60" height="60" rx="8" fill="hsl(var(--primary))" fillOpacity="0.1" />
    <rect x="80" y="20" width="50" height="50" rx="6" fill="#a855f7" fillOpacity="0.12" />
    <rect x="140" y="5" width="70" height="70" rx="10" fill="#22c55e" fillOpacity="0.09" />
    <rect x="220" y="15" width="55" height="55" rx="8" fill="#3b82f6" fillOpacity="0.11" />
    <rect x="285" y="25" width="45" height="45" rx="6" fill="hsl(var(--primary))" fillOpacity="0.08" />
    <rect x="340" y="10" width="50" height="65" rx="8" fill="#a855f7" fillOpacity="0.1" />
    {/* Row 2 */}
    <rect x="20" y="90" width="70" height="50" rx="8" fill="#3b82f6" fillOpacity="0.1" />
    <rect x="100" y="100" width="55" height="55" rx="8" fill="#22c55e" fillOpacity="0.11" />
    <rect x="165" y="85" width="60" height="65" rx="10" fill="#a855f7" fillOpacity="0.09" />
    <rect x="235" y="95" width="50" height="50" rx="6" fill="hsl(var(--primary))" fillOpacity="0.12" />
    <rect x="295" y="105" width="45" height="60" rx="8" fill="#3b82f6" fillOpacity="0.08" />
    <rect x="350" y="90" width="40" height="55" rx="6" fill="#22c55e" fillOpacity="0.1" />
  </svg>
);

const MixedFlowPattern = ({ className }: PatternProps) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="mixedFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
        <stop offset="33%" stopColor="#a855f7" stopOpacity="0.12" />
        <stop offset="66%" stopColor="#22c55e" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.12" />
      </linearGradient>
    </defs>
    <path d="M0,100 C80,40 160,140 240,80 S360,120 400,60 L400,200 L0,200 Z" fill="url(#mixedFlowGrad)" />
    <path d="M0,140 C60,100 120,160 200,120 S320,150 400,110 L400,200 L0,200 Z" fill="hsl(var(--primary))" fillOpacity="0.06" />
    <circle cx="80" cy="60" r="15" fill="#a855f7" fillOpacity="0.12" />
    <circle cx="200" cy="100" r="12" fill="#22c55e" fillOpacity="0.14" />
    <circle cx="320" cy="70" r="18" fill="#3b82f6" fillOpacity="0.1" />
  </svg>
);

export const coverPatterns: Record<CoverPattern, { component: React.FC<PatternProps>; label: string; colorLabel: string }> = {
  // Primary (Teal/Cyan)
  circles: { component: CirclesPattern, label: 'Círculos', colorLabel: 'Teal' },
  lines: { component: LinesPattern, label: 'Linhas', colorLabel: 'Teal' },
  dots: { component: DotsPattern, label: 'Pontos', colorLabel: 'Teal' },
  waves: { component: WavesPattern, label: 'Ondas', colorLabel: 'Teal' },
  triangles: { component: TrianglesPattern, label: 'Triângulos', colorLabel: 'Teal' },
  grid: { component: GridPattern, label: 'Grade', colorLabel: 'Teal' },
  // Purple
  'purple-circles': { component: PurpleCirclesPattern, label: 'Círculos', colorLabel: 'Roxo' },
  'purple-waves': { component: PurpleWavesPattern, label: 'Ondas', colorLabel: 'Roxo' },
  // Green
  'green-dots': { component: GreenDotsPattern, label: 'Pontos', colorLabel: 'Verde' },
  'green-lines': { component: GreenLinesPattern, label: 'Linhas', colorLabel: 'Verde' },
  // Blue
  'blue-triangles': { component: BlueTrianglesPattern, label: 'Triângulos', colorLabel: 'Azul' },
  'blue-grid': { component: BlueGridPattern, label: 'Grade', colorLabel: 'Azul' },
  // Mixed
  'mixed-bubbles': { component: MixedBubblesPattern, label: 'Bolhas', colorLabel: 'Misto' },
  'mixed-stripes': { component: MixedStripesPattern, label: 'Listras', colorLabel: 'Misto' },
  'mixed-mosaic': { component: MixedMosaicPattern, label: 'Mosaico', colorLabel: 'Misto' },
  'mixed-flow': { component: MixedFlowPattern, label: 'Fluxo', colorLabel: 'Misto' },
};

interface TeleCoverPatternProps {
  pattern: CoverPattern;
  className?: string;
}

export const TeleCoverPattern = ({ pattern, className }: TeleCoverPatternProps) => {
  const PatternComponent = coverPatterns[pattern].component;
  return <PatternComponent className={className} />;
};
