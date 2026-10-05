// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NetworkDiagramPage from './NetworkDiagramPage.vue';
import { DIAGRAM_STORAGE_KEY } from '../lib/storage-keys';

describe('NetworkDiagramPage integration', () => {
  const values = new Map<string, string>();
  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), clear: () => values.clear() });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false; } });
  });

  it('migrates v1 browser data and exposes physical mode without changing the logical topology', async () => {
    values.set(DIAGRAM_STORAGE_KEY, JSON.stringify({ version: 1, title: 'Saved v1 Site', notes: '', subnets: [], infrastructure: [], paths: [], viewMode: 'detailed' }));
    const wrapper = mount(NetworkDiagramPage);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('#diagram-title').element).toHaveProperty('value', 'Saved v1 Site');
    expect(wrapper.get('#diagram-scope').findAll('option').map(option => option.attributes('value'))).toContain('physical');
    expect(wrapper.text()).toContain('Physical layer');
    wrapper.unmount();
    expect(JSON.parse(values.get(DIAGRAM_STORAGE_KEY)!).version).toBe(2);
  });

  it('can return from the physical visualization using the preview toolbar', async () => {
    values.set(DIAGRAM_STORAGE_KEY, JSON.stringify({ version: 1, title: 'Physical site', notes: '', subnets: [], infrastructure: [], paths: [], viewMode: 'physical' }));
    const wrapper = mount(NetworkDiagramPage);
    await wrapper.vm.$nextTick();

    const visualization = wrapper.get('#diagram-visualization-mode');
    expect((visualization.element as HTMLSelectElement).value).toBe('physical');
    expect(wrapper.find('.physical-diagram-svg').exists()).toBe(true);
    expect(wrapper.find('#diagram-layout-mode').exists()).toBe(false);

    await visualization.setValue('detailed');

    expect(wrapper.find('.physical-diagram-svg').exists()).toBe(false);
    expect(wrapper.find('#diagram-layout-mode').exists()).toBe(true);
    expect(wrapper.find('.network-diagram-svg').exists()).toBe(true);
  });
});
