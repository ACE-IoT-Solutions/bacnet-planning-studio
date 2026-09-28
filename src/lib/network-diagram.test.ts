import { describe, expect, it } from 'vitest';
import {
  createDefaultProject, createDevice, createDeviceAddress, createDiagramProjectFromPlan, createEmptyProject, createNic, createSubnet, createTestPath, deviceAddressState,
  getDiagramDiagnostics, getWhoIsSuggestedBroadcast, isDiagramProject, moveDeviceToSubnet, normalizeDiagramProject, type DiagramDevice, type DiagramInfrastructure, type DiagramProject
} from './network-diagram';

describe('network diagram validation', () => {
  it('creates an empty project without starter topology', () => {
    expect(createEmptyProject()).toMatchObject({
      version: 2,
      title: 'Untitled BACnet Network',
      subnets: [],
      infrastructure: [],
      paths: [],
      allowSplitHorizonBdt: false
    });
  });

  it('moves a device without replacing its details or cross-subnet references', () => {
    const project = createDefaultProject();
    const source = project.subnets[0];
    const target = createSubnet(2);
    project.subnets.push(target);
    const device = source.devices[0];
    device.bbmdEnabled = true;
    device.notes = 'Preserve this configuration';
    const originalAddressId = device.nics[0].addresses[0].id;
    const secondaryNic = createNic(source.id, 2);
    secondaryNic.addresses[0].subnetId = source.id;
    device.nics.push(secondaryNic);
    project.paths.push(createTestPath([originalAddressId, source.devices[1].nics[0].addresses[0].id]));

    expect(moveDeviceToSubnet(project, device.id, target.id)).toBe(true);
    expect(source.devices).not.toContain(device);
    expect(target.devices).toContain(device);
    expect(target.devices[0]).toBe(device);
    expect(device.notes).toBe('Preserve this configuration');
    expect(device.bbmdEnabled).toBe(true);
    expect(device.nics.flatMap(nic => nic.addresses).every(address => address.subnetId === target.id)).toBe(true);
    expect(project.paths[0].hops[0]).toBe(originalAddressId);
  });

  it('supports distinct BACnet/IP networks on one IP subnet when ports and network numbers differ', () => {
    const project = createDefaultProject();
    const first = project.subnets[0];
    first.udpPort = 47808;
    first.bacnetNetworkNumber = '1001';
    const second = createSubnet(2);
    second.address = first.address;
    second.cidr = first.cidr;
    second.vlan = first.vlan;
    second.udpPort = 47809;
    second.bacnetNetworkNumber = '1002';
    project.subnets.push(second);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('require distinct UDP ports'))).toBe(false);
    second.udpPort = 47808;
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('require distinct UDP ports'))).toBe(true);
  });

  it('recognizes whether a device belongs to its subnet', () => {
    const project = createDefaultProject();
    const subnet = project.subnets[0];
    expect(deviceAddressState(subnet.devices[0], subnet)).toBe('valid');
    subnet.devices[0].nics[0].addresses[0].ip = '192.168.2.20';
    expect(deviceAddressState(subnet.devices[0], subnet)).toBe('outside');
  });

  it('reports duplicate addresses across diagram elements', () => {
    const project = createDefaultProject();
    project.subnets[0].devices[1].nics[0].addresses[0].ip = project.subnets[0].devices[0].nics[0].addresses[0].ip;
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('Duplicate IP'))).toBe(true);
  });

  it('validates multiple addresses on one NIC against their selected subnets', () => {
    const project = createDefaultProject();
    const secondSubnet = createSubnet(2);
    project.subnets.push(secondSubnet);
    const secondaryAddress = createDeviceAddress(secondSubnet.id, 'Alias');
    secondaryAddress.ip = '192.168.9.10';
    project.subnets[0].devices[0].nics[0].addresses.push(secondaryAddress);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('outside 192.168.1.0/24'))).toBe(true);
  });

  it('supports multiple NICs with independent addresses', () => {
    const project = createDefaultProject();
    const secondSubnet = createSubnet(2);
    project.subnets.push(secondSubnet);
    const secondNic = createNic(secondSubnet.id, 2);
    secondNic.addresses[0].ip = '192.168.1.20';
    project.subnets[0].devices[0].nics.push(secondNic);
    expect(getDiagramDiagnostics(project)).toEqual([]);
  });

  it('accepts and normalizes projects saved before interfaces and paths were added', () => {
    const legacy = createDefaultProject() as DiagramProject;
    delete (legacy as Partial<DiagramProject>).paths;
    const legacyDevice = legacy.subnets[0].devices[0] as Partial<DiagramDevice>;
    legacyDevice.ip = legacyDevice.nics?.[0].addresses[0].ip;
    legacyDevice.additionalInterfaces = [];
    delete legacyDevice.nics;
    expect(isDiagramProject(legacy)).toBe(true);
    const normalized = normalizeDiagramProject(legacy);
    expect(normalized.paths).toEqual([]);
    expect(normalized.subnets[0].devices[0].nics[0].addresses[0].ip).toBe('192.168.0.20');
    expect(normalized.subnets[0].devices[0].additionalInterfaces).toBeUndefined();
  });

  it('reports test paths whose endpoints have been removed', () => {
    const project = createDefaultProject();
    project.paths.push(createTestPath([project.subnets[0].devices[0].id, 'missing-endpoint']));
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('no longer exists'))).toBe(true);
  });

  it('uses individual device addresses as connectivity-test endpoints', () => {
    const project = createDefaultProject();
    const source = project.subnets[0].devices[0].nics[0].addresses[0];
    const destination = project.subnets[0].devices[1].nics[0].addresses[0];
    project.paths.push(createTestPath([source.id, destination.id]));
    expect(getDiagramDiagnostics(project)).toEqual([]);
  });

  it('migrates legacy host endpoints to their primary addresses', () => {
    const project = createDefaultProject();
    const sourceHost = project.subnets[0].devices[0];
    const destinationHost = project.subnets[0].devices[1];
    project.paths.push(createTestPath([sourceHost.id, destinationHost.id]));
    normalizeDiagramProject(project);
    expect(project.paths[0].hops).toEqual([
      sourceHost.nics[0].addresses[0].id,
      destinationHost.nics[0].addresses[0].id
    ]);
  });

  it('suggests and validates the source subnet broadcast for BACnet Who-Is', () => {
    const project = createDefaultProject();
    const source = project.subnets[0].devices[0].nics[0].addresses[0];
    const destination = project.subnets[0].devices[1].nics[0].addresses[0];
    const path = createTestPath([source.id, destination.id]);
    path.testType = 'bacnet-whois';
    path.protocol = 'BACnet/IP Who-Is';
    path.broadcastAddress = getWhoIsSuggestedBroadcast(project, path);
    project.paths.push(path);
    expect(path.broadcastAddress).toBe('192.168.0.255');
    expect(getDiagramDiagnostics(project)).toEqual([]);
  });

  it('warns when a Who-Is uses a different directed broadcast', () => {
    const project = createDefaultProject();
    const source = project.subnets[0].devices[0].nics[0].addresses[0];
    const destination = project.subnets[0].devices[1].nics[0].addresses[0];
    const path = createTestPath([source.id, destination.id]);
    path.testType = 'bacnet-whois';
    path.broadcastAddress = '192.168.9.255';
    project.paths.push(path);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('source subnet broadcast'))).toBe(true);
  });

  it('validates MS/TP MAC and ARCNET node addresses', () => {
    const project = createDefaultProject();
    const mstp = project.subnets[0];
    mstp.networkType = 'mstp';
    mstp.bacnetNetworkNumber = '2001';
    mstp.mstpMaxMaster = 63;
    mstp.devices[0].nics[0].addresses[0].ip = '63';
    mstp.devices[1].nics[0].addresses[0].ip = '64';
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('invalid MS/TP MAC'))).toBe(true);

    mstp.networkType = 'arcnet';
    mstp.devices[0].nics[0].addresses[0].ip = '255';
    mstp.devices[1].nics[0].addresses[0].ip = '256';
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('invalid ARCNET node'))).toBe(true);
  });

  it('requires field buses to be reached through an IP-side router', () => {
    const project = createDefaultProject();
    const fieldBus = createSubnet(2);
    fieldBus.networkType = 'mstp';
    fieldBus.bacnetNetworkNumber = '2001';
    project.subnets.push(fieldBus);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('upstream BACnet/IP'))).toBe(true);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('BACnet device on the upstream'))).toBe(true);

    const router = project.subnets[0].devices[0];
    fieldBus.upstreamSubnetId = project.subnets[0].id;
    fieldBus.routerId = router.id;
    expect(getDiagramDiagnostics(project)).toEqual([]);
  });

  it('supports a same-datalink MS/TP router while rejecting cross-type device addresses', () => {
    const project = createDefaultProject();
    const ipRouter = project.subnets[0].devices[0];
    const upstream = createSubnet(2);
    upstream.networkType = 'mstp'; upstream.bacnetNetworkNumber = '2001'; upstream.upstreamSubnetId = project.subnets[0].id; upstream.routerId = ipRouter.id;
    const mstpRouter = createDevice(1, upstream.id);
    mstpRouter.name = 'MS/TP Router'; mstpRouter.nics[0].addresses[0].ip = '10'; upstream.devices.push(mstpRouter);
    const downstream = createSubnet(3);
    downstream.networkType = 'mstp'; downstream.bacnetNetworkNumber = '2002'; downstream.upstreamSubnetId = upstream.id; downstream.routerId = mstpRouter.id;
    project.subnets.push(upstream, downstream);
    expect(getDiagramDiagnostics(project)).toEqual([]);

    mstpRouter.nics[0].addresses[0].subnetId = project.subnets[0].id;
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('different datalink type'))).toBe(true);
  });

  it('turns a planner field bus into a network-only routed diagram', () => {
    const base = { gatewayOffset: 1, vlan: 10, port: 47808, bbmdEnabled: false, bbmdOffset: 10, bmsPlaced: false, bmsRole: 'none' as const, fdrTargetSubnetId: '' };
    const diagram = createDiagramProjectFromPlan([
      { ...base, id: 'ip', name: 'IP LAN', ip: '192.168.10.0', cidr: 24, networkType: 'bacnet-ip' },
      { ...base, id: 'mstp', name: 'VAV Trunk', ip: '', cidr: 24, networkType: 'mstp', bacnetNetworkNumber: 2001, upstreamIpSubnetId: 'ip', routerName: 'VAV Router', routerIp: '192.168.10.20' }
    ]);
    expect(diagram.viewMode).toBe('networks');
    expect(diagram.subnets[1].upstreamSubnetId).toBe(diagram.subnets[0].id);
    expect(diagram.subnets[0].devices[0].requiredForRouting).toBe(true);
    expect(diagram.subnets[1].routerId).toBe(diagram.subnets[0].devices[0].id);
    expect(getDiagramDiagnostics(diagram)).toEqual([]);
  });

  it('turns planner physical hints into switches, locations, MS/TP, and ALC ARC156 segments', () => {
    const base = { gatewayOffset: 1, vlan: 10, port: 47808, bbmdEnabled: false, bbmdOffset: 10, bmsPlaced: false, bmsRole: 'none' as const, fdrTargetSubnetId: '' };
    const diagram = createDiagramProjectFromPlan([
      { ...base, id: 'ip', name: 'IP LAN', ip: '192.168.10.0', cidr: 24, networkType: 'bacnet-ip', physical: { closetName: 'IDF 1', switchCount: 1, portsPerSwitch: 24 } },
      { ...base, id: 'mstp', name: 'VAV', ip: '', cidr: 24, networkType: 'mstp', bacnetNetworkNumber: 2001, upstreamIpSubnetId: 'ip', routerName: 'Router', routerIp: '192.168.10.20', physical: { closetName: 'IDF 1', mstpSegments: 2, mstpSegmentLengthMeters: 400 } },
      { ...base, id: 'arc', name: 'ALC ARC156', ip: '', cidr: 24, networkType: 'arcnet', bacnetNetworkNumber: 2002, upstreamIpSubnetId: 'ip', routerName: 'Router', routerIp: '192.168.10.20', physical: { closetName: 'IDF 1', arcnetSegments: 1, arcnetSegmentLengthMeters: 500, cable: 'stp-22awg' } }
    ]);
    expect(diagram.viewMode).toBe('physical');
    expect(diagram.physical.locations.map(item => item.name)).toEqual(['IDF 1']);
    expect(diagram.infrastructure.find(item => item.kind === 'switch')?.ports).toHaveLength(25);
    expect(diagram.physical.mstpSegments).toHaveLength(2);
    expect(diagram.physical.arcnetSegments).toHaveLength(1);
    expect(diagram.physical.arcnetSegments[0]).toMatchObject({ lengthMeters: 500, cable: 'stp-22awg' });
  });

  it('imports planned core routing, BBMDs, and the BMS into the topology', () => {
    const base = { gatewayOffset: 1, vlan: 10, port: 47808, bbmdEnabled: true, bbmdOffset: 10, bmsPlaced: false, bmsRole: 'none' as const, fdrTargetSubnetId: '', routeTargets: undefined };
    const diagram = createDiagramProjectFromPlan([
      { ...base, id: 'core', name: 'Core BMS Subnet', ip: '10.100.8.0', cidr: 23, bmsPlaced: true, bmsRole: 'bbmd' as const },
      { ...base, id: 'campus-2', name: 'Campus Subnet 2', ip: '10.100.10.0', cidr: 23, vlan: 17 },
      { ...base, id: 'campus-3', name: 'Campus Subnet 3', ip: '10.100.12.0', cidr: 23, vlan: 19 }
    ]);

    const router = diagram.infrastructure.find(item => item.kind === 'router');
    const bbmds = diagram.subnets.flatMap(subnet => subnet.devices).filter(device => device.bbmdEnabled);
    const bms = diagram.subnets[0].devices.find(device => device.kind === 'server');
    expect(router?.name).toBe('Core Router');
    expect(router?.subnetIds).toEqual(diagram.subnets.map(subnet => subnet.id));
    expect(diagram.infrastructure.some(item => item.kind === 'bbmd')).toBe(false);
    expect(bbmds).toHaveLength(3);
    expect(bbmds.map(device => device.nics[0].addresses[0].ip)).toEqual(['10.100.8.10', '10.100.10.10', '10.100.12.10']);
    expect(bbmds.every(device => device.bdtPeerDeviceIds?.length === 2)).toBe(true);
    expect(bms?.name).toBe('BMS Server / BBMD');
    expect(bms?.bbmdEnabled).toBe(true);
    expect(bms?.nics[0].addresses[0].ip).toBe('10.100.8.10');
    expect(getDiagramDiagnostics(diagram)).toEqual([]);
  });

  it('imports planner foreign-device registration to a device-level BBMD', () => {
    const base = { gatewayOffset: 1, vlan: 10, port: 47808, bbmdEnabled: false, bbmdOffset: 10, bmsPlaced: false, bmsRole: 'none' as const, fdrTargetSubnetId: '' };
    const diagram = createDiagramProjectFromPlan([
      { ...base, id: 'bms', name: 'Remote BMS', ip: '10.20.1.0', cidr: 24, bmsPlaced: true, bmsRole: 'fdr' as const, fdrTargetSubnetId: 'bbmd' },
      { ...base, id: 'bbmd', name: 'Controls LAN', ip: '10.20.2.0', cidr: 24, vlan: 20, bbmdEnabled: true }
    ]);
    const bms = diagram.subnets[0].devices.find(device => device.kind === 'server');
    const bbmd = diagram.subnets[1].devices.find(device => device.bbmdEnabled);
    expect(bms?.foreignDeviceBbmdId).toBe(bbmd?.id);
    expect(getDiagramDiagnostics(diagram)).toEqual([]);
  });

  it('migrates legacy infrastructure BBMDs into BACnet devices', () => {
    const project = createDefaultProject();
    project.infrastructure.push({ id: 'legacy-bbmd', name: 'Legacy BBMD', kind: 'bbmd', ip: '192.168.0.10', subnetIds: [project.subnets[0].id], notes: 'Old model' });
    const path = createTestPath(['legacy-bbmd', project.subnets[0].devices[0].nics[0].addresses[0].id]);
    project.paths.push(path);
    normalizeDiagramProject(project);
    const migrated = project.subnets[0].devices.find(device => device.id === 'legacy-bbmd');
    expect(project.infrastructure.some(item => item.kind === 'bbmd')).toBe(false);
    expect(migrated?.bbmdEnabled).toBe(true);
    expect(migrated?.nics[0].addresses[0].ip).toBe('192.168.0.10');
    expect(project.paths[0].hops[0]).toBe(migrated?.nics[0].addresses[0].id);
  });

  it('diagnoses non-mutual BDTs and same-subnet FDR targets', () => {
    const project = createDefaultProject();
    const second = createSubnet(2);
    second.address = '192.168.1.0';
    const firstBbmd = project.subnets[0].devices[0];
    const secondBbmd = createDevice(1, second.id);
    secondBbmd.nics[0].addresses[0].ip = '192.168.1.10';
    firstBbmd.bbmdEnabled = true;
    secondBbmd.bbmdEnabled = true;
    firstBbmd.bdtPeerDeviceIds = [secondBbmd.id];
    second.devices.push(secondBbmd);
    project.subnets.push(second);
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('mutual BDT'))).toBe(true);
    project.allowSplitHorizonBdt = true;
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('mutual BDT'))).toBe(false);
    project.allowSplitHorizonBdt = false;
    secondBbmd.bdtPeerDeviceIds = [firstBbmd.id];
    project.subnets[0].devices[1].foreignDeviceBbmdId = firstBbmd.id;
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('own IP subnet'))).toBe(true);
  });

  it('validates BACnet/SC hub assignment, failover endpoints, L3 reachability, and hub continuity', () => {
    const project = createDefaultProject();
    const underlay = project.subnets[0];
    underlay.name = 'IP Underlay';
    underlay.address = '10.0.0.0';
    underlay.cidr = 8;
    underlay.devices = [createDevice(1, underlay.id), createDevice(2, underlay.id)];
    underlay.devices.forEach(device => { device.nics[0].bacnetScEnabled = true; device.nics[0].bacnetIpEnabled = false; });
    const primary: DiagramInfrastructure = project.infrastructure[0] = {
      id: 'hub-a', name: 'SC Hub A', kind: 'sc-hub', ip: '10.20.0.10', uri: 'wss://hub-a.example',
      failoverIp: '', failoverUri: '', subnetIds: [underlay.id], underlaySubnetIds: [underlay.id], peerInfrastructureIds: [], notes: ''
    };
    const secondary: DiagramInfrastructure = project.infrastructure[1] = {
      id: 'hub-b', name: 'SC Hub B', kind: 'sc-hub-cluster', ip: '10.30.0.10', uri: 'wss://hub-b.example',
      failoverIp: '10.31.0.10', failoverUri: 'wss://hub-b-failover.example', subnetIds: [underlay.id], underlaySubnetIds: [underlay.id], peerInfrastructureIds: [], notes: ''
    };
    underlay.devices[0].nics[0].addresses[0].ip = '10.20.0.20';
    underlay.devices[0].nics[0].scHubId = primary.id;
    underlay.devices[0].nics[0].scHubL3Reachable = true;
    underlay.devices[1].nics[0].addresses[0].ip = '10.30.0.20';
    underlay.devices[1].nics[0].scHubId = secondary.id;
    underlay.devices[1].nics[0].scHubL3Reachable = true;
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('without a modeled hub-to-hub path'))).toBe(true);
    primary.peerInfrastructureIds = [secondary.id];
    secondary.peerInfrastructureIds = [primary.id];
    expect(getDiagramDiagnostics(project)).toEqual([]);
    secondary.failoverUri = 'https://not-websocket.example';
    expect(getDiagramDiagnostics(project).some(item => item.message.includes('failover wss://'))).toBe(true);
  });

  it('imports planner BACnet/SC hubs as network infrastructure', () => {
    const base = { gatewayOffset: 1, vlan: '' as const, port: 47808, bbmdEnabled: false, bbmdOffset: 10, bmsPlaced: false, bmsRole: 'none' as const, fdrTargetSubnetId: '' };
    const diagram = createDiagramProjectFromPlan([
      { ...base, id: 'ip', name: 'IP Underlay', ip: '10.0.0.0', cidr: 8, networkType: 'bacnet-ip', scEnabled: true, scPrimaryHubName: 'Campus Hub', scPrimaryHubIp: '10.0.0.10', scPrimaryHubUri: 'wss://hub.example', scFailoverEnabled: true, scFailoverHubIp: '10.0.1.10', scFailoverHubUri: 'wss://hub-failover.example' }
    ]);
    expect(diagram.subnets).toHaveLength(1);
    const hub = diagram.infrastructure.find(item => item.kind === 'sc-hub-cluster');
    expect(hub?.subnetIds).toEqual([diagram.subnets[0].id]);
    expect(hub?.underlaySubnetIds).toEqual([diagram.subnets[0].id]);
    expect(getDiagramDiagnostics(diagram)).toEqual([]);
  });

  it('allows one device to use BACnet/IP and BACnet/SC on the same IP interface', () => {
    const project = createDefaultProject();
    const ip = project.subnets[0];
    const router = ip.devices[0];
    router.nics[0].bacnetIpEnabled = true; router.nics[0].bacnetScEnabled = true;
    const hub: DiagramInfrastructure = { id: 'hub', name: 'SC Hub', kind: 'sc-hub', ip: '192.168.0.10', uri: 'wss://hub.example', failoverIp: '', failoverUri: '', subnetIds: [ip.id], underlaySubnetIds: [ip.id], peerInfrastructureIds: [], notes: '' };
    project.infrastructure.push(hub); router.nics[0].scHubId = hub.id; router.nics[0].scHubL3Reachable = true;
    expect(getDiagramDiagnostics(project)).toEqual([]);
  });
});
