
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateModal = ({ isOpen, onClose }: TemplateModalProps) => {
  const { toast } = useToast();

  if (!isOpen) return null;

  const templateFichas = [
    {
      ID: '1',
      'Projetos Cormeciais': 'SELETIVA EXEMPLO',
      'Gestão de Scouter': 'Nome do Scouter',
      Criado: '01/08/2025',
      'Data de criação da Ficha': '01/08/2025 10:00',
      'Valor por Leads': 'R$ 6,00'
    }
  ];

  const templateProjetos = [
    {
      'agencia e seletiva': 'SELETIVA EXEMPLO',
      'Meta de leads': '3000',
      'Inicio Captação leads': '01/08/2025',
      'Termino Captação leads': '31/08/2025',
      'Meta Individual': '1000'
    }
  ];

  const downloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Aba Leads
      const wsFichas = XLSX.utils.json_to_sheet(templateFichas);
      XLSX.utils.book_append_sheet(wb, wsFichas, "Fichas");
      
      // Aba Projetos
      const wsProjetos = XLSX.utils.json_to_sheet(templateProjetos);
      XLSX.utils.book_append_sheet(wb, wsProjetos, "Projetos");
      
      // Download
      XLSX.writeFile(wb, "Modelo_MaxFama_Dashboard.xlsx");
      
      toast({
        title: "Template baixado",
        description: "O arquivo modelo foi baixado com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o template",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-6xl max-h-[90vh] overflow-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Modelo de Planilha MaxFama
            </CardTitle>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Use este modelo para estruturar suas planilhas corretamente
              </p>
              <Button onClick={downloadTemplate} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Baixar Template Excel
              </Button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Aba: Leads</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(templateFichas[0]).map((header) => (
                          <TableHead key={header} className="bg-primary text-primary-foreground">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templateFichas.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex} className="font-mono text-xs">
                              {value}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Aba: Projetos</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(templateProjetos[0]).map((header) => (
                          <TableHead key={header} className="bg-primary text-primary-foreground">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templateProjetos.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex} className="font-mono text-xs">
                              {value}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Instruções importantes:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li><strong>Não altere os nomes das colunas</strong> - elas devem permanecer exatamente como mostrado</li>
                <li><strong>Formato de datas:</strong> Use DD/MM/AAAA (exemplo: 01/08/2025)</li>
                <li><strong>Formato de valores:</strong> Use R$ X,XX (exemplo: R$ 6,00)</li>
                <li><strong>Projetos:</strong> Use nomes consistentes entre as abas Leads e Projetos</li>
                <li><strong>Meta de leads:</strong> Use apenas números (exemplo: 3000)</li>
                <li><strong>Para Google Sheets:</strong> Publique a planilha (Arquivo → Compartilhar → Publicar na web)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
