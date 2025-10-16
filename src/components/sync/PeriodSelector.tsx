import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Period } from "@/lib/syncUtils";

interface PeriodSelectorProps {
  value: Period;
  onChange: (value: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">Período:</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="minute">Por Minuto</SelectItem>
          <SelectItem value="hour">Por Hora</SelectItem>
          <SelectItem value="day">Por Dia</SelectItem>
          <SelectItem value="week">Por Semana</SelectItem>
          <SelectItem value="month">Por Mês</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
