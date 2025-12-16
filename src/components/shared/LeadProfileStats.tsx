import { ReactNode } from 'react';
import { Calendar, Ruler, User, Footprints, Scale, Palette, Eye, Sparkles } from 'lucide-react';

interface QuickStatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
}

const QuickStatCard = ({ icon, label, value }: QuickStatCardProps) => (
  <div className="flex-shrink-0 w-[70px] sm:w-[80px] bg-card border rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center">
    <div className="flex justify-center text-primary mb-0.5">{icon}</div>
    <p className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">{value}</p>
    <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
  </div>
);

interface AgeInfo {
  value: number;
  unit: 'meses' | 'anos';
}

export interface LeadProfileStatsProps {
  ageInfo?: AgeInfo | null;
  altura?: string | number | null;
  manequim?: string | null;
  calcado?: string | number | null;
  peso?: string | number | null;
  corPele?: string | null;
  corOlhos?: string | null;
  tipoCabelo?: string | null;
  corCabelo?: string | null;
  className?: string;
}

/**
 * Displays quick stats grid for lead/model profile
 * Used in both /telemarketing and /portal-produtor
 */
export const LeadProfileStats = ({
  ageInfo,
  altura,
  manequim,
  calcado,
  peso,
  corPele,
  corOlhos,
  tipoCabelo,
  corCabelo,
  className = '',
}: LeadProfileStatsProps) => {
  // Check if we have any data to show
  const hasAnyData = ageInfo?.value || altura || manequim || calcado || peso || 
    (corPele && corPele !== '-') || (corOlhos && corOlhos !== '-') ||
    (tipoCabelo && tipoCabelo !== '-') || (corCabelo && corCabelo !== '-');

  if (!hasAnyData) return null;

  return (
    <div className={`flex flex-wrap justify-start gap-1.5 sm:gap-2 ${className}`}>
      {ageInfo && ageInfo.value > 0 && (
        <div className="flex-shrink-0 w-[70px] sm:w-[80px] bg-card border rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center">
          <div className="flex justify-center text-primary mb-0.5">
            <Calendar className="h-4 w-4" />
          </div>
          <p className="text-base sm:text-lg font-bold text-foreground leading-tight">{ageInfo.value}</p>
          <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-wide">{ageInfo.unit}</p>
        </div>
      )}
      {altura && (
        <QuickStatCard 
          icon={<Ruler className="h-4 w-4" />} 
          label="Altura" 
          value={`${altura}cm`} 
        />
      )}
      {manequim && manequim !== '-' && (
        <QuickStatCard 
          icon={<User className="h-4 w-4" />} 
          label="Manequim" 
          value={manequim} 
        />
      )}
      {calcado && (
        <QuickStatCard 
          icon={<Footprints className="h-4 w-4" />} 
          label="Calçado" 
          value={String(calcado)} 
        />
      )}
      {peso && (
        <QuickStatCard 
          icon={<Scale className="h-4 w-4" />} 
          label="Peso" 
          value={`${peso}kg`} 
        />
      )}
      {corPele && corPele !== '-' && (
        <QuickStatCard 
          icon={<Palette className="h-4 w-4" />} 
          label="Pele" 
          value={corPele} 
        />
      )}
      {corOlhos && corOlhos !== '-' && (
        <QuickStatCard 
          icon={<Eye className="h-4 w-4" />} 
          label="Olhos" 
          value={corOlhos} 
        />
      )}
      {tipoCabelo && tipoCabelo !== '-' && (
        <QuickStatCard 
          icon={<Sparkles className="h-4 w-4" />} 
          label="Tipo Cabelo" 
          value={tipoCabelo} 
        />
      )}
      {corCabelo && corCabelo !== '-' && (
        <QuickStatCard 
          icon={<Palette className="h-4 w-4" />} 
          label="Cor Cabelo" 
          value={corCabelo} 
        />
      )}
    </div>
  );
};

/**
 * Utility to calculate age from birth date
 */
export const calculateAgeWithUnit = (birthDate: string | null | undefined): AgeInfo | null => {
  if (!birthDate) return null;
  try {
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) return null;
    const today = new Date();
    
    // Calculate total months
    let totalMonths = (today.getFullYear() - date.getFullYear()) * 12;
    totalMonths += today.getMonth() - date.getMonth();
    if (today.getDate() < date.getDate()) {
      totalMonths--;
    }
    
    // If less than 2 years, show in months
    if (totalMonths < 24) {
      return { value: Math.max(0, totalMonths), unit: 'meses' };
    }
    
    // Otherwise show in years
    let years = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      years--;
    }
    return { value: years, unit: 'anos' };
  } catch {
    return null;
  }
};

