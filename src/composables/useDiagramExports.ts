import { ref, type Ref } from 'vue';
import brandLogoSvg from '../assets/brand/bacnet-studio.svg?raw';
import brandLogoWhiteSvg from '../assets/brand/bacnet-studio-white.svg?raw';
import { createBbmdReport } from '../lib/bbmd-report';
import { appendBbmdReportPages } from '../lib/export-bbmd-pdf';
import { appendPhysicalSchedulePages } from '../lib/export-physical-pdf';
import {
  PDF_LIGHT_STYLES,
  SUBNET_ACCENT_EXPORT_STYLES,
  SVG_BACNET_RELATIONSHIP_STYLES,
  SVG_CONNECTION_STYLES,
  SVG_EXPORT_STYLES,
  SVG_PHYSICAL_STYLES,
  SVG_SC_LINK_STYLES
} from '../lib/diagram-svg-styles';
import type { DiagramProject } from '../lib/network-diagram';
import { migrateDiagramProject, toLegacyDiagramProject } from '../lib/schema-migrations';

const TOOL_URL = 'https://ace-iot-solutions.github.io/bacnet-planning-studio/';

interface SvgHandle {
  svg: SVGSVGElement | null;
}

interface DiagramExportOptions {
  project: Ref<DiagramProject>;
  logicalDiagram: Ref<SvgHandle | null>;
  physicalDiagram: Ref<SvgHandle | null>;
  canvasWidth: Ref<number>;
  canvasHeight: Ref<number>;
}

interface DialogHandle {
  open: () => void;
  close: () => void;
}

export function useDiagramExports(options: DiagramExportOptions) {
  const { project, logicalDiagram, physicalDiagram, canvasWidth, canvasHeight } = options;
  const fileInput = ref<HTMLInputElement | null>(null);
  const pdfExportDialog = ref<DialogHandle | null>(null);
  const isExportingPdf = ref(false);
  const pdfTheme = ref<'dark' | 'light'>('light');
  const includeBbmdTablesInPdf = ref(false);
  const includeCableScheduleInPdf = ref(false);
  const includeSerialTablesInPdf = ref(false);

  function diagramFilename() {
    return (project.value.title || 'network-diagram').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'network-diagram';
  }

  function download(content: BlobPart, type: string, extension: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${diagramFilename()}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveJson() {
    download(JSON.stringify(project.value, null, 2), 'application/json', 'json');
  }

  function saveLegacyJson() {
    download(JSON.stringify(toLegacyDiagramProject(project.value), null, 2), 'application/json', 'v1.json');
  }

  async function saveXlsx() {
    const { exportDiagramXlsx } = await import('../lib/export-diagram-xlsx');
    await exportDiagramXlsx(project.value);
  }

  function serializedDiagramSvg(theme: 'dark' | 'light' = 'dark', branded = false) {
    const source = project.value.viewMode === 'physical' ? physicalDiagram.value?.svg : logicalDiagram.value?.svg;
    if (!source) return;
    const clone = source.cloneNode(true) as SVGSVGElement;
    const originalIcons = source.querySelectorAll<SVGElement>('.ace-node-icon');
    clone.querySelectorAll<SVGElement>('.ace-node-icon').forEach((icon, index) => {
      icon.setAttribute('fill', getComputedStyle(originalIcons[index]).color || '#c1d301');
    });
    if (project.value.viewMode !== 'physical') {
      clone.setAttribute('width', String(canvasWidth.value));
      clone.setAttribute('height', String(canvasHeight.value));
    }
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `${SVG_EXPORT_STYLES}${SVG_SC_LINK_STYLES}${SVG_BACNET_RELATIONSHIP_STYLES}${SVG_CONNECTION_STYLES}${SVG_PHYSICAL_STYLES}${theme === 'light' ? PDF_LIGHT_STYLES : ''}${SUBNET_ACCENT_EXPORT_STYLES}`;
    clone.prepend(style);
    if (branded) {
      const logo = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      const logoSource = theme === 'light' ? brandLogoSvg : brandLogoWhiteSvg;
      logo.setAttribute('class', 'export-ace-logo');
      logo.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(logoSource)}`);
      logo.setAttribute('x', '36');
      logo.setAttribute('y', '10');
      logo.setAttribute('width', '170');
      logo.setAttribute('height', '52');
      logo.setAttribute('preserveAspectRatio', 'xMinYMid meet');
      clone.querySelector('.export-bg')?.after(logo);
      clone.querySelector('.export-title')?.setAttribute('x', '230');
      clone.querySelector('.export-title')?.setAttribute('y', '37');
      clone.querySelector('.export-notes')?.setAttribute('x', '230');
      clone.querySelector('.export-notes')?.setAttribute('y', '59');
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  }

  function saveSvg() {
    const svg = serializedDiagramSvg();
    if (svg) download(svg, 'image/svg+xml', 'svg');
  }

  function openPdfExportDialog() {
    pdfExportDialog.value?.open();
  }

  function confirmPdfExport() {
    pdfExportDialog.value?.close();
    void savePdf();
  }

  async function savePdf() {
    const svg = serializedDiagramSvg(pdfTheme.value, true);
    if (!svg || isExportingPdf.value) return;
    isExportingPdf.value = true;
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Unable to render diagram SVG'));
        image.src = svgUrl;
      });
      const exportWidth = image.naturalWidth || canvasWidth.value;
      const exportHeight = image.naturalHeight || canvasHeight.value;
      const renderScale = Math.min(2, 8192 / Math.max(exportWidth, exportHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(exportWidth * renderScale));
      canvas.height = Math.max(1, Math.round(exportHeight * renderScale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('PDF canvas is unavailable');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const { jsPDF } = await import('jspdf');
      const padding = 24;
      const pointScale = Math.min(0.75, (14_400 - padding * 2) / Math.max(exportWidth, exportHeight));
      const drawingWidth = exportWidth * pointScale;
      const drawingHeight = exportHeight * pointScale;
      const pageWidth = drawingWidth + padding * 2;
      const pageHeight = drawingHeight + padding * 2;
      const pdf = new jsPDF({ orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait', unit: 'pt', format: [pageWidth, pageHeight], compress: true, putOnlyUsedFonts: true });
      pdf.setFillColor(pdfTheme.value === 'light' ? '#ffffff' : '#121212');
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', padding, padding, drawingWidth, drawingHeight, undefined, 'FAST');
      pdf.link(padding + 38 * pointScale, padding + (exportHeight - 36) * pointScale, Math.min(360 * pointScale, drawingWidth - 38 * pointScale), 20 * pointScale, { url: TOOL_URL });
      if (includeBbmdTablesInPdf.value) appendBbmdReportPages(pdf, createBbmdReport(project.value), {
        projectTitle: project.value.title || 'Untitled BACnet Network', theme: pdfTheme.value
      });
      if (includeCableScheduleInPdf.value || includeSerialTablesInPdf.value) appendPhysicalSchedulePages(pdf, project.value, {
        projectTitle: project.value.title || 'Untitled BACnet Network', theme: pdfTheme.value,
        includeCables: includeCableScheduleInPdf.value, includeSerial: includeSerialTablesInPdf.value
      });
      pdf.save(`${diagramFilename()}.pdf`);
    } catch (error) {
      console.error(error);
      window.alert('The PDF could not be generated. Please try exporting the SVG instead.');
    } finally {
      URL.revokeObjectURL(svgUrl);
      isExportingPdf.value = false;
    }
  }

  async function openJson(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      project.value = migrateDiagramProject(JSON.parse(await file.text()) as unknown);
    } catch {
      window.alert('That file is not a valid BACnet Studio diagram project.');
    } finally {
      input.value = '';
    }
  }

  return {
    confirmPdfExport, fileInput, includeBbmdTablesInPdf, includeCableScheduleInPdf,
    includeSerialTablesInPdf, isExportingPdf, openJson, openPdfExportDialog, pdfExportDialog,
    pdfTheme, saveJson, saveLegacyJson, saveSvg, saveXlsx
  };
}
