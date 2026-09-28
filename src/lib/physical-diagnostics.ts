import type { ConfigTargetKind, DiagramDiagnostic, DiagramProject } from './network-diagram';
import { hasL2Path, portAllowsVlan } from './physical-graph';
import { endpointKey, hasPhysicalEntities, resolveEndpoint, type MstpSegmentMember, type PhysicalEndpointRef } from './physical';
import { ARC156_MAX_LENGTH_METERS, ARC156_MAX_NODES, MSTP_MAX_UNIT_LOADS, POE_CLASS_RANK, POE_CLASS_WATTS, mediaReach, mstpLengthLimit } from './physical-limits';

const target = (kind: ConfigTargetKind, id: string) => ({ kind, id });

function endpointTarget(ref: PhysicalEndpointRef) {
  if (ref.kind === 'device-nic') return target('nic', ref.nicId);
  return target('port', ref.portId);
}

function isMediaConverter(project: DiagramProject, ref: PhysicalEndpointRef) {
  return ref.kind === 'infrastructure-port' && project.infrastructure.find(item => item.id === ref.infrastructureId)?.kind === 'media-converter';
}

function deviceSubnetVlan(project: DiagramProject, ref: PhysicalEndpointRef): string | undefined {
  if (ref.kind !== 'device-nic') return undefined;
  const device = project.subnets.flatMap(subnet => subnet.devices).find(item => item.id === ref.deviceId);
  const nic = device?.nics.find(item => item.id === ref.nicId);
  const subnetId = nic?.addresses[0]?.subnetId;
  return project.subnets.find(item => item.id === subnetId)?.vlan;
}

function serialMemberExistsOnSubnet(project: DiagramProject, member: MstpSegmentMember, subnetId: string) {
  if (member.ref.kind === 'infrastructure') return true;
  const deviceId = member.ref.deviceId;
  const device = project.subnets.flatMap(subnet => subnet.devices).find(item => item.id === deviceId);
  return device?.nics.some(nic => nic.addresses.some(address => address.subnetId === subnetId)) ?? false;
}

function serialTopologyDiagnostics(
  project: DiagramProject,
  protocol: 'MSTP' | 'ARCNET',
  segment: { id: string; subnetId: string; name: string; lengthMeters?: number; members: MstpSegmentMember[] },
  maxNodes: number,
  maxLength: number
): DiagramDiagnostic[] {
  const diagnostics: DiagramDiagnostic[] = [];
  const name = segment.name || (protocol === 'MSTP' ? 'MS/TP segment' : 'ARC156 segment');
  const terminations = segment.members.flatMap((member, index) => member.terminated ? [index] : []);
  if (segment.members.length > 1 && (terminations.length !== 2 || terminations[0] !== 0 || terminations[1] !== segment.members.length - 1)) {
    diagnostics.push({ level: 'error', code: `${protocol}-TERM`, message: `${name} needs termination at exactly the first and last node.`, targets: [target('segment', segment.id)] });
  }
  const biasCount = segment.members.filter(member => member.biasSource).length;
  if (protocol === 'MSTP' && biasCount !== 1) diagnostics.push({ level: 'warning', code: 'MSTP-BIAS', message: `${name} needs exactly one bias source; ${biasCount} are configured.`, targets: [target('segment', segment.id)] });
  const unitLoads = segment.members.reduce((sum, member) => sum + (member.unitLoad ?? 1), 0);
  if (unitLoads > maxNodes) diagnostics.push({ level: 'error', code: `${protocol}-NODES`, message: `${name} has ${unitLoads} unit loads; a repeater is required above ${maxNodes}.`, targets: [target('segment', segment.id)] });
  if ((segment.lengthMeters ?? 0) > maxLength) diagnostics.push({ level: 'warning', code: `${protocol}-LENGTH`, message: `${name} is ${segment.lengthMeters} m; the modeled limit is ${maxLength} m.`, targets: [target('segment', segment.id)] });
  for (const member of segment.members) {
    if (!serialMemberExistsOnSubnet(project, member, segment.subnetId)) diagnostics.push({
      level: 'error', code: `${protocol}-SEGMENT-SUBNET`, message: `${name} contains a device that has no address on its ${protocol === 'MSTP' ? 'MS/TP' : 'ARC156'} network.`,
      targets: [target('segment', segment.id), target(member.ref.kind === 'device' ? 'device' : 'infrastructure', member.ref.kind === 'device' ? member.ref.deviceId : member.ref.infrastructureId)]
    });
  }
  const internalRouters = segment.members.slice(1, -1).filter(member => member.ref.kind === 'infrastructure').length;
  if (internalRouters > 0) diagnostics.push({ level: 'warning', code: `${protocol}-ORDER`, message: `${name} has a router or repeater mid-chain; verify segment boundaries.`, targets: [target('segment', segment.id)] });
  return diagnostics;
}

export function getPhysicalDiagnostics(project: DiagramProject): DiagramDiagnostic[] {
  if (!project.physical || (!project.physical.enabled && !hasPhysicalEntities(project.physical))) return [];
  const diagnostics: DiagramDiagnostic[] = [];
  const endpointUses = new Map<string, string[]>();

  for (const link of project.physical.links) {
    const a = resolveEndpoint(project, link.a);
    const b = resolveEndpoint(project, link.b);
    if (!a || !b) {
      diagnostics.push({ level: 'error', code: 'PHY-LINK-DANGLING', message: `${link.label || 'Physical link'} references a missing endpoint.`, targets: [target('link', link.id)] });
      continue;
    }
    for (const ref of [link.a, link.b]) endpointUses.set(endpointKey(ref), [...(endpointUses.get(endpointKey(ref)) ?? []), link.id]);
    if (!isMediaConverter(project, link.a) && !isMediaConverter(project, link.b) && (a.media !== link.media || b.media !== link.media)) {
      diagnostics.push({ level: 'error', code: 'PHY-LINK-MEDIA', message: `${link.label || `${a.label} to ${b.label}`} uses ${link.media}, which does not match both endpoints.`, targets: [target('link', link.id), endpointTarget(link.a), endpointTarget(link.b)] });
    }
    const reach = mediaReach(link.media, Math.min(a.port?.speedMbps ?? 1000, b.port?.speedMbps ?? 1000));
    if (reach !== undefined && (link.lengthMeters ?? 0) > reach) diagnostics.push({ level: 'warning', code: 'PHY-LINK-LENGTH', message: `${link.label || `${a.label} to ${b.label}`} is ${link.lengthMeters} m; modeled reach is ${reach} m.`, targets: [target('link', link.id)] });

    const nicRef = link.a.kind === 'device-nic' ? link.a : link.b.kind === 'device-nic' ? link.b : undefined;
    const portEndpoint = nicRef === link.a ? b : nicRef === link.b ? a : undefined;
    const vlan = nicRef ? deviceSubnetVlan(project, nicRef) : undefined;
    if (nicRef && portEndpoint?.port?.vlanMode === 'access' && vlan && portEndpoint.port.accessVlan !== vlan) diagnostics.push({
      level: 'error', code: 'PHY-PORT-VLAN', message: `${portEndpoint.label} is access VLAN ${portEndpoint.port.accessVlan || 'unset'}, but the connected NIC is on VLAN ${vlan}.`,
      targets: [target('link', link.id), endpointTarget(nicRef), endpointTarget(portEndpoint.ref)]
    });
  }

  for (const [key, links] of endpointUses) if (links.length > 1) diagnostics.push({ level: 'error', code: 'PHY-PORT-DOUBLE', message: `Physical endpoint ${key} is used by ${links.length} links.`, targets: links.map(id => target('link', id)) });

  for (const link of project.physical.links) {
    if (link.a.kind !== 'infrastructure-port' || link.b.kind !== 'infrastructure-port') continue;
    const a = resolveEndpoint(project, link.a)?.port;
    const b = resolveEndpoint(project, link.b)?.port;
    if (a?.vlanMode !== 'trunk' || b?.vlanMode !== 'trunk') continue;
    const vlans = new Set([...(a.allowedVlans ?? []), ...(b.allowedVlans ?? []), a.nativeVlan ?? '', b.nativeVlan ?? ''].filter(Boolean));
    for (const vlan of vlans) if (portAllowsVlan(a, vlan) !== portAllowsVlan(b, vlan)) diagnostics.push({ level: 'error', code: 'PHY-TRUNK-VLAN', message: `${link.label || 'Switch trunk'} does not carry VLAN ${vlan} at both ends.`, targets: [target('link', link.id)] });
  }

  const nicEntries = project.subnets.flatMap(owner => owner.devices.flatMap(device => device.nics.map(nic => ({ owner, device, nic }))));
  for (const { device, nic } of nicEntries) {
    if ((nic.bacnetIpEnabled || nic.bacnetScEnabled) && !endpointUses.has(endpointKey({ kind: 'device-nic', deviceId: device.id, nicId: nic.id }))) diagnostics.push({ level: 'info', code: 'PHY-NIC-UNCABLED', message: `${device.name} ${nic.name} has BACnet enabled but no physical link.`, targets: [target('nic', nic.id)] });
  }
  for (let first = 0; first < nicEntries.length; first++) for (let second = first + 1; second < nicEntries.length; second++) {
    const a = nicEntries[first]; const b = nicEntries[second];
    const shared = a.nic.addresses.map(address => address.subnetId).find(id => b.nic.addresses.some(address => address.subnetId === id));
    if (!shared) continue;
    const subnet = project.subnets.find(item => item.id === shared);
    if (!subnet || (subnet.networkType && subnet.networkType !== 'bacnet-ip')) continue;
    const aLinked = endpointUses.has(endpointKey({ kind: 'device-nic', deviceId: a.device.id, nicId: a.nic.id }));
    const bLinked = endpointUses.has(endpointKey({ kind: 'device-nic', deviceId: b.device.id, nicId: b.nic.id }));
    if (aLinked && bLinked && !hasL2Path(project, { deviceId: a.device.id, nicId: a.nic.id }, { deviceId: b.device.id, nicId: b.nic.id }, subnet.vlan)) diagnostics.push({ level: 'warning', code: 'PHY-L2-PATH', message: `${a.device.name} and ${b.device.name} share ${subnet.name} but have no modeled Layer 2 path for VLAN ${subnet.vlan || 'untagged'}.`, targets: [target('nic', a.nic.id), target('nic', b.nic.id)] });
  }

  for (const infrastructure of project.infrastructure) {
    if (infrastructure.poeBudgetWatts === undefined) continue;
    let draw = 0;
    for (const link of project.physical.links) {
      const infraRef = link.a.kind === 'infrastructure-port' && link.a.infrastructureId === infrastructure.id ? link.a : link.b.kind === 'infrastructure-port' && link.b.infrastructureId === infrastructure.id ? link.b : undefined;
      const nicRef = link.a.kind === 'device-nic' ? link.a : link.b.kind === 'device-nic' ? link.b : undefined;
      if (!infraRef || !nicRef) continue;
      const port = infrastructure.ports?.find(item => item.id === infraRef.portId);
      const device = project.subnets.flatMap(subnet => subnet.devices).find(item => item.id === nicRef.deviceId);
      const required = device?.poeClass ?? 'none';
      draw += POE_CLASS_WATTS[required];
      if (POE_CLASS_RANK[port?.poe ?? 'none'] < POE_CLASS_RANK[required]) diagnostics.push({ level: 'error', code: 'PHY-POE-CLASS', message: `${infrastructure.name} ${port?.name || 'port'} cannot supply the ${required} class required by ${device?.name || 'device'}.`, targets: [target('port', infraRef.portId), target('device', nicRef.deviceId)] });
    }
    if (draw > infrastructure.poeBudgetWatts) diagnostics.push({ level: 'warning', code: 'PHY-POE-BUDGET', message: `${infrastructure.name} requires ${draw.toFixed(1)} W PoE but its budget is ${infrastructure.poeBudgetWatts} W.`, targets: [target('infrastructure', infrastructure.id)] });
  }

  for (const segment of project.physical.mstpSegments) {
    const subnet = project.subnets.find(item => item.id === segment.subnetId);
    diagnostics.push(...serialTopologyDiagnostics(project, 'MSTP', segment, MSTP_MAX_UNIT_LOADS, mstpLengthLimit(segment.cable, subnet?.mstpBaudRate ?? 38400)));
  }
  for (const segment of project.physical.arcnetSegments) diagnostics.push(...serialTopologyDiagnostics(project, 'ARCNET', segment, ARC156_MAX_NODES, ARC156_MAX_LENGTH_METERS));

  const represented = new Set([...project.physical.mstpSegments, ...project.physical.arcnetSegments].flatMap(segment => segment.members.flatMap(member => member.ref.kind === 'device' ? [member.ref.deviceId] : [])));
  for (const subnet of project.subnets.filter(item => item.networkType === 'mstp' || item.networkType === 'arcnet')) for (const device of subnet.devices) if (!represented.has(device.id)) diagnostics.push({ level: 'warning', code: subnet.networkType === 'mstp' ? 'MSTP-ORDER' : 'ARCNET-ORDER', message: `${device.name} is not assigned to a ${subnet.networkType === 'mstp' ? 'MS/TP' : 'ARC156'} physical segment.`, targets: [target('device', device.id), target('subnet', subnet.id)] });

  const locations = new Map(project.physical.locations.map(item => [item.id, item]));
  for (const location of project.physical.locations) {
    const visited = new Set([location.id]); let parentId = location.parentId;
    while (parentId && locations.has(parentId)) {
      if (visited.has(parentId)) { diagnostics.push({ level: 'error', code: 'LOC-CYCLE', message: `${location.name} is in a cyclic location hierarchy.`, targets: [target('location', location.id)] }); break; }
      visited.add(parentId); parentId = locations.get(parentId)?.parentId;
    }
  }
  return diagnostics;
}
