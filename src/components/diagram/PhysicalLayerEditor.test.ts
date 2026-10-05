// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createDefaultProject, createInfrastructure } from '../../lib/network-diagram';
import { createLink, createPortRange } from '../../lib/physical';
import PhysicalLayerEditor from './PhysicalLayerEditor.vue';

describe('PhysicalLayerEditor', () => {
  it('shows ALC ARC156 controls and removes links when a referenced port is removed', async () => {
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

  it('requires acknowledgement before replacing connected generated ports', async () => {
    const project = createDefaultProject(); project.physical.enabled = true;
    const sw = createInfrastructure(); sw.kind = 'switch'; sw.name = 'SW-1'; sw.ports = createPortRange('Old-', 1, 2); project.infrastructure.push(sw);
    const device = project.subnets[0].devices[0];
    project.physical.links.push(createLink({ kind: 'device-nic', deviceId: device.id, nicId: device.nics[0].id }, { kind: 'infrastructure-port', infrastructureId: sw.id, portId: sw.ports[0].id }));
    const wrapper = mount(PhysicalLayerEditor, { props: { project } });
    await wrapper.find('.physical-port-toolbar button').trigger('click');
    const dialog = wrapper.find('.port-generator-dialog');
    expect(dialog.attributes('open')).toBeDefined();
    expect(dialog.text()).toContain('removes 1 attached cable');
    const confirm = dialog.find('.primary-button');
    expect(confirm.attributes('disabled')).toBeDefined();
    await dialog.find('.port-replacement-warning input').setValue(true);
    const fields = dialog.findAll('input');
    await fields[2].setValue(4);
    await confirm.trigger('click');
    expect(sw.ports).toHaveLength(4);
    expect(project.physical.links).toEqual([]);
  });
});
