import { describe, expect, it } from 'vitest';
import { createDefaultProject, createInfrastructure } from './network-diagram';
import { diagramWorkbookRows } from './export-diagram-xlsx';
import { createLink, createLocation, createPortRange } from './physical';

describe('physical workbook rows', () => {
  it('builds cable, port, serial, and location sheets', () => {
    const project = createDefaultProject();
    const location = createLocation('IDF 1'); project.physical.locations.push(location);
    const sw = createInfrastructure(); sw.kind = 'switch'; sw.ports = createPortRange('Gi', 1, 2); project.infrastructure.push(sw);
    const device = project.subnets[0].devices[0];
    project.physical.links.push(createLink({ kind: 'device-nic', deviceId: device.id, nicId: device.nics[0].id }, { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports[0].id }));
    const rows = diagramWorkbookRows(project);
    expect(rows.cableSchedule).toHaveLength(2);
    expect(rows.portMap).toHaveLength(3);
    expect(rows.serialSegments[0][0]).toBe('Protocol');
    expect(rows.locations[1][0]).toBe('IDF 1');
  });
});
