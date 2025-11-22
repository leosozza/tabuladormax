import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  // Generate options
  const days = useMemo(() => {
    const selectedMonth = parseInt(month) || 1;
    const selectedYear = parseInt(year) || new Date().getFullYear();
    
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
  }, [month, year]);

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
    if (month && year) {
      onChange(`${year}-${month}-${newDay}`);
    }
  };

  const handleMonthChange = (newMonth: string) => {
    let finalDay = day;
    
    // Validate day for new month
    const maxDaysInNewMonth = [4, 6, 9, 11].includes(parseInt(newMonth)) ? 30 :
                               parseInt(newMonth) === 2 ? 28 : 31;
    
    if (parseInt(day) > maxDaysInNewMonth) {
      finalDay = String(maxDaysInNewMonth).padStart(2, '0');
    }
    
    if (year) {
      onChange(`${year}-${newMonth}-${finalDay || '01'}`);
    }
  };

  const handleYearChange = (newYear: string) => {
    let finalDay = day;
    
    // Check if February and leap year
    if (month === '02') {
      const isLeap = (parseInt(newYear) % 4 === 0 && parseInt(newYear) % 100 !== 0) || 
                     (parseInt(newYear) % 400 === 0);
      const maxDays = isLeap ? 29 : 28;
      
      if (parseInt(day) > maxDays) {
        finalDay = String(maxDays).padStart(2, '0');
      }
    }
    
    if (month) {
      onChange(`${newYear}-${month}-${finalDay || '01'}`);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-medium">
        {label}
        {required && <span className="text-destructive ml-1 text-lg">*</span>}
      </Label>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select value={day} onValueChange={handleDayChange} disabled={disabled}>
          <SelectTrigger id={id} className="h-12 text-base">
            <SelectValue placeholder="Dia" />
          </SelectTrigger>
          <SelectContent className="max-h-[60vh]">
            {days.map((d) => (
              <SelectItem key={d.value} value={d.value} className="text-base py-3">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={month} onValueChange={handleMonthChange} disabled={disabled}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent className="max-h-[60vh]">
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-base py-3">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={handleYearChange} disabled={disabled}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent className="max-h-[60vh]">
            {years.map((y) => (
              <SelectItem key={y.value} value={y.value} className="text-base py-3">
                {y.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
