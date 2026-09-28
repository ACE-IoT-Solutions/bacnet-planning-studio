import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../lib/network-diagram';
import { DIAGRAM_STORAGE_KEY } from '../lib/storage-keys';
import { handoffPlannerDiagram } from './usePlannerDiagramHandoff';

describe('planner diagram handoff', () => {
  const values = new Map<string, string>();
  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), clear: () => values.clear() });
  });

  it('does not overwrite an existing named diagram when confirmation is declined', () => {
    const current = createDefaultProject(); current.title = 'Current Site';
    localStorage.setItem(DIAGRAM_STORAGE_KEY, JSON.stringify(current));
    const next = createDefaultProject(); next.title = 'New Plan';
    const confirm = vi.fn(() => false);
    expect(handoffPlannerDiagram(next, confirm)).toBe(false);
    expect(confirm).toHaveBeenCalledWith('Replace current diagram “Current Site”?');
    expect(JSON.parse(localStorage.getItem(DIAGRAM_STORAGE_KEY)!).title).toBe('Current Site');
  });
});
