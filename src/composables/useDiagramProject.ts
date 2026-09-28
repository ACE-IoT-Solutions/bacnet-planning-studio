import { ref, watch } from 'vue';
import { createDefaultProject, type DiagramProject } from '../lib/network-diagram';
import { migrateDiagramProject } from '../lib/schema-migrations';
import { DIAGRAM_STORAGE_KEY } from '../lib/storage-keys';

export function useDiagramProject(storageKey = DIAGRAM_STORAGE_KEY) {
  const project = ref<DiagramProject>(createDefaultProject());
  let autosaveTimer: ReturnType<typeof window.setTimeout> | undefined;

  function loadStoredProject(): boolean {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return false;
    try {
      project.value = migrateDiagramProject(JSON.parse(saved));
      return true;
    } catch {
      return false;
    }
  }

  function replaceProject(next: unknown) {
    project.value = migrateDiagramProject(next);
  }

  function persistNow() {
    if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
    localStorage.setItem(storageKey, JSON.stringify(project.value));
  }

  const stopAutosave = watch(project, value => {
    if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => localStorage.setItem(storageKey, JSON.stringify(value)), 300);
  }, { deep: true });

  function dispose() {
    stopAutosave();
    persistNow();
  }

  return { project, loadStoredProject, replaceProject, persistNow, dispose };
}
