// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInfrastructure, createTestPath } from '../lib/network-diagram';
import { createLink, createPortRange } from '../lib/physical';
import { useDiagramProject } from './useDiagramProject';

describe('useDiagramProject removal actions', () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('removes dependent paths and physical links before pruning references', () => {
    const state = useDiagramProject('test-diagram-removals');
    const subnet = state.project.value.subnets[0];
    const device = subnet.devices[0];
    const address = device.nics[0].addresses[0];
    const sw = createInfrastructure(); sw.ports = createPortRange('Gi', 1, 1); state.project.value.infrastructure.push(sw);
    state.project.value.physical.links.push(createLink(
      { kind: 'device-nic', deviceId: device.id, nicId: device.nics[0].id },
      { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports[0].id }
    ));
    state.project.value.paths.push(createTestPath([address.id, sw.id]));

    state.removeDevice(subnet, device.id);

    expect(state.project.value.physical.links).toEqual([]);
    expect(state.project.value.paths[0].hops).toEqual([sw.id]);
    state.dispose();
    localStorage.removeItem('test-diagram-removals');
  });
});
