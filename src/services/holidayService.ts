import { isWeekend } from 'date-fns';

interface Holiday {
  date: Date;
  name: string;
  type: 'national' | 'state';
}

// Feriados nacionais fixos
const FIXED_HOLIDAYS = [
  { month: 0, day: 1, name: 'Ano Novo' },
  { month: 3, day: 21, name: 'Tiradentes' },
  { month: 4, day: 1, name: 'Dia do Trabalho' },
  { month: 8, day: 7, name: 'Independência do Brasil' },
  { month: 9, day: 12, name: 'Nossa Senhora Aparecida' },
  { month: 10, day: 2, name: 'Finados' },
  { month: 10, day: 15, name: 'Proclamação da República' },
  { month: 11, day: 25, name: 'Natal' },
];

// Função para calcular Páscoa (algoritmo de Meeus)
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month, day);
}

export function getHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  
  // Adicionar feriados fixos
  FIXED_HOLIDAYS.forEach(holiday => {
    holidays.push({
      date: new Date(year, holiday.month, holiday.day),
      name: holiday.name,
      type: 'national',
    });
  });
  
  // Feriados móveis (baseados na Páscoa)
  const easter = calculateEaster(year);
  
  // Carnaval (47 dias antes da Páscoa)
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  holidays.push({
    date: carnival,
    name: 'Carnaval',
    type: 'national',
  });
  
  // Sexta-feira Santa (2 dias antes da Páscoa)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({
    date: goodFriday,
    name: 'Sexta-feira Santa',
    type: 'national',
  });
  
  // Corpus Christi (60 dias após a Páscoa)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.push({
    date: corpusChristi,
    name: 'Corpus Christi',
    type: 'national',
  });
  
  return holidays;
}

export function isHoliday(date: Date, holidays: Holiday[]): boolean {
  return holidays.some(holiday => 
    holiday.date.getDate() === date.getDate() &&
    holiday.date.getMonth() === date.getMonth() &&
    holiday.date.getFullYear() === date.getFullYear()
  );
}

export function isWorkingDay(date: Date, holidays: Holiday[]): boolean {
  return !isWeekend(date) && !isHoliday(date, holidays);
}

export function getWorkingDaysInPeriod(start: Date, end: Date): number {
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  // Buscar feriados dos anos envolvidos
  const holidays: Holiday[] = [];
  for (let year = startYear; year <= endYear; year++) {
    holidays.push(...getHolidays(year));
  }
  
  let workingDays = 0;
  const current = new Date(start);
  
  while (current <= end) {
    if (isWorkingDay(current, holidays)) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}
