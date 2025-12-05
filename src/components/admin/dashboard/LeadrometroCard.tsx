/**
 * Leadrômetro Card
 * Analyzes lead quality based on weighted indicators
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilterValue } from '@/components/MinimalDateFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
export interface LeadrometroCardProps {
  dateFilter: DateFilterValue;
  sourceFilter?: 'all' | 'scouter' | 'meta';
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
  comparecidos: 20
};
const STORAGE_KEY = 'leadrometro-weights';
function getStoredWeights(): Weights {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_WEIGHTS;
}
function HorizontalGauge({
  value
}: {
  value: number;
}) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const position = clampedValue;
  const faces = [{
    emoji: '😞',
    label: 'Péssimo'
  }, {
    emoji: '😟',
    label: 'Ruim'
  }, {
    emoji: '😐',
    label: 'Regular'
  }, {
    emoji: '😊',
    label: 'Bom'
  }, {
    emoji: '😄',
    label: 'Ótimo'
  }];
  return <div className="w-full px-2">
      {/* Emojis */}
      <div className="flex justify-between mb-2 px-1">
        {faces.map((face, i) => <span key={i} className="text-xl" title={face.label}>
            {face.emoji}
          </span>)}
      </div>
      
      {/* Horizontal colored bar */}
      <div className="relative h-3 rounded-full overflow-hidden" style={{
      background: 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 50%, #84cc16 75%, #22c55e 100%)'
    }} />
      
      {/* Indicator triangle */}
      <div className="relative h-5 mt-1">
        <div className="absolute transform -translate-x-1/2 transition-all duration-500 ease-out" style={{
        left: `${position}%`
      }}>
          <div className="w-0 h-0 mx-auto" style={{
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '10px solid hsl(var(--foreground))'
        }} />
        </div>
      </div>
    </div>;
}
function getClassification(score: number): {
  label: string;
  color: string;
} {
  if (score < 20) return {
    label: 'Péssimo',
    color: 'text-red-500'
  };
  if (score < 40) return {
    label: 'Ruim',
    color: 'text-orange-500'
  };
  if (score < 60) return {
    label: 'Regular',
    color: 'text-yellow-500'
  };
  if (score < 80) return {
    label: 'Bom',
    color: 'text-lime-500'
  };
  return {
    label: 'Ótimo',
    color: 'text-green-500'
  };
}
export function LeadrometroCard({
  dateFilter,
  sourceFilter = 'all'
}: LeadrometroCardProps) {
  const [weights, setWeights] = useState<Weights>(getStoredWeights);
  const [tempWeights, setTempWeights] = useState<Weights>(weights);
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ['leadrometro', dateFilter.startDate?.toISOString(), dateFilter.endDate?.toISOString()],
    queryFn: async () => {
      // CRITICAL: Convert Date objects to ISO strings for Supabase queries
      const startDate = dateFilter.startDate.toISOString();
      const endDate = dateFilter.endDate.toISOString();

      // Total leads no período
      const {
        count: total
      } = await supabase.from('leads').select('*', {
        count: 'exact',
        head: true
      }).gte('criado', startDate).lte('criado', endDate);

      // Leads COM FOTO (indicador de qualidade principal)
      const {
        count: comFoto
      } = await supabase.from('leads').select('*', {
        count: 'exact',
        head: true
      }).gte('criado', startDate).lte('criado', endDate).eq('cadastro_existe_foto', true);

      // Fichas CONFIRMADAS
      const {
        count: confirmados
      } = await supabase.from('leads').select('*', {
        count: 'exact',
        head: true
      }).gte('criado', startDate).lte('criado', endDate).eq('ficha_confirmada', true);

      // Agendados (várias etapas indicam agendamento)
      const {
        count: agendados
      } = await supabase.from('leads').select('*', {
        count: 'exact',
        head: true
      }).gte('criado', startDate).lte('criado', endDate).in('etapa', ['Agendados', 'UC_QWPO2W', 'Em agendamento', 'Reagendar', 'Retornar Ligação']);

      // Convertidos (Lead convertido ou compareceu=true)
      const {
        count: convertidos
      } = await supabase.from('leads').select('*', {
        count: 'exact',
        head: true
      }).gte('criado', startDate).lte('criado', endDate).or('etapa.eq.Lead convertido,etapa.eq.UC_GPH3PL,compareceu.eq.true');

      // Leads em análise (não qualificados ainda)
      const {
        count: emAnalise
      } = await supabase.from('leads').select('*', {
        count: 'exact',
        head: true
      }).gte('criado', startDate).lte('criado', endDate).in('etapa', ['Lead a Qualificar', 'Triagem', 'Banco de Leads']);
      return {
        total: total || 0,
        comFoto: comFoto || 0,
        confirmados: confirmados || 0,
        agendados: agendados || 0,
        convertidos: convertidos || 0,
        emAnalise: emAnalise || 0
      };
    },
    refetchInterval: 60000
  });
  const calculateScore = (metrics: typeof data, w: Weights): number => {
    if (!metrics || metrics.total === 0) return 0;
    const {
      total,
      comFoto,
      confirmados,
      agendados,
      convertidos,
      emAnalise
    } = metrics;

    // Calcular taxas (0-100)
    const taxaComFoto = comFoto / total * 100;
    const taxaConfirmados = confirmados / total * 100;
    const taxaAgendados = agendados / total * 100;
    // Taxa de conversão: convertidos em relação aos agendados (ou total se não houver agendados)
    const taxaConvertidos = agendados > 0 ? convertidos / agendados * 100 : convertidos / total * 100;
    // Inverte: quanto MENOS em análise, melhor (leads sendo processados)
    const taxaProcessados = (total - emAnalise) / total * 100;

    // Normalizar pesos
    const totalWeight = w.verificados + w.emVerificacao + w.naoReconhecidos + w.agendados + w.comparecidos;

    // Calcular score ponderado
    // verificados = confirmados, emVerificacao = comFoto, naoReconhecidos = processados, agendados, comparecidos = convertidos
    const score = taxaConfirmados * (w.verificados / totalWeight) + taxaComFoto * (w.emVerificacao / totalWeight) + taxaProcessados * (w.naoReconhecidos / totalWeight) * 0.5 + taxaAgendados * (w.agendados / totalWeight) + taxaConvertidos * (w.comparecidos / totalWeight);
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
    return <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Leadrômetro</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <Skeleton className="h-[120px] w-[200px] rounded-t-full" />
          <Skeleton className="h-8 w-16 mt-2" />
        </CardContent>
      </Card>;
  }
  const score = calculateScore(data, weights);
  const classification = getClassification(score);
  return <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full opacity-50" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Leadrômetro
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-semibold mb-1">Como é calculado:</p>
                <ul className="text-xs space-y-1">
                  <li><strong>Confirmados:</strong> % de fichas confirmadas</li>
                  <li><strong>Com Foto:</strong> % de leads com foto</li>
                  <li><strong>Processados:</strong> % fora da fila de qualificação</li>
                  <li><strong>Agendados:</strong> % em agendamento</li>
                  <li><strong>Convertidos:</strong> comparecidos / agendados</li>
                </ul>
                <p className="text-xs mt-2 text-muted-foreground">
                  Cada indicador tem um peso configurável via ⚙️
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 z-10 relative" onClick={e => {
            e.stopPropagation();
            setDialogOpen(true);
          }}>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Pesos do Leadrômetro</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {[{
              key: 'verificados',
              label: 'Confirmados',
              desc: 'Fichas confirmadas'
            }, {
              key: 'emVerificacao',
              label: 'Com Foto',
              desc: 'Leads com foto cadastrada'
            }, {
              key: 'naoReconhecidos',
              label: 'Processados',
              desc: 'Leads fora da fila de qualificação'
            }, {
              key: 'agendados',
              label: 'Agendados',
              desc: 'Taxa de leads em agendamento'
            }, {
              key: 'comparecidos',
              label: 'Convertidos',
              desc: 'Taxa de conversão (comparecidos/agendados)'
            }].map(({
              key,
              label,
              desc
            }) => <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{label}</Label>
                    <span className="text-sm text-muted-foreground">{tempWeights[key as keyof Weights]}%</span>
                  </div>
                  <Slider value={[tempWeights[key as keyof Weights]]} onValueChange={([v]) => setTempWeights(prev => ({
                ...prev,
                [key]: v
              }))} max={100} step={5} />
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>)}
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
          
          <p className={`text-sm font-medium ${classification.color}`}>
            {classification.label}
          </p>
        </div>
      </CardContent>
    </Card>;
}