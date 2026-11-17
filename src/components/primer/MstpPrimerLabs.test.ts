// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import MstpPrimerLabs from './MstpPrimerLabs.vue';
import MstpWaveform from './MstpWaveform.vue';

describe('MstpPrimerLabs', () => {
  it('derives wire differential and common mode from the source A/B fields', async () => {
    const wrapper = mount(MstpPrimerLabs);
    const field = (label: string) => {
      const id = wrapper.findAll('label').find(item => item.text().startsWith(label))!.attributes('for');
      return wrapper.find(`input[id="${id}"]`);
    };
    const wave = () => wrapper.findComponent(MstpWaveform);
    await field('Transmitter A,').setValue('6');
    await field('Transmitter B,').setValue('4');
    expect(wave().props('driverVolts')).toBe(2);
    expect(wave().props('commonMode')).toBe(5);
    expect(wrapper.text()).toContain('+1,012 mV'); // far-end resistor-network plateau
    await field('Transmitter A,').setValue('7');
    expect(wave().props('driverVolts')).toBe(3);
    expect(wave().props('commonMode')).toBe(5.5);
    await field('Transmitter B,').setValue('5'); // shift both source levels together
    expect(wave().props('driverVolts')).toBe(2);
    expect(wave().props('commonMode')).toBe(6);
    await field('Transmitter A,').setValue('5');
    expect(wave().props('driverVolts')).toBe(0);
    expect(wrapper.text()).toContain('Undefined threshold band');
    await field('Transmitter A,').setValue('3');
    expect(wave().props('driverVolts')).toBe(-2);
    expect(wrapper.text()).toContain('Guaranteed low region');
    wrapper.unmount();
  });

  it('renders electrical results and updates the token model presets', async () => {
    const wrapper = mount(MstpPrimerLabs);
    expect(wrapper.text()).toContain('16 UL');
    expect(wrapper.text()).toContain('Guaranteed high region');
    expect(wrapper.text()).toContain('Poll For Master runs periodically');

    const sparsePreset = wrapper.findAll('button').find(button => button.text() === 'Sparse default range');
    expect(sparsePreset).toBeDefined();
    await sparsePreset!.trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('120 unused addresses through 127');
    expect(wrapper.text()).toContain('PFM events / rotation');
  });
});
