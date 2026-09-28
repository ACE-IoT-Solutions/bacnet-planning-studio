import { getOffsetIp } from './subnet';
import { getBmsHostOffset, isIpNetwork, type PlannerSubnet } from './planner';
import {
  createDevice, createInfrastructure, createSubnet,
  type DiagramDevice, type DiagramInfrastructure, type DiagramProject
} from './network-diagram';
import { createArcnetSegment, createEmptyPhysicalLayer, createLocation, createMstpSegment, createPortRange } from './physical';

export function createDiagramProjectFromPlan(plan: PlannerSubnet[], splitHorizon = false): DiagramProject {
  const idMap = new Map(plan.map(subnet => [subnet.id, `plan-${subnet.id}`]));
  const subnets = plan.map((source, index) => {
    const subnet = createSubnet(index + 1);
    subnet.id = idMap.get(source.id)!;
    subnet.name = source.name;
    subnet.networkType = source.networkType || 'bacnet-ip';
    subnet.address = source.ip;
    subnet.cidr = source.cidr;
    subnet.vlan = source.vlan === '' ? '' : String(source.vlan);
    subnet.udpPort = source.port || 47808;
    subnet.bacnetNetworkNumber = source.bacnetNetworkNumber === '' ? '' : String(source.bacnetNetworkNumber ?? '');
    subnet.mstpBaudRate = source.mstpBaudRate ?? 38400;
    subnet.mstpMaxMaster = source.mstpMaxMaster ?? 127;
    subnet.arcnetDataRate = source.arcnetDataRate ?? 2500;
    subnet.upstreamSubnetId = source.upstreamIpSubnetId ? idMap.get(source.upstreamIpSubnetId) || '' : '';
    subnet.devices = [];
    return subnet;
  });
  const ipSources = plan.filter(isIpNetwork);
  const infrastructure: DiagramInfrastructure[] = [];

  if (ipSources.length) {
    const coreRouter = createInfrastructure(1);
    coreRouter.name = 'Core Router';
    coreRouter.kind = 'router';
    coreRouter.subnetIds = ipSources.map(source => idMap.get(source.id)!);
    coreRouter.notes = `Planned gateway interfaces: ${ipSources.map(source => `${source.name} ${getOffsetIp(source.ip, source.cidr, source.gatewayOffset) || 'address not set'}`).join(' · ')}`;
    infrastructure.push(coreRouter);
  }

  const scHubs = ipSources.filter(item => item.scEnabled && item.scPrimaryHubName?.trim()).map(source => {
    const hub = createInfrastructure(infrastructure.length + 1);
    hub.name = source.scFailoverEnabled ? `${source.scPrimaryHubName} HA Cluster` : source.scPrimaryHubName!;
    hub.kind = source.scFailoverEnabled ? 'sc-hub-cluster' : 'sc-hub';
    hub.ip = source.scPrimaryHubIp || '';
    hub.uri = source.scPrimaryHubUri || '';
    hub.failoverIp = source.scFailoverHubIp || '';
    hub.failoverUri = source.scFailoverHubUri || '';
    hub.subnetIds = [idMap.get(source.id)!];
    hub.underlaySubnetIds = [...hub.subnetIds];
    hub.notes = source.scFailoverEnabled ? `Primary: ${source.scPrimaryHubName}; failover: ${source.scFailoverHubName || 'unnamed'}` : 'BACnet/SC primary hub';
    return hub;
  });
  infrastructure.push(...scHubs);

  const bbmdBySourceId = new Map<string, DiagramDevice>();
  const bmsSource = ipSources.find(item => item.bmsPlaced);
  if (bmsSource) {
    const bmsSubnet = subnets.find(item => item.id === idMap.get(bmsSource.id));
    if (bmsSubnet) {
      const bms = createDevice(bmsSubnet.devices.length + 1, bmsSubnet.id);
      bms.name = bmsSource.bmsRole === 'bbmd' ? 'BMS Server / BBMD' : 'BMS Server';
      bms.kind = 'server';
      bms.bbmdEnabled = bmsSource.bmsRole === 'bbmd';
      bms.nics[0].name = 'BMS network interface';
      bms.nics[0].addresses[0].ip = getOffsetIp(bmsSource.ip, bmsSource.cidr, getBmsHostOffset(bmsSource)) || '';
      bms.nics[0].bacnetIpEnabled = bmsSource.bmsUsesBacnetIp ?? true;
      bms.nics[0].bacnetScEnabled = bmsSource.bmsUsesBacnetSc ?? false;
      if (bms.nics[0].bacnetScEnabled) {
        bms.nics[0].scHubId = scHubs.find(hub => hub.subnetIds.includes(bmsSubnet.id))?.id || '';
        bms.nics[0].scHubL3Reachable = Boolean(bms.nics[0].scHubId);
      }
      const role = bmsSource.bmsRole === 'bbmd'
        ? 'Hosts the local BBMD service'
        : bmsSource.bmsRole === 'fdr'
          ? `Foreign device registered to ${plan.find(item => item.id === bmsSource.fdrTargetSubnetId)?.name || 'an unassigned BBMD'}`
          : 'Local BACnet supervisory host';
      bms.notes = `${role} · imported from Network Planner`;
      bmsSubnet.devices.push(bms);
      if (bms.bbmdEnabled) bbmdBySourceId.set(bmsSource.id, bms);
    }
  }

  for (const source of ipSources.filter(item => item.bbmdEnabled && !bbmdBySourceId.has(item.id))) {
    const subnet = subnets.find(item => item.id === idMap.get(source.id));
    if (!subnet) continue;
    const bbmd = createDevice(subnet.devices.length + 1, subnet.id);
    bbmd.name = `${source.name} BBMD`;
    bbmd.kind = 'controller';
    bbmd.bbmdEnabled = true;
    bbmd.nics[0].name = 'BACnet/IP interface';
    bbmd.nics[0].addresses[0].ip = getOffsetIp(source.ip, source.cidr, source.bbmdOffset) || '';
    bbmd.notes = 'BBMD-capable BACnet device imported from Network Planner';
    subnet.devices.push(bbmd);
    bbmdBySourceId.set(source.id, bbmd);
  }

  for (let firstIndex = 0; firstIndex < ipSources.length; firstIndex++) {
    const first = ipSources[firstIndex];
    const firstBbmd = bbmdBySourceId.get(first.id);
    if (!firstBbmd) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < ipSources.length; secondIndex++) {
      const second = ipSources[secondIndex];
      const secondBbmd = bbmdBySourceId.get(second.id);
      if (!secondBbmd || (first.port || 47808) !== (second.port || 47808)) continue;
      const mutuallySelected = !splitHorizon || (first.routeTargets?.includes(second.id) && second.routeTargets?.includes(first.id));
      if (!mutuallySelected) continue;
      firstBbmd.bdtPeerDeviceIds!.push(secondBbmd.id);
      secondBbmd.bdtPeerDeviceIds!.push(firstBbmd.id);
    }
  }

  if (bmsSource?.bmsRole === 'fdr') {
    const bms = subnets.flatMap(subnet => subnet.devices).find(device => device.kind === 'server');
    const target = bbmdBySourceId.get(bmsSource.fdrTargetSubnetId);
    if (bms && target) bms.foreignDeviceBbmdId = target.id;
  }

  const routerByKey = new Map<string, DiagramDevice>();
  for (const source of plan.filter(item => item.networkType === 'mstp' || item.networkType === 'arcnet')) {
    const segment = subnets.find(item => item.id === idMap.get(source.id));
    const upstream = subnets.find(item => item.id === segment?.upstreamSubnetId);
    if (!segment || !upstream || !source.routerName?.trim()) continue;
    const key = `${upstream.id}|${source.routerName}|${source.routerIp || ''}`;
    let router = routerByKey.get(key);
    if (!router) {
      router = createDevice(upstream.devices.length + 1, upstream.id);
      router.name = source.routerName;
      router.kind = 'controller';
      router.notes = 'Required BACnet routing device imported from Network Planner';
      router.requiredForRouting = true;
      router.nics[0].addresses[0].ip = source.routerIp || '';
      upstream.devices.push(router);
      routerByKey.set(key, router);
    }
    segment.routerId = router.id;
  }
  const physical = createEmptyPhysicalLayer();
  const locationByName = new Map<string, string>();
  for (const source of plan.filter(item => item.physical?.closetName?.trim())) {
    const name = source.physical!.closetName!.trim();
    if (!locationByName.has(name)) {
      const location = createLocation(name, 'closet');
      physical.locations.push(location);
      locationByName.set(name, location.id);
    }
  }
  for (const source of ipSources) {
    const hint = source.physical;
    const switchCount = Math.max(0, hint?.switchCount ?? 0);
    for (let index = 0; index < switchCount; index++) {
      const networkSwitch = createInfrastructure(infrastructure.length + 1);
      networkSwitch.name = `${source.name} Switch ${index + 1}`;
      networkSwitch.kind = 'switch';
      networkSwitch.locationId = locationByName.get(hint?.closetName?.trim() ?? '');
      const accessCount = Math.max(1, hint?.portsPerSwitch ?? 24);
      networkSwitch.ports = [
        ...createPortRange('Gi1/0/', 1, accessCount, { vlanMode: 'access', accessVlan: source.vlan === '' ? '' : String(source.vlan), poe: (hint?.poeDevices ?? 0) > 0 ? 'af' : 'none' }),
        ...createPortRange('Uplink', 1, 1, { media: 'fiber-mm', speedMbps: 10000, vlanMode: 'trunk', allowedVlans: source.vlan === '' ? [] : [String(source.vlan)] })
      ];
      networkSwitch.subnetIds = [idMap.get(source.id)!];
      infrastructure.push(networkSwitch);
    }
  }
  for (const source of plan.filter(item => item.networkType === 'mstp' || item.networkType === 'arcnet')) {
    const subnetId = idMap.get(source.id)!;
    const hint = source.physical;
    const count = source.networkType === 'arcnet' ? hint?.arcnetSegments ?? 0 : hint?.mstpSegments ?? 0;
    const routerId = subnets.find(item => item.id === subnetId)?.routerId;
    for (let index = 0; index < count; index++) {
      if (source.networkType === 'arcnet') {
        const segment = createArcnetSegment(subnetId, `${source.name} ARC156 ${index + 1}`);
        segment.lengthMeters = hint?.arcnetSegmentLengthMeters;
        if (hint?.cable && hint.cable !== 'stp-18awg') segment.cable = hint.cable;
        if (routerId) segment.members.push({ ref: { kind: 'device', deviceId: routerId }, terminated: true, biasSource: false });
        physical.arcnetSegments.push(segment);
      } else {
        const segment = createMstpSegment(subnetId, `${source.name} MS/TP ${index + 1}`);
        segment.lengthMeters = hint?.mstpSegmentLengthMeters;
        if (hint?.cable) segment.cable = hint.cable;
        if (routerId) segment.members.push({ ref: { kind: 'device', deviceId: routerId }, terminated: true, biasSource: true });
        physical.mstpSegments.push(segment);
      }
    }
  }
  physical.enabled = hasPhysicalPlanHints(plan);
  return { version: 2, title: 'Planned BACnet Network Topology', notes: 'Imported from Network Planner', subnets, infrastructure, paths: [], viewMode: physical.enabled ? 'physical' : 'networks', physical };
}

function hasPhysicalPlanHints(plan: PlannerSubnet[]) {
  return plan.some(item => item.physical && Object.values(item.physical).some(value => value !== undefined && value !== '' && value !== 0));
}
