import * as XLSX from 'xlsx';

/**
 * Export ApexCharts data to CSV format
 */
export function exportApexChartToCSV(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export ApexCharts data to Excel format
 */
export function exportApexChartToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export ApexCharts data to JSON format
 */
export function exportApexChartToJSON(data: any[], filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Download ApexChart as PNG (requires ApexCharts instance)
 */
export async function exportApexChartToPNG(chartId: string, filename: string) {
  // @ts-ignore - ApexCharts global instance
  if (window.ApexCharts) {
    // @ts-ignore
    const chart = window.ApexCharts.getChartByID(chartId);
    if (chart) {
      const dataURI = await chart.dataURI();
      const link = document.createElement('a');
      link.href = dataURI.imgURI;
      link.download = `${filename}.png`;
      link.click();
    }
  }
}
