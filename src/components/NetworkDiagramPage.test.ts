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
});
