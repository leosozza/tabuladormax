import { useFieldFilterOptions } from "@/hooks/useFieldFilterOptions";

interface FilterValueLabelProps {
  field: string;
  value: string;
}

export function FilterValueLabel({ field, value }: FilterValueLabelProps) {
  const config = useFieldFilterOptions(field);
  
  if (config?.type === 'enum' && config.options) {
    const option = config.options.find(o => o.value === value);
    return <>{option?.label || value}</>;
  }
  
  if (config?.type === 'boolean') {
    return <>{value === 'true' ? 'Sim' : 'Não'}</>;
  }
  
  return <>{value}</>;
}
