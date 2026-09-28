import type { DiagramProject } from '../lib/network-diagram';
import { migrateDiagramProject } from '../lib/schema-migrations';
import { DIAGRAM_STORAGE_KEY } from '../lib/storage-keys';

export function handoffPlannerDiagram(next: DiagramProject, confirmReplace: (message: string) => boolean = window.confirm): boolean {
  const existing = localStorage.getItem(DIAGRAM_STORAGE_KEY);
  if (existing) {
    try {
      const title = migrateDiagramProject(JSON.parse(existing)).title;
      if (!confirmReplace(`Replace current diagram “${title}”?`)) return false;
    } catch { /* Invalid bridge data can be replaced safely. */ }
  }
  localStorage.setItem(DIAGRAM_STORAGE_KEY, JSON.stringify(next));
  return true;
}
