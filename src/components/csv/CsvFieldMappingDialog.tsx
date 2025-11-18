import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, ArrowRight, Check, Save, Sparkles, Trash2 } from 'lucide-react';
import { useCsvFieldMappings } from '@/hooks/useCsvFieldMappings';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CsvFieldMappingDialogProps {
  csvHeaders: string[];
  leadsColumns: Array<{ column_name: string; data_type: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (mappingName: string) => void;
}

interface MappingRow {
  csv_column: string;
  leads_column: string;
  transform_function: string;
  priority: number;
}

const TRANSFORM_OPTIONS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'parseBoolean', label: 'Boolean (true/false)' },
  { value: 'parseNumeric', label: 'Número' },
  { value: 'parseBrazilianDate', label: 'Data (DD/MM/YYYY)' },
  { value: 'parseTimestamp', label: 'Timestamp ISO' }
];

export function CsvFieldMappingDialog({
  csvHeaders,
  leadsColumns,
  open,
  onOpenChange,
  onSave
}: CsvFieldMappingDialogProps) {
  const { mappingNames, saveMappings, deleteMappings } = useCsvFieldMappings();
  const [mappingName, setMappingName] = useState('');
  const [selectedMappingToLoad, setSelectedMappingToLoad] = useState('');
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);

  // Inicializar com sugestões automáticas baseadas em nomes similares
  useEffect(() => {
    if (csvHeaders.length > 0 && mappingRows.length === 0) {
      const autoMappings = csvHeaders.map((header, index) => {
        // Buscar coluna do leads com nome similar
        const normalizedHeader = header.toLowerCase().replace(/[_\s]/g, '');
        const matchingColumn = leadsColumns.find(col => {
          const normalizedCol = col.column_name.toLowerCase().replace(/[_\s]/g, '');
          return normalizedCol.includes(normalizedHeader) || normalizedHeader.includes(normalizedCol);
        });

        return {
          csv_column: header,
          leads_column: matchingColumn?.column_name || '',
          transform_function: 'none',
          priority: index
        };
      });

      setMappingRows(autoMappings);
    }
  }, [csvHeaders, leadsColumns, mappingRows.length]);

  // Carregar mapeamento existente
  const handleLoadMapping = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('csv_field_mappings')
        .select('*')
        .eq('mapping_name', name)
        .eq('active', true)
        .order('priority');

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMappings = data.map(m => ({
          csv_column: m.csv_column,
          leads_column: m.leads_column,
          transform_function: m.transform_function || 'none',
          priority: m.priority
        }));
        setMappingRows(loadedMappings);
        setMappingName(name);
        toast.success(`Mapeamento "${name}" carregado!`);
      }
    } catch (error) {
      toast.error('Erro ao carregar mapeamento');
    }
  };

  const handleSave = async () => {
    if (!mappingName.trim()) {
      toast.error('Digite um nome para o mapeamento');
      return;
    }

    const validMappings = mappingRows.filter(row => row.csv_column && row.leads_column);

    if (validMappings.length === 0) {
      toast.error('Configure pelo menos um mapeamento válido');
      return;
    }

    try {
      await saveMappings.mutateAsync({
        mappingName: mappingName.trim(),
        mappings: validMappings
      });

      onSave(mappingName.trim());
      onOpenChange(false);
    } catch (error) {
      // Erro já tratado no mutation
    }
  };

  const handleDeleteMapping = async (name: string) => {
    if (confirm(`Deseja excluir o mapeamento "${name}"?`)) {
      await deleteMappings.mutateAsync(name);
      if (mappingName === name) {
        setMappingName('');
      }
    }
  };

  const addMappingRow = () => {
    setMappingRows([
      ...mappingRows,
      {
        csv_column: '',
        leads_column: '',
        transform_function: 'none',
        priority: mappingRows.length
      }
    ]);
  };

  const removeMappingRow = (index: number) => {
    setMappingRows(mappingRows.filter((_, i) => i !== index));
  };

  const updateMappingRow = (index: number, field: keyof MappingRow, value: string | number) => {
    const updated = [...mappingRows];
    updated[index] = { ...updated[index], [field]: value };
    setMappingRows(updated);
  };

  const validMappingsCount = mappingRows.filter(r => r.csv_column && r.leads_column).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configurar Mapeamento de Campos CSV
          </DialogTitle>
          <DialogDescription>
            Configure como os campos do CSV serão mapeados para a tabela de leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Controles de Mapeamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mapping-name">Nome do Mapeamento</Label>
              <Input
                id="mapping-name"
                placeholder="Ex: Mapeamento Padrão"
                value={mappingName}
                onChange={(e) => setMappingName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="load-mapping">Carregar Mapeamento Existente</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedMappingToLoad}
                  onValueChange={(value) => {
                    setSelectedMappingToLoad(value);
                    handleLoadMapping(value);
                  }}
                >
                  <SelectTrigger id="load-mapping">
                    <SelectValue placeholder="Selecione um mapeamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {mappingNames?.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMappingToLoad && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteMapping(selectedMappingToLoad)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Preview de Mapeamentos */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {validMappingsCount} de {csvHeaders.length} campos mapeados
              </span>
              <Button variant="ghost" size="sm" onClick={addMappingRow}>
                Adicionar Campo
              </Button>
            </AlertDescription>
          </Alert>

          {/* Tabela de Mapeamentos */}
          <ScrollArea className="flex-1 h-[400px] border rounded-lg">
            <div className="p-4 space-y-2">
              {mappingRows.map((row, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      {/* Campo CSV */}
                      <div className="col-span-4">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Campo CSV
                        </Label>
                        <Select
                          value={row.csv_column}
                          onValueChange={(value) => updateMappingRow(index, 'csv_column', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {csvHeaders.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Campo Leads */}
                      <div className="col-span-4">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Campo Leads
                        </Label>
                        <Select
                          value={row.leads_column}
                          onValueChange={(value) => updateMappingRow(index, 'leads_column', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {leadsColumns.map((col) => (
                              <SelectItem key={col.column_name} value={col.column_name}>
                                {col.column_name}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {col.data_type}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Transformação */}
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Transformação
                        </Label>
                        <Select
                          value={row.transform_function}
                          onValueChange={(value) => updateMappingRow(index, 'transform_function', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSFORM_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ações */}
                      <div className="col-span-1 flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMappingRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saveMappings.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Mapeamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
