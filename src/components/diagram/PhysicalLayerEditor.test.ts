// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultProject, createInfrastructure } from '../../lib/network-diagram';
import { createLink, createPortRange } from '../../lib/physical';
import PhysicalLayerEditor from './PhysicalLayerEditor.vue';

describe('PhysicalLayerEditor', () => {
  it('shows ALC ARC156 controls and removes links when a referenced port is removed', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('2');
    const project = createDefaultProject(); project.physical.enabled = true;
    const arcnet = project.subnets[0]; arcnet.networkType = 'arcnet'; arcnet.name = 'ALC ARC156';
    const sw = createInfrastructure(); sw.kind = 'switch'; sw.ports = createPortRange('Gi', 1, 2); project.infrastructure.push(sw);
    const device = arcnet.devices[0];
    project.physical.links.push(createLink({ kind: 'device-nic', deviceId: device.id, nicId: device.nics[0].id }, { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports[0].id }));
    const wrapper = mount(PhysicalLayerEditor, { props: { project } });
    expect(wrapper.text()).toContain('ARC156');
    const removeButtons = wrapper.findAll('.physical-port-row .row-remove-button');
    await removeButtons[0].trigger('click');
    expect(project.physical.links).toEqual([]);
  });
});
