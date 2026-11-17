// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PrimerNumberField from './PrimerNumberField.vue';

describe('primer numeric field integration', () => {
  it('uses decimal steps and labels the input and step buttons', async () => {
    const wrapper = mount(PrimerNumberField, { props: { label: 'Source voltage', modelValue: 4, min: -12, max: 18, step: .05, precision: 2, unit: 'V' } });
    expect(wrapper.find('label').attributes('for')).toBe(wrapper.find('input').attributes('id'));
    await wrapper.find('button[aria-label="Increase Source voltage"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([4.05]);
    await wrapper.setProps({ modelValue: 18 });
    expect(wrapper.find('button[aria-label="Increase Source voltage"]').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('keeps an empty draft out of the simulator and restores the required value on exit', async () => {
    const wrapper = mount(PrimerNumberField, { props: { label: 'Managers', modelValue: 8, min: 1, max: 128 } });
    await wrapper.find('input').setValue('');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.find('input').element.value).toBe('');
    await wrapper.find('input').trigger('blur');
    await wrapper.find('input').trigger('focusout');
    expect(wrapper.find('input').element.value).toBe('8');
    await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([7]);
    wrapper.unmount();
  });
});
