import type { jsPDF } from 'jspdf';
import type { DiagramProject } from './network-diagram';
import { endpointLabel } from './physical';

interface ScheduleOptions { projectTitle: string; includeCables: boolean; includeSerial: boolean; theme: 'dark' | 'light' }

export function appendPhysicalSchedulePages(pdf: jsPDF, project: DiagramProject, options: ScheduleOptions) {
  const rows: { section: string; columns: string[] }[] = [];
  if (options.includeCables) for (const link of project.physical.links) rows.push({ section: 'Cable Schedule', columns: [link.label || link.id, endpointLabel(project, link.a), endpointLabel(project, link.b), link.media, link.lengthMeters === undefined ? '—' : `${link.lengthMeters} m`, link.status] });
  if (options.includeSerial) for (const segment of [...project.physical.mstpSegments.map(item => ({ ...item, protocol: 'MS/TP' })), ...project.physical.arcnetSegments.map(item => ({ ...item, protocol: 'ARC156' }))]) {
    rows.push({ section: 'Serial Segments', columns: [segment.protocol, segment.name, `${segment.members.length} nodes`, segment.cable, segment.lengthMeters === undefined ? '—' : `${segment.lengthMeters} m`] });
  }
  const perPage = 28;
  for (let offset = 0; offset < rows.length; offset += perPage) {
    pdf.addPage('letter', 'landscape');
    const dark = options.theme === 'dark';
    pdf.setFillColor(dark ? '#121212' : '#ffffff'); pdf.rect(0, 0, 792, 612, 'F');
    pdf.setTextColor(dark ? '#f8fafc' : '#0f172a'); pdf.setFontSize(16); pdf.text(options.projectTitle, 36, 38);
    pdf.setTextColor('#859300'); pdf.setFontSize(11); pdf.text(rows[offset].section, 36, 60);
    rows.slice(offset, offset + perPage).forEach((row, index) => {
      const y = 84 + index * 17;
      pdf.setTextColor(dark ? '#cbd5e1' : '#334155'); pdf.setFontSize(8);
      row.columns.forEach((column, columnIndex) => pdf.text(String(column).slice(0, columnIndex < 3 ? 42 : 20), 36 + columnIndex * 120, y));
    });
  }
}
