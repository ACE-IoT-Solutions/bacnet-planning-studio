import type { ConfigTargetKind, DiagramProject } from './network-diagram';
import { endpointKey, type PhysicalEndpointRef } from './physical';

export interface PhysicalLayoutNode {
  id: string;
  kind: 'infrastructure' | 'patch-panel' | 'device';
  targetKind: ConfigTargetKind;
  label: string;
  detail: string;
  locationId?: string;
  x: number; y: number; width: number; height: number;
  ports: { id: string; label: string; x: number; y: number; endpoint?: PhysicalEndpointRef }[];
}

export interface PhysicalLayoutLink {
  id: string;
  label: string;
  media: string;
  status: string;
  points: string;
}

export interface PhysicalLayoutLane { id: string; label: string; x: number; y: number; width: number; height: number }
export interface PhysicalLayout { width: number; height: number; lanes: PhysicalLayoutLane[]; nodes: PhysicalLayoutNode[]; links: PhysicalLayoutLink[] }

const LANE_GAP = 24;
const LANE_WIDTH = 340;
const NODE_WIDTH = 280;
const NODE_HEIGHT = 92;
const NODE_GAP = 28;

function hierarchyLabel(project: DiagramProject, id?: string): string {
  if (!id) return 'Unassigned';
  const byId = new Map(project.physical.locations.map(item => [item.id, item]));
  const parts: string[] = [];
  const visited = new Set<string>();
  let current = byId.get(id);
  while (current && !visited.has(current.id)) { visited.add(current.id); parts.unshift(current.name); current = current.parentId ? byId.get(current.parentId) : undefined; }
  return parts.join(' / ') || 'Unassigned';
}

export function layoutPhysicalDiagram(project: DiagramProject): PhysicalLayout {
  const entries = [
    ...project.infrastructure.map(item => ({ id: item.id, kind: 'infrastructure' as const, targetKind: 'infrastructure' as const, label: item.name, detail: item.kind, locationId: item.locationId, portDefs: (item.ports ?? []).map(port => ({ id: port.id, label: port.name, endpoint: { kind: 'infrastructure-port' as const, infrastructureId: item.id, portId: port.id } })) })),
    ...project.physical.patchPanels.map(item => ({ id: item.id, kind: 'patch-panel' as const, targetKind: 'panel' as const, label: item.name, detail: 'patch panel', locationId: item.locationId, portDefs: item.ports.map(port => ({ id: port.id, label: port.name, endpoint: { kind: 'patch-panel-port' as const, panelId: item.id, portId: port.id } })) })),
    ...project.subnets.flatMap(subnet => subnet.devices.map(item => ({ id: item.id, kind: 'device' as const, targetKind: 'device' as const, label: item.name, detail: `${item.kind} · ${subnet.name}`, locationId: item.locationId, portDefs: item.nics.map(nic => ({ id: nic.id, label: nic.name, endpoint: { kind: 'device-nic' as const, deviceId: item.id, nicId: nic.id } })) })))
  ];
  const locationIds = [...new Set(entries.map(item => item.locationId ?? ''))].sort((a, b) => hierarchyLabel(project, a).localeCompare(hierarchyLabel(project, b)));
  if (!locationIds.length) locationIds.push('');
  const maxCount = Math.max(1, ...locationIds.map(id => entries.filter(item => (item.locationId ?? '') === id).length));
  const laneHeight = 72 + maxCount * (NODE_HEIGHT + NODE_GAP);
  const lanes = locationIds.map((id, index) => ({ id, label: hierarchyLabel(project, id), x: 24 + index * (LANE_WIDTH + LANE_GAP), y: 82, width: LANE_WIDTH, height: laneHeight }));
  const nodes: PhysicalLayoutNode[] = [];
  for (const lane of lanes) {
    const laneEntries = entries.filter(item => (item.locationId ?? '') === lane.id).sort((a, b) => {
      const rank = { infrastructure: 0, 'patch-panel': 1, device: 2 };
      return rank[a.kind] - rank[b.kind] || a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
    });
    laneEntries.forEach((entry, index) => {
      const x = lane.x + 30; const y = lane.y + 52 + index * (NODE_HEIGHT + NODE_GAP);
      const spacing = NODE_WIDTH / Math.max(2, entry.portDefs.length + 1);
      nodes.push({ ...entry, x, y, width: NODE_WIDTH, height: NODE_HEIGHT, ports: entry.portDefs.map((port, portIndex) => ({ ...port, x: x + spacing * (portIndex + 1), y: y + NODE_HEIGHT })) });
    });
  }
  const endpointPoints = new Map(nodes.flatMap(node => node.ports.flatMap(port => port.endpoint ? [[endpointKey(port.endpoint), port] as const] : [])));
  const links = project.physical.links.flatMap(link => {
    const a = endpointPoints.get(endpointKey(link.a)); const b = endpointPoints.get(endpointKey(link.b));
    if (!a || !b) return [];
    const middleY = Math.max(a.y, b.y) + 18 + (project.physical.links.indexOf(link) % 4) * 7;
    return [{ id: link.id, label: link.label, media: link.media, status: link.status, points: `${a.x},${a.y} ${a.x},${middleY} ${b.x},${middleY} ${b.x},${b.y}` }];
  });
  return { width: Math.max(760, 48 + lanes.length * (LANE_WIDTH + LANE_GAP)), height: Math.max(520, laneHeight + 130), lanes, nodes, links };
}
