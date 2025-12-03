import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ScouterStats {
  scouter: string;
  total_fichas: number;
  confirmadas: number;
  com_foto: number;
  agendadas: number;
  compareceram: number;
}

export interface ScouterReportData {
  projectName: string | null;
  fonteName: string | null;
  startDate: string | null;
  endDate: string | null;
  scouterStats: ScouterStats[];
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function generateScouterReportPDF(data: ScouterReportData) {
  const doc = new jsPDF();
  
  // Calcular totais gerais
  const totals = data.scouterStats.reduce((acc, s) => ({
    total_fichas: acc.total_fichas + s.total_fichas,
    confirmadas: acc.confirmadas + s.confirmadas,
    com_foto: acc.com_foto + s.com_foto,
    agendadas: acc.agendadas + s.agendadas,
    compareceram: acc.compareceram + s.compareceram,
  }), { total_fichas: 0, confirmadas: 0, com_foto: 0, agendadas: 0, compareceram: 0 });

  // ========== CABEÇALHO ==========
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE PRODUÇÃO - SCOUTERS', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let y = 32;
  
  if (data.projectName) {
    doc.text(`Projeto: ${data.projectName}`, 20, y);
    y += 6;
  }
  
  if (data.startDate && data.endDate) {
    doc.text(`Período: ${data.startDate} a ${data.endDate}`, 20, y);
    y += 6;
  } else if (data.startDate) {
    doc.text(`A partir de: ${data.startDate}`, 20, y);
    y += 6;
  } else if (data.endDate) {
    doc.text(`Até: ${data.endDate}`, 20, y);
    y += 6;
  }
  
  if (data.fonteName) {
    doc.text(`Fonte: ${data.fonteName}`, 20, y);
    y += 6;
  }

  // ========== RESUMO GERAL ==========
  y += 4;
  doc.setFillColor(240, 240, 240);
  doc.rect(15, y, 180, 28, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO GERAL', 20, y + 7);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const col1X = 20;
  const col2X = 75;
  const col3X = 130;
  
  doc.text(`Total de Fichas: ${totals.total_fichas.toLocaleString('pt-BR')}`, col1X, y + 14);
  doc.text(`Confirmadas: ${totals.confirmadas.toLocaleString('pt-BR')} (${formatPercent(totals.confirmadas, totals.total_fichas)})`, col2X, y + 14);
  doc.text(`Com Foto: ${totals.com_foto.toLocaleString('pt-BR')} (${formatPercent(totals.com_foto, totals.total_fichas)})`, col3X, y + 14);
  
  doc.text(`Total Scouters: ${data.scouterStats.length}`, col1X, y + 21);
  doc.text(`Agendadas: ${totals.agendadas.toLocaleString('pt-BR')} (${formatPercent(totals.agendadas, totals.total_fichas)})`, col2X, y + 21);
  doc.text(`Compareceram: ${totals.compareceram.toLocaleString('pt-BR')} (${formatPercent(totals.compareceram, totals.total_fichas)})`, col3X, y + 21);

  // ========== TABELA DE SCOUTERS ==========
  const tableStartY = y + 35;
  
  const tableData = data.scouterStats.map(s => [
    s.scouter || 'Sem nome',
    s.total_fichas.toString(),
    `${s.confirmadas} (${formatPercent(s.confirmadas, s.total_fichas)})`,
    `${s.com_foto} (${formatPercent(s.com_foto, s.total_fichas)})`,
    `${s.agendadas} (${formatPercent(s.agendadas, s.total_fichas)})`,
    `${s.compareceram} (${formatPercent(s.compareceram, s.total_fichas)})`
  ]);
  
  autoTable(doc, {
    startY: tableStartY,
    head: [['Scouter', 'Fichas', 'Confirmadas', 'Com Foto', 'Agendadas', 'Compareceram']],
    body: tableData,
    foot: [[
      'TOTAL',
      totals.total_fichas.toString(),
      `${totals.confirmadas} (${formatPercent(totals.confirmadas, totals.total_fichas)})`,
      `${totals.com_foto} (${formatPercent(totals.com_foto, totals.total_fichas)})`,
      `${totals.agendadas} (${formatPercent(totals.agendadas, totals.total_fichas)})`,
      `${totals.compareceram} (${formatPercent(totals.compareceram, totals.total_fichas)})`
    ]],
    theme: 'grid',
    headStyles: { 
      fillColor: [66, 139, 202],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' }
    }
  });

  // ========== RODAPÉ ==========
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, finalY + 15, { align: 'center' });
  
  // Assinaturas
  doc.setFont('helvetica', 'normal');
  doc.text('_____________________________', 35, finalY + 35);
  doc.text('Responsável', 55, finalY + 41);
  
  doc.text('_____________________________', 125, finalY + 35);
  doc.text('Coordenação', 145, finalY + 41);

  // ========== DOWNLOAD ==========
  const fileName = `Relatorio_Scouters_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`;
  doc.save(fileName);
  
  return fileName;
}
