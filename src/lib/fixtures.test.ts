import { describe, expect, it } from 'vitest';
import defaultDiagram from './fixtures/diagram-v1-default.json';
import plannerDiagram from './fixtures/diagram-v1-planner-import.json';
import bbmdDiagram from './fixtures/diagram-v1-bbmd-state-import.json';
import nmapDiagram from './fixtures/diagram-v1-nmap-import.json';
import preNicDiagram from './fixtures/diagram-legacy-pre-nic.json';
import fullPlanner from './fixtures/planner-v1-full.json';
import wizardPlanner from './fixtures/planner-v1-wizard.json';
import defaultDiagnostics from './fixtures/diagram-v1-default.diagnostics.json';
import plannerDiagnostics from './fixtures/diagram-v1-planner-import.diagnostics.json';
import bbmdDiagnostics from './fixtures/diagram-v1-bbmd-state-import.diagnostics.json';
import nmapDiagnostics from './fixtures/diagram-v1-nmap-import.diagnostics.json';
import preNicDiagnostics from './fixtures/diagram-legacy-pre-nic.diagnostics.json';
import { getDiagramDiagnostics, isDiagramProject } from './network-diagram';
import { isPlannerProject } from './planner';
import { migrateDiagramProject, migratePlannerProject } from './schema-migrations';

describe('frozen v1 fixtures', () => {
  it.each([
    [defaultDiagram, defaultDiagnostics], [plannerDiagram, plannerDiagnostics], [bbmdDiagram, bbmdDiagnostics],
    [nmapDiagram, nmapDiagnostics], [preNicDiagram, preNicDiagnostics]
  ])('accepts and idempotently migrates diagram fixture %#', (fixture, expectedDiagnostics) => {
    expect(isDiagramProject(fixture)).toBe(true);
    const migrated = migrateDiagramProject(fixture);
    expect(migrateDiagramProject(structuredClone(migrated))).toEqual(migrated);
    expect(getDiagramDiagnostics(migrated)).toEqual(expectedDiagnostics);
  });

  it.each([fullPlanner, wizardPlanner])('accepts and idempotently migrates planner fixture %#', fixture => {
    expect(isPlannerProject(fixture)).toBe(true);
    const migrated = migratePlannerProject(fixture);
    expect(migratePlannerProject(structuredClone(migrated))).toEqual(migrated);
  });
});
