import type { ReportArgs } from './ReportDocument';

// One shared load: the warm-up and the real click use the same dynamic imports.
let modules: Promise<[typeof import('@react-pdf/renderer'), typeof import('./ReportDocument')]> | null = null;
const loadPdfModules = () => {
  modules ??= Promise.all([import('@react-pdf/renderer'), import('./ReportDocument')]);
  return modules;
};

/**
 * Starts loading the PDF library when the person is about to press the button (hover, focus,
 * touch), so the click feels instant. Never called at page load. A failure is only logged and
 * forgotten: the real click retries the load and reports its own error.
 */
export function warmPdf(): void {
  if (modules) return;
  loadPdfModules().catch((e) => {
    modules = null;
    console.warn('PDF warm-up failed; it will load on click', e);
  });
}

/** A built PDF: its blob URL stays valid until the next PDF replaces it. */
export interface PdfFile {
  url: string;
  name: string;
}

// Only the last PDF is kept, so the "open it here" link keeps working. Revoking it a few seconds
// after the click can break the download in iPhone Safari, which may read the file only after
// the person confirms its download prompt.
let lastUrl: string | null = null;

/** Genera el PDF en el navegador y lo descarga. La librería se carga solo aquí. */
export async function downloadReportPdf(args: ReportArgs): Promise<PdfFile> {
  const [{ pdf }, { buildReportDocument }] = await loadPdfModules().catch((e) => {
    modules = null;
    throw e;
  });
  const blob = await pdf(buildReportDocument(args)).toBlob();
  const { lat, lon } = args.report.context.centroid;
  const name = `data-corn_${lat.toFixed(4)},${lon.toFixed(4)}_${args.report.inputs?.season ?? ''}.pdf`;
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  const url = URL.createObjectURL(blob);
  lastUrl = url;
  // Desktop and Android browsers save the file right away. iPhone Safari and the browsers inside
  // apps may ignore this click, because it comes after the PDF was built and not from the tap
  // itself; the panel then shows a link to tap.
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return { url, name };
}
