import { describe, expect, it } from 'vitest';
import { layoutGridPoint, layoutRowCount } from './diagram-layout';

describe('logical diagram layout', () => {
  it('wraps deterministically at the selected layout limit', () => {
    expect(layoutRowCount(9, 'compact')).toBe(3);
    expect(layoutRowCount(9, 'balanced')).toBe(2);
    expect(layoutGridPoint({ index: 4, count: 5, itemWidth: 100, gap: 10, startY: 50, rowHeight: 80, canvasWidth: 600, mode: 'compact' })).toEqual({ x: 250, y: 130 });
  });
});
