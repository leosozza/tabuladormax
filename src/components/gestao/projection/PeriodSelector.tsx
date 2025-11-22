import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PeriodSelectorProps {
  historicalStart: Date | undefined;
  historicalEnd: Date | undefined;
  projectionStart: Date | undefined;
  projectionEnd: Date | undefined;
  onHistoricalStartChange: (date: Date | undefined) => void;
  onHistoricalEndChange: (date: Date | undefined) => void;
  onProjectionStartChange: (date: Date | undefined) => void;
  onProjectionEndChange: (date: Date | undefined) => void;
  onCalculate: () => void;
  isLoading?: boolean;
}

export function PeriodSelector({
  historicalStart,
  historicalEnd,
  projectionStart,
  projectionEnd,
  onHistoricalStartChange,
  onHistoricalEndChange,
  onProjectionStartChange,
  onProjectionEndChange,
  onCalculate,
  isLoading = false,
}: PeriodSelectorProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Período Histórico</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione o período para análise de dados passados
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !historicalStart && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {historicalStart ? format(historicalStart, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={historicalStart}
                  onSelect={onHistoricalStartChange}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !historicalEnd && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {historicalEnd ? format(historicalEnd, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={historicalEnd}
                  onSelect={onHistoricalEndChange}
                  locale={ptBR}
                  disabled={(date) => historicalStart ? date < historicalStart : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Período de Projeção</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione o período futuro para projetar
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !projectionStart && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {projectionStart ? format(projectionStart, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={projectionStart}
                  onSelect={onProjectionStartChange}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !projectionEnd && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {projectionEnd ? format(projectionEnd, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={projectionEnd}
                  onSelect={onProjectionEndChange}
                  locale={ptBR}
                  disabled={(date) => projectionStart ? date < projectionStart : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            className="w-full mt-4" 
            onClick={onCalculate}
            disabled={isLoading || !historicalStart || !historicalEnd || !projectionStart || !projectionEnd}
          >
            {isLoading ? "Calculando..." : "Calcular Projeção"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
