import type { DiagramProject } from './network-diagram';
import { resolveEndpoint } from './physical';

export function pruneDanglingReferences(project: DiagramProject): DiagramProject {
  const subnets = new Set(project.subnets.map(item => item.id));
  const infrastructure = new Set(project.infrastructure.map(item => item.id));
  const devices = project.subnets.flatMap(subnet => subnet.devices);
  const deviceIds = new Set(devices.map(item => item.id));
  const addressIds = new Set(devices.flatMap(device => device.nics.flatMap(nic => nic.addresses.map(address => address.id))));
  const nicIds = new Set(devices.flatMap(device => device.nics.map(nic => nic.id)));
  const bbmdIds = new Set(devices.filter(device => device.bbmdEnabled).map(device => device.id));
  const hubIds = new Set([
    ...project.infrastructure.filter(item => item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster').map(item => item.id),
    ...devices.flatMap(device => device.nics.filter(nic => nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub').map(nic => nic.id))
  ]);

  for (const subnet of project.subnets) {
    if (!subnets.has(subnet.upstreamSubnetId ?? '') || subnet.upstreamSubnetId === subnet.id) subnet.upstreamSubnetId = '';
    if (!deviceIds.has(subnet.routerId ?? '')) subnet.routerId = '';
    for (const device of subnet.devices) {
      device.bdtPeerDeviceIds = [...new Set((device.bdtPeerDeviceIds ?? []).filter(id => id !== device.id && bbmdIds.has(id)))];
      if (!bbmdIds.has(device.foreignDeviceBbmdId ?? '')) device.foreignDeviceBbmdId = '';
      for (const nic of device.nics) {
        nic.addresses = nic.addresses.filter(address => subnets.has(address.subnetId));
        if (nic.scHubId && !hubIds.has(nic.scHubId)) nic.scHubId = '';
      }
    }
  }
  for (const item of project.infrastructure) {
    item.subnetIds = [...new Set(item.subnetIds.filter(id => subnets.has(id)))];
    item.underlaySubnetIds = [...new Set((item.underlaySubnetIds ?? []).filter(id => subnets.has(id)))];
    item.peerInfrastructureIds = [...new Set((item.peerInfrastructureIds ?? []).filter(id => id !== item.id && infrastructure.has(id)))];
    item.ports = (item.ports ?? []).filter(port => port.id);
  }
  const endpointIds = new Set([...addressIds, ...infrastructure]);
  for (const path of project.paths) path.hops = path.hops.filter(id => endpointIds.has(id));

  const locationIds = new Set(project.physical.locations.map(item => item.id));
  for (const location of project.physical.locations) if (!locationIds.has(location.parentId ?? '') || location.parentId === location.id) location.parentId = undefined;
  for (const device of devices) if (!locationIds.has(device.locationId ?? '')) device.locationId = undefined;
  for (const item of project.infrastructure) if (!locationIds.has(item.locationId ?? '')) item.locationId = undefined;
  for (const panel of project.physical.patchPanels) if (!locationIds.has(panel.locationId ?? '')) panel.locationId = undefined;
  project.physical.links = project.physical.links.filter(link => resolveEndpoint(project, link.a) && resolveEndpoint(project, link.b));
  project.physical.mstpSegments = project.physical.mstpSegments.filter(segment => subnets.has(segment.subnetId)).map(segment => ({
    ...segment,
    members: segment.members.filter(member => member.ref.kind === 'device' ? deviceIds.has(member.ref.deviceId) : infrastructure.has(member.ref.infrastructureId))
  }));
  project.physical.arcnetSegments = project.physical.arcnetSegments.filter(segment => subnets.has(segment.subnetId)).map(segment => ({
    ...segment,
    members: segment.members.filter(member => member.ref.kind === 'device' ? deviceIds.has(member.ref.deviceId) : infrastructure.has(member.ref.infrastructureId))
  }));
  void nicIds;
  return project;
}
