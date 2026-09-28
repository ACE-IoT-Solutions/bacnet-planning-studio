import type { DiagramProject } from './network-diagram';
import { endpointLabel } from './physical';
import { STYLES } from './xlsx-styles';

export function diagramWorkbookRows(project: DiagramProject) {
  const cableSchedule = [
    ['Cable ID', 'Endpoint A', 'Endpoint B', 'Media', 'Length (m)', 'Status', 'Notes'],
    ...project.physical.links.map(link => [link.label || link.id, endpointLabel(project, link.a), endpointLabel(project, link.b), link.media, link.lengthMeters ?? '', link.status, link.notes])
  ];
  const portMap = [
    ['Equipment', 'Kind', 'Port', 'Media', 'Speed (Mbps)', 'VLAN Mode', 'Access VLAN', 'Allowed VLANs', 'PoE', 'Enabled'],
    ...project.infrastructure.flatMap(item => (item.ports ?? []).map(port => [item.name, item.kind, port.name, port.media, port.speedMbps ?? '', port.vlanMode, port.accessVlan ?? '', (port.allowedVlans ?? []).join(', '), port.poe ?? 'none', port.enabled ? 'Yes' : 'No']))
  ];
  const serialSegments = [
    ['Protocol', 'Segment', 'Network', 'Cable', 'Length (m)', 'Order', 'Node', 'Terminated', 'Bias Source', 'Unit Load'],
    ...[
      ...project.physical.mstpSegments.map(item => ({ ...item, protocol: 'MS/TP' })),
      ...project.physical.arcnetSegments.map(item => ({ ...item, protocol: 'ARC156' }))
    ].flatMap(segment => segment.members.length ? segment.members.map((member, index) => {
      const ref = member.ref;
      const node = ref.kind === 'device'
        ? project.subnets.flatMap(subnet => subnet.devices).find(item => item.id === ref.deviceId)?.name
        : project.infrastructure.find(item => item.id === ref.infrastructureId)?.name;
      return [segment.protocol, segment.name, project.subnets.find(item => item.id === segment.subnetId)?.name ?? segment.subnetId, segment.cable, segment.lengthMeters ?? '', index + 1, node ?? 'Missing', member.terminated ? 'Yes' : 'No', member.biasSource ? 'Yes' : 'No', member.unitLoad ?? 1];
    }) : [[segment.protocol, segment.name, project.subnets.find(item => item.id === segment.subnetId)?.name ?? segment.subnetId, segment.cable, segment.lengthMeters ?? '', '', '', '', '', '']])
  ];
  const locations = [
    ['Location', 'Kind', 'Parent', 'Notes'],
    ...project.physical.locations.map(location => [location.name, location.kind, project.physical.locations.find(item => item.id === location.parentId)?.name ?? '', location.notes])
  ];
  return { cableSchedule, portMap, serialSegments, locations };
}

export async function exportDiagramXlsx(project: DiagramProject) {
  const XLSX = await import('xlsx-js-style');
  const workbook = XLSX.utils.book_new();
  const sheets = diagramWorkbookRows(project);
  for (const [name, rows] of Object.entries({ 'Cable Schedule': sheets.cableSchedule, 'Port Map': sheets.portMap, 'Serial Segments': sheets.serialSegments, Locations: sheets.locations })) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = rows[0].map((_, column) => ({ wch: Math.min(45, Math.max(12, ...rows.map(row => String(row[column] ?? '').length + 2))) }));
    for (let column = 0; column < rows[0].length; column++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
      if (cell) cell.s = STYLES.tableHeader;
    }
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  const filename = (project.title || 'network-diagram').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'network-diagram';
  XLSX.writeFile(workbook, `${filename}-physical.xlsx`);
}
