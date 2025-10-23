// @ts-nocheck
// Garantir consistência: usar getValorFichaFromRow(ficha) para cada item.
// Remover qualquer parse antigo de "Valor por Leads".
import { getValorFichaFromRow } from '@/utils/values';
import { formatBRL } from '@/utils/currency';
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, FileText, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FinancialFilterState } from "./FinancialFilters";
import type { Ficha, Project } from "@/repositories/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PDFReportService } from "@/services/pdfReportService";

interface PaymentSummaryProps {
  leadsFiltradas: Lead[];
  filterType: string;
  filterValue: string;
  projetos: Project[];
  selectedPeriod?: { start: string; end: string } | null;
  filters?: FinancialFilterState;
}

export const PaymentSummary = ({
  leadsFiltradas = [],
  filterType,
  filterValue,
  projetos = [],
  selectedPeriod,
  filters
}: PaymentSummaryProps) => {
  const { toast } = useToast();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const leadsAPagar = leadsFiltradas.filter(f => f && f['Ficha paga'] !== 'Sim');
  
  const valorTotalFichasAPagar = leadsAPagar.reduce((total, ficha) => {
    const valor = getValorFichaFromRow(ficha);
    return total + valor;
  }, 0);

  // Calcular ajuda de custo baseado no período e filtros
  const calcularAjudaDeCusto = () => {
    if (!selectedPeriod || !filters?.scouter) return 0;

    // Buscar projeto do scouter para obter valores de ajuda de custo
    const leadsDoScouter = leadsFiltradas.filter(f => f && f['Gestão de Scouter'] === filters.scouter);
    if (fichasDoScouter.length === 0) return 0;

    const projetoScouter = leadsDoScouter[0]['Projetos Cormeciais'];
    const projeto = projetos?.find(p => p && p.nome === projetoScouter);
    
    if (!projeto) return 0;

    const valorDiaria = typeof projeto.valorAjudaCusto === 'number' 
      ? projeto.valorAjudaCusto 
      : parseFloat(String(projeto.valorAjudaCusto || '0'));
    const valorFolgaRemunerada = typeof projeto.valorFolgaRemunerada === 'number'
      ? projeto.valorFolgaRemunerada
      : parseFloat(String(projeto.valorFolgaRemunerada || '0'));

    // Calcular dias trabalhados no período
    const startDate = new Date(selectedPeriod.start);
    const endDate = new Date(selectedPeriod.end);
    const diasTrabalhados = new Set();
    
    leadsDoScouter.forEach(ficha => {
      const dataCriado = ficha.Criado;
      if (dataCriado && typeof dataCriado === 'string' && dataCriado.includes('/')) {
        const [day, month, year] = dataCriado.split('/');
        const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        diasTrabalhados.add(dateKey);
      }
    });

    // Calcular total de dias no período
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const diasNaoTrabalhados = totalDays - diasTrabalhados.size;

    const ajudaCustoTrabalhados = diasTrabalhados.size * valorDiaria;
    const ajudaCustoFolgas = diasNaoTrabalhados * valorFolgaRemunerada;

    return ajudaCustoTrabalhados + ajudaCustoFolgas;
  };

  const valorAjudaCusto = calcularAjudaDeCusto();
  const valorTotalCompleto = valorTotalFichasAPagar + valorAjudaCusto;

  // Função para calcular detalhes por scouter
  const calcularDetalhesPorScouter = (fichas: Lead[]) => {
    const scouterData: Record<string, {
      nome: string;
      quantidadeFichas: number;
      valorFichas: number;
      diasTrabalhados: Set<string>;
      folgaRemunerada: number;
      valorAjudaCusto: number;
    }> = {};

    leads.forEach(ficha => {
      const scouter = ficha['Gestão de Scouter'] || 'Sem Scouter';
      if (!scouterData[scouter]) {
        scouterData[scouter] = {
          nome: scouter,
          quantidadeFichas: 0,
          valorFichas: 0,
          diasTrabalhados: new Set(),
          folgaRemunerada: 0,
          valorAjudaCusto: 0
        };
      }

      scouterData[scouter].quantidadeFichas++;
      scouterData[scouter].valorFichas += getValorFichaFromRow(ficha);

      // Adicionar dia trabalhado
      const dataCriado = ficha.Criado;
      if (dataCriado && typeof dataCriado === 'string' && dataCriado.includes('/')) {
        const [day, month, year] = dataCriado.split('/');
        const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        scouterData[scouter].diasTrabalhados.add(dateKey);
      }
    });

    // Calcular ajuda de custo por scouter
    if (selectedPeriod) {
      Object.keys(scouterData).forEach(scouterNome => {
        const projetoScouter = leads.find(f => f['Gestão de Scouter'] === scouterNome)?.['Projetos Cormeciais'];
        const projeto = projetos?.find(p => p.nome === projetoScouter);
        
        if (projeto) {
          const valorDiaria = typeof projeto.valorAjudaCusto === 'number' 
            ? projeto.valorAjudaCusto 
            : parseFloat(String(projeto.valorAjudaCusto || '0'));
          const valorFolgaRemunerada = typeof projeto.valorFolgaRemunerada === 'number'
            ? projeto.valorFolgaRemunerada
            : parseFloat(String(projeto.valorFolgaRemunerada || '0'));
          
          const startDate = new Date(selectedPeriod.start);
          const endDate = new Date(selectedPeriod.end);
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const diasTrabalhados = scouterData[scouterNome].diasTrabalhados.size;
          const diasNaoTrabalhados = totalDays - diasTrabalhados;
          
          scouterData[scouterNome].folgaRemunerada = diasNaoTrabalhados;
          scouterData[scouterNome].valorAjudaCusto = 
            (diasTrabalhados * valorDiaria) + (diasNaoTrabalhados * valorFolgaRemunerada);
        }
      });
    }

    return Object.values(scouterData).map(scouter => ({
      ...scouter,
      diasTrabalhados: scouter.diasTrabalhados.size
    }));
  };

  const generatePDFReport = async (tipoRelatorio: 'resumo' | 'completo') => {
    setIsGeneratingReport(true);
    
    try {
      const scouterDetails = calcularDetalhesPorScouter(leadsAPagar);
      const valorTotalAjudaCusto = scouterDetails.reduce((total, s) => total + s.valorAjudaCusto, 0);
      
      const reportData = {
        titulo: 'RELATÓRIO DE PAGAMENTO',
        periodo: selectedPeriod ? `${selectedPeriod.start} a ${selectedPeriod.end}` : 'Sem período definido',
        filtro: filterType ? `${filterType}: ${filterValue}` : 'Sem filtro',
        scouter: filters?.scouter || 'Todos',
        projeto: filters?.projeto || 'Todos',
        leads: leadsAPagar.map(ficha => ({
          id: ficha.ID,
          scouter: ficha['Gestão de Scouter'] || 'N/A',
          projeto: ficha['Projetos Cormeciais'] || 'N/A',
        nome: ficha['Primeiro nome'] || 'N/A',
        valor: getValorFichaFromRow(ficha),
        data: ficha.Criado || 'N/A'
        })),
        resumo: {
          totalLeads: leadsAPagar.length,
          valorFichas: valorTotalFichasAPagar,
          valorAjudaCusto: valorTotalAjudaCusto,
          valorTotal: valorTotalFichasAPagar + valorTotalAjudaCusto
        },
        scouterDetails: scouterDetails
      };

      if (tipoRelatorio === 'resumo') {
        PDFReportService.generateResumo(reportData);
      } else {
        PDFReportService.generateCompleto(reportData);
      }

      toast({
        title: `Relatório ${tipoRelatorio} gerado`,
        description: "O PDF foi baixado com sucesso"
      });

    } catch (error) {
      console.error('Erro ao gerar relatório PDF:', error);
      toast({
        title: "Erro na geração do PDF",
        description: "Não foi possível gerar o relatório",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Resumo de Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filterType && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{filterType}: {filterValue}</Badge>
                {selectedPeriod && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {selectedPeriod.start} a {selectedPeriod.end}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="text-muted-foreground">Total de leads:</span>
                  <br />
                  <span className="font-medium">{leadsFiltradas.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fichas a pagar:</span>
                  <br />
                  <span className="font-medium text-orange-600">{leadsAPagar.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor leads a pagar:</span>
                  <br />
                  <span className="font-medium text-orange-600">{formatBRL(valorTotalFichasAPagar)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Selecionadas:</span>
                  <br />
                  <span className="font-medium">0</span>
                </div>
              </div>

              {/* Sempre mostrar informações de ajuda de custo quando houver período e scouter */}
              {selectedPeriod && valorAjudaCusto > 0 && (
                <div className="border-t pt-3">
                  <h4 className="font-medium text-sm mb-2 text-blue-600">Ajuda de Custo</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Valor ajuda de custo:</span>
                      <br />
                      <span className="font-medium text-blue-600">{formatBRL(valorAjudaCusto)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total leads + ajuda:</span>
                      <br />
                      <span className="font-medium text-green-600">{formatBRL(valorTotalCompleto)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Período:</span>
                      <br />
                      <span className="font-medium text-xs">{selectedPeriod.start} a {selectedPeriod.end}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão único para gerar relatórios */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={leadsAPagar.length === 0 || isGeneratingReport}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Gerar Relatório PDF
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => generatePDFReport('resumo')}
                  disabled={isGeneratingReport}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Relatório Resumido
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => generatePDFReport('completo')}
                  disabled={isGeneratingReport}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Relatório Completo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
