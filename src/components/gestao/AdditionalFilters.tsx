import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Filter } from "lucide-react";
import { AdditionalFilter } from "@/types/filters";
import { useGestaoFieldMappings } from "@/hooks/useGestaoFieldMappings";
import { useLeadColumnConfig } from "@/hooks/useLeadColumnConfig";
import { useFieldFilterOptions } from "@/hooks/useFieldFilterOptions";
import { EnumFieldFilter } from "./filters/EnumFieldFilter";
import { BooleanFieldFilter } from "./filters/BooleanFieldFilter";
import { NumberFieldFilter } from "./filters/NumberFieldFilter";
import { DateFieldFilter } from "./filters/DateFieldFilter";
import { FilterValueLabel } from "./filters/FilterValueLabel";
import { FieldTypeIcon } from "./filters/FieldTypeIcon";

interface AdditionalFiltersProps {
  filters: AdditionalFilter[];
  onChange: (filters: AdditionalFilter[]) => void;
}

export function AdditionalFilters({ filters, onChange }: AdditionalFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const [operator, setOperator] = useState<AdditionalFilter['operator']>('eq');
  
  const { data: allFields } = useGestaoFieldMappings();
  const { visibleColumns } = useLeadColumnConfig();
  
  // Buscar configuração do campo selecionado
  const fieldConfig = useFieldFilterOptions(selectedField);

  // Filtrar apenas campos visíveis e que são filtráveis
  const filterableFields = allFields?.filter(field => 
    visibleColumns.includes(field.key) &&
    !['id'].includes(field.key) // Excluir campos que não fazem sentido filtrar
  ) || [];

  const handleAddFilter = () => {
    if (!selectedField || !filterValue) return;

    const field = filterableFields.find(f => f.key === selectedField);
    if (!field) return;

    const newFilter: AdditionalFilter = {
      field: selectedField,
      value: filterValue,
      operator: operator || 'eq'
    };

    onChange([...filters, newFilter]);
    setSelectedField("");
    setFilterValue("");
    setOperator('eq');
  };

  const handleRemoveFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const getFieldLabel = (fieldKey: string) => {
    return filterableFields.find(f => f.key === fieldKey)?.label || fieldKey;
  };

  const getOperatorLabel = (op: AdditionalFilter['operator']) => {
    switch (op) {
      case 'eq': return 'igual a';
      case 'contains': return 'contém';
      case 'gt': return 'maior que';
      case 'lt': return 'menor que';
      case 'gte': return 'maior ou igual';
      case 'lte': return 'menor ou igual';
      default: return 'igual a';
    }
  };

  // Operadores disponíveis baseados no tipo de campo
  const getAvailableOperators = () => {
    if (!fieldConfig) return ['eq', 'contains'];

    switch (fieldConfig.type) {
      case 'boolean':
      case 'enum':
        return ['eq']; // Apenas "Igual a"
      
      case 'number':
      case 'date':
        return ['eq', 'gt', 'lt', 'gte', 'lte'];
      
      default:
        return ['eq', 'contains'];
    }
  };

  // Renderizar input baseado no tipo de campo
  const renderValueInput = () => {
    if (!fieldConfig) {
      return (
        <Input
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          placeholder="Digite o valor"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddFilter();
            }
          }}
        />
      );
    }

    switch (fieldConfig.type) {
      case 'enum':
        return (
          <EnumFieldFilter
            value={filterValue}
            onChange={setFilterValue}
            options={fieldConfig.options || []}
            placeholder={`Selecione ${getFieldLabel(selectedField)}`}
          />
        );
      
      case 'boolean':
        return (
          <BooleanFieldFilter
            value={filterValue}
            onChange={setFilterValue}
          />
        );
      
      case 'number':
        return (
          <NumberFieldFilter
            value={filterValue}
            onChange={setFilterValue}
            placeholder="Digite um número"
          />
        );
      
      case 'date':
        return (
          <DateFieldFilter
            value={filterValue}
            onChange={setFilterValue}
          />
        );
      
      default:
        return (
          <Input
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            placeholder="Digite o valor"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddFilter();
              }
            }}
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Badges dos filtros ativos */}
      {filters.map((filter, index) => (
        <Badge key={index} variant="secondary" className="gap-1 flex items-center">
          <FieldTypeIcon fieldKey={filter.field} />
          <span>
            {getFieldLabel(filter.field)} {getOperatorLabel(filter.operator)} "
            <FilterValueLabel field={filter.field} value={filter.value} />"
          </span>
          <X 
            className="h-3 w-3 cursor-pointer" 
            onClick={() => handleRemoveFilter(index)}
          />
        </Badge>
      ))}

      {/* Botão para abrir dialog de filtros */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 relative">
            <Filter className="h-4 w-4" />
            {filters.length > 0 && (
              <Badge variant="default" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {filters.length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filtros Adicionais</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Filtros ativos */}
            {filters.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Filtros Ativos:</label>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 flex items-center">
                      <FieldTypeIcon fieldKey={filter.field} />
                      <span>
                        {getFieldLabel(filter.field)} {getOperatorLabel(filter.operator)} "
                        <FilterValueLabel field={filter.field} value={filter.value} />"
                      </span>
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveFilter(index)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Adicionar novo filtro */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">Campo</label>
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterableFields.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Operador</label>
                <Select value={operator} onValueChange={(v) => setOperator(v as AdditionalFilter['operator'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableOperators().includes('eq') && <SelectItem value="eq">Igual a</SelectItem>}
                    {getAvailableOperators().includes('contains') && <SelectItem value="contains">Contém</SelectItem>}
                    {getAvailableOperators().includes('gt') && <SelectItem value="gt">Maior que</SelectItem>}
                    {getAvailableOperators().includes('lt') && <SelectItem value="lt">Menor que</SelectItem>}
                    {getAvailableOperators().includes('gte') && <SelectItem value="gte">Maior ou igual</SelectItem>}
                    {getAvailableOperators().includes('lte') && <SelectItem value="lte">Menor ou igual</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Valor</label>
                {renderValueInput()}
              </div>

              <Button 
                onClick={handleAddFilter} 
                disabled={!selectedField || !filterValue}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Filtro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
