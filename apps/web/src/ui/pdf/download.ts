import type { ReportArgs } from './ReportDocument';

/** Genera el PDF en el navegador y lo descarga. La librería se carga solo aquí. */
export async function downloadReportPdf(args: ReportArgs): Promise<void> {
  const [{ pdf }, { buildReportDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ReportDocument'),
  ]);
  const blob = await pdf(buildReportDocument(args)).toBlob();
  const { lat, lon } = args.report.context.centroid;
  const name = `data-corn_${lat.toFixed(4)},${lon.toFixed(4)}_${args.report.inputs?.season ?? ''}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
