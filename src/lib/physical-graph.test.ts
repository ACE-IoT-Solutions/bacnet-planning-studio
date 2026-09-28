import { describe, expect, it } from 'vitest';
import { createDefaultProject, createInfrastructure } from './network-diagram';
import { hasL2Path } from './physical-graph';
import { createLink, createPatchPanel, createPort, createPortRange } from './physical';

describe('physical Layer 2 graph', () => {
  it('passes a VLAN through access ports on a switch', () => {
    const project = createDefaultProject();
    const [a, b] = project.subnets[0].devices;
    const sw = createInfrastructure(); sw.kind = 'switch';
    sw.ports = createPortRange('Gi', 1, 2, { vlanMode: 'access', accessVlan: '10' });
    project.infrastructure.push(sw);
    project.physical.links.push(
      createLink({ kind: 'device-nic', deviceId: a.id, nicId: a.nics[0].id }, { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports[0].id }),
      createLink({ kind: 'device-nic', deviceId: b.id, nicId: b.nics[0].id }, { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports[1].id })
    );
    expect(hasL2Path(project, { deviceId: a.id, nicId: a.nics[0].id }, { deviceId: b.id, nicId: b.nics[0].id }, '10')).toBe(true);
    sw.ports[1].accessVlan = '20';
    expect(hasL2Path(project, { deviceId: a.id, nicId: a.nics[0].id }, { deviceId: b.id, nicId: b.nics[0].id }, '10')).toBe(false);
  });

  it('passes through paired patch-panel ports', () => {
    const project = createDefaultProject();
    const [a, b] = project.subnets[0].devices;
    const panel = createPatchPanel('PP', [createPort('1-front'), createPort('1-rear')]);
    project.physical.patchPanels.push(panel);
    project.physical.links.push(
      createLink({ kind: 'device-nic', deviceId: a.id, nicId: a.nics[0].id }, { kind: 'patch-panel-port', panelId: panel.id, portId: panel.ports[0].id }),
      createLink({ kind: 'patch-panel-port', panelId: panel.id, portId: panel.ports[1].id }, { kind: 'device-nic', deviceId: b.id, nicId: b.nics[0].id })
    );
    expect(hasL2Path(project, { deviceId: a.id, nicId: a.nics[0].id }, { deviceId: b.id, nicId: b.nics[0].id }, '10')).toBe(true);
  });
});
