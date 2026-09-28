import { describe, expect, it } from 'vitest';
import { createDefaultProject, createInfrastructure } from './network-diagram';
import { layoutPhysicalDiagram } from './physical-layout';
import { createLocation, createPatchPanel } from './physical';

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
});
