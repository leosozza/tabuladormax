import { DateFilter, DateFilterPreset } from '@/types/filters';

export function getDateRangeForPreset(preset: DateFilterPreset): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(now);
  
  switch (preset) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      // Start of the current week (Sunday)
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      // Start of the current month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'all':
      // Set to a very early date to capture all leads (Jan 1, 1900)
      startDate.setFullYear(1900, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      // For custom, return today's range as default
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
}

export function createDateFilter(preset: DateFilterPreset, customStart?: Date, customEnd?: Date): DateFilter {
  if (preset === 'custom' && customStart && customEnd) {
    return {
      preset,
      startDate: customStart,
      endDate: customEnd
    };
  }
  
  const { startDate, endDate } = getDateRangeForPreset(preset);
  return {
    preset,
    startDate,
    endDate
  };
}

export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
