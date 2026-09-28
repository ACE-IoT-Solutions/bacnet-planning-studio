// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../lib/network-diagram';
import { createArcnetSegment, createLocation } from '../../lib/physical';
import PhysicalDiagramSvg from './PhysicalDiagramSvg.vue';

describe('PhysicalDiagramSvg', () => {
  it('renders location lanes and ARC156 serial segments as keyboard targets', async () => {
    const project = createDefaultProject();
    const location = createLocation('ALC Panel'); project.physical.locations.push(location);
    project.subnets[0].devices[0].locationId = location.id;
    project.physical.arcnetSegments.push(createArcnetSegment(project.subnets[0].id, 'ARC156 A'));
    const wrapper = mount(PhysicalDiagramSvg, { props: { project } });
    expect(wrapper.text()).toContain('ALC Panel');
    expect(wrapper.text()).toContain('ARC156 A');
    await wrapper.find('.serial-segment').trigger('keydown.enter');
    expect(wrapper.emitted('focus')?.[0]).toEqual(['segment', project.physical.arcnetSegments[0].id]);
  });
});
