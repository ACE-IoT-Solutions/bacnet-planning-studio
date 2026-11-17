// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import MstpTokenAnimation from './MstpTokenAnimation.vue';
import MstpWaveform from './MstpWaveform.vue';

afterEach(() => vi.unstubAllGlobals());

describe('MS/TP teaching animations', () => {
  it('probes the next empty slot on each later token visit and resets when the ring changes', async () => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const wrapper = mount(MstpTokenAnimation, { props: { addresses: [0, 3], gaps: [{ from: 0, to: 3, unused: 2 }, { from: 3, to: 0, unused: 0 }], maxManager: 3 } });
    const button = (label: string) => wrapper.findAll('button').find(b => b.text() === label)!;
    await button('Jump to maintenance').trigger('click');
    expect(wrapper.text()).toContain('MAC 0 polls empty MAC 1');
    await button('Step').trigger('click'); // finish unanswered poll, keep token
    expect(wrapper.text()).toContain('MAC 0 → MAC 3');
    await button('Step').trigger('click'); // successor
    await button('Step').trigger('click'); // next rotation
    expect(wrapper.text()).toContain('MAC 0 polls empty MAC 2');
    await wrapper.setProps({ addresses: [0, 1], gaps: [{ from: 0, to: 1, unused: 0 }, { from: 1, to: 0, unused: 0 }], maxManager: 1 });
    expect(wrapper.text()).toContain('Rotation 1');
    expect(wrapper.find('.probing').exists()).toBe(false);
    wrapper.unmount();
  });

  it('changes trace amplitude and ringing with electrical settings', async () => {
    const wrapper = mount(MstpWaveform, { props: { unitLoads: 16, terminations: 2, commonMode: 2.2, driverVolts: 2, baudRate: 38400 } });
    const before = wrapper.findAll('g > path').at(-1)!.attributes('d');
    await wrapper.setProps({ unitLoads: 64 });
    expect(wrapper.findAll('g > path').at(-1)!.attributes('d')).not.toBe(before);
    expect(wrapper.text()).toContain('Receiver loading exceeds');
    await wrapper.setProps({ terminations: 0 });
    expect(wrapper.text()).toContain('Reflections with incomplete termination');
    wrapper.unmount();
  });
});
