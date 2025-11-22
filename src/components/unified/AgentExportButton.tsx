import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentExportButtonProps {
  messages: Message[];
}

export function AgentExportButton({ messages }: AgentExportButtonProps) {
  const { toast } = useToast();

  const exportToCSV = () => {
    try {
      const csvContent = [
        ['Timestamp', 'Role', 'Message'],
        ...messages.map(m => [
          m.timestamp.toISOString(),
          m.role === 'user' ? 'Usuário' : 'Agente',
          m.content.replace(/\n/g, ' ')
        ])
      ];

      const csv = csvContent.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `conversa-maxconnect-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: "Exportado com sucesso",
        description: "Conversa exportada em CSV",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar a conversa",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const marginBottom = 20;

      doc.setFontSize(16);
      doc.text('Conversa com Agente MAXconnect', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, yPosition);
      yPosition += 15;

      messages.forEach((msg, index) => {
        if (yPosition > pageHeight - marginBottom) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        const role = msg.role === 'user' ? 'Você' : 'Agente';
        const timestamp = msg.timestamp.toLocaleTimeString('pt-BR');
        doc.text(`${role} (${timestamp}):`, 20, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(msg.content, 170);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - marginBottom) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      });

      doc.save(`conversa-maxconnect-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Exportado com sucesso",
        description: "Conversa exportada em PDF",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar a conversa",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="w-4 h-4 mr-2" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
