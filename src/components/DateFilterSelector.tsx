import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateFilter, DateFilterPreset } from "@/types/filters";
import { createDateFilter, formatDateForDisplay } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface DateFilterSelectorProps {
  value: DateFilter;
  onChange: (filter: DateFilter) => void;
}

export function DateFilterSelector({ value, onChange }: DateFilterSelectorProps) {
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(value.startDate);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(value.endDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePresetChange = (preset: DateFilterPreset) => {
    if (preset !== 'custom') {
      const newFilter = createDateFilter(preset);
      onChange(newFilter);
    } else {
      onChange({ ...value, preset });
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      
      onChange(createDateFilter('custom', startDate, endDate));
      setIsCalendarOpen(false);
    }
  };

  const getDisplayText = () => {
    if (value.preset === 'custom') {
      return `${formatDateForDisplay(value.startDate)} - ${formatDateForDisplay(value.endDate)}`;
    }
    
    switch (value.preset) {
      case 'all':
        return 'Todo Período';
      case 'today':
        return 'Hoje';
      case 'week':
        return 'Esta Semana';
      case 'month':
        return 'Este Mês';
      default:
        return 'Selecione';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value.preset} onValueChange={(v) => handlePresetChange(v as DateFilterPreset)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo Período</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="week">Esta Semana</SelectItem>
          <SelectItem value="month">Este Mês</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {value.preset === 'custom' && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !customStartDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getDisplayText()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  initialFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Final</label>
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  disabled={(date) => customStartDate ? date < customStartDate : false}
                />
              </div>
              <Button 
                onClick={handleCustomDateApply} 
                disabled={!customStartDate || !customEndDate}
                className="w-full"
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}