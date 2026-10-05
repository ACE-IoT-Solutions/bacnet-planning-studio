import type { ConfigTargetKind, DiagramProject } from './network-diagram';
import { endpointKey, type MstpSegmentMember, type PhysicalEndpointRef } from './physical';

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
  routeLane: number;
}

export interface PhysicalLayoutLane { id: string; label: string; x: number; y: number; width: number; height: number }
export interface PhysicalLayoutSerialMember { id: string; label: string; x: number; y: number; terminated: boolean; biasSource: boolean }
export interface PhysicalLayoutSerialSegment { id: string; name: string; protocol: 'mstp' | 'arcnet'; y: number; members: PhysicalLayoutSerialMember[] }
export interface PhysicalLayout { width: number; height: number; lanes: PhysicalLayoutLane[]; nodes: PhysicalLayoutNode[]; links: PhysicalLayoutLink[]; serialSegments: PhysicalLayoutSerialSegment[] }

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

function serialMemberLabel(project: DiagramProject, member: MstpSegmentMember): string {
  if (member.ref.kind === 'infrastructure') {
    const id = member.ref.infrastructureId;
    return project.infrastructure.find(item => item.id === id)?.name ?? 'Missing infrastructure';
  }
  const id = member.ref.deviceId;
  return project.subnets.flatMap(subnet => subnet.devices).find(item => item.id === id)?.name ?? 'Missing device';
}

function serialMemberId(member: MstpSegmentMember): string {
  return member.ref.kind === 'infrastructure' ? `infrastructure-${member.ref.infrastructureId}` : `device-${member.ref.deviceId}`;
}

function assignRouteLane(occupied: [number, number][][], start: number, end: number): number {
  const interval: [number, number] = [Math.min(start, end), Math.max(start, end)];
  const lane = occupied.findIndex(entries => entries.every(([from, to]) => interval[1] < from || interval[0] > to));
  const selected = lane === -1 ? occupied.length : lane;
  (occupied[selected] ??= []).push(interval);
  return selected;
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
  const endpointPoints = new Map(nodes.flatMap(node => node.ports.flatMap(port => port.endpoint ? [[endpointKey(port.endpoint), { ...port, node }] as const] : [])));
  const routeLanes: [number, number][][] = [];
  const laneByLocation = new Map(lanes.map(lane => [lane.id, lane]));
  const routingBaseY = 82 + laneHeight + 18;
  const links = project.physical.links.flatMap(link => {
    const a = endpointPoints.get(endpointKey(link.a)); const b = endpointPoints.get(endpointKey(link.b));
    if (!a || !b) return [];
    const aLane = laneByLocation.get(a.node.locationId ?? '')!;
    const bLane = laneByLocation.get(b.node.locationId ?? '')!;
    const aGutter = aLane.x < bLane.x ? aLane.x + aLane.width - 12 : aLane.x + 12;
    const bGutter = bLane.x < aLane.x ? bLane.x + bLane.width - 12 : bLane.x + 12;
    const sameLane = aLane.id === bLane.id;
    const startX = sameLane ? aLane.x + aLane.width - 12 : aGutter;
    const endX = sameLane ? startX : bGutter;
    const routeLane = assignRouteLane(routeLanes, startX, endX);
    const routeY = routingBaseY + routeLane * 16;
    const points = [
      [a.x, a.y], [a.x, a.y + 10], [startX, a.y + 10], [startX, routeY],
      [endX, routeY], [endX, b.y + 10], [b.x, b.y + 10], [b.x, b.y]
    ].map(point => point.join(',')).join(' ');
    return [{ id: link.id, label: link.label, media: link.media, status: link.status, points, routeLane }];
  });
  const width = Math.max(760, 48 + lanes.length * (LANE_WIDTH + LANE_GAP));
  const serialSource = [
    ...project.physical.mstpSegments.map(segment => ({ ...segment, protocol: 'mstp' as const })),
    ...project.physical.arcnetSegments.map(segment => ({ ...segment, protocol: 'arcnet' as const }))
  ];
  const serialStartY = routingBaseY + Math.max(1, routeLanes.length) * 16 + 42;
  const serialSegments = serialSource.map((segment, segmentIndex) => {
    const y = serialStartY + segmentIndex * 72;
    const memberWidth = segment.members.length > 1 ? (width - 112) / (segment.members.length - 1) : 0;
    return {
      id: segment.id, name: segment.name, protocol: segment.protocol, y,
      members: segment.members.map((member, index) => ({
        id: serialMemberId(member), label: serialMemberLabel(project, member),
        x: segment.members.length === 1 ? width / 2 : 56 + index * memberWidth, y,
        terminated: member.terminated, biasSource: member.biasSource
      }))
    };
  });
  const height = Math.max(520, serialSegments.length ? serialStartY + serialSegments.length * 72 : routingBaseY + routeLanes.length * 16 + 50);
  return { width, height, lanes, nodes, links, serialSegments };
}
