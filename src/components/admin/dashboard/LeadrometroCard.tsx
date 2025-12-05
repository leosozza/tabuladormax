/**
 * Leadrômetro Card
 * Analyzes lead quality based on weighted indicators
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilterValue } from '@/components/MinimalDateFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface LeadrometroCardProps {
  dateFilter: DateFilterValue;
}

interface Weights {
  verificados: number;
  emVerificacao: number;
  naoReconhecidos: number;
  agendados: number;
  comparecidos: number;
}

const DEFAULT_WEIGHTS: Weights = {
  verificados: 30,
  emVerificacao: 10,
  naoReconhecidos: 20,
  agendados: 20,
  comparecidos: 20,
};

const STORAGE_KEY = 'leadrometro-weights';

function getStoredWeights(): Weights {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_WEIGHTS;
}

function GaugeChart({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  
  // SVG parameters
  const width = 200;
  const height = 120;
  const cx = width / 2;
  const cy = height - 10;
  const radius = 80;
  const strokeWidth = 16;
  
  // Arc calculations (180 degrees = π radians)
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalAngle = Math.PI;
  
  // Zones (each 20% of the arc)
  const zones = [
    { color: '#ef4444', start: 0, end: 0.2 },    // Péssimo - Red
    { color: '#f97316', start: 0.2, end: 0.4 },  // Ruim - Orange
    { color: '#eab308', start: 0.4, end: 0.6 },  // Regular - Yellow
    { color: '#84cc16', start: 0.6, end: 0.8 },  // Bom - Light Green
    { color: '#22c55e', start: 0.8, end: 1 },    // Ótimo - Green
  ];
  
  // Create arc path
  const createArc = (startPercent: number, endPercent: number) => {
    const startA = startAngle - (startPercent * totalAngle);
    const endA = startAngle - (endPercent * totalAngle);
    
    const x1 = cx + radius * Math.cos(startA);
    const y1 = cy - radius * Math.sin(startA);
    const x2 = cx + radius * Math.cos(endA);
    const y2 = cy - radius * Math.sin(endA);
    
    const largeArc = (endPercent - startPercent) > 0.5 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };
  
  // Needle position
  const needleAngle = startAngle - (clampedValue / 100) * totalAngle;
  const needleLength = radius - 10;
  const needleX = cx + needleLength * Math.cos(needleAngle);
  const needleY = cy - needleLength * Math.sin(needleAngle);
  
  return (
    <svg width={width} height={height} className="mx-auto">
      {/* Background arcs for each zone */}
      {zones.map((zone, i) => (
        <path
          key={i}
          d={createArc(zone.start, zone.end)}
          fill="none"
          stroke={zone.color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          opacity={0.3}
        />
      ))}
      
      {/* Filled arc up to current value */}
      {zones.map((zone, i) => {
        const valuePercent = clampedValue / 100;
        if (valuePercent <= zone.start) return null;
        const fillEnd = Math.min(valuePercent, zone.end);
        return (
          <path
            key={`fill-${i}`}
            d={createArc(zone.start, fillEnd)}
            fill="none"
            stroke={zone.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        );
      })}
      
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke="hsl(var(--foreground))"
        strokeWidth={3}
        strokeLinecap="round"
      />
      
      {/* Center circle */}
      <circle cx={cx} cy={cy} r={8} fill="hsl(var(--foreground))" />
      <circle cx={cx} cy={cy} r={4} fill="hsl(var(--background))" />
    </svg>
  );
}

function getClassification(score: number): { label: string; color: string } {
  if (score < 20) return { label: 'Péssimo', color: 'text-red-500' };
  if (score < 40) return { label: 'Ruim', color: 'text-orange-500' };
  if (score < 60) return { label: 'Regular', color: 'text-yellow-500' };
  if (score < 80) return { label: 'Bom', color: 'text-lime-500' };
  return { label: 'Ótimo', color: 'text-green-500' };
}

export function LeadrometroCard({ dateFilter }: LeadrometroCardProps) {
  const [weights, setWeights] = useState<Weights>(getStoredWeights);
  const [tempWeights, setTempWeights] = useState<Weights>(weights);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leadrometro', dateFilter.startDate, dateFilter.endDate],
    queryFn: async () => {
      const { startDate, endDate } = dateFilter;

      // Total leads
      const { count: total } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate);

      // Verificados (confirmed)
      const { count: verificados } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .eq('qualidade_lead', 'Reconhecido');

      // Em verificação (awaiting)
      const { count: emVerificacao } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .eq('qualidade_lead', 'Em verificação');

      // Não reconhecidos
      const { count: naoReconhecidos } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .eq('qualidade_lead', 'Não reconhecido');

      // Agendados
      const { count: agendados } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .or('etapa.eq.Agendados,etapa.eq.UC_QWPO2W');

      // Comparecidos
      const { count: comparecidos } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .not('date_closed', 'is', null)
        .or('etapa.eq.CONVERTED,etapa.eq.Lead convertido');

      return {
        total: total || 0,
        verificados: verificados || 0,
        emVerificacao: emVerificacao || 0,
        naoReconhecidos: naoReconhecidos || 0,
        agendados: agendados || 0,
        comparecidos: comparecidos || 0,
      };
    },
    refetchInterval: 60000,
  });

  const calculateScore = (metrics: typeof data, w: Weights): number => {
    if (!metrics || metrics.total === 0) return 0;

    const { total, verificados, emVerificacao, naoReconhecidos, agendados, comparecidos } = metrics;

    // Calculate rates (0-100)
    const taxaVerificados = (verificados / total) * 100;
    const taxaEmVerificacao = (emVerificacao / total) * 100;
    const taxaNaoReconhecidos = (naoReconhecidos / total) * 100;
    const taxaAgendados = (agendados / total) * 100;
    const taxaComparecidos = agendados > 0 ? (comparecidos / agendados) * 100 : 0;

    // Normalize weights
    const totalWeight = w.verificados + w.emVerificacao + w.naoReconhecidos + w.agendados + w.comparecidos;
    
    // Calculate weighted score
    const score = 
      (taxaVerificados * (w.verificados / totalWeight)) +
      (taxaEmVerificacao * (w.emVerificacao / totalWeight) * 0.5) + // Neutral impact
      ((100 - taxaNaoReconhecidos) * (w.naoReconhecidos / totalWeight)) + // Inverse - penalize
      (taxaAgendados * (w.agendados / totalWeight)) +
      (taxaComparecidos * (w.comparecidos / totalWeight));

    return Math.max(0, Math.min(100, score));
  };

  const handleSaveWeights = () => {
    setWeights(tempWeights);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempWeights));
    setDialogOpen(false);
  };

  const handleResetWeights = () => {
    setTempWeights(DEFAULT_WEIGHTS);
  };

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Leadrômetro</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <Skeleton className="h-[120px] w-[200px] rounded-t-full" />
          <Skeleton className="h-8 w-16 mt-2" />
        </CardContent>
      </Card>
    );
  }

  const score = calculateScore(data, weights);
  const classification = getClassification(score);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full opacity-50" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Leadrômetro
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Pesos do Leadrômetro</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {[
                { key: 'verificados', label: 'Verificados', desc: 'Leads reconhecidos' },
                { key: 'emVerificacao', label: 'Em Verificação', desc: 'Leads aguardando análise' },
                { key: 'naoReconhecidos', label: 'Não Reconhecidos', desc: 'Penaliza leads inválidos' },
                { key: 'agendados', label: 'Agendados', desc: 'Taxa de agendamento' },
                { key: 'comparecidos', label: 'Comparecidos', desc: 'Taxa de comparecimento' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{label}</Label>
                    <span className="text-sm text-muted-foreground">{tempWeights[key as keyof Weights]}%</span>
                  </div>
                  <Slider
                    value={[tempWeights[key as keyof Weights]]}
                    onValueChange={([v]) => setTempWeights(prev => ({ ...prev, [key]: v }))}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleResetWeights} className="flex-1">
                  Restaurar Padrões
                </Button>
                <Button onClick={handleSaveWeights} className="flex-1">
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-0">
        <GaugeChart value={score} />
        <div className="text-center mt-1">
          <span className={`text-3xl font-bold ${classification.color}`}>
            {score.toFixed(0)}
          </span>
          <p className={`text-sm font-medium ${classification.color}`}>
            {classification.label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
