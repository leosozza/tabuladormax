// Negotiation Statistics Component
// Dashboard cards showing key metrics - Alinhado com Bitrix Categoria 1 (Pinheiros)

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, TrendingUp, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import type { Negotiation } from '@/types/agenciamento';

interface NegotiationStatsProps {
  negotiations: Negotiation[];
}

export function NegotiationStats({ negotiations }: NegotiationStatsProps) {
  // Calculate statistics - Alinhado com Bitrix
  const stats = {
    total: negotiations.length,
    totalValue: negotiations.reduce((sum, n) => sum + n.total_value, 0),
    recepcaoCadastro: negotiations.filter((n) => n.status === 'recepcao_cadastro').length,
    fichaPreenchida: negotiations.filter((n) => n.status === 'ficha_preenchida').length,
    atendimentoProdutor: negotiations.filter((n) => n.status === 'atendimento_produtor').length,
    negociosFechados: negotiations.filter((n) => n.status === 'negocios_fechados').length,
    contratoNaoFechado: negotiations.filter((n) => n.status === 'contrato_nao_fechado').length,
    analisar: negotiations.filter((n) => n.status === 'analisar').length,
    averageValue:
      negotiations.length > 0
        ? negotiations.reduce((sum, n) => sum + n.total_value, 0) / negotiations.length
        : 0,
  };

  const cards = [
    {
      title: 'Total de Negociações',
      value: stats.total,
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Valor Total',
      value: `R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Recepção - Cadastro',
      value: stats.recepcaoCadastro,
      icon: Clock,
      color: 'text-slate-600',
    },
    {
      title: 'Ficha Preenchida',
      value: stats.fichaPreenchida,
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Atendimento Produtor',
      value: stats.atendimentoProdutor,
      icon: TrendingUp,
      color: 'text-amber-600',
    },
    {
      title: 'Negócios Fechados',
      value: stats.negociosFechados,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Contrato não fechado',
      value: stats.contratoNaoFechado,
      icon: XCircle,
      color: 'text-orange-600',
    },
    {
      title: 'Analisar',
      value: stats.analisar,
      icon: Search,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
