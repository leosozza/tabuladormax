/**
 * Biblioteca para geração de relatórios do Gestão Scouter
 */
import * as XLSX from 'xlsx';

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
 * Gera relatório em formato XLSX (Excel)
 */
export async function generateXLSXReport(data: any[], sheetName: string = "Leads"): Promise<Blob> {
  if (!data || data.length === 0) {
    throw new Error("Nenhum dado disponível para exportação");
  }

  // Criar worksheet a partir dos dados
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Ajustar largura das colunas automaticamente
  const maxWidths = Object.keys(data[0]).map(key => ({
    wch: Math.max(
      key.length + 2,
      ...data.map(row => String(row[key] || '').length).slice(0, 100)
    )
  }));
  worksheet['!cols'] = maxWidths;

  // Criar workbook e adicionar worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Gerar buffer e converter para Blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
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
 * Download de Blob (para arquivos binários como XLSX)
 */
export function downloadBlob(blob: Blob, filename: string) {
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
    "Telefone Casa": lead.telefone_casa || "",
    "Telefone Trabalho": lead.telefone_trabalho || "",
    "Telefone Normalizado": lead.phone_normalized || "",
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
