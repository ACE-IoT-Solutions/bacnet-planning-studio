import { describe, expect, it } from 'vitest';
import { createDefaultProject, createInfrastructure, createTestPath } from './network-diagram';
import { pruneDanglingReferences } from './network-diagram-prune';
import { createLink, createPort } from './physical';

describe('diagram reference pruning', () => {
  it('removes references to a deleted device everywhere', () => {
    const project = createDefaultProject();
    const removed = project.subnets[0].devices[0];
    const survivor = project.subnets[0].devices[1];
    survivor.bdtPeerDeviceIds = [removed.id];
    survivor.foreignDeviceBbmdId = removed.id;
    project.paths.push(createTestPath([removed.nics[0].addresses[0].id, survivor.nics[0].addresses[0].id]));
    const infrastructure = createInfrastructure();
    infrastructure.ports = [createPort('1')];
    project.infrastructure.push(infrastructure);
    project.physical.links.push(createLink(
      { kind: 'device-nic', deviceId: removed.id, nicId: removed.nics[0].id },
      { kind: 'infrastructure-port', infrastructureId: infrastructure.id, portId: infrastructure.ports[0].id }
    ));
    project.physical.mstpSegments.push({ id: 's', subnetId: project.subnets[0].id, name: 'S', cable: 'stp-18awg', notes: '', members: [{ ref: { kind: 'device', deviceId: removed.id }, terminated: true, biasSource: true }] });
    project.subnets[0].devices.shift();
    pruneDanglingReferences(project);
    expect(survivor.bdtPeerDeviceIds).toEqual([]);
    expect(survivor.foreignDeviceBbmdId).toBe('');
    expect(project.paths[0].hops).toEqual([survivor.nics[0].addresses[0].id]);
    expect(project.physical.links).toEqual([]);
    expect(project.physical.mstpSegments[0].members).toEqual([]);
  });
});
