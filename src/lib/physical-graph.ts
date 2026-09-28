import type { DiagramProject } from './network-diagram';
import { endpointKey, resolveEndpoint, type PhysicalEndpointRef, type PhysicalPort } from './physical';

export interface PhysicalGraph {
  adjacency: Map<string, Set<string>>;
  refs: Map<string, PhysicalEndpointRef>;
}

const graphCache = new WeakMap<DiagramProject, Map<string, { signature: string; graph: PhysicalGraph }>>();

function graphSignature(project: DiagramProject) {
  return JSON.stringify({
    links: project.physical.links,
    panels: project.physical.patchPanels.map(panel => [panel.id, panel.ports]),
    infrastructure: project.infrastructure.map(item => [item.id, item.kind, item.ports])
  });
}

function portCarriesVlan(port: PhysicalPort | undefined, vlan: string): boolean {
  if (!port) return true;
  if (!port.enabled) return false;
  if (!vlan || port.vlanMode === 'unmanaged') return true;
  if (port.vlanMode === 'access') return port.accessVlan === vlan;
  return port.nativeVlan === vlan || (port.allowedVlans ?? []).includes(vlan);
}

function connect(adjacency: Map<string, Set<string>>, a: string, b: string) {
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  if (!adjacency.has(b)) adjacency.set(b, new Set());
  adjacency.get(a)!.add(b);
  adjacency.get(b)!.add(a);
}

export function buildPhysicalGraph(project: DiagramProject, vlan = ''): PhysicalGraph {
  const signature = graphSignature(project);
  const cached = graphCache.get(project)?.get(vlan);
  if (cached?.signature === signature) return cached.graph;
  const adjacency = new Map<string, Set<string>>();
  const refs = new Map<string, PhysicalEndpointRef>();
  for (const link of project.physical.links) {
    const a = resolveEndpoint(project, link.a);
    const b = resolveEndpoint(project, link.b);
    if (!a || !b || !portCarriesVlan(a.port, vlan) || !portCarriesVlan(b.port, vlan)) continue;
    const aKey = endpointKey(link.a);
    const bKey = endpointKey(link.b);
    refs.set(aKey, link.a);
    refs.set(bKey, link.b);
    connect(adjacency, aKey, bKey);
  }

  // Ports on a switch or media converter share its internal forwarding plane.
  for (const infrastructure of project.infrastructure.filter(item => item.kind === 'switch' || item.kind === 'media-converter' || item.kind === 'wireless-ap')) {
    const ports = (infrastructure.ports ?? []).filter(port => portCarriesVlan(port, vlan));
    for (let index = 1; index < ports.length; index++) {
      const first: PhysicalEndpointRef = { kind: 'infrastructure-port', infrastructureId: infrastructure.id, portId: ports[0].id };
      const next: PhysicalEndpointRef = { kind: 'infrastructure-port', infrastructureId: infrastructure.id, portId: ports[index].id };
      refs.set(endpointKey(first), first);
      refs.set(endpointKey(next), next);
      connect(adjacency, endpointKey(first), endpointKey(next));
    }
  }

  // Consecutive front/rear ports form patch-panel pass-through pairs.
  for (const panel of project.physical.patchPanels) {
    for (let index = 0; index + 1 < panel.ports.length; index += 2) {
      const a: PhysicalEndpointRef = { kind: 'patch-panel-port', panelId: panel.id, portId: panel.ports[index].id };
      const b: PhysicalEndpointRef = { kind: 'patch-panel-port', panelId: panel.id, portId: panel.ports[index + 1].id };
      refs.set(endpointKey(a), a);
      refs.set(endpointKey(b), b);
      connect(adjacency, endpointKey(a), endpointKey(b));
    }
  }
  const graph = { adjacency, refs };
  const projectCache = graphCache.get(project) ?? new Map();
  projectCache.set(vlan, { signature, graph });
  graphCache.set(project, projectCache);
  return graph;
}

export function hasL2Path(project: DiagramProject, nicA: { deviceId: string; nicId: string }, nicB: { deviceId: string; nicId: string }, vlan: string): boolean {
  const start = endpointKey({ kind: 'device-nic', ...nicA });
  const target = endpointKey({ kind: 'device-nic', ...nicB });
  if (start === target) return true;
  const graph = buildPhysicalGraph(project, vlan).adjacency;
  const queue = [start];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...(graph.get(current) ?? []));
  }
  return false;
}

export function portAllowsVlan(port: PhysicalPort | undefined, vlan: string): boolean {
  return portCarriesVlan(port, vlan);
}
