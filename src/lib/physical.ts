import type { DiagramProject } from './network-diagram';

export type PhysicalMedia = 'copper-utp' | 'copper-stp' | 'fiber-mm' | 'fiber-sm' | 'rs485' | 'coax' | 'wireless' | 'other';
export type PoeClass = 'none' | 'af' | 'at' | 'bt-type3' | 'bt-type4';
export type PortVlanMode = 'access' | 'trunk' | 'unmanaged';
export type LocationKind = 'campus' | 'building' | 'floor' | 'room' | 'closet' | 'rack' | 'panel';
export type LinkStatus = 'planned' | 'installed' | 'verified' | 'faulted';
export type MstpCable = 'stp-18awg' | 'stp-22awg' | 'stp-24awg' | 'other';

export interface PhysicalLocation { id: string; name: string; kind: LocationKind; parentId?: string; notes: string }

export interface PhysicalPort {
  id: string;
  name: string;
  media: PhysicalMedia;
  speedMbps?: number;
  enabled: boolean;
  vlanMode: PortVlanMode;
  accessVlan?: string;
  allowedVlans?: string[];
  nativeVlan?: string;
  poe?: PoeClass;
  notes: string;
}

export interface PatchPanel { id: string; name: string; locationId?: string; ports: PhysicalPort[]; notes: string }

export type PhysicalEndpointRef =
  | { kind: 'device-nic'; deviceId: string; nicId: string }
  | { kind: 'infrastructure-port'; infrastructureId: string; portId: string }
  | { kind: 'patch-panel-port'; panelId: string; portId: string };

export interface PhysicalLink {
  id: string;
  label: string;
  media: PhysicalMedia;
  lengthMeters?: number;
  status: LinkStatus;
  a: PhysicalEndpointRef;
  b: PhysicalEndpointRef;
  notes: string;
}

export interface MstpSegmentMember {
  ref: { kind: 'device'; deviceId: string } | { kind: 'infrastructure'; infrastructureId: string };
  terminated: boolean;
  biasSource: boolean;
  unitLoad?: number;
}

export interface MstpSegment {
  id: string;
  subnetId: string;
  name: string;
  cable: MstpCable;
  lengthMeters?: number;
  members: MstpSegmentMember[];
  notes: string;
}

/** BACnet ARC156 physical trunk used by Automated Logic/Carrier controllers. */
export interface ArcnetSegment {
  id: string;
  subnetId: string;
  name: string;
  cable: Extract<MstpCable, 'stp-22awg' | 'stp-24awg' | 'other'>;
  lengthMeters?: number;
  members: MstpSegmentMember[];
  notes: string;
}

export interface DiagramPhysicalLayer {
  enabled: boolean;
  locations: PhysicalLocation[];
  patchPanels: PatchPanel[];
  links: PhysicalLink[];
  mstpSegments: MstpSegment[];
  arcnetSegments: ArcnetSegment[];
}

export interface ResolvedPhysicalEndpoint {
  ref: PhysicalEndpointRef;
  label: string;
  media: PhysicalMedia;
  portId: string;
  ownerId: string;
  ownerKind: 'device' | 'infrastructure' | 'patch-panel';
  port?: PhysicalPort;
}

let sequence = 0;
function physicalId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function createEmptyPhysicalLayer(): DiagramPhysicalLayer {
  return { enabled: false, locations: [], patchPanels: [], links: [], mstpSegments: [], arcnetSegments: [] };
}

export function createLocation(name = 'New location', kind: LocationKind = 'closet', parentId?: string): PhysicalLocation {
  return { id: physicalId('location'), name, kind, parentId, notes: '' };
}

export function createPort(name = 'Port 1', template: Partial<Omit<PhysicalPort, 'id' | 'name'>> = {}): PhysicalPort {
  return {
    id: physicalId('port'), name, media: template.media ?? 'copper-utp', speedMbps: template.speedMbps ?? 1000,
    enabled: template.enabled ?? true, vlanMode: template.vlanMode ?? 'unmanaged', accessVlan: template.accessVlan ?? '',
    allowedVlans: [...(template.allowedVlans ?? [])], nativeVlan: template.nativeVlan ?? '', poe: template.poe ?? 'none', notes: template.notes ?? ''
  };
}

export function createPortRange(prefix: string, start: number, count: number, template: Partial<Omit<PhysicalPort, 'id' | 'name'>> = {}): PhysicalPort[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => createPort(`${prefix}${start + index}`, template));
}

export function createPatchPanel(name = 'Patch panel', ports: PhysicalPort[] = []): PatchPanel {
  return { id: physicalId('panel'), name, ports, notes: '' };
}

export function createLink(a: PhysicalEndpointRef, b: PhysicalEndpointRef, media: PhysicalMedia = 'copper-utp'): PhysicalLink {
  return { id: physicalId('link'), label: '', media, status: 'planned', a, b, notes: '' };
}

export function createMstpSegment(subnetId: string, name = 'MS/TP segment'): MstpSegment {
  return { id: physicalId('segment'), subnetId, name, cable: 'stp-18awg', members: [], notes: '' };
}

export function createArcnetSegment(subnetId: string, name = 'ARC156 segment'): ArcnetSegment {
  return { id: physicalId('arcnet-segment'), subnetId, name, cable: 'stp-22awg', members: [], notes: '' };
}

export function endpointKey(ref: PhysicalEndpointRef): string {
  if (ref.kind === 'device-nic') return `device:${ref.deviceId}:nic:${ref.nicId}`;
  if (ref.kind === 'infrastructure-port') return `infrastructure:${ref.infrastructureId}:port:${ref.portId}`;
  return `panel:${ref.panelId}:port:${ref.portId}`;
}

export function resolveEndpoint(project: DiagramProject, ref: PhysicalEndpointRef): ResolvedPhysicalEndpoint | undefined {
  if (ref.kind === 'device-nic') {
    const device = project.subnets.flatMap(subnet => subnet.devices).find(item => item.id === ref.deviceId);
    const nic = device?.nics.find(item => item.id === ref.nicId);
    if (!device || !nic) return undefined;
    return { ref, label: `${device.name} · ${nic.name}`, media: nic.physical?.media ?? 'copper-utp', portId: nic.id, ownerId: device.id, ownerKind: 'device' };
  }
  if (ref.kind === 'infrastructure-port') {
    const infrastructure = project.infrastructure.find(item => item.id === ref.infrastructureId);
    const port = infrastructure?.ports?.find(item => item.id === ref.portId);
    if (!infrastructure || !port) return undefined;
    return { ref, label: `${infrastructure.name} · ${port.name}`, media: port.media, portId: port.id, ownerId: infrastructure.id, ownerKind: 'infrastructure', port };
  }
  const panel = project.physical.patchPanels.find(item => item.id === ref.panelId);
  const port = panel?.ports.find(item => item.id === ref.portId);
  if (!panel || !port) return undefined;
  return { ref, label: `${panel.name} · ${port.name}`, media: port.media, portId: port.id, ownerId: panel.id, ownerKind: 'patch-panel', port };
}

export function endpointLabel(project: DiagramProject, ref: PhysicalEndpointRef): string {
  return resolveEndpoint(project, ref)?.label ?? 'Missing endpoint';
}

export function hasPhysicalEntities(layer: DiagramPhysicalLayer): boolean {
  return Boolean(layer.locations.length || layer.patchPanels.length || layer.links.length || layer.mstpSegments.length || layer.arcnetSegments.length);
}
