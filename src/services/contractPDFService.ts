import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentMethodPDF {
  method: string;
  value: number;
  installments?: number;
  firstDueDate?: string;
  dueDates?: string[];
}

interface ContractPDFData {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  productName?: string;
  baseValue: number;
  discountPercentage: number;
  discountValue: number;
  totalValue: number;
  paymentMethods: PaymentMethodPDF[];
  notes?: string;
  producerName?: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
};

export function generateContractPDF(data: ContractPDFData): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(26, 32, 44); // dark header
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE SERVIÇOS', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageWidth / 2, 32, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let yPos = 55;
  
  // Client Info Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${data.clientName}`, 20, yPos);
  yPos += 6;
  
  if (data.clientPhone) {
    doc.text(`Telefone: ${data.clientPhone}`, 20, yPos);
    yPos += 6;
  }
  
  if (data.clientEmail) {
    doc.text(`E-mail: ${data.clientEmail}`, 20, yPos);
    yPos += 6;
  }
  
  yPos += 10;
  
  // Product/Service Section
  if (data.productName) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVIÇO CONTRATADO', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(data.productName, 20, yPos);
    yPos += 12;
  }
  
  // Values Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('VALORES', 20, yPos);
  yPos += 8;
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Valor Base: ${formatCurrency(data.baseValue)}`, 20, yPos);
  yPos += 6;
  
  if (data.discountPercentage > 0) {
    doc.text(`Desconto: ${data.discountPercentage}% (${formatCurrency(data.discountValue)})`, 20, yPos);
    yPos += 6;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`VALOR TOTAL: ${formatCurrency(data.totalValue)}`, 20, yPos);
  yPos += 15;
  
  // Payment Receipt Section
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 32, 44);
  doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, yPos + 3, { align: 'center' });
  yPos += 15;
  
  doc.setTextColor(0, 0, 0);
  
  // Payment Methods Table
  const tableBody = data.paymentMethods.map((pm) => {
    const method = PAYMENT_METHOD_LABELS[pm.method] || pm.method;
    const value = formatCurrency(pm.value);
    
    let details = '-';
    if (pm.method === 'cartao_credito' && pm.installments) {
      const installmentValue = pm.value / pm.installments;
      details = `${pm.installments}x de ${formatCurrency(installmentValue)}`;
    } else if (pm.method === 'boleto' && pm.dueDates && pm.dueDates.length > 0) {
      details = pm.dueDates.map(d => format(new Date(d), 'dd/MM/yyyy')).join(', ');
    }
    
    return [method, value, details];
  });
  
  // Add total row
  const totalPayments = data.paymentMethods.reduce((sum, pm) => sum + pm.value, 0);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Método', 'Valor', 'Detalhes/Vencimentos']],
    body: tableBody,
    foot: [['TOTAL', formatCurrency(totalPayments), '']],
    theme: 'grid',
    headStyles: {
      fillColor: [66, 139, 202],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [200, 230, 200],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 11
    },
    styles: {
      fontSize: 9,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 20, right: 20 }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Notes Section
  if (data.notes) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 40);
    doc.text(splitNotes, 20, yPos);
    yPos += splitNotes.length * 5 + 10;
  }
  
  // Signatures Section
  yPos = Math.max(yPos + 10, 220);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.line(20, yPos + 20, 85, yPos + 20);
  doc.text('Cliente', 52, yPos + 27, { align: 'center' });
  doc.text(data.clientName, 52, yPos + 33, { align: 'center' });
  
  doc.line(125, yPos + 20, 190, yPos + 20);
  doc.text('Produtor', 157, yPos + 27, { align: 'center' });
  if (data.producerName) {
    doc.text(data.producerName, 157, yPos + 33, { align: 'center' });
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth / 2, 285, { align: 'center' });
  
  // Save
  const fileName = `Contrato_${data.clientName.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
  
  return fileName;
}
