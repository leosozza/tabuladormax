/**
 * Biblioteca para geração de relatórios do Gestão Scouter
 */

interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  scouterId?: string;
  status?: string;
  area?: string;
}

/**
 * Gera relatório em formato CSV
 */
export async function generateCSVReport(data: any[], filters?: ReportFilter): Promise<string> {
  if (!data || data.length === 0) {
    return "Nenhum dado disponível";
  }

  // Cabeçalhos
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar valores com vírgula ou aspas
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      }).join(",")
    )
  ].join("\n");

  return csvContent;
}

/**
 * Trigger download de arquivo
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/csv") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formata dados de leads para exportação
 */
export function formatLeadsForExport(leads: any[]) {
  return leads.map(lead => ({
    ID: lead.id,
    Nome: lead.name || "",
    Scouter: lead.scouter || "",
    "Local de Abordagem": lead.local_abordagem || "",
    Endereço: lead.address || "",
    Celular: lead.celular || "",
    Status: lead.etapa || "",
    "Ficha Confirmada": lead.ficha_confirmada ? "Sim" : "Não",
    Compareceu: lead.compareceu ? "Sim" : "Não",
    "Valor Ficha": lead.valor_ficha || "",
    "Data Criação": lead.criado ? new Date(lead.criado).toLocaleDateString("pt-BR") : "",
    "Qualidade": lead.qualidade_lead || "Não analisado",
  }));
}

/**
 * Formata dados de scouters para exportação
 */
export function formatScoutersForExport(scouters: any[]) {
  return scouters.map(scouter => ({
    Scouter: scouter.scouter,
    "Total Leads": scouter.total,
    "Fichas Confirmadas": scouter.confirmados,
    Comparecimentos: scouter.compareceram,
    "Taxa de Conversão": `${scouter.taxa_conversao}%`,
  }));
}
