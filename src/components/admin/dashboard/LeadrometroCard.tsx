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

function HorizontalGauge({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const position = clampedValue;

  const faces = [
    { emoji: '😞', label: 'Péssimo' },
    { emoji: '😟', label: 'Ruim' },
    { emoji: '😐', label: 'Regular' },
    { emoji: '😊', label: 'Bom' },
    { emoji: '😄', label: 'Ótimo' },
  ];

  return (
    <div className="w-full px-2">
      {/* Emojis */}
      <div className="flex justify-between mb-2 px-1">
        {faces.map((face, i) => (
          <span key={i} className="text-xl" title={face.label}>
            {face.emoji}
          </span>
        ))}
      </div>
      
      {/* Horizontal colored bar */}
      <div 
        className="relative h-3 rounded-full overflow-hidden"
        style={{ 
          background: 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 50%, #84cc16 75%, #22c55e 100%)' 
        }}
      />
      
      {/* Indicator triangle */}
      <div className="relative h-5 mt-1">
        <div 
          className="absolute transform -translate-x-1/2 transition-all duration-500 ease-out"
          style={{ left: `${position}%` }}
        >
          <div 
            className="w-0 h-0 mx-auto"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '10px solid hsl(var(--foreground))',
            }}
          />
        </div>
      </div>
    </div>
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

      // Total leads no período
      const { count: total } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate);

      // Leads aprovados (qualidade_lead = 'aprovado' ou 'super_aprovado')
      const { count: aprovados } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .in('qualidade_lead', ['aprovado', 'super_aprovado']);

      // Leads reprovados
      const { count: reprovados } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .eq('qualidade_lead', 'reprovado');

      // Leads com foto (indicador de qualidade)
      const { count: comFoto } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .eq('cadastro_existe_foto', true);

      // Agendados (várias etapas indicam agendamento)
      const { count: agendados } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .in('etapa', ['Agendados', 'UC_QWPO2W', 'Em agendamento']);

      // Convertidos/Comparecidos
      const { count: comparecidos } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('criado', startDate)
        .lte('criado', endDate)
        .or('etapa.eq.Lead convertido,etapa.eq.UC_GPH3PL');

      return {
        total: total || 0,
        aprovados: aprovados || 0,
        reprovados: reprovados || 0,
        comFoto: comFoto || 0,
        agendados: agendados || 0,
        comparecidos: comparecidos || 0,
      };
    },
    refetchInterval: 60000,
  });

  const calculateScore = (metrics: typeof data, w: Weights): number => {
    if (!metrics || metrics.total === 0) return 0;

    const { total, aprovados, reprovados, comFoto, agendados, comparecidos } = metrics;

    // Calcular taxas (0-100)
    const taxaAprovados = (aprovados / total) * 100;
    const taxaComFoto = (comFoto / total) * 100;
    const taxaReprovados = (reprovados / total) * 100;
    const taxaAgendados = (agendados / total) * 100;
    const taxaComparecidos = agendados > 0 ? (comparecidos / agendados) * 100 : (comparecidos / total) * 100;

    // Normalizar pesos
    const totalWeight = w.verificados + w.emVerificacao + w.naoReconhecidos + w.agendados + w.comparecidos;
    
    // Calcular score ponderado
    // verificados = aprovados, emVerificacao = comFoto (qualidade), naoReconhecidos = reprovados (penaliza)
    const score = 
      (taxaAprovados * (w.verificados / totalWeight)) +
      (taxaComFoto * (w.emVerificacao / totalWeight)) +
      ((100 - taxaReprovados) * (w.naoReconhecidos / totalWeight) * 0.2) + // Penaliza reprovados
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
                { key: 'verificados', label: 'Aprovados', desc: 'Leads com qualidade aprovada/super aprovada' },
                { key: 'emVerificacao', label: 'Com Foto', desc: 'Leads que possuem foto cadastrada' },
                { key: 'naoReconhecidos', label: 'Reprovados', desc: 'Penaliza leads reprovados' },
                { key: 'agendados', label: 'Agendados', desc: 'Taxa de leads agendados' },
                { key: 'comparecidos', label: 'Convertidos', desc: 'Taxa de leads convertidos' },
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
        <HorizontalGauge value={score} />
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
