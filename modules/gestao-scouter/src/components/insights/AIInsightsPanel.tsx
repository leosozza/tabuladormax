import React, { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { 
  calculateTimeMetrics, 
  calculateDailyTimeMetrics, 
  getTimeInsights,
  formatMinutesToHours 
} from "@/utils/timeAnalytics";

type Lead = {
  created_at?: string;
  data_criacao_ficha?: string;
  criado?: string;
  hora_criacao_ficha?: string;
  projeto?: string;
  projetos_comerciais?: string;
  scouter?: string;
  gestao_de_scouter?: string;
  confirmado?: boolean | string;
  tem_foto?: boolean | string;
  valor_ficha?: number | string;
  [key: string]: any;
};

type Props = {
  startDate: Date;
  endDate: Date;
  rows: Lead[];
  projectName?: string | null;
};

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.trim().toLowerCase() === "sim";
  return !!v;
}

export default function AIInsightsPanel({ startDate, endDate, rows, projectName }: Props) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const kpis = useMemo(() => {
    const total = rows.length;
    const byDay = new Map<string, number>();
    let confirmados = 0;
    let comFoto = 0;
    let valorTotal = 0;

    for (const r of rows) {
      let iso = r.data_criacao_ficha ?? r.created_at ?? r.criado ?? "";
      
      // Se for formato brasileiro (dd/MM/yyyy), converter para ISO (yyyy-MM-dd)
      if (iso.includes("/")) {
        const [day, month, year] = iso.split(" ")[0].split("/");
        if (day && month && year) {
          iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
      } else {
        iso = iso.slice(0, 10);
      }
      
      if (iso && iso.match(/^\d{4}-\d{2}-\d{2}$/)) {
        byDay.set(iso, (byDay.get(iso) ?? 0) + 1);
      }
      
      // % confirmadas: considerar ficha_confirmada === "Confirmada" OU confirmado == 1
      const fichaConfirmada = (r as Record<string, unknown>).ficha_confirmada;
      const confirmadoField = r.confirmado;
      const confirmadoBool = typeof confirmadoField === 'boolean' ? confirmadoField : 
                             typeof confirmadoField === 'number' ? confirmadoField === 1 :
                             typeof confirmadoField === 'string' ? (confirmadoField === '1' || confirmadoField.toLowerCase() === 'sim') : false;
      if (fichaConfirmada === "Confirmada" || confirmadoBool) {
        confirmados++;
      }
      
      // % com foto: considerar cadastro_existe_foto === "SIM" OU foto == 1
      const cadastroFoto = (r as Record<string, unknown>).cadastro_existe_foto;
      const fotoField = (r as Record<string, unknown>).foto;
      if (cadastroFoto === "SIM" || fotoField === "1" || fotoField === 1 || toBool(r.tem_foto)) {
        comFoto++;
      }
      
      const valorFicha = typeof r.valor_ficha === "number" ? r.valor_ficha : parseFloat(String(r.valor_ficha || 0));
      if (!isNaN(valorFicha)) valorTotal += valorFicha;
    }

    const daily = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const best = daily.reduce((m, d) => (d.count > (m?.count ?? 0) ? d : m), null as { date: string; count: number } | null);
    const worst = daily.reduce((m, d) => (d.count < (m?.count ?? Infinity) ? d : m), null as { date: string; count: number } | null);

    const confirmRate = total ? (confirmados / total) : 0;
    const fotoRate = total ? (comFoto / total) : 0;
    const avgPerDay = daily.length ? total / daily.length : 0;

    // tendência simples: compara média dos 3 últimos dias vs 3 primeiros
    const head = daily.slice(0, 3).reduce((s, d) => s + d.count, 0) / Math.max(1, Math.min(3, daily.length));
    const tail = daily.slice(-3).reduce((s, d) => s + d.count, 0) / Math.max(1, Math.min(3, daily.length));
    const trend = tail - head;

    // top projetos/scouters (se presentes)
    const top = (keys: string[]) => {
      const map = new Map<string, number>();
      for (const r of rows) {
        let k = "";
        for (const key of keys) {
          k = String(r[key] ?? "");
          if (k) break;
        }
        if (!k) continue;
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    // Calculate time-based metrics
    const timeMetrics = calculateTimeMetrics(rows);
    const dailyTimeMetrics = calculateDailyTimeMetrics(rows);

    return {
      total,
      valorTotal,
      confirmRate,
      fotoRate,
      confirmados,
      comFoto,
      avgPerDay,
      best,
      worst,
      trend,
      topProjetos: top(["projeto", "projetos_comerciais"]),
      topScouters: top(["scouter", "gestao_de_scouter"]),
      daily,
      timeMetrics,
      dailyTimeMetrics
    };
  }, [rows]);

  const localNarrative = useMemo(() => {
    const p = (n: number) => (n * 100).toFixed(1) + "%";
    const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    
    const formatSafeDate = (dateStr: string) => {
      try {
        const date = parseISO(dateStr);
        if (isValid(date)) {
          return format(date, "dd/MM", { locale: ptBR });
        }
      } catch {
        // ignore
      }
      return dateStr;
    };
    
    const period = `${format(startDate, "dd/MM", { locale: ptBR })}–${format(endDate, "dd/MM", { locale: ptBR })}`;
    const bestTxt = kpis.best ? `${formatSafeDate(kpis.best.date)} (${kpis.best.count})` : "-";
    const worstTxt = kpis.worst ? `${formatSafeDate(kpis.worst.date)} (${kpis.worst.count})` : "-";
    const trendTxt = kpis.trend > 0 ? "alta" : kpis.trend < 0 ? "queda" : "estável";
    const projTxt = kpis.topProjetos.map(([n, v]) => `${n}: ${v}`).join(" • ") || "-";
    const scoutTxt = kpis.topScouters.map(([n, v]) => `${n}: ${v}`).join(" • ") || "-";
    
    // Build narrative with all KPIs including photo and confirmation rates
    const narrativeParts = [
      `📅 Período ${period}${projectName ? ` | Projeto: ${projectName}` : ""}`,
      `📊 Total de leads: ${kpis.total} | Média/dia: ${kpis.avgPerDay.toFixed(1)}`,
      `📈 Dia pico: ${bestTxt} | Dia fraco: ${worstTxt} | Tendência: ${trendTxt}`,
      `✅ Confirmadas: ${kpis.confirmados} (${p(kpis.confirmRate)}) | 📷 Com foto: ${kpis.comFoto} (${p(kpis.fotoRate)})`,
      typeof kpis.valorTotal === "number" && kpis.valorTotal > 0 ? `💰 Valor total estimado: ${brl(kpis.valorTotal)}` : "",
    ];

    // Add time-based metrics
    if (kpis.timeMetrics.avgIntervalMinutes > 0) {
      narrativeParts.push(
        `⏱️ Intervalo médio entre leads: ${kpis.timeMetrics.avgIntervalMinutes} minutos`
      );
    }

    if (kpis.timeMetrics.workStartTime && kpis.timeMetrics.workEndTime) {
      narrativeParts.push(
        `🕐 Horário de trabalho: ${kpis.timeMetrics.workStartTime} às ${kpis.timeMetrics.workEndTime} (${kpis.timeMetrics.totalWorkHours.toFixed(1)}h)`
      );
    }

    if (kpis.timeMetrics.fichasPerHour > 0) {
      narrativeParts.push(
        `📊 Produtividade: ${kpis.timeMetrics.fichasPerHour.toFixed(1)} leads/hora`
      );
    }

    narrativeParts.push(
      `🎯 Top Projetos: ${projTxt}`,
      `👥 Top Scouters: ${scoutTxt}`
    );
    
    return narrativeParts.filter(Boolean).join("\n");
  }, [kpis, startDate, endDate, projectName]);

  async function runAI() {
    try {
      setLoadingAI(true);
      setShowAnalysis(true);
      // Fallback: mostra só a narrativa local (sem LLM)
      // TODO: Integrar com Edge Function quando necessário
      setAiText(buildPrompt(localNarrative, kpis));
    } finally {
      setLoadingAI(false);
    }
  }

  const TrendIcon = kpis.trend > 0 ? TrendingUp : kpis.trend < 0 ? TrendingDown : Minus;
  const trendColor = kpis.trend > 0 ? "text-green-500" : kpis.trend < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <div className="text-sm font-medium">IA de Performance</div>
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        </div>
        <div className="flex items-center gap-2">
          {showAnalysis && (
            <Button
              onClick={() => setShowAnalysis(false)}
              variant="ghost"
              size="sm"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={runAI}
            variant="outline"
            size="sm"
            disabled={loadingAI}
          >
            <Brain className="h-4 w-4 mr-2" />
            {loadingAI ? "Analisando..." : "Analisar"}
          </Button>
        </div>
      </div>

      {showAnalysis && (
        <>
          <div className="rounded-md bg-muted/50 p-3">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono">
              {aiText ?? localNarrative}
            </pre>
          </div>

          <div className="space-y-2 text-sm">
            <div className="font-medium">💡 Insights:</div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {kpis.trend < -1 && (
                <li>⚠️ Tendência de queda detectada - reforçar ações de captação</li>
              )}
              {kpis.avgPerDay < 5 && (
                <li>📉 Média diária abaixo do ideal - considerar aumentar meta</li>
              )}
              {kpis.confirmRate < 0.7 && (
                <li>✅ Taxa de confirmados {(kpis.confirmRate * 100).toFixed(1)}% pode melhorar - reforçar qualificação (meta: 70%+)</li>
              )}
              {kpis.confirmRate >= 0.7 && kpis.confirmRate < 0.85 && (
                <li>👍 Boa taxa de confirmados {(kpis.confirmRate * 100).toFixed(1)}% - continue assim!</li>
              )}
              {kpis.confirmRate >= 0.85 && (
                <li>🌟 Excelente taxa de confirmados {(kpis.confirmRate * 100).toFixed(1)}% - parabéns!</li>
              )}
              {kpis.fotoRate < 0.8 && (
                <li>📷 Taxa de fotos {(kpis.fotoRate * 100).toFixed(1)}% - aumentar para melhor conversão (meta: 80%+)</li>
              )}
              {kpis.fotoRate >= 0.8 && kpis.fotoRate < 0.95 && (
                <li>📸 Boa taxa de fotos {(kpis.fotoRate * 100).toFixed(1)}% - mantenha o padrão!</li>
              )}
              {kpis.fotoRate >= 0.95 && (
                <li>📷✨ Excelente taxa de fotos {(kpis.fotoRate * 100).toFixed(1)}% - qualidade superior!</li>
              )}
              {kpis.best && (
                <li>🎯 Replicar práticas do dia pico ({kpis.best.date.slice(8, 10)}/{kpis.best.date.slice(5, 7)})</li>
              )}
              {/* Time-based insights */}
              {getTimeInsights(kpis.timeMetrics, kpis.dailyTimeMetrics).map((insight, idx) => (
                <li key={`time-${idx}`}>{insight}</li>
              ))}
              {kpis.topScouters.length > 0 && (
                <li>👥 Focar nos top scouters: {kpis.topScouters.slice(0, 2).map(([n]) => n).join(", ")}</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

interface KPIData {
  total: number;
  valorTotal: number;
  confirmRate: number;
  fotoRate: number;
  confirmados: number;
  comFoto: number;
  avgPerDay: number;
  best: { date: string; count: number } | null;
  worst: { date: string; count: number } | null;
  trend: number;
  topProjetos: [string, number][];
  topScouters: [string, number][];
  daily: { date: string; count: number }[];
  timeMetrics: {
    avgIntervalMinutes: number;
    workStartTime: string | null;
    workEndTime: string | null;
    totalWorkHours: number;
    leadsPerHour: number;
  };
  dailyTimeMetrics: {
    date: string;
    startTime: string;
    endTime: string;
    workHours: number;
    leadsCount: number;
    avgIntervalMinutes: number;
  }[];
}

function buildPrompt(narrative: string, kpis: KPIData): string {
  const suggestions = [
    "🤖 Análise de Performance",
    "",
    narrative,
    "",
    "💡 Ações Sugeridas:",
  ];

  // Add suggestions based on confirmation rate
  if (kpis.confirmRate < 0.7) {
    suggestions.push("• Melhorar qualificação das leads para aumentar taxa de confirmados");
  }

  // Add suggestions based on photo rate
  if (kpis.fotoRate < 0.8) {
    suggestions.push("• Reforçar importância do envio de fotos nas leads");
  }

  // Add time-based suggestions
  if (kpis.timeMetrics.avgIntervalMinutes > 30) {
    suggestions.push("• Reduzir intervalo entre leads para aumentar produtividade");
  }

  if (kpis.timeMetrics.totalWorkHours < 4) {
    suggestions.push("• Considerar ampliar jornada diária de trabalho");
  }

  // General suggestions
  suggestions.push(
    "• Reforçar briefing no meio da semana",
    "• Estabelecer meta diária por scouter",
    "• Monitorar dias de baixa performance",
    "• Celebrar e replicar práticas dos dias pico"
  );

  return suggestions.join("\n");
}
