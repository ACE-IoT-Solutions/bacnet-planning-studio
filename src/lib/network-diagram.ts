import { getSubnetDetails, ipToLong } from './subnet';
import { createEmptyPhysicalLayer, type DiagramPhysicalLayer, type PhysicalPort, type PoeClass, type PhysicalMedia } from './physical';
import { pruneDanglingReferences } from './network-diagram-prune';

export type DeviceKind = 'controller' | 'workstation' | 'server' | 'sensor' | 'other';
export type InfrastructureKind = 'router' | 'switch' | 'firewall' | 'bbmd' | 'gateway' | 'sc-hub' | 'sc-hub-cluster' | 'media-converter' | 'mstp-repeater' | 'arcnet-repeater' | 'wireless-ap';
export type PathOutcome = 'success' | 'failure';
export type DiagramTestType = 'ping' | 'bacnet-whois' | 'custom';
export type DiagramNetworkType = 'bacnet-ip' | 'bacnet-sc' | 'mstp' | 'arcnet';

export interface DiagramDeviceAddress {
  id: string;
  subnetId: string;
  ip: string;
  label: string;
}

export interface DiagramNic {
  id: string;
  name: string;
  addresses: DiagramDeviceAddress[];
  bacnetIpEnabled?: boolean;
  bacnetScEnabled?: boolean;
  scHubRole?: 'node' | 'hub' | 'ha-hub';
  scHubUri?: string;
  scFailoverHubUri?: string;
  scHubId?: string;
  scHubL3Reachable?: boolean;
  physical?: { media: PhysicalMedia; speedMbps?: number; poePowered: boolean };
}

export interface DiagramDevice {
  id: string;
  name: string;
  kind: DeviceKind;
  notes: string;
  nics: DiagramNic[];
  /** Legacy fields retained only while importing version 1 projects. */
  ip?: string;
  additionalInterfaces?: DiagramDeviceAddress[];
  requiredForRouting?: boolean;
  bbmdEnabled?: boolean;
  bdtPeerDeviceIds?: string[];
  foreignDeviceBbmdId?: string;
  bacnetIpEnabled?: boolean;
  bacnetScEnabled?: boolean;
  scHubRole?: 'node' | 'hub' | 'ha-hub';
  scHubUri?: string;
  scFailoverHubUri?: string;
  scHubId?: string;
  scHubL3Reachable?: boolean;
  locationId?: string;
  poeClass?: PoeClass;
}

export interface DiagramSubnet {
  id: string;
  name: string;
  address: string;
  cidr: number;
  vlan: string;
  color: string;
  devices: DiagramDevice[];
  networkType?: DiagramNetworkType;
  udpPort?: number | '';
  bacnetNetworkNumber?: string;
  mstpBaudRate?: number;
  mstpMaxMaster?: number;
  arcnetDataRate?: number;
  upstreamSubnetId?: string;
  routerId?: string;
  scDirectConnections?: boolean;
}

export interface DiagramInfrastructure {
  id: string;
  name: string;
  kind: InfrastructureKind;
  ip: string;
  subnetIds: string[];
  notes: string;
  uri?: string;
  failoverIp?: string;
  failoverUri?: string;
  peerInfrastructureIds?: string[];
  underlaySubnetIds?: string[];
  ports?: PhysicalPort[];
  locationId?: string;
  model?: string;
  poeBudgetWatts?: number;
}

export interface DiagramTestPath {
  id: string;
  name: string;
  testType: DiagramTestType;
  protocol: string;
  broadcastAddress: string;
  udpPort?: number;
  outcome: PathOutcome;
  hops: string[];
  notes: string;
}

export interface DiagramProject {
  version: 2;
  title: string;
  notes: string;
  subnets: DiagramSubnet[];
  infrastructure: DiagramInfrastructure[];
  paths: DiagramTestPath[];
  viewMode?: 'detailed' | 'networks' | 'physical';
  allowSplitHorizonBdt?: boolean;
  physical: DiagramPhysicalLayer;
}

export type ConfigTargetKind = 'subnet' | 'device' | 'nic' | 'infrastructure' | 'path' | 'location' | 'panel' | 'link' | 'segment' | 'port';
export interface DiagramDiagnostic {
  level: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  targets?: { kind: ConfigTargetKind; id: string }[];
}

export const SUBNET_COLORS = ['#c1d200', '#94d8ff', '#a78bfa', '#fb923c', '#2dd4bf', '#f472b6'];

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDeviceAddress(subnetId = '', label = 'Primary'): DiagramDeviceAddress {
  return { id: createId('address'), subnetId, ip: '', label };
}

export function createNic(subnetId = '', index = 1): DiagramNic {
  return { id: createId('nic'), name: `NIC ${index}`, addresses: [createDeviceAddress(subnetId)], bacnetIpEnabled: true, bacnetScEnabled: false, scHubRole: 'node', scHubUri: '', scFailoverHubUri: '', scHubId: '', scHubL3Reachable: false, physical: { media: 'copper-utp', speedMbps: 1000, poePowered: false } };
}

export function createDevice(index = 1, subnetId = ''): DiagramDevice {
  return { id: createId('device'), name: `Device ${index}`, kind: 'controller', notes: '', nics: [createNic(subnetId)], bbmdEnabled: false, bdtPeerDeviceIds: [], foreignDeviceBbmdId: '' };
}

export function createSubnet(index = 1): DiagramSubnet {
  const thirdOctet = Math.min(254, index - 1);
  return {
    id: createId('subnet'),
    name: `Subnet ${index}`,
    address: `192.168.${thirdOctet}.0`,
    cidr: 24,
    vlan: '',
    color: SUBNET_COLORS[(index - 1) % SUBNET_COLORS.length],
    devices: [],
    networkType: 'bacnet-ip',
    udpPort: 47808,
    bacnetNetworkNumber: '',
    mstpBaudRate: 38400,
    mstpMaxMaster: 127,
    arcnetDataRate: 2500,
    upstreamSubnetId: '',
    routerId: ''
  };
}

export function createInfrastructure(index = 1): DiagramInfrastructure {
  return { id: createId('infra'), name: `Router ${index}`, kind: 'router', ip: '', subnetIds: [], notes: '', uri: '', failoverIp: '', failoverUri: '', peerInfrastructureIds: [], underlaySubnetIds: [] };
}

export function createTestPath(endpointIds: string[] = []): DiagramTestPath {
  return {
    id: createId('path'),
    name: 'Ping test',
    testType: 'ping',
    protocol: 'ICMP',
    broadcastAddress: '',
    udpPort: 47808,
    outcome: 'success',
    hops: endpointIds.slice(0, 2),
    notes: ''
  };
}

export function moveDeviceToSubnet(project: DiagramProject, deviceId: string, targetSubnetId: string): boolean {
  const source = project.subnets.find(subnet => subnet.devices.some(device => device.id === deviceId));
  const target = project.subnets.find(subnet => subnet.id === targetSubnetId);
  if (!source || !target || source.id === target.id) return false;
  const deviceIndex = source.devices.findIndex(device => device.id === deviceId);
  if (deviceIndex < 0) return false;
  const [device] = source.devices.splice(deviceIndex, 1);
  device.nics.forEach(nic => nic.addresses.forEach(address => {
    if (address.subnetId === source.id) address.subnetId = target.id;
  }));
  target.devices.push(device);
  return true;
}

export function createEmptyProject(): DiagramProject {
  return {
    version: 2,
    title: 'Untitled BACnet Network',
    notes: '',
    subnets: [],
    infrastructure: [],
    paths: [],
    viewMode: 'detailed',
    allowSplitHorizonBdt: false,
    physical: createEmptyPhysicalLayer()
  };
}

export function createDefaultProject(): DiagramProject {
  const first = createSubnet(1);
  first.name = 'Controls LAN';
  first.vlan = '10';
  first.devices = [
    { ...createDevice(1, first.id), name: 'BACnet Controller' },
    { ...createDevice(2, first.id), name: 'Operator Workstation', kind: 'workstation' }
  ];
  first.devices[0].nics[0].addresses[0].ip = '192.168.0.20';
  first.devices[1].nics[0].addresses[0].ip = '192.168.0.50';
  return {
    version: 2,
    title: 'BACnet Network Condition',
    notes: '',
    subnets: [first],
    infrastructure: [],
    paths: [],
    viewMode: 'detailed',
    allowSplitHorizonBdt: false,
    physical: createEmptyPhysicalLayer()
  };
}

export { createDiagramProjectFromPlan } from './diagram-import';
export function subnetCidr(subnet: DiagramSubnet): string {
  if (subnet.networkType === 'bacnet-sc') return `BACnet/SC · Network ${subnet.bacnetNetworkNumber || 'not set'}`;
  if (subnet.networkType === 'mstp') return `MS/TP · Network ${subnet.bacnetNetworkNumber || 'not set'} · ${subnet.mstpBaudRate || 38400} baud`;
  if (subnet.networkType === 'arcnet') return `ARCNET · Network ${subnet.bacnetNetworkNumber || 'not set'} · ${subnet.arcnetDataRate || 2500} kbps`;
  const details = getSubnetDetails(subnet.address, subnet.cidr);
  return details ? `${details.network}/${subnet.cidr}` : `${subnet.address}/${subnet.cidr}`;
}

export function deviceAddressState(device: DiagramDevice, subnet: DiagramSubnet): 'empty' | 'invalid' | 'outside' | 'valid' {
  const address = device.nics.flatMap(nic => nic.addresses).find(item => item.subnetId === subnet.id)
    ?? device.nics[0]?.addresses[0];
  return addressState(address, subnet);
}

export function addressState(item: DiagramDeviceAddress | undefined, subnet: DiagramSubnet | undefined): 'empty' | 'invalid' | 'outside' | 'valid' {
  if (!item?.ip.trim()) return 'empty';
  if (!subnet) return 'invalid';
  if (subnet.networkType === 'mstp') {
    const mac = Number(item.ip);
    return Number.isInteger(mac) && mac >= 0 && mac <= Math.min(127, subnet.mstpMaxMaster ?? 127) ? 'valid' : 'invalid';
  }
  if (subnet.networkType === 'arcnet') {
    const node = Number(item.ip);
    return Number.isInteger(node) && node >= 0 && node <= 255 ? 'valid' : 'invalid';
  }
  if (subnet.networkType === 'bacnet-sc') return ipToLong(item.ip) === null ? 'invalid' : 'valid';
  const ip = ipToLong(item.ip);
  const details = getSubnetDetails(subnet.address, subnet.cidr);
  if (ip === null || !details) return 'invalid';
  return ip >= details.networkLong && ip <= details.broadcastLong ? 'valid' : 'outside';
}

export { getDiagramDiagnostics } from './diagram-logical-diagnostics';
export function getWhoIsSuggestedBroadcast(project: DiagramProject, path: DiagramTestPath): string {
  const sourceId = path.hops[0];
  for (const subnet of project.subnets) {
    for (const device of subnet.devices) {
      for (const nic of device.nics) {
        const address = nic.addresses.find(item => item.id === sourceId);
        if (!address) continue;
        const addressSubnet = project.subnets.find(item => item.id === address.subnetId);
        return addressSubnet ? getSubnetDetails(addressSubnet.address, addressSubnet.cidr)?.broadcast ?? '' : '';
      }
    }
  }
  return '';
}

export function normalizeDiagramProject(project: DiagramProject): DiagramProject {
  project.version = 2;
  project.physical ??= createEmptyPhysicalLayer();
  project.physical.enabled ??= false;
  project.physical.locations ??= [];
  project.physical.patchPanels ??= [];
  project.physical.links ??= [];
  project.physical.mstpSegments ??= [];
  project.physical.arcnetSegments ??= [];
  project.viewMode ??= 'detailed';
  project.allowSplitHorizonBdt ??= false;
  for (const legacy of project.subnets.filter(subnet => subnet.networkType === 'bacnet-sc')) {
    const hubs = project.infrastructure.filter(item => (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster') && item.subnetIds.includes(legacy.id));
    const underlayId = hubs.flatMap(hub => hub.underlaySubnetIds ?? []).find(id => project.subnets.some(subnet => subnet.id === id && (!subnet.networkType || subnet.networkType === 'bacnet-ip')));
    const underlay = project.subnets.find(subnet => subnet.id === underlayId);
    if (!underlay) continue;
    for (const device of legacy.devices) {
      device.bacnetScEnabled = true;
      device.bacnetIpEnabled ??= false;
      for (const address of device.nics?.flatMap(nic => nic.addresses) ?? []) address.subnetId = underlay.id;
      underlay.devices.push(device);
    }
    for (const hub of hubs) {
      hub.subnetIds = [...new Set(hub.subnetIds.filter(id => id !== legacy.id).concat(underlay.id))];
      hub.underlaySubnetIds = [...new Set((hub.underlaySubnetIds ?? []).concat(underlay.id))];
    }
    project.subnets = project.subnets.filter(subnet => subnet.id !== legacy.id);
  }
  for (const legacyBbmd of project.infrastructure.filter(item => item.kind === 'bbmd')) {
    const ipSubnets = project.subnets.filter(candidate => !candidate.networkType || candidate.networkType === 'bacnet-ip');
    const subnet = ipSubnets.find(candidate => legacyBbmd.subnetIds.includes(candidate.id))
      ?? ipSubnets.find(candidate => addressState({ id: '', subnetId: candidate.id, ip: legacyBbmd.ip, label: '' }, candidate) === 'valid')
      ?? ipSubnets[0];
    if (!subnet) continue;
    const device = createDevice(subnet.devices.length + 1, subnet.id);
    device.id = legacyBbmd.id;
    device.name = legacyBbmd.name || 'Migrated BBMD';
    device.kind = 'controller';
    device.notes = legacyBbmd.notes ? `${legacyBbmd.notes} · migrated from IT infrastructure` : 'Migrated from IT infrastructure';
    device.bbmdEnabled = true;
    device.nics[0].name = 'BACnet/IP interface';
    device.nics[0].addresses[0].ip = legacyBbmd.ip;
    subnet.devices.push(device);
  }
  project.infrastructure = project.infrastructure.filter(item => item.kind !== 'bbmd');
  for (const subnet of project.subnets) {
    subnet.networkType ??= 'bacnet-ip';
    if (subnet.udpPort === undefined) subnet.udpPort = 47808;
    subnet.bacnetNetworkNumber ??= '';
    subnet.mstpBaudRate ??= 38400;
    subnet.mstpMaxMaster ??= 127;
    subnet.arcnetDataRate ??= 2500;
    subnet.upstreamSubnetId ??= '';
    subnet.routerId ??= '';
    subnet.scDirectConnections ??= false;
    for (const device of subnet.devices) {
      device.bbmdEnabled ??= false;
      device.bdtPeerDeviceIds ??= [];
      device.foreignDeviceBbmdId ??= '';
      device.poeClass ??= 'none';
      if (!Array.isArray(device.nics)) {
        const nic = createNic(subnet.id);
        nic.addresses[0].ip = device.ip ?? '';
        nic.addresses.push(...(device.additionalInterfaces ?? []).map((address, index) => ({
          ...address,
          id: address.id || createId('address'),
          label: address.label && address.label !== 'Secondary NIC' ? address.label : `Address ${index + 2}`
        })));
        device.nics = [nic];
      }
      device.nics.forEach((nic, index) => {
        const isLegacyPrimaryNic = index === 0;
        nic.bacnetIpEnabled ??= isLegacyPrimaryNic ? (device.bacnetIpEnabled ?? subnet.networkType !== 'bacnet-sc') : true;
        nic.bacnetScEnabled ??= isLegacyPrimaryNic ? (device.bacnetScEnabled ?? subnet.networkType === 'bacnet-sc') : false;
        nic.scHubRole ??= isLegacyPrimaryNic ? (device.scHubRole ?? 'node') : 'node';
        nic.scHubUri ??= isLegacyPrimaryNic ? (device.scHubUri ?? '') : '';
        nic.scFailoverHubUri ??= isLegacyPrimaryNic ? (device.scFailoverHubUri ?? '') : '';
        nic.scHubId ??= isLegacyPrimaryNic ? (device.scHubId ?? '') : '';
        nic.scHubL3Reachable ??= isLegacyPrimaryNic ? (device.scHubL3Reachable ?? false) : false;
        nic.physical ??= { media: subnet.networkType === 'mstp' || subnet.networkType === 'arcnet' ? 'rs485' : 'copper-utp', speedMbps: subnet.networkType === 'arcnet' ? 0.156 : subnet.networkType === 'mstp' ? undefined : 1000, poePowered: false };
      });
      delete device.ip;
      delete device.additionalInterfaces;
      delete device.bacnetIpEnabled;
      delete device.bacnetScEnabled;
      delete device.scHubRole;
      delete device.scHubUri;
      delete device.scFailoverHubUri;
      delete device.scHubId;
      delete device.scHubL3Reachable;
    }
  }
  for (const item of project.infrastructure) {
    item.uri ??= '';
    item.failoverIp ??= '';
    item.failoverUri ??= '';
    item.peerInfrastructureIds ??= [];
    item.underlaySubnetIds ??= [];
    item.ports ??= [];
    item.model ??= '';
  }
  if (!Array.isArray(project.paths)) project.paths = [];
  const devices = project.subnets.flatMap(subnet => subnet.devices);
  const deviceIds = new Set(devices.map(device => device.id));
  const bbmdIds = new Set(devices.filter(device => device.bbmdEnabled).map(device => device.id));
  for (const device of devices) {
    device.bdtPeerDeviceIds = [...new Set((device.bdtPeerDeviceIds ?? []).filter(id => id !== device.id && bbmdIds.has(id)))];
    if (!deviceIds.has(device.foreignDeviceBbmdId ?? '') || !bbmdIds.has(device.foreignDeviceBbmdId ?? '')) device.foreignDeviceBbmdId = '';
  }
  for (const path of project.paths) {
    if (!path.testType) path.testType = path.protocol.toLowerCase().includes('who-is') ? 'bacnet-whois' : 'ping';
    if (typeof path.broadcastAddress !== 'string') path.broadcastAddress = '';
    path.udpPort ??= 47808;
    path.hops = path.hops.map(endpointId => {
      const legacyHost = devices.find(device => device.id === endpointId);
      return legacyHost?.nics[0]?.addresses[0]?.id ?? endpointId;
    });
  }
  return pruneDanglingReferences(project);
}

export function isDiagramProject(value: unknown): value is DiagramProject {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DiagramProject>;
  const version = (value as { version?: unknown }).version;
  if ((version !== 1 && version !== 2) || typeof candidate.title !== 'string' || typeof candidate.notes !== 'string'
    || !Array.isArray(candidate.subnets) || !Array.isArray(candidate.infrastructure)) return false;

  const devicesValid = (devices: unknown): devices is DiagramDevice[] => Array.isArray(devices) && devices.every(device => {
    if (!device || typeof device !== 'object') return false;
    const item = device as Partial<DiagramDevice>;
    const legacyInterfacesValid = item.additionalInterfaces === undefined || (Array.isArray(item.additionalInterfaces) && item.additionalInterfaces.every(networkInterface => {
      if (!networkInterface || typeof networkInterface !== 'object') return false;
      const networkItem = networkInterface as Partial<DiagramDeviceAddress>;
      return typeof networkItem.id === 'string' && typeof networkItem.subnetId === 'string'
        && typeof networkItem.ip === 'string' && typeof networkItem.label === 'string';
    }));
    const nicsValid = item.nics === undefined || (Array.isArray(item.nics) && item.nics.every(nic => {
      if (!nic || typeof nic !== 'object') return false;
      const nicItem = nic as Partial<DiagramNic>;
      return typeof nicItem.id === 'string' && typeof nicItem.name === 'string' && Array.isArray(nicItem.addresses)
        && (nicItem.bacnetIpEnabled === undefined || typeof nicItem.bacnetIpEnabled === 'boolean')
        && (nicItem.bacnetScEnabled === undefined || typeof nicItem.bacnetScEnabled === 'boolean')
        && (nicItem.scHubRole === undefined || nicItem.scHubRole === 'node' || nicItem.scHubRole === 'hub' || nicItem.scHubRole === 'ha-hub')
        && (nicItem.scHubUri === undefined || typeof nicItem.scHubUri === 'string')
        && (nicItem.scFailoverHubUri === undefined || typeof nicItem.scFailoverHubUri === 'string')
        && (nicItem.scHubId === undefined || typeof nicItem.scHubId === 'string')
        && (nicItem.scHubL3Reachable === undefined || typeof nicItem.scHubL3Reachable === 'boolean')
        && nicItem.addresses.every(address => typeof address.id === 'string' && typeof address.subnetId === 'string'
          && typeof address.ip === 'string' && typeof address.label === 'string');
    }));
    return typeof item.id === 'string' && typeof item.name === 'string' && (item.ip === undefined || typeof item.ip === 'string')
      && typeof item.notes === 'string' && (item.scHubId === undefined || typeof item.scHubId === 'string')
      && (item.bbmdEnabled === undefined || typeof item.bbmdEnabled === 'boolean')
      && (item.bdtPeerDeviceIds === undefined || (Array.isArray(item.bdtPeerDeviceIds) && item.bdtPeerDeviceIds.every(id => typeof id === 'string')))
      && (item.foreignDeviceBbmdId === undefined || typeof item.foreignDeviceBbmdId === 'string')
      && (item.scHubL3Reachable === undefined || typeof item.scHubL3Reachable === 'boolean')
      && (item.bacnetIpEnabled === undefined || typeof item.bacnetIpEnabled === 'boolean') && (item.bacnetScEnabled === undefined || typeof item.bacnetScEnabled === 'boolean')
      && (item.scHubRole === undefined || item.scHubRole === 'node' || item.scHubRole === 'hub' || item.scHubRole === 'ha-hub')
      && ['controller', 'workstation', 'server', 'sensor', 'other'].includes(item.kind ?? '')
      && legacyInterfacesValid && nicsValid && (Array.isArray(item.nics) || typeof item.ip === 'string');
  });
  const subnetsValid = candidate.subnets.every(subnet => {
    if (!subnet || typeof subnet !== 'object') return false;
    const item = subnet as Partial<DiagramSubnet>;
    return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.address === 'string'
      && typeof item.cidr === 'number' && item.cidr >= 0 && item.cidr <= 32 && typeof item.vlan === 'string'
      && typeof item.color === 'string' && devicesValid(item.devices);
  });
  const infrastructureValid = candidate.infrastructure.every(infrastructure => {
    if (!infrastructure || typeof infrastructure !== 'object') return false;
    const item = infrastructure as Partial<DiagramInfrastructure>;
    return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.ip === 'string'
      && typeof item.notes === 'string' && ['router', 'switch', 'firewall', 'bbmd', 'gateway', 'sc-hub', 'sc-hub-cluster', 'media-converter', 'mstp-repeater', 'arcnet-repeater', 'wireless-ap'].includes(item.kind ?? '')
      && Array.isArray(item.subnetIds) && item.subnetIds.every(id => typeof id === 'string');
  });
  const pathsValid = candidate.paths === undefined || (Array.isArray(candidate.paths) && candidate.paths.every(path => {
    if (!path || typeof path !== 'object') return false;
    const item = path as Partial<DiagramTestPath>;
    return typeof item.id === 'string' && typeof item.name === 'string'
      && (item.testType === undefined || item.testType === 'ping' || item.testType === 'bacnet-whois' || item.testType === 'custom')
      && typeof item.protocol === 'string' && (item.broadcastAddress === undefined || typeof item.broadcastAddress === 'string')
      && (item.udpPort === undefined || typeof item.udpPort === 'number')
      && (item.outcome === 'success' || item.outcome === 'failure') && Array.isArray(item.hops)
      && item.hops.every(id => typeof id === 'string') && typeof item.notes === 'string';
  }));
  const physicalValid = version === 1 || (candidate.physical && typeof candidate.physical === 'object'
    && typeof candidate.physical.enabled === 'boolean' && Array.isArray(candidate.physical.locations)
    && Array.isArray(candidate.physical.patchPanels) && Array.isArray(candidate.physical.links)
    && Array.isArray(candidate.physical.mstpSegments) && Array.isArray(candidate.physical.arcnetSegments));
  return subnetsValid && infrastructureValid && pathsValid && Boolean(physicalValid);
}
