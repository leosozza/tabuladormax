import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BooleanFieldFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function BooleanFieldFilter({ value, onChange }: BooleanFieldFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">Sim</SelectItem>
        <SelectItem value="false">Não</SelectItem>
      </SelectContent>
    </Select>
  );
}
