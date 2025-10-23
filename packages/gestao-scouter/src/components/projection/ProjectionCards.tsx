import { formatBRL } from '@/utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Trophy, DollarSign } from "lucide-react";

interface LinearProjectionData {
  periodo: {
    inicio: string;
    fim: string;
    hoje_limite: string;
    dias_passados: number;
    dias_restantes: number;
    dias_totais: number;
  };
  realizado: {
    leads: number;
    valor: number;
  };
  projetado_restante: {
    leads: number;
    valor: number;
  };
  total_projetado: {
    leads: number;
    valor: number;
  };
  media_diaria: number;
  valor_medio_por_ficha: number;
}

interface ProjectionCardsProps {
  data: LinearProjectionData;
  projectionType: 'scouter' | 'projeto';
  selectedFilter?: string;
}

export function ProjectionCards({ data, projectionType, selectedFilter }: ProjectionCardsProps) {
  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtNumber = new Intl.NumberFormat('pt-BR');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hover:shadow-md transition-shadow rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Realizado</CardTitle>
            <Target className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Fichas</span>
            </div>
            <span className="font-medium text-blue-600">{fmtNumber.format(data.realizado.leads)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Valor</span>
            </div>
            <span className="font-bold text-lg text-blue-600">{fmtBRL.format(data.realizado.valor)}</span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs text-muted-foreground">
                {data.periodo.dias_passados} dias realizados
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Projeção Total</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Fichas</span>
            </div>
            <span className="font-medium text-green-600">{fmtNumber.format(data.total_projetado.leads)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Valor</span>
            </div>
            <span className="font-bold text-lg text-green-600">{fmtBRL.format(data.total_projetado.valor)}</span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs text-muted-foreground">
                Total até {new Date(data.periodo.fim).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Média Diária</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Fichas/dia</span>
            </div>
            <span className="font-medium">{data.media_diaria.toFixed(1)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Valor/Ficha</span>
            </div>
            <span className="font-bold text-lg">{fmtBRL.format(data.valor_medio_por_ficha)}</span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs text-muted-foreground">
                Baseado no realizado
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Filtro Aplicado</CardTitle>
            <Trophy className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo</span>
            </div>
            <Badge variant="secondary">{projectionType === 'scouter' ? 'Scouter' : 'Projeto'}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtro</span>
            </div>
            <span className="font-medium text-sm">
              {selectedFilter || 'Todos'}
            </span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs text-muted-foreground">
                {data.periodo.dias_restantes} dias restantes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}