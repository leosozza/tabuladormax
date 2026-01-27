// ============================================
// Lead Field Picker - Select date fields from leads
// ============================================

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface LeadFieldPickerProps {
  value?: string;
  onChange: (field: string) => void;
  placeholder?: string;
}

// Date fields available in the leads table
const leadDateFields = [
  { value: 'data_agendamento', label: 'Data do Agendamento', description: 'Data marcada para o agendamento' },
  { value: 'data_criacao_agendamento', label: 'Data Criação Agendamento', description: 'Quando o agendamento foi criado' },
  { value: 'data_retorno_ligacao', label: 'Data Retorno Ligação', description: 'Data para retornar a ligação' },
  { value: 'data_analise', label: 'Data Análise', description: 'Data da análise do lead' },
  { value: 'data_confirmacao_ficha', label: 'Data Confirmação Ficha', description: 'Data de confirmação da ficha' },
  { value: 'data_criacao_ficha', label: 'Data Criação Ficha', description: 'Data de criação da ficha' },
  { value: 'criado', label: 'Data de Criação', description: 'Data de criação do lead' },
];

export function LeadFieldPicker({ value, onChange, placeholder = 'Selecionar campo de data' }: LeadFieldPickerProps) {
  const selectedField = leadDateFields.find(f => f.value === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="text-sm">
        <SelectValue placeholder={placeholder}>
          {selectedField && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="truncate">{selectedField.label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {leadDateFields.map(field => (
          <SelectItem key={field.value} value={field.value}>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">{field.label}</span>
              </div>
              <span className="text-xs text-muted-foreground pl-6">
                {field.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
