import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailySummary {
  date: string;
  leadCount: number;
  totalValue: number;
  unitValue: number;
}

interface PDFData {
  projectName: string;
  scouterName: string;
  startDate: Date;
  endDate: Date;
  dailySummary: DailySummary[];
  totalLeads: number;
  totalValue: number;
}

export function generatePaymentPDF(data: PDFData) {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE PAGAMENTO - SCOUTERS', 105, 20, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Projeto: ${data.projectName}`, 20, 35);
  doc.text(`Período: ${format(data.startDate, 'dd/MM/yyyy', { locale: ptBR })} a ${format(data.endDate, 'dd/MM/yyyy', { locale: ptBR })}`, 20, 42);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Scouter: ${data.scouterName}`, 20, 52);
  
  // Tabela de detalhamento por dia
  const tableData = data.dailySummary.map(day => [
    format(new Date(day.date), 'dd/MM/yyyy', { locale: ptBR }),
    day.leadCount.toString(),
    `R$ ${day.unitValue.toFixed(2)}`,
    `R$ ${day.totalValue.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: 60,
    head: [['Data', 'Qtd Leads', 'Vlr Unitário', 'Total Dia']],
    body: tableData,
    foot: [[
      'TOTAL',
      data.totalLeads.toString(),
      '',
      `R$ ${data.totalValue.toFixed(2)}`
    ]],
    theme: 'grid',
    headStyles: { 
      fillColor: [66, 139, 202],
      fontSize: 10,
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 11
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });
  
  // Rodapé com assinaturas
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  
  doc.setFontSize(10);
  doc.text('_____________________________', 30, finalY + 30);
  doc.text('Responsável', 50, finalY + 37);
  
  doc.text('_____________________________', 120, finalY + 30);
  doc.text('Financeiro', 145, finalY + 37);
  
  doc.text(`Data: ___/___/______`, 85, finalY + 50);
  
  // Download do PDF
  const fileName = `Pagamento_${data.scouterName.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
  
  return fileName;
}
