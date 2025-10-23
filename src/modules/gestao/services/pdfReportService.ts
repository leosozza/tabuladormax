
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/utils/formatters';

interface ReportData {
  titulo: string;
  periodo: string;
  filtro: string;
  scouter: string;
  projeto: string;
  fichas: Array<{
    id: string;
    scouter: string;
    projeto: string;
    nome: string;
    valor: number;
    data: string;
  }>;
  resumo: {
    totalLeads: number;
    valorFichas: number;
    valorAjudaCusto: number;
    valorTotal: number;
  };
  scouterDetails?: Array<{
    nome: string;
    quantidadeFichas: number;
    valorFichas: number;
    diasTrabalhados: number;
    folgaRemunerada: number;
    valorAjudaCusto: number;
  }>;
}

export class PDFReportService {
  private static addHeader(doc: jsPDF, titulo: string) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, 20, 30);
    
    // Linha divisória
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
  }

  private static addReportInfo(doc: jsPDF, data: ReportData, startY: number): number {
    let currentY = startY;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const info = [
      `Período: ${data.periodo}`,
      `Filtro: ${data.filtro}`,
      `Scouter: ${data.scouter}`,
      `Projeto: ${data.projeto}`
    ];
    
    info.forEach(line => {
      doc.text(line, 20, currentY);
      currentY += 8;
    });
    
    return currentY + 10;
  }

  private static addResumo(doc: jsPDF, data: ReportData, startY: number): number {
    let currentY = startY;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO:', 20, currentY);
    currentY += 15;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const resumoLines = [
      `• Total de fichas: ${data.resumo.totalLeads.toLocaleString('pt-BR')}`,
      `• Valor das fichas: ${formatCurrency(data.resumo.valorFichas)}`,
      `• Ajuda de Custo: ${formatCurrency(data.resumo.valorAjudaCusto)}`,
    ];
    
    resumoLines.forEach(line => {
      doc.text(line, 25, currentY);
      currentY += 8;
    });
    
    // Valor total destacado
    currentY += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`VALOR TOTAL: ${formatCurrency(data.resumo.valorTotal)}`, 25, currentY);
    
    return currentY + 15;
  }

  private static addScouterTable(doc: jsPDF, data: ReportData, startY: number): number {
    if (!data.scouterDetails || data.scouterDetails.length === 0) {
      return startY;
    }
    
    let currentY = startY;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHAMENTO POR SCOUTER:', 20, currentY);
    currentY += 10;
    
    const tableData = data.scouterDetails.map(scouter => [
      scouter.nome,
      scouter.quantidadeFichas.toString(),
      formatCurrency(scouter.valorFichas),
      scouter.diasTrabalhados.toString(),
      scouter.folgaRemunerada.toString(),
      formatCurrency(scouter.valorAjudaCusto)
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [[
        'Nome do Scouter',
        'Qtd Fichas',
        'Valor Fichas',
        'Dias Trabalhados',
        'Folga Remunerada',
        'Ajuda de Custo'
      ]],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 20, right: 20 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' }
      }
    });
    
    return (doc as any).lastAutoTable.finalY + 15;
  }

  private static addFichasTable(doc: jsPDF, data: ReportData, startY: number): number {
    if (data.fichas.length === 0) {
      return startY;
    }
    
    let currentY = startY;
    
    // Verificar se precisa de nova página
    if (currentY + 40 > doc.internal.pageSize.height - 20) {
      doc.addPage();
      currentY = 30;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHAMENTO DAS FICHAS:', 20, currentY);
    currentY += 10;
    
    const tableData = data.fichas.map(ficha => [
      ficha.id,
      ficha.scouter,
      ficha.nome,
      formatCurrency(ficha.valor),
      ficha.data
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['ID', 'Scouter', 'Nome', 'Valor', 'Data']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: 20, right: 20 },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'center' }
      }
    });
    
    return (doc as any).lastAutoTable.finalY + 10;
  }

  private static addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
        20,
        doc.internal.pageSize.height - 10
      );
    }
  }

  static generateResumo(data: ReportData): void {
    const doc = new jsPDF();
    
    this.addHeader(doc, data.titulo + ' - RESUMO');
    
    let currentY = 45;
    currentY = this.addReportInfo(doc, data, currentY);
    currentY = this.addResumo(doc, data, currentY);
    currentY = this.addScouterTable(doc, data, currentY);
    
    this.addFooter(doc);
    
    const fileName = `relatorio-pagamento-resumo-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  static generateCompleto(data: ReportData): void {
    const doc = new jsPDF();
    
    this.addHeader(doc, data.titulo + ' - COMPLETO');
    
    let currentY = 45;
    currentY = this.addReportInfo(doc, data, currentY);
    currentY = this.addResumo(doc, data, currentY);
    currentY = this.addScouterTable(doc, data, currentY);
    currentY = this.addFichasTable(doc, data, currentY);
    
    this.addFooter(doc);
    
    const fileName = `relatorio-pagamento-completo-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }
}
