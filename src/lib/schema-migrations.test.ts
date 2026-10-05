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

  it('upgrades the rounded ARC156 data rate used by v1 diagram files', () => {
    const legacy = structuredClone(createDefaultProject()) as unknown as Record<string, unknown>;
    legacy.version = 1;
    delete legacy.physical;
    const subnets = legacy.subnets as PlannerSubnet[];
    subnets[0].networkType = 'arcnet';
    subnets[0].arcnetDataRate = 156;
    expect(migrateDiagramProject(legacy).subnets[0].arcnetDataRate).toBe(156.25);
  });

  it('migrates planner v1 without changing subnet data', () => {
    const subnet: PlannerSubnet = { id: 'a', name: 'LAN', ip: '10.0.0.0', cidr: 24, gatewayOffset: 1, vlan: 10, port: 47808, bbmdEnabled: false, bbmdOffset: 10, bmsPlaced: false, bmsRole: 'none', fdrTargetSubnetId: '' };
    const legacy = { ...createPlannerProject([subnet], false), version: 1 };
    expect(isPlannerProject(legacy)).toBe(true);
    expect(migratePlannerProject(legacy)).toEqual({ ...legacy, version: 2 });
  });

  it('upgrades the rounded ARC156 data rate used by v1 planner files', () => {
    const subnet: PlannerSubnet = { id: 'arc', name: 'ARC156', ip: '', cidr: 24, gatewayOffset: 1, vlan: '', port: '', bbmdEnabled: false, bbmdOffset: 10, bmsPlaced: false, bmsRole: 'none', fdrTargetSubnetId: '', networkType: 'arcnet', arcnetDataRate: 156 };
    const migrated = migratePlannerProject({ ...createPlannerProject([subnet], false), version: 1 });
    expect(migrated.subnets[0].arcnetDataRate).toBe(156.25);
  });

  it('exports a v1 logical project and maps physical-only infrastructure kinds', () => {
    const project = createDefaultProject();
    const converter = createInfrastructure();
    converter.kind = 'media-converter';
    project.infrastructure.push(converter);
    project.viewMode = 'physical';
    const legacy = toLegacyDiagramProject(project);
    expect(legacy.version).toBe(1);
    expect('physical' in legacy).toBe(false);
    expect(legacy.infrastructure[0].kind).toBe('gateway');
    expect(legacy.viewMode).toBe('detailed');
    expect(migrateDiagramProject(legacy).subnets).toEqual(migrateDiagramProject(project).subnets);
  });
});
