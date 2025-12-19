import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Negotiation, NegotiationStatus, NEGOTIATION_STATUS_CONFIG } from '@/types/agenciamento';
import { TrendingUp, TrendingDown, Users, DollarSign, Target, CheckCircle, XCircle, Search } from 'lucide-react';

interface AgenciamentoDashboardProps {
  negotiations: Negotiation[];
}

export function AgenciamentoDashboard({ negotiations }: AgenciamentoDashboardProps) {
  const stats = useMemo(() => {
    const total = negotiations.length;
    const byStatus = negotiations.reduce((acc, neg) => {
      acc[neg.status] = (acc[neg.status] || 0) + 1;
      return acc;
    }, {} as Record<NegotiationStatus, number>);

    const valueByStatus = negotiations.reduce((acc, neg) => {
      acc[neg.status] = (acc[neg.status] || 0) + neg.total_value;
      return acc;
    }, {} as Record<NegotiationStatus, number>);

    const totalValue = negotiations.reduce((sum, n) => sum + n.total_value, 0);
    // Usar os novos nomes de status alinhados com Bitrix
    const negociosFechadosValue = valueByStatus['negocios_fechados'] || 0;
    const negociosFechadosCount = byStatus['negocios_fechados'] || 0;
    const contratoNaoFechadoCount = byStatus['contrato_nao_fechado'] || 0;
    const finalizados = negociosFechadosCount + contratoNaoFechadoCount;
    const taxaConversao = finalizados > 0 ? (negociosFechadosCount / finalizados) * 100 : 0;

    return {
      total,
      byStatus,
      valueByStatus,
      totalValue,
      negociosFechadosValue,
      taxaConversao,
      finalizados,
    };
  }, [negotiations]);

  // Funnel stages alinhados com Bitrix - Categoria 1 (Pinheiros)
  const funnelStages: NegotiationStatus[] = [
    'recepcao_cadastro',
    'ficha_preenchida',
    'atendimento_produtor',
    'negocios_fechados',
    'contrato_nao_fechado',
    'analisar',
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Negociações
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.finalizados} finalizadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Em todas as etapas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
            {stats.taxaConversao >= 50 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.taxaConversao.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Fechados vs Finalizados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Negócios Fechados
            </CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.negociosFechadosValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Agenciamentos concluídos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel and Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelStages.map((status, index) => {
                const count = stats.byStatus[status] || 0;
                const value = stats.valueByStatus[status] || 0;
                const maxCount = Math.max(...Object.values(stats.byStatus));
                const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const config = NEGOTIATION_STATUS_CONFIG[status];

                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{config.label}</span>
                      <span className="text-muted-foreground">
                        {count} ({formatCurrency(value)})
                      </span>
                    </div>
                    <div className="h-8 bg-muted rounded-md overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 flex items-center justify-center text-xs font-medium ${
                          status === 'recepcao_cadastro' ? 'bg-slate-500' :
                          status === 'ficha_preenchida' ? 'bg-blue-500' :
                          status === 'atendimento_produtor' ? 'bg-amber-500' :
                          status === 'negocios_fechados' ? 'bg-green-500' :
                          status === 'contrato_nao_fechado' ? 'bg-orange-500' :
                          'bg-purple-500'
                        } text-white`}
                        style={{ width: `${Math.max(width, 5)}%` }}
                      >
                        {count > 0 && count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Status Summary */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Resumo por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(NEGOTIATION_STATUS_CONFIG).map(([status, config]) => {
                const count = stats.byStatus[status as NegotiationStatus] || 0;
                const value = stats.valueByStatus[status as NegotiationStatus] || 0;
                const Icon = status === 'negocios_fechados' ? CheckCircle : 
                            status === 'contrato_nao_fechado' ? XCircle : 
                            status === 'analisar' ? Search : Target;

                return (
                  <div
                    key={status}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          status === 'recepcao_cadastro' ? 'bg-slate-100 text-slate-600' :
                          status === 'ficha_preenchida' ? 'bg-blue-100 text-blue-600' :
                          status === 'atendimento_produtor' ? 'bg-amber-100 text-amber-600' :
                          status === 'negocios_fechados' ? 'bg-green-100 text-green-600' :
                          status === 'contrato_nao_fechado' ? 'bg-orange-100 text-orange-600' :
                          'bg-purple-100 text-purple-600'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{config.label}</p>
                        <p className="text-sm text-muted-foreground">{count} negociações</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrency(value)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
