import { describe, expect, it } from 'vitest';
import { createDefaultProject, createInfrastructure, isDiagramProject } from './network-diagram';
import { createPlannerProject, isPlannerProject, type PlannerSubnet } from './planner';
import { migrateDiagramProject, migratePlannerProject, toLegacyDiagramProject } from './schema-migrations';

describe('schema migrations', () => {
  it('migrates a v1 diagram and is idempotent', () => {
    const legacy = structuredClone(createDefaultProject()) as unknown as Record<string, unknown>;
    legacy.version = 1;
    delete legacy.physical;
    expect(isDiagramProject(legacy)).toBe(true);
    const migrated = migrateDiagramProject(legacy);
    expect(migrated.version).toBe(2);
    expect(migrated.physical).toEqual({ enabled: false, locations: [], patchPanels: [], links: [], mstpSegments: [], arcnetSegments: [] });
    expect(migrateDiagramProject(migrated)).toEqual(migrated);
  });

  it('migrates planner v1 without changing subnet data', () => {
    const subnet: PlannerSubnet = { id: 'a', name: 'LAN', ip: '10.0.0.0', cidr: 24, gatewayOffset: 1, vlan: 10, port: 47808, bbmdEnabled: false, bbmdOffset: 10, bmsPlaced: false, bmsRole: 'none', fdrTargetSubnetId: '' };
    const legacy = { ...createPlannerProject([subnet], false), version: 1 };
    expect(isPlannerProject(legacy)).toBe(true);
    expect(migratePlannerProject(legacy)).toEqual({ ...legacy, version: 2 });
  });

  it('exports a v1 logical project and maps physical-only infrastructure kinds', () => {
    const project = createDefaultProject();
    const converter = createInfrastructure();
    converter.kind = 'media-converter';
    project.infrastructure.push(converter);
    const legacy = toLegacyDiagramProject(project);
    expect(legacy.version).toBe(1);
    expect('physical' in legacy).toBe(false);
    expect(legacy.infrastructure[0].kind).toBe('gateway');
    expect(migrateDiagramProject(legacy).subnets).toEqual(migrateDiagramProject(project).subnets);
  });
});
