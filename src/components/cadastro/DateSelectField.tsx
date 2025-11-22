import React, { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateSelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export const DateSelectField: React.FC<DateSelectFieldProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false
}) => {
  // Parse current value (YYYY-MM-DD)
  const [year, month, day] = value ? value.split('-') : ['', '', ''];
  
  // Temporary state for popover selections
  const [tempDay, setTempDay] = useState(day);
  const [tempMonth, setTempMonth] = useState(month);
  const [tempYear, setTempYear] = useState(year);
  const [open, setOpen] = useState(false);
  
  // Update temp values when value prop changes
  React.useEffect(() => {
    const [y, m, d] = value ? value.split('-') : ['', '', ''];
    setTempDay(d);
    setTempMonth(m);
    setTempYear(y);
  }, [value]);

  // Format display date
  const formatDisplayDate = (d: string, m: string, y: string) => {
    if (!d || !m || !y) return 'Selecione a data';
    const monthName = months.find(mo => mo.value === m)?.label || m;
    return `${d}/${monthName}/${y}`;
  };
  
  // Check if date is complete
  const isDateComplete = tempDay && tempMonth && tempYear;
  
  // Generate options
  const days = useMemo(() => {
    const selectedMonth = parseInt(tempMonth) || 1;
    const selectedYear = parseInt(tempYear) || new Date().getFullYear();
    
    // Days in month logic
    let maxDays = 31;
    if ([4, 6, 9, 11].includes(selectedMonth)) {
      maxDays = 30;
    } else if (selectedMonth === 2) {
      // Leap year check
      const isLeap = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || (selectedYear % 400 === 0);
      maxDays = isLeap ? 29 : 28;
    }
    
    return Array.from({ length: maxDays }, (_, i) => {
      const d = i + 1;
      return { value: String(d).padStart(2, '0'), label: String(d) };
    });
  }, [tempMonth, tempYear]);

  const months = useMemo(() => [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ], []);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => {
      const y = currentYear - i;
      return { value: String(y), label: String(y) };
    });
  }, []);

  const handleDayChange = (newDay: string) => {
    setTempDay(newDay);
  };

  const handleMonthChange = (newMonth: string) => {
    setTempMonth(newMonth);
    
    // Validate day for new month
    const maxDaysInNewMonth = [4, 6, 9, 11].includes(parseInt(newMonth)) ? 30 :
                               parseInt(newMonth) === 2 ? 28 : 31;
    
    if (tempDay && parseInt(tempDay) > maxDaysInNewMonth) {
      setTempDay(String(maxDaysInNewMonth).padStart(2, '0'));
    }
  };

  const handleYearChange = (newYear: string) => {
    setTempYear(newYear);
    
    // Check if February and leap year
    if (tempMonth === '02' && tempDay) {
      const isLeap = (parseInt(newYear) % 4 === 0 && parseInt(newYear) % 100 !== 0) || 
                     (parseInt(newYear) % 400 === 0);
      const maxDays = isLeap ? 29 : 28;
      
      if (parseInt(tempDay) > maxDays) {
        setTempDay(String(maxDays).padStart(2, '0'));
      }
    }
  };
  
  const handleConfirm = () => {
    if (tempDay && tempMonth && tempYear) {
      onChange(`${tempYear}-${tempMonth}-${tempDay}`);
      setOpen(false);
    }
  };
  
  const handleCancel = () => {
    // Restore original values
    const [y, m, d] = value ? value.split('-') : ['', '', ''];
    setTempDay(d);
    setTempMonth(m);
    setTempYear(y);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-medium">
        {label}
        {required && <span className="text-destructive ml-1 text-lg">*</span>}
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full h-12 justify-start text-left font-normal text-base",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {formatDisplayDate(day, month, year)}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Select value={tempDay} onValueChange={handleDayChange}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {days.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={tempMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={tempYear} onValueChange={handleYearChange}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {years.map((y) => (
                    <SelectItem key={y.value} value={y.value}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleConfirm}
                disabled={!isDateComplete}
                className="flex-1"
              >
                Confirmar
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
            
            {!isDateComplete && (
              <p className="text-xs text-muted-foreground text-center">
                Selecione dia, mês e ano
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
