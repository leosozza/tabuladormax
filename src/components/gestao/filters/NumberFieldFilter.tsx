import { Input } from "@/components/ui/input";

interface NumberFieldFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function NumberFieldFilter({ value, onChange, placeholder }: NumberFieldFilterProps) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Digite um número"}
    />
  );
}
