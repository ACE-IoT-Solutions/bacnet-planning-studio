import { computed, type Ref } from 'vue';
import type { LogicalDiagramModel } from '../components/diagram/LogicalDiagramSvg.vue';
import type { DiagramDevice, DiagramDeviceAddress, DiagramProject, DiagramSubnet } from '../lib/network-diagram';
import type { PhysicalEndpointRef } from '../lib/physical';

interface HostNode { device: DiagramDevice; ownerSubnet: DiagramSubnet }
interface Point { x: number; y: number }
type RelationshipMode = 'highlights' | 'focused' | 'all' | 'hidden';
type RenderHelpers = Pick<LogicalDiagramModel,
  'clipped' | 'validConnections' | 'infrastructureConnectionLabel' | 'connectionPath' |
  'connectionKindClass' | 'connectionTargetX' | 'connectionTargetY' | 'infrastructureX' |
  'infrastructureY' | 'focusConfig' | 'fieldBusRoutePath' | 'networkCenter' | 'networkY' |
  'routerName' | 'networkX' | 'roundedTopAccentPath' | 'networkDiagramLabel' | 'subnetCidr' |
  'subnetMetaLabel' | 'hostRelationshipClass' | 'hostX' | 'hostYFor' | 'activateHostNode' |
  'deviceTooltip' | 'deviceServiceLabel' | 'hostAddressRows' | 'addressCount' |
  'hostRelationshipBadge'>;

interface Options {
  project: Ref<DiagramProject>;
  hostNodes: Ref<HostNode[]>;
  hostHeight: Ref<number>;
  ipHostLayerBottom: Ref<number>;
  relationshipMode: Ref<RelationshipMode>;
  focusedBbmdId: Ref<string>;
  canvasWidth: Ref<number>;
  canvasHeight: Ref<number>;
  subnetY: Ref<number>;
  ipHostNodes: Ref<HostNode[]>;
  ipHostY: Ref<number>;
  fieldSegments: Ref<DiagramSubnet[]>;
  fieldBusY: Ref<number>;
  fieldHostNodes: Ref<HostNode[]>;
  fieldHostY: Ref<number>;
  showPhysicalOverlay: Ref<boolean>;
  diagnosticTargetKeys: Ref<string[]>;
  legendColumns: Ref<number>;
  legendCardWidth: Ref<number>;
  legendTextLimit: Ref<number>;
  legendStart: Ref<number>;
  subnetWidth: number;
  subnetHeight: number;
  hostWidth: number;
  displayAddress: (address: DiagramDeviceAddress) => string;
  allAddresses: (device: DiagramDevice) => DiagramDeviceAddress[];
  helpers: RenderHelpers;
}

export function useLogicalDiagramLinks(options: Options) {
  const {
    project, hostNodes, hostHeight, ipHostLayerBottom, relationshipMode, focusedBbmdId,
    canvasWidth, canvasHeight, subnetY, ipHostNodes, ipHostY, fieldSegments, fieldBusY,
    fieldHostNodes, fieldHostY, showPhysicalOverlay, diagnosticTargetKeys, legendColumns,
    legendCardWidth, legendTextLimit, legendStart, subnetWidth, subnetHeight, hostWidth,
    displayAddress, allAddresses, helpers
  } = options;

  const addressLinks = computed(() => hostNodes.value.flatMap((host, hostIndex) => {
    const addressTotal = helpers.addressCount(host.device);
    let flatAddressIndex = 0;
    return host.device.nics.flatMap(nic => nic.addresses.flatMap(address => {
      const target = project.value.subnets.find(candidate => candidate.id === address.subnetId);
      if (!target) return [];
      const offset = (flatAddressIndex++ - (addressTotal - 1) / 2) * 12;
      const start = { x: helpers.networkX(target) + subnetWidth / 2 + offset, y: helpers.networkY(target) + subnetHeight };
      const end = { x: helpers.hostX(host, hostIndex) + hostWidth / 2 + offset, y: helpers.hostYFor(host) };
      const midY = (start.y + end.y) / 2;
      return [{
        id: address.id, path: `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`,
        color: target.color, label: `${nic.name} · ${displayAddress(address)}`,
        startX: start.x, startY: start.y, endX: end.x, endY: end.y, labelX: (start.x + end.x) / 2, labelY: midY - 6
      }];
    }));
  }));

  const scLinks = computed(() => hostNodes.value.flatMap((host, hostIndex) => host.device.nics.flatMap((nic, nicIndex) => {
    if (!nic.bacnetScEnabled || !nic.scHubId) return [];
    const sourceX = helpers.hostX(host, hostIndex) + hostWidth / 2 + (nicIndex - (host.device.nics.length - 1) / 2) * 18;
    const sourceY = helpers.hostYFor(host) + hostHeight.value;
    const infrastructureIndex = project.value.infrastructure.findIndex(item => item.id === nic.scHubId);
    let targetX = 0; let targetY = 0; let targetName = '';
    if (infrastructureIndex >= 0) {
      const target = project.value.infrastructure[infrastructureIndex];
      targetX = helpers.infrastructureX(infrastructureIndex);
      targetY = helpers.infrastructureY(infrastructureIndex) + 72;
      targetName = target.name;
    } else {
      const targetHostIndex = hostNodes.value.findIndex(candidate => candidate.device.nics.some(candidateNic => candidateNic.id === nic.scHubId));
      if (targetHostIndex < 0) return [];
      const targetHost = hostNodes.value[targetHostIndex];
      targetX = helpers.hostX(targetHost, targetHostIndex) + hostWidth / 2;
      targetY = helpers.hostYFor(targetHost) + hostHeight.value;
      targetName = targetHost.device.name;
    }
    const controlY = Math.max(sourceY, targetY) + 52;
    return [{
      id: `sc-${nic.id}-${nic.scHubId}`, label: `BACnet/SC · ${host.device.name} ${nic.name} → ${targetName}`,
      path: `M ${sourceX} ${sourceY} C ${sourceX} ${controlY}, ${targetX} ${controlY}, ${targetX} ${targetY}`,
      startX: sourceX, startY: sourceY, endX: targetX, endY: targetY
    }];
  })));

  function deviceRelationshipPoint(deviceId: string, offset = 0): Point | null {
    const hostIndex = hostNodes.value.findIndex(host => host.device.id === deviceId);
    if (hostIndex < 0) return null;
    const host = hostNodes.value[hostIndex];
    return { x: helpers.hostX(host, hostIndex) + hostWidth / 2 + offset, y: helpers.hostYFor(host) + hostHeight.value };
  }

  const bdtLinks = computed(() => {
    const seen = new Set<string>();
    return hostNodes.value.flatMap((host, relationshipIndex) => (host.device.bdtPeerDeviceIds ?? []).flatMap(peerId => {
      const pair = [host.device.id, peerId].sort();
      const peer = hostNodes.value.find(candidate => candidate.device.id === peerId && candidate.device.bbmdEnabled);
      const mutual = peer?.device.bdtPeerDeviceIds?.includes(host.device.id) ?? false;
      const id = mutual ? `bdt-${pair.join('-')}` : `bdt-${host.device.id}-${peerId}`;
      if (seen.has(id)) return [];
      seen.add(id);
      const start = deviceRelationshipPoint(host.device.id, -12);
      const end = deviceRelationshipPoint(peerId, -12);
      if (!peer || !start || !end) return [];
      const depth = Math.max(start.y, end.y, ipHostLayerBottom.value) + 48 + (relationshipIndex % 4) * 14;
      return [{
        id, sourceId: host.device.id, targetId: peerId, mutual,
        label: mutual ? `Mutual BDT · ${host.device.name} ↔ ${peer.device.name}` : `BDT entry · ${host.device.name} → ${peer.device.name}`,
        path: `M ${start.x} ${start.y} C ${start.x} ${depth}, ${end.x} ${depth}, ${end.x} ${end.y}`,
        startX: start.x, startY: start.y, endX: end.x, endY: end.y,
        labelX: (start.x + end.x) / 2, labelY: depth - 5
      }];
    }));
  });

  const fdrLinks = computed(() => hostNodes.value.flatMap((host, relationshipIndex) => {
    const targetId = host.device.foreignDeviceBbmdId;
    if (!targetId) return [];
    const target = hostNodes.value.find(candidate => candidate.device.id === targetId && candidate.device.bbmdEnabled);
    const start = deviceRelationshipPoint(host.device.id, 12);
    const end = deviceRelationshipPoint(targetId, 12);
    if (!target || !start || !end) return [];
    const depth = Math.max(start.y, end.y, ipHostLayerBottom.value) + 104 + (relationshipIndex % 3) * 14;
    return [{
      id: `fdr-${host.device.id}-${targetId}`, sourceId: host.device.id, targetId,
      label: `Foreign Device Registration · ${host.device.name} → ${target.device.name}`,
      path: `M ${start.x} ${start.y} C ${start.x} ${depth}, ${end.x} ${depth}, ${end.x} ${end.y}`,
      startX: start.x, startY: start.y, endX: end.x, endY: end.y,
      labelX: (start.x + end.x) / 2, labelY: depth - 5
    }];
  }));

  const displayedBdtLinks = computed(() => relationshipMode.value === 'all' ? bdtLinks.value
    : relationshipMode.value === 'focused' && focusedBbmdId.value
      ? bdtLinks.value.filter(link => link.sourceId === focusedBbmdId.value || link.targetId === focusedBbmdId.value) : []);
  const displayedFdrLinks = computed(() => relationshipMode.value === 'all' ? fdrLinks.value
    : relationshipMode.value === 'focused' && focusedBbmdId.value
      ? fdrLinks.value.filter(link => link.sourceId === focusedBbmdId.value || link.targetId === focusedBbmdId.value) : []);

  function physicalEndpointPoint(ref: PhysicalEndpointRef): Point | null {
    if (ref.kind === 'infrastructure-port') {
      const index = project.value.infrastructure.findIndex(item => item.id === ref.infrastructureId);
      return index < 0 ? null : { x: helpers.infrastructureX(index), y: helpers.infrastructureY(index) + 72 };
    }
    if (ref.kind === 'device-nic') {
      const index = hostNodes.value.findIndex(item => item.device.id === ref.deviceId);
      const host = hostNodes.value[index];
      return host ? { x: helpers.hostX(host, index) + hostWidth / 2, y: helpers.hostYFor(host) + hostHeight.value } : null;
    }
    return null;
  }
  const physicalOverlayLinks = computed(() => project.value.physical.links.flatMap(link => {
    const a = physicalEndpointPoint(link.a); const b = physicalEndpointPoint(link.b);
    return a && b ? [{ id: link.id, label: link.label || link.media, points: `${a.x},${a.y} ${b.x},${b.y}` }] : [];
  }));

  function resolveAddressEndpoint(endpointId: string) {
    for (let hostIndex = 0; hostIndex < hostNodes.value.length; hostIndex++) {
      const host = hostNodes.value[hostIndex];
      for (const nic of host.device.nics) {
        const address = nic.addresses.find(item => item.id === endpointId);
        if (address) return { host, hostIndex, nic, address };
      }
    }
    return null;
  }
  function endpointPoint(endpointId: string): Point | null {
    const infrastructureIndex = project.value.infrastructure.findIndex(item => item.id === endpointId);
    if (infrastructureIndex >= 0) return { x: helpers.infrastructureX(infrastructureIndex), y: helpers.infrastructureY(infrastructureIndex) + 72 };
    const resolved = resolveAddressEndpoint(endpointId);
    if (!resolved) return null;
    const addresses = allAddresses(resolved.host.device);
    const offset = (addresses.findIndex(address => address.id === endpointId) - (addresses.length - 1) / 2) * 12;
    return { x: helpers.hostX(resolved.host, resolved.hostIndex) + hostWidth / 2 + offset, y: helpers.hostYFor(resolved.host) + hostHeight.value };
  }
  const pathSegments = computed(() => project.value.paths.flatMap((path, pathIndex) => path.hops.slice(0, -1).flatMap((endpointId, index) => {
    const start = endpointPoint(endpointId); const end = endpointPoint(path.hops[index + 1]);
    if (!start || !end) return [];
    const controlY = start.y > 300 && end.y > 300 ? Math.max(start.y, end.y) + 38 + pathIndex * 18 : (start.y + end.y) / 2 + pathIndex * 12;
    return [{ id: `${path.id}-${index}`, outcome: path.outcome,
      path: `M ${start.x} ${start.y} C ${start.x} ${controlY}, ${end.x} ${controlY}, ${end.x} ${end.y}`,
      label: `${path.name} — ${path.protocol || 'Test'} ${path.outcome === 'success' ? 'passed' : 'failed'}` }];
  })));
  function endpointName(id: string) {
    const infrastructure = project.value.infrastructure.find(item => item.id === id);
    if (infrastructure) return `${infrastructure.name || 'Unnamed infrastructure'} [${infrastructure.ip || 'IP not set'}]`;
    const resolved = resolveAddressEndpoint(id);
    return resolved ? `${resolved.host.device.name || 'Unnamed host'} [${displayAddress(resolved.address)}]` : 'Missing endpoint';
  }
  const pathLegends = computed(() => project.value.paths.map((path, index) => ({
    id: path.id, outcome: path.outcome, name: path.name || 'Connectivity test', protocol: path.protocol || 'Test',
    rows: [
      { label: 'FROM', value: endpointName(path.hops[0] ?? '') },
      ...(path.hops.length > 2 ? [{ label: 'VIA', value: path.hops.slice(1, -1).map(endpointName).join(' → ') }] : []),
      { label: 'TO', value: endpointName(path.hops[path.hops.length - 1] ?? '') },
      ...(path.testType === 'bacnet-whois' ? [{ label: 'BROADCAST', value: `${path.broadcastAddress || 'Not specified'}:${path.udpPort || 47808}` }] : [])
    ],
    x: 40 + (index % legendColumns.value) * (legendCardWidth.value + 20),
    y: legendStart.value + Math.floor(index / legendColumns.value) * 124
  })));
  const legendCardHeight = (legend: { rows: unknown[] }) => 37 + legend.rows.length * 19;

  const logicalDiagramModel = computed<LogicalDiagramModel>(() => ({
    project: project.value, canvasWidth: canvasWidth.value, canvasHeight: canvasHeight.value,
    subnetY: subnetY.value, ipHostNodes: ipHostNodes.value, ipHostY: ipHostY.value,
    fieldSegments: fieldSegments.value, fieldBusY: fieldBusY.value, fieldHostNodes: fieldHostNodes.value,
    fieldHostY: fieldHostY.value, showPhysicalOverlay: showPhysicalOverlay.value,
    physicalOverlayLinks: physicalOverlayLinks.value, diagnosticTargetKeys: diagnosticTargetKeys.value,
    addressLinks: addressLinks.value, scLinks: scLinks.value, displayedBdtLinks: displayedBdtLinks.value,
    displayedFdrLinks: displayedFdrLinks.value, hostNodes: hostNodes.value, hostHeight: hostHeight.value,
    pathSegments: pathSegments.value, pathLegends: pathLegends.value, legendStart: legendStart.value,
    legendCardWidth: legendCardWidth.value, legendTextLimit: legendTextLimit.value,
    subnetWidth, subnetHeight, hostWidth, ...helpers, legendCardHeight
  }));

  return { logicalDiagramModel, resolveAddressEndpoint };
}
