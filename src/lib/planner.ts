import { getSubnetDetails, ipToLong, longToIp } from './subnet';
import type { MstpCable } from './physical';

export interface PlannerPhysicalHints {
  closetName?: string;
  switchCount?: number;
  portsPerSwitch?: number;
  poeDevices?: number;
  mstpSegments?: number;
  mstpSegmentLengthMeters?: number;
  arcnetSegments?: number;
  arcnetSegmentLengthMeters?: number;
  cable?: MstpCable;
}

export interface PlannerSubnet {
  id: string;
  name: string;
  ip: string;
  cidr: number;
  gatewayOffset: number;
  vlan: number | '';
  port: number | '';
  bbmdEnabled: boolean;
  bbmdOffset: number;
  bmsPlaced: boolean;
  bmsRole: 'none' | 'bbmd' | 'fdr';
  bmsUsesBacnetIp?: boolean;
  bmsUsesBacnetSc?: boolean;
  fdrTargetSubnetId: string;
  plannedDevices?: number;
  routeTargets?: string[];
  networkType?: 'bacnet-ip' | 'bacnet-sc' | 'mstp' | 'arcnet';
  bacnetNetworkNumber?: number | '';
  mstpBaudRate?: number;
  mstpMaxMaster?: number;
  arcnetDataRate?: number;
  upstreamIpSubnetId?: string;
  routerName?: string;
  routerIp?: string;
  scPrimaryHubName?: string;
  scEnabled?: boolean;
  scPrimaryHubIp?: string;
  scPrimaryHubUri?: string;
  scFailoverEnabled?: boolean;
  scFailoverHubName?: string;
  scFailoverHubIp?: string;
  scFailoverHubUri?: string;
  scUnderlaySubnetIds?: string[];
  physical?: PlannerPhysicalHints;
}

export function isIpNetwork(subnet: PlannerSubnet): boolean {
  return !subnet.networkType || subnet.networkType === 'bacnet-ip';
}

export function getBmsHostOffset(subnet: PlannerSubnet): number {
  return subnet.bmsRole === 'bbmd' && subnet.bbmdEnabled ? subnet.bbmdOffset : 20;
}

export interface PlannerState {
  splitHorizon: boolean;
  subnets: PlannerSubnet[];
}

export interface PlannerProject extends PlannerState {
  version: 2;
  kind: 'ace-bacnet-network-plan';
}

export function createPlannerProject(subnets: PlannerSubnet[], splitHorizon: boolean): PlannerProject {
  return { version: 2, kind: 'ace-bacnet-network-plan', splitHorizon, subnets };
}

export function isPlannerProject(value: unknown): value is PlannerProject {
  if (!value || typeof value !== 'object') return false;
  const project = value as Partial<PlannerProject>;
  const version = (value as { version?: unknown }).version;
  if ((version !== 1 && version !== 2) || project.kind !== 'ace-bacnet-network-plan' || typeof project.splitHorizon !== 'boolean' || !Array.isArray(project.subnets)) return false;

  return project.subnets.every(subnet => {
    if (!subnet || typeof subnet !== 'object') return false;
    const item = subnet as Partial<PlannerSubnet>;
    const vlanValid = item.vlan === '' || typeof item.vlan === 'number';
    const portValid = item.port === '' || typeof item.port === 'number';
    const networkTypeValid = item.networkType === undefined || ['bacnet-ip', 'bacnet-sc', 'mstp', 'arcnet'].includes(item.networkType);
    const stringArrayValid = (list: unknown) => list === undefined || (Array.isArray(list) && list.every(entry => typeof entry === 'string'));
    return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.ip === 'string'
      && typeof item.cidr === 'number' && item.cidr >= 0 && item.cidr <= 32
      && typeof item.gatewayOffset === 'number' && vlanValid && portValid
      && typeof item.bbmdEnabled === 'boolean' && typeof item.bbmdOffset === 'number'
      && typeof item.bmsPlaced === 'boolean' && (item.bmsRole === 'none' || item.bmsRole === 'bbmd' || item.bmsRole === 'fdr')
      && typeof item.fdrTargetSubnetId === 'string' && networkTypeValid
      && stringArrayValid(item.routeTargets) && stringArrayValid(item.scUnderlaySubnetIds);
  });
}

/**
 * Calculates optimized CIDR based on planned devices count
 * with 20% headroom and at least 10 spare IPs (minimum size /27)
 */
export function calculateAutoSizeCidr(plannedDevices: number): number {
  const requiredHosts = Math.max(Math.ceil(plannedDevices * 1.20), plannedDevices + 10);
  let targetCidr = 27;
  for (let c = 27; c >= 16; c--) {
    const usable = (1 << (32 - c)) - 2;
    if (usable >= requiredHosts) {
      targetCidr = c;
      break;
    }
  }
  return targetCidr;
}

/**
 * Finds the next non-overlapping IP block for a subnet candidates search
 */
export function findNextAvailableSubnetBlock(
  targetSub: PlannerSubnet,
  cidrVal: number,
  subnets: PlannerSubnet[]
): string | null {
  const activeRanges: { start: number; end: number }[] = [];
  subnets.forEach(s => {
    if (s.id !== targetSub.id && isIpNetwork(s)) {
      const details = getSubnetDetails(s.ip, s.cidr);
      if (details) {
        activeRanges.push({ start: details.networkLong, end: details.broadcastLong });
      }
    }
  });

  const targetIpLong = ipToLong(targetSub.ip);
  if (targetIpLong === null) return null;

  const maskLong = (0xffffffff << (32 - cidrVal)) >>> 0;
  let candidateStart = (targetIpLong & maskLong) >>> 0;
  const blockSize = (1 << (32 - cidrVal)) >>> 0;

  // Search up to 256 subnet blocks forward
  for (let step = 0; step < 256; step++) {
    const candidateEnd = (candidateStart + blockSize - 1) >>> 0;

    let overlaps = false;
    for (let r = 0; r < activeRanges.length; r++) {
      if (candidateStart <= activeRanges[r].end && candidateEnd >= activeRanges[r].start) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      return longToIp(candidateStart);
    }

    candidateStart = (candidateStart + blockSize) >>> 0;
  }

  return null;
}

/**
 * Classifies the overlap relationship between two subnets.
 * Returns null if they do not overlap in IP address space.
 */
export function classifyOverlap(
  s1: PlannerSubnet,
  s2: PlannerSubnet
): { type: 'error' | 'warning'; text: string } | null {
  if (!isIpNetwork(s1) || !isIpNetwork(s2)) return null;
  const details1 = getSubnetDetails(s1.ip, s1.cidr);
  const details2 = getSubnetDetails(s2.ip, s2.cidr);
  if (!details1 || !details2) return null;

  const overlap = details1.networkLong <= details2.broadcastLong && details2.networkLong <= details1.broadcastLong;
  if (!overlap) return null;

  const port1 = s1.port || 47808;
  const port2 = s2.port || 47808;

  if (s1.vlan === s2.vlan) {
    if (port1 === port2) {
      return {
        type: 'error',
        text: `Conflict: Subnet "${s1.name}" and "${s2.name}" overlap in IP range on the same VLAN (VLAN ${s1.vlan || 'default'}) and use the same BACnet port (${port1}). This will cause host IP clashes.`
      };
    } else {
      return {
        type: 'warning',
        text: `Note: Subnets "${s1.name}" and "${s2.name}" share VLAN ${s1.vlan || 'default'} and IP range, but operate on different UDP ports (${port1} vs ${port2}) as separate BACnet networks.`
      };
    }
  } else {
    return {
      type: 'warning',
      text: `Warning: Subnets "${s1.name}" and "${s2.name}" overlap in IP range but reside on separate VLANs (VLAN ${s1.vlan || 'default'} vs VLAN ${s2.vlan || 'default'}).`
    };
  }
}
