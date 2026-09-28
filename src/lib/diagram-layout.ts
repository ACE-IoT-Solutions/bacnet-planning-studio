export type DiagramLayoutMode = 'compact' | 'balanced' | 'wide';

export function layoutColumnCount(count: number, mode: DiagramLayoutMode): number {
  const limit = mode === 'compact' ? 4 : mode === 'balanced' ? 8 : Number.POSITIVE_INFINITY;
  return Math.max(1, Math.min(count || 1, limit));
}

export function layoutRowCount(count: number, mode: DiagramLayoutMode): number {
  return count ? Math.ceil(count / layoutColumnCount(count, mode)) : 0;
}

export function layoutRowPixelWidth(count: number, itemWidth: number, gap: number, mode: DiagramLayoutMode): number {
  const columns = layoutColumnCount(count, mode);
  return columns * itemWidth + Math.max(0, columns - 1) * gap;
}

export function layoutGridPoint(options: { index: number; count: number; itemWidth: number; gap: number; startY: number; rowHeight: number; canvasWidth: number; mode: DiagramLayoutMode }) {
  const { index, count, itemWidth, gap, startY, rowHeight, canvasWidth, mode } = options;
  const columns = layoutColumnCount(count, mode);
  const row = Math.floor(Math.max(0, index) / columns);
  const column = Math.max(0, index) % columns;
  const itemsInRow = Math.min(columns, Math.max(0, count - row * columns));
  const rowWidth = itemsInRow * itemWidth + Math.max(0, itemsInRow - 1) * gap;
  return { x: (canvasWidth - rowWidth) / 2 + column * (itemWidth + gap), y: startY + row * rowHeight };
}
