import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check } from "lucide-react";
import { format, startOfMonth, startOfWeek, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type DatePreset = 'today' | 'week' | 'month' | 'exact' | 'range';

export interface DateFilterValue {
  preset: DatePreset;
  startDate: Date;
  endDate: Date;
  label: string;
}

interface MinimalDateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

const presets: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mês' },
  { id: 'exact', label: 'Data Exata' },
  { id: 'range', label: 'Período' },
];

export function getDefaultMonthFilter(): DateFilterValue {
  const now = new Date();
  return {
    preset: 'month',
    startDate: startOfMonth(now),
    endDate: endOfDay(now),
    label: format(now, "MMMM 'de' yyyy", { locale: ptBR }),
  };
}

export function MinimalDateFilter({ value, onChange }: MinimalDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState<'exact' | 'range' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const handlePresetSelect = (preset: DatePreset) => {
    const now = new Date();
    
    if (preset === 'exact') {
      setShowCalendar('exact');
      return;
    }
    
    if (preset === 'range') {
      setShowCalendar('range');
      return;
    }
    
    let startDate: Date;
    let endDate = endOfDay(now);
    let label: string;
    
    switch (preset) {
      case 'today':
        startDate = startOfDay(now);
        label = 'Hoje';
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 0 });
        label = 'Esta Semana';
        break;
      case 'month':
      default:
        startDate = startOfMonth(now);
        label = format(now, "MMMM 'de' yyyy", { locale: ptBR });
        break;
    }
    
    onChange({ preset, startDate, endDate, label });
    setShowCalendar(null);
    setOpen(false);
  };

  const handleExactDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onChange({
        preset: 'exact',
        startDate: startOfDay(date),
        endDate: endOfDay(date),
        label: format(date, "dd 'de' MMMM", { locale: ptBR }),
      });
      setShowCalendar(null);
      setOpen(false);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onChange({
        preset: 'range',
        startDate: startOfDay(range.from),
        endDate: endOfDay(range.to),
        label: `${format(range.from, "dd/MM")} - ${format(range.to, "dd/MM")}`,
      });
      setShowCalendar(null);
      setOpen(false);
    }
  };

  const handleBack = () => {
    setShowCalendar(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title={value.label}
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {showCalendar === null ? (
          <div className="p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">Filtrar por período</p>
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start text-sm font-normal",
                  value.preset === preset.id && "bg-accent"
                )}
                onClick={() => handlePresetSelect(preset.id)}
              >
                {value.preset === preset.id && (
                  <Check className="mr-2 h-3 w-3" />
                )}
                <span className={cn(value.preset !== preset.id && "ml-5")}>
                  {preset.label}
                </span>
              </Button>
            ))}
          </div>
        ) : showCalendar === 'exact' ? (
          <div>
            <div className="p-2 border-b">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ← Voltar
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleExactDateSelect}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
        ) : (
          <div>
            <div className="p-2 border-b">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ← Voltar
              </Button>
            </div>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleRangeSelect}
              numberOfMonths={1}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
