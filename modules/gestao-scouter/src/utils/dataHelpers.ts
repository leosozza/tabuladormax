// Helper functions for data normalization

export function toISO(dateString: string): string {
  if (!dateString) return new Date().toISOString();
  
  // If already ISO, return as is
  if (dateString.includes('T') || dateString.includes('Z')) {
    return new Date(dateString).toISOString();
  }
  
  // Parse Brazilian format dd/MM/yyyy or dd/MM/yyyy HH:mm
  const parts = dateString.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '00:00';
  
  const [day, month, year] = datePart.split('/');
  const [hour, minute] = timePart.split(':');
  
  const fullYear = year.length === 2 ? `20${year}` : year;
  
  const date = new Date(
    parseInt(fullYear),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour || '0'),
    parseInt(minute || '0')
  );
  
  return date.toISOString();
}

export function safeNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = String(value);
  // Remove R$, spaces, and convert comma to dot
  const cleanStr = str.replace(/[R$\s]/g, '').replace(',', '.');
  const num = parseFloat(cleanStr);
  
  return isNaN(num) ? 0 : num;
}

export function toBool(value: string): boolean {
  if (!value) return false;
  const normalizedValue = value.toLowerCase().trim();
  return ['sim', 'yes', 'true', '1', 'verdadeiro'].includes(normalizedValue);
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text.toString().trim();
}

/**
 * Converts a date to YYYY-MM-DD format for PostgREST DATE columns
 * Accepts ISO strings, Date objects, or YYYY-MM-DD strings
 */
export function toYMD(date: string | Date | undefined | null): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Check if valid date
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Failed to convert date to YMD:', date, error);
    return '';
  }
}