import { createEmptyPhysicalLayer } from './physical';
import { isDiagramProject, normalizeDiagramProject, type DiagramProject, type InfrastructureKind } from './network-diagram';
import { isPlannerProject, type PlannerProject } from './planner';

export const DIAGRAM_SCHEMA_VERSION = 2;
export const PLANNER_SCHEMA_VERSION = 2;

type JsonRecord = Record<string, unknown>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function migrateDiagramProject(raw: unknown): DiagramProject {
  if (!isDiagramProject(raw)) throw new Error('This file is not a supported BACnet Studio diagram project.');
  const project = clone(raw) as unknown as DiagramProject;
  if ((project.version as number) === 1) {
    project.version = 2;
    project.physical = createEmptyPhysicalLayer();
  }
  project.physical ??= createEmptyPhysicalLayer();
  project.physical.arcnetSegments ??= [];
  return normalizeDiagramProject(project);
}

export function migratePlannerProject(raw: unknown): PlannerProject {
  if (!isPlannerProject(raw)) throw new Error('This file is not a supported BACnet Studio planner project.');
  const project = clone(raw) as unknown as PlannerProject;
  project.version = 2;
  return project;
}

export type LegacyDiagramProject = Omit<DiagramProject, 'version' | 'physical'> & { version: 1 };

export function toLegacyDiagramProject(project: DiagramProject): LegacyDiagramProject {
  const copy = clone(project) as DiagramProject & JsonRecord;
  const legacyKinds = new Set<InfrastructureKind>(['media-converter', 'mstp-repeater', 'arcnet-repeater', 'wireless-ap']);
  copy.infrastructure = copy.infrastructure.map(item => legacyKinds.has(item.kind)
    ? { ...item, kind: 'gateway', notes: `${item.notes}${item.notes ? ' · ' : ''}Originally modeled as ${item.kind} in schema v2.` }
    : item);
  delete (copy as Partial<DiagramProject>).physical;
  copy.version = 1 as never;
  return copy as unknown as LegacyDiagramProject;
}
