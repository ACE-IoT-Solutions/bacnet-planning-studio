import { describe, expect, it } from 'vitest';
import { createDefaultProject, createInfrastructure } from './network-diagram';
import { diagramWorkbookRows } from './export-diagram-xlsx';
import { createArcnetSegment, createLink, createLocation, createPortRange } from './physical';

describe('physical workbook rows', () => {
  it('builds cable, port, serial, and location sheets', () => {
    const project = createDefaultProject();
    const location = createLocation('IDF 1'); project.physical.locations.push(location);
    const sw = createInfrastructure(); sw.name = 'SW-1'; sw.kind = 'switch'; sw.ports = createPortRange('Gi', 1, 2, { vlanMode: 'access', accessVlan: '10', poe: 'at' }); project.infrastructure.push(sw);
    const device = project.subnets[0].devices[0];
    const link = createLink({ kind: 'device-nic', deviceId: device.id, nicId: device.nics[0].id }, { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports[0].id });
    link.label = 'C-101'; link.lengthMeters = 42; link.status = 'verified'; project.physical.links.push(link);
    const arcnet = createArcnetSegment(project.subnets[0].id, 'ARC156 A'); arcnet.lengthMeters = 500; arcnet.members = [{ ref: { kind: 'device', deviceId: device.id }, terminated: true, biasSource: false }]; project.physical.arcnetSegments.push(arcnet);
    const rows = diagramWorkbookRows(project);
    expect(rows.cableSchedule[1]).toEqual(['C-101', `${device.name} · ${device.nics[0].name}`, 'SW-1 · Gi1', 'copper-utp', 42, 'verified', '']);
    expect(rows.portMap[1]).toEqual(['SW-1', 'switch', 'Gi1', 'copper-utp', 1000, 'access', '10', '', 'at', 'Yes']);
    expect(rows.serialSegments[1]).toEqual(['ARC156', 'ARC156 A', project.subnets[0].name, 'stp-22awg', 500, 1, device.name, 'Yes', 'No', 1]);
    expect(rows.locations[1]).toEqual(['IDF 1', 'closet', '', '']);
  });
});
