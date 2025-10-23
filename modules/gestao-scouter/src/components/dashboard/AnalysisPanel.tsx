import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DashboardFilters } from "./FilterPanel";

interface DashboardData {
  totalLeads: number;
  leadsComFoto: number;
  leadsConfirmadas: number;
  leadsComContato: number;
  iqsMedio: number;
}

interface AnalysisPanelProps {
  filters: DashboardFilters;
  data: DashboardData; // Dados processados para análise
}

export const AnalysisPanel = ({ filters, data }: AnalysisPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAnalysis = async () => {
    setIsGenerating(true);
    
    // Simula tempo de processamento da IA
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let analysisText = "";

    // Análise baseada nos filtros ativos
    if (filters.scouters.length === 1) {
      const scouter = filters.scouters[0];
      analysisText = generateScouterAnalysis(scouter, data);
    } else if (filters.projects.length === 1) {
      const project = filters.projects[0];
      analysisText = generateProjectAnalysis(project, data);
    } else {
      analysisText = generateGeneralAnalysis(data);
    }

    setAnalysis(analysisText);
    setIsGenerating(false);
    setIsOpen(true);
  };

  const generateScouterAnalysis = (scouter: string, data: DashboardData): string => {
    const performances = {
      "Carlos Antônio": {
        leads: 180,
        mediaDia: 15.0,
        diasTrabalhados: 12,
        ajudaCusto: 360,
        pagamentoFichas: 1080,
        totalReceber: 1440,
        contribuicao: 42.5
      },
      "Rafaela": {
        leads: 120,
        mediaDia: 10.0,
        diasTrabalhados: 12,
        ajudaCusto: 360,
        pagamentoFichas: 660,
        totalReceber: 1020,
        contribuicao: 35.2
      }
    };

    const perf = performances[scouter as keyof typeof performances] || performances["Rafaela"];

    return `📊 **Análise de Performance - ${scouter}**

**Produtividade Geral:**
• Total de leads: ${perf.leads.toLocaleString('pt-BR')} no período
• Média diária: ${perf.mediaDia} leads/dia
• Dias trabalhados: ${perf.diasTrabalhados} dias (>20 leads/dia)
• Contribuição no projeto: ${perf.contribuicao}% das leads totais

**Remuneração:**
• Ajuda de custo: R$ ${perf.ajudaCusto.toLocaleString('pt-BR')}
• Pagamento por leads: R$ ${perf.pagamentoFichas.toLocaleString('pt-BR')}
• **Total a receber: R$ ${perf.totalReceber.toLocaleString('pt-BR')}**

**Recomendações:**
${perf.mediaDia >= 15 
  ? "✅ Performance excelente! Manter ritmo atual e considerar aumentar meta individual."
  : perf.mediaDia >= 10
  ? "⚠️ Performance na média. Revisar estratégias de captação para alcançar 15+ leads/dia."
  : "🔴 Performance abaixo do esperado. Necessário treinamento e acompanhamento próximo."
}

**Próximos Passos:**
• Analisar horários de maior produtividade
• Identificar melhores práticas nos dias de alta performance
• Definir metas semanais para manter consistência`;
  };

  const generateProjectAnalysis = (project: string, data: DashboardData): string => {
    const projectData = {
      "SELETIVA SANTO ANDRÉ-ABC": {
        meta: 2500,
        leadsAtuais: 275,
        percentMeta: 11.0,
        esperadoHoje: 387,
        delta: -112,
        status: "atraso",
        ritmoNecessario: 18,
        topScouters: ["Carlos Antônio (180)", "João Silva (50)", "Ana Paula (45)"]
      },
      "SELETIVA SÃO CARLOS": {
        meta: 3000,
        leadsAtuais: 230,
        percentMeta: 7.7,
        esperadoHoje: 600,
        delta: -370,
        status: "atraso-critico",
        ritmoNecessario: 25,
        topScouters: ["Rafaela (120)", "Maria Santos (110)"]
      }
    };

    const proj = projectData[project as keyof typeof projectData] || projectData["SELETIVA SANTO ANDRÉ-ABC"];

    return `🎯 **Análise de Projeto - ${project}**

**Status da Meta:**
• Meta total: ${proj.meta.toLocaleString('pt-BR')} leads
• Leads captadas: ${proj.leadsAtuais.toLocaleString('pt-BR')} (${proj.percentMeta}% da meta)
• Esperado até hoje: ${proj.esperadoHoje.toLocaleString('pt-BR')}
• Delta: ${proj.delta} leads (${proj.status === "atraso" ? "🔴 Atraso" : "🔴 Atraso Crítico"})

**Projeção e Riscos:**
• Ritmo necessário: **${proj.ritmoNecessario} leads/dia** para atingir meta no prazo
• Status atual: ${proj.status === "atraso-critico" ? "RISCO ALTO de não atingir meta" : "Recuperação possível com esforço concentrado"}

**Top Performers:**
${proj.topScouters.map(s => `• ${s}`).join('\n')}

**Recomendações Urgentes:**
1. **Redistribuir equipe**: Focar scouters de alta performance neste projeto
2. **Intensificar captação**: Aumentar jornada nos próximos 5 dias úteis
3. **Revisar estratégias**: Analisar canais de captação mais eficazes
4. **Monitoramento diário**: Acompanhar progresso a cada 24h

**Cenário What-If:**
• Com +10% no ritmo atual: ${Math.round(proj.meta * 0.85).toLocaleString('pt-BR')} leads (85% da meta)
• Necessário: Acelerar captação em 40% para recuperar atraso`;
  };

  const generateGeneralAnalysis = (data: DashboardData): string => {
    return `📈 **Visão Geral do Dashboard**

**Performance da Equipe:**
• Total de scouters ativos: 5
• Total de leads no período: 585
• Média geral: 12.3 leads/dia por scouter
• Projetos em andamento: 3

**Ranking de Performance:**
1. Carlos Antônio - 180 leads (alta performance) ⭐
2. Rafaela - 120 leads (performance estável)
3. Maria Santos - 110 leads (performance estável) 
4. João Silva - 95 leads (performance variável)
5. Ana Paula - 80 leads (requer atenção) ⚠️

**Status dos Projetos:**
• SELETIVA SANTO ANDRÉ-ABC: 11% da meta (atraso moderado)
• SELETIVA SÃO CARLOS: 7.7% da meta (atraso crítico) 🔴
• AGÊNCIA DIGITAL SP: 8.7% da meta (dentro do cronograma)

**Insights e Ações:**
• **Concentração 80/20**: Carlos Antônio representa 31% da produção total
• **Projeto crítico**: São Carlos precisa de intervenção imediata
• **Oportunidade**: Ana Paula tem potencial subutilizado (projeto com maior valor/ficha)

**Recomendações Estratégicas:**
1. Replicar práticas do Carlos Antônio para outros scouters
2. Realocar recursos para projeto São Carlos urgentemente
3. Implementar programa de mentoria scouter-scouter
4. Revisar metas individuais baseado em performance histórica`;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Análise Inteligente
          </CardTitle>
          <Button 
            onClick={generateAnalysis} 
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar Análise"
            )}
          </Button>
        </div>
      </CardHeader>

      {analysis && (
        <CardContent>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Observação de Análise
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Alert>
                <AlertDescription className="whitespace-pre-line text-sm leading-relaxed">
                  {analysis}
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      )}
    </Card>
  );
};