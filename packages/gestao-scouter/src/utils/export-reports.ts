/**
 * Export Reports Utilities
 * Generate PDF and CSV reports from spatial analysis
 */
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';

interface ProjetoSummary {
  projeto: string;
  total: number;
  byScout: Map<string, number>;
}

interface AnalysisSummary {
  total: number;
  byProjeto: ProjetoSummary[];
}

interface ReportMetadata {
  timestamp: string;
  center: { lat: number; lng: number };
  zoom: number;
  bbox: string;
  totalPoints: number;
}

/**
 * Capture map as PNG image
 * @param element - Map container element
 * @returns Base64 PNG data URL
 */
export async function captureMapPNG(element: HTMLElement): Promise<string> {
  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      backgroundColor: null,
      scale: 2,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing map:', error);
    // Return a placeholder if capture fails
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 800;
    fallbackCanvas.height = 600;
    const ctx = fallbackCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#666';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Mapa não disponível', 400, 300);
    }
    return fallbackCanvas.toDataURL('image/png');
  }
}

/**
 * Generate summary HTML for PDF
 */
function generateSummaryHTML(summary: AnalysisSummary, metadata: ReportMetadata): string {
  const projectsHTML = summary.byProjeto.map(proj => {
    const scoutersHTML = Array.from(proj.byScout.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([scouter, count]) => `
        <tr>
          <td style="padding: 4px 8px; border: 1px solid #ddd;">${scouter}</td>
          <td style="padding: 4px 8px; border: 1px solid #ddd; text-align: right;">${count}</td>
        </tr>
      `).join('');

    return `
      <div style="margin-bottom: 16px; page-break-inside: avoid;">
        <h4 style="margin: 8px 0; color: #333;">${proj.projeto} — Total: ${proj.total}</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">Scouter</th>
              <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">Fichas</th>
            </tr>
          </thead>
          <tbody>
            ${scoutersHTML}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
    <div style="font-family: system-ui, sans-serif; padding: 16px;">
      <h3 style="margin-top: 0; color: #333;">Resumo da Área</h3>
      
      <div style="margin-bottom: 16px; padding: 12px; background-color: #f9f9f9; border-radius: 8px;">
        <p style="margin: 4px 0;"><strong>Total de fichas:</strong> ${summary.total}</p>
        <p style="margin: 4px 0;"><strong>Data/hora:</strong> ${metadata.timestamp}</p>
        <p style="margin: 4px 0;"><strong>Centro:</strong> ${metadata.center.lat.toFixed(4)}, ${metadata.center.lng.toFixed(4)}</p>
        <p style="margin: 4px 0;"><strong>Zoom:</strong> ${metadata.zoom}</p>
        <p style="margin: 4px 0;"><strong>BBox:</strong> ${metadata.bbox}</p>
      </div>

      <h4 style="color: #333; margin-bottom: 12px;">Por Projeto:</h4>
      ${projectsHTML}
    </div>
  `;
}

/**
 * Export area report as PDF
 * @param mapElement - Map container element to capture
 * @param summary - Analysis summary
 * @param metadata - Report metadata
 * @param aiHTML - Optional AI analysis HTML
 */
export async function exportAreaReportPDF(
  mapElement: HTMLElement,
  summary: AnalysisSummary,
  metadata: ReportMetadata,
  aiHTML?: string
): Promise<void> {
  try {
    // Capture map screenshot
    const mapPNG = await captureMapPNG(mapElement);

    // Generate summary HTML
    const resumoHTML = generateSummaryHTML(summary, metadata);

    // Create wrapper with all sections
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <section style="page-break-after: always;">
        <h2 style="font-family: system-ui, sans-serif; color: #333; margin-bottom: 16px;">Mapa da Área</h2>
        <img src="${mapPNG}" style="width: 100%; max-width: 100%; border: 1px solid #ddd; border-radius: 8px;" alt="Mapa"/>
      </section>
      <section style="page-break-after: always;">
        ${resumoHTML}
      </section>
      ${aiHTML ? `<section>${aiHTML}</section>` : ''}
    `;

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const filename = `relatorio-area-${timestamp}.pdf`;

    // Generate PDF
    await html2pdf()
      .set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(wrapper)
      .save();

    console.log('✅ PDF report generated:', filename);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new Error('Falha ao gerar relatório PDF');
  }
}

/**
 * Export area summary as CSV
 * @param summary - Analysis summary
 */
export function exportAreaReportCSV(summary: AnalysisSummary): void {
  try {
    const rows: string[] = ['projeto,scouter,count'];

    summary.byProjeto.forEach(proj => {
      proj.byScout.forEach((count, scouter) => {
        // Properly escape CSV values
        const projetoEscaped = JSON.stringify(proj.projeto);
        const scouterEscaped = JSON.stringify(scouter);
        rows.push(`${projetoEscaped},${scouterEscaped},${count}`);
      });
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const filename = `resumo-area-${timestamp}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ CSV report generated:', filename);
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    throw new Error('Falha ao gerar relatório CSV');
  }
}
