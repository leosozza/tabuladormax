import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

export interface OperatorPerformance {
  name: string;
  leads: number;
  agendamentos: number;
  confirmadas: number;
  leadsScouter: number;
  leadsMeta: number;
}

export interface ScouterPerformance {
  name: string;
  agendamentos: number;
  totalLeads: number;
  taxaConversao: number;
}

export interface TabulacaoItem {
  label: string;
  count: number;
  percentage: string;
}

export interface ComparecimentoReportItem {
  name: string;
  scouter: string | null;
  telemarketing: string | null;
}

export interface TelemarketingReportData {
  period: string;
  periodLabel: string;
  date: string;
  totalLeads: number;
  agendamentos: number;
  comparecimentos?: number;
  taxaConversao: number;
  operatorPerformance: OperatorPerformance[];
  scouterPerformance: ScouterPerformance[];
  tabulacaoDistribution: TabulacaoItem[];
  createdBy?: number;
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTelemarketingReportPDF(data: TelemarketingReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE TELEMARKETING', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${data.date}`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Período: ${data.periodLabel}`, pageWidth / 2, 35, { align: 'center' });
  
  // Summary Box
  doc.setDrawColor(100);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 42, pageWidth - 28, 30, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO GERAL', 20, 52);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const col1 = 20;
  const col2 = pageWidth / 2 + 10;
  
  doc.text(`Total de Leads: ${data.totalLeads}`, col1, 62);
  doc.text(`Agendamentos: ${data.agendamentos}`, col2, 62);
  doc.text(`Comparecimentos: ${data.comparecimentos || 0}`, col1, 68);
  doc.text(`Taxa de Conversão: ${data.taxaConversao.toFixed(1)}%`, col2, 68);
  
  // Operator Performance Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PERFORMANCE POR OPERADOR', 14, 85);
  
  const operatorRows = data.operatorPerformance.map((op, idx) => {
    const medal = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '';
    const taxa = op.leads > 0 ? ((op.agendamentos / op.leads) * 100).toFixed(1) : '0.0';
    return [
      `${medal}${op.name}`,
      op.leads.toString(),
      op.agendamentos.toString(),
      (op.leadsScouter || 0).toString(),
      (op.leadsMeta || 0).toString(),
      `${taxa}%`
    ];
  });
  
  autoTable(doc, {
    startY: 90,
    head: [['Operador', 'Leads', 'Agendados', 'Scouter', 'Meta', 'Taxa']],
    body: operatorRows,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
    },
  });
  
  // Tabulacao Distribution Table
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DISTRIBUIÇÃO DE TABULAÇÕES', 14, finalY + 15);
  
  const tabulacaoRows = data.tabulacaoDistribution.map(item => [
    item.label,
    item.count.toString(),
    item.percentage
  ]);
  
  autoTable(doc, {
    startY: finalY + 20,
    head: [['Status', 'Quantidade', '%']],
    body: tabulacaoRows,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
    },
  });
  
  // Top 5 Scouters Section
  if (data.scouterPerformance && data.scouterPerformance.length > 0) {
    const scouterY = (doc as any).lastAutoTable.finalY || 150;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('TOP 5 SCOUTERS (POR AGENDAMENTOS)', 14, scouterY + 15);
    
    const scouterRows = data.scouterPerformance.map((s, idx) => {
      const medal = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '';
      return [
        `${medal}${s.name}`,
        s.agendamentos.toString(),
        s.totalLeads.toString(),
        `${s.taxaConversao.toFixed(1)}%`
      ];
    });
    
    autoTable(doc, {
      startY: scouterY + 20,
      head: [['Scouter', 'Agendamentos', 'Leads', 'Conversão']],
      body: scouterRows,
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
      },
    });
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128);
  doc.text(
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // Save PDF
  const fileName = `relatorio-telemarketing-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}

export async function createShareableReport(data: TelemarketingReportData): Promise<{
  success: boolean;
  shortCode?: string;
  url?: string;
  expiresAt?: string;
  error?: string;
}> {
  try {
    const shortCode = generateShortCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    
    const { error } = await supabase
      .from('telemarketing_reports')
      .insert({
        short_code: shortCode,
        period: data.period,
        report_date: format(new Date(), 'yyyy-MM-dd'),
        created_by: data.createdBy,
        expires_at: expiresAt.toISOString(),
        data: data as any,
      });
    
    if (error) throw error;
    
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/relatorio/${shortCode}`;
    
    return {
      success: true,
      shortCode,
      url,
      expiresAt: format(expiresAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
    };
  } catch (error: any) {
    console.error('Error creating shareable report:', error);
    return {
      success: false,
      error: error.message || 'Erro ao criar link compartilhável',
    };
  }
}

export async function getReportByShortCode(shortCode: string): Promise<{
  success: boolean;
  data?: TelemarketingReportData;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('telemarketing_reports')
      .select('*')
      .eq('short_code', shortCode)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return { success: false, error: 'Relatório não encontrado' };
    }
    
    // Increment access count
    await supabase
      .from('telemarketing_reports' as any)
      .update({ access_count: (data.access_count || 0) + 1 })
      .eq('id', data.id);
    
    return {
      success: true,
      data: data.data as unknown as TelemarketingReportData,
    };
  } catch (error: any) {
    console.error('Error fetching report:', error);
    return {
      success: false,
      error: error.message || 'Erro ao buscar relatório',
    };
  }
}
