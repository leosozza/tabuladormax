// @ts-nocheck

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatBRL } from "@/utils/formatters";
import { CalendarDays, DollarSign, Edit, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import type { Ficha, Project } from "@/repositories/types";

interface CostAllowanceManagerProps {
  leads: Lead[];
  projetos: Project[];
  selectedPeriod: { start: string; end: string } | null;
  filters: { scouter: string | null; projeto: string | null };
}

interface DayInfo {
  date: string;
  hasFichas: boolean;
  leadsCount: number;
  status: 'trabalhou' | 'falta' | 'folga_remunerada';
  valorFolga?: number;
}

export const CostAllowanceManager = ({ 
  leads, 
  projetos, 
  selectedPeriod, 
  filters 
}: CostAllowanceManagerProps) => {
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [dayStatuses, setDayStatuses] = useState<Record<string, DayInfo>>({});
  const [projectSettings, setProjectSettings] = useState<Record<string, {
    valorDiaria: number;
    valorFolgaRemunerada: number;
  }>>({});
  const { toast } = useToast();

  if (!selectedPeriod) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Selecione um período para gerenciar ajuda de custo
          </p>
        </CardContent>
      </Card>
    );
  }

  // Gerar todos os dias do período
  const allDays = eachDayOfInterval({
    start: parseISO(selectedPeriod.start),
    end: parseISO(selectedPeriod.end)
  });

  // Agrupar leads por data e scouter
  const leadsPorDataScouter = leads.reduce((acc, ficha) => {
    const dataCriado = ficha.Criado;
    const scouter = ficha['Gestão de Scouter'] || 'Sem Scouter';
    
    if (!dataCriado) return acc;

    let dateKey;
    if (typeof dataCriado === 'string' && dataCriado.includes('/')) {
      const [day, month, year] = dataCriado.split('/');
      dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else {
      const date = new Date(dataCriado);
      dateKey = format(date, 'yyyy-MM-dd');
    }

    if (!acc[scouter]) acc[scouter] = {};
    if (!acc[scouter][dateKey]) acc[scouter][dateKey] = [];
    acc[scouter][dateKey].push(ficha);
    
    return acc;
  }, {} as Record<string, Record<string, Lead[]>>);

  // Obter scouters únicos considerando os filtros
  const scouters = Array.from(new Set(
    leads
      .map(f => f['Gestão de Scouter'])
      .filter(Boolean)
  )).filter(scouter => !filters.scouter || scouter === filters.scouter);

  // Calcular dados de ajuda de custo por scouter
  const calculateCostAllowance = (scouter: string) => {
    const scouterDays = leadsPorDataScouter[scouter] || {};
    let diasTrabalhados = 0;
    let diasFalta = 0;
    let diasFolgaRemunerada = 0;
    let valorTotalAjudaCusto = 0;

    allDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayInfo = dayStatuses[`${scouter}-${dateKey}`];
      const hasFichas = !!scouterDays[dateKey];

      if (hasFichas) {
        diasTrabalhados++;
        // Valor da diária (se configurado no projeto)
        const projeto = leads.find(f => f['Gestão de Scouter'] === scouter)?.['Projetos Cormeciais'];
        if (projeto && projectSettings[projeto]) {
          valorTotalAjudaCusto += projectSettings[projeto].valorDiaria;
        }
      } else {
        // Dia sem leads - verificar se é falta ou folga remunerada
        const status = dayInfo?.status || 'falta';
        if (status === 'folga_remunerada') {
          diasFolgaRemunerada++;
          const valorFolga = dayInfo?.valorFolga || 0;
          valorTotalAjudaCusto += valorFolga;
        } else {
          diasFalta++;
        }
      }
    });

    return {
      diasTrabalhados,
      diasFalta,
      diasFolgaRemunerada,
      valorTotalAjudaCusto,
      totalDias: allDays.length
    };
  };

  const updateDayStatus = (scouter: string, date: string, status: 'falta' | 'folga_remunerada', valorFolga?: number) => {
    const key = `${scouter}-${date}`;
    setDayStatuses(prev => ({
      ...prev,
      [key]: {
        date,
        hasFichas: false,
        leadsCount: 0,
        status,
        valorFolga
      }
    }));
  };

  const updateProjectSettings = (projeto: string, valorDiaria: number, valorFolgaRemunerada: number) => {
    setProjectSettings(prev => ({
      ...prev,
      [projeto]: {
        valorDiaria,
        valorFolgaRemunerada
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Configuração de Projetos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configuração de Valores por Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Array.from(new Set(fichas.map(f => f['Projetos Cormeciais']).filter(Boolean))).map(projeto => (
              <div key={projeto} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">{projeto}</Label>
                </div>
                <div>
                  <Label className="text-xs">Valor da Diária</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={projectSettings[projeto]?.valorDiaria || ''}
                    onChange={(e) => updateProjectSettings(
                      projeto, 
                      parseFloat(e.target.value) || 0,
                      projectSettings[projeto]?.valorFolgaRemunerada || 0
                    )}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor Folga Remunerada</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={projectSettings[projeto]?.valorFolgaRemunerada || ''}
                    onChange={(e) => updateProjectSettings(
                      projeto,
                      projectSettings[projeto]?.valorDiaria || 0,
                      parseFloat(e.target.value) || 0
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo de Ajuda de Custo por Scouter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ajuda de Custo por Scouter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scouters.map(scouter => {
              const dados = calculateCostAllowance(scouter);
              
              return (
                <div key={scouter} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold">{scouter}</h4>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Dias
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Gerenciar Dias - {scouter}</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Fichas</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Valor Folga</TableHead>
                                <TableHead>Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allDays.map(day => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const scouterDays = leadsPorDataScouter[scouter] || {};
                                const hasFichas = !!scouterDays[dateKey];
                                const leadsCount = scouterDays[dateKey]?.length || 0;
                                const dayInfo = dayStatuses[`${scouter}-${dateKey}`];
                                
                                return (
                                  <TableRow key={dateKey}>
                                    <TableCell>{format(day, 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>
                                      {hasFichas ? (
                                        <Badge variant="default">{fichasCount} leads</Badge>
                                      ) : (
                                        <Badge variant="secondary">Sem leads</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {hasFichas ? (
                                        <Badge variant="default">Trabalhou</Badge>
                                      ) : (
                                        <Select
                                          value={dayInfo?.status || 'falta'}
                                          onValueChange={(value) => updateDayStatus(
                                            scouter, 
                                            dateKey, 
                                            value as 'falta' | 'folga_remunerada',
                                            dayInfo?.valorFolga
                                          )}
                                        >
                                          <SelectTrigger className="w-40">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="falta">Falta</SelectItem>
                                            <SelectItem value="folga_remunerada">Folga Remunerada</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {!hasFichas && dayInfo?.status === 'folga_remunerada' && (
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="w-24"
                                          placeholder="0.00"
                                          value={dayInfo?.valorFolga || ''}
                                          onChange={(e) => updateDayStatus(
                                            scouter,
                                            dateKey,
                                            'folga_remunerada',
                                            parseFloat(e.target.value) || 0
                                          )}
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {!hasFichas && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => updateDayStatus(scouter, dateKey, 'falta')}
                                        >
                                          Reset
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Dias Trabalhados:</span>
                      <br />
                      <span className="font-medium text-green-600">{dados.diasTrabalhados}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Faltas:</span>
                      <br />
                      <span className="font-medium text-red-600">{dados.diasFalta}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Folgas Remuneradas:</span>
                      <br />
                      <span className="font-medium text-blue-600">{dados.diasFolgaRemunerada}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Dias:</span>
                      <br />
                      <span className="font-medium">{dados.totalDias}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ajuda de Custo:</span>
                      <br />
                      <span className="font-medium text-green-600">{formatBRL(dados.valorTotalAjudaCusto)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Opções de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Opções de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">
              Pagar Apenas Leads
            </Button>
            <Button variant="outline">
              Pagar Apenas Ajuda de Custo
            </Button>
            <Button>
              Pagar Leads + Ajuda de Custo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
