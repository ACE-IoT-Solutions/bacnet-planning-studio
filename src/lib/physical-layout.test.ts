import { describe, expect, it } from 'vitest';
import { createDefaultProject, createInfrastructure } from './network-diagram';
import { layoutPhysicalDiagram } from './physical-layout';
import { createArcnetSegment, createLink, createLocation, createPatchPanel, createPortRange } from './physical';

describe('physical layout', () => {
  it('is deterministic and does not overlap nodes', () => {
    const project = createDefaultProject();
    const closet = createLocation('IDF 1'); project.physical.locations.push(closet);
    project.subnets[0].devices.forEach(device => { device.locationId = closet.id; });
    const sw = createInfrastructure(); sw.kind = 'switch'; sw.locationId = closet.id; project.infrastructure.push(sw);
    const panel = createPatchPanel(); panel.locationId = closet.id; project.physical.patchPanels.push(panel);
    const first = layoutPhysicalDiagram(project); const second = layoutPhysicalDiagram(project);
    expect(second).toEqual(first);
    for (let a = 0; a < first.nodes.length; a++) for (let b = a + 1; b < first.nodes.length; b++) {
      const one = first.nodes[a]; const two = first.nodes[b];
      expect(one.x + one.width <= two.x || two.x + two.width <= one.x || one.y + one.height <= two.y || two.y + two.height <= one.y).toBe(true);
    }
  });

  it('assigns orthogonal route lanes and lays serial buses out as ordered member chains', () => {
    const project = createDefaultProject();
    const firstCloset = createLocation('IDF 1'); const secondCloset = createLocation('IDF 2');
    project.physical.locations.push(firstCloset, secondCloset);
    const [firstDevice, secondDevice] = project.subnets[0].devices;
    firstDevice.locationId = firstCloset.id; secondDevice.locationId = secondCloset.id;
    const firstSwitch = createInfrastructure(); firstSwitch.name = 'SW-1'; firstSwitch.locationId = firstCloset.id; firstSwitch.ports = createPortRange('Gi', 1, 2);
    const secondSwitch = createInfrastructure(); secondSwitch.name = 'SW-2'; secondSwitch.locationId = secondCloset.id; secondSwitch.ports = createPortRange('Gi', 1, 2);
    project.infrastructure.push(firstSwitch, secondSwitch);
    project.physical.links.push(
      createLink({ kind: 'device-nic', deviceId: firstDevice.id, nicId: firstDevice.nics[0].id }, { kind: 'infrastructure-port', infrastructureId: secondSwitch.id, portId: secondSwitch.ports[0].id }),
      createLink({ kind: 'infrastructure-port', infrastructureId: firstSwitch.id, portId: firstSwitch.ports[0].id }, { kind: 'device-nic', deviceId: secondDevice.id, nicId: secondDevice.nics[0].id })
    );
    const arcnet = createArcnetSegment(project.subnets[0].id, 'ARC156 A');
    arcnet.members = [
      { ref: { kind: 'device', deviceId: firstDevice.id }, terminated: true, biasSource: false },
      { ref: { kind: 'device', deviceId: secondDevice.id }, terminated: true, biasSource: false }
    ];
    project.physical.arcnetSegments.push(arcnet);

    const layout = layoutPhysicalDiagram(project);
    expect(new Set(layout.links.map(link => link.routeLane)).size).toBe(2);
    for (const link of layout.links) {
      const points = link.points.split(' ').map(point => point.split(',').map(Number));
      for (let index = 1; index < points.length; index++) expect(points[index][0] === points[index - 1][0] || points[index][1] === points[index - 1][1]).toBe(true);
    }
    expect(layout.serialSegments[0].members.map(member => member.label)).toEqual([firstDevice.name, secondDevice.name]);
    expect(layout.serialSegments[0].members[0].x).toBeLessThan(layout.serialSegments[0].members[1].x);
  });
});
