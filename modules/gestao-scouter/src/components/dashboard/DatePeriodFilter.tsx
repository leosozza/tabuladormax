
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DatePeriodFilterProps {
  onPeriodChange: (period: { start?: string; end?: string }) => void;
  selectedPeriod: { start: string; end: string } | null;
}

export const DatePeriodFilter = ({ onPeriodChange, selectedPeriod }: DatePeriodFilterProps) => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isSelectingStart, setIsSelectingStart] = useState(true);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (isSelectingStart) {
      setStartDate(date);
      setEndDate(undefined);
      setIsSelectingStart(false);
    } else {
      setEndDate(date);
      
      if (startDate) {
        const period = {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(date, 'yyyy-MM-dd')
        };
        onPeriodChange(period);
      }
    }
  };

  const clearPeriod = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setIsSelectingStart(true);
    onPeriodChange({});
  };

  const resetSelection = () => {
    setIsSelectingStart(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Filtro por Período
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal min-w-[200px]",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yyyy") : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: startDate ?? undefined, to: endDate ?? undefined }}
                onSelect={(range) => {
                  // atualiza estados progressivamente
                  if (range?.from) setStartDate(range.from);
                  if (range?.to) setEndDate(range.to);

                  // emite sempre que houver alguma mudança útil:
                  const fromIso = range?.from ? format(range.from, "yyyy-MM-dd") : undefined;
                  const toIso   = range?.to   ? format(range.to, "yyyy-MM-dd")   : undefined;
                  onPeriodChange({ start: fromIso, end: toIso });
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!startDate}
                className={cn(
                  "justify-start text-left font-normal min-w-[200px]",
                  (!endDate && startDate) && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yyyy") : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: startDate ?? undefined, to: endDate ?? undefined }}
                onSelect={(range) => {
                  // atualiza estados progressivamente
                  if (range?.from) setStartDate(range.from);
                  if (range?.to) setEndDate(range.to);

                  // emite sempre que houver alguma mudança útil:
                  const fromIso = range?.from ? format(range.from, "yyyy-MM-dd") : undefined;
                  const toIso   = range?.to   ? format(range.to, "yyyy-MM-dd")   : undefined;
                  onPeriodChange({ start: fromIso, end: toIso });
                }}
                disabled={(date) => !startDate || date < startDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {(startDate || endDate) && (
            <Button variant="outline" onClick={clearPeriod}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>

        {selectedPeriod && (
          <div className="mt-4">
            <Badge variant="secondary" className="flex items-center gap-2 w-fit">
              Período: {format(new Date(selectedPeriod.start), 'dd/MM/yyyy')} - {format(new Date(selectedPeriod.end), 'dd/MM/yyyy')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={clearPeriod}
              />
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
