import { getSubnetDetails, ipToLong } from './subnet';
import {
  addressState, getWhoIsSuggestedBroadcast, subnetCidr,
  type DiagramDiagnostic, type DiagramProject, type DiagramSubnet
} from './network-diagram';
import { getPhysicalDiagnostics } from './physical-diagnostics';

export function getDiagramDiagnostics(project: DiagramProject): DiagramDiagnostic[] {
  const diagnostics: DiagramDiagnostic[] = [];
  const usedIps = new Map<string, string[]>();

  for (const subnet of project.subnets) {
    if ((!subnet.networkType || subnet.networkType === 'bacnet-ip') && !getSubnetDetails(subnet.address, subnet.cidr)) {
      diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed subnet'} has an invalid network address.` });
    }
    const bipNics = project.subnets.flatMap(owner => owner.devices.flatMap(device => device.nics)).filter(nic => nic.bacnetIpEnabled && nic.addresses.some(address => address.subnetId === subnet.id));
    if ((!subnet.networkType || subnet.networkType === 'bacnet-ip') && bipNics.length && (!Number.isInteger(subnet.udpPort) || Number(subnet.udpPort) < 1 || Number(subnet.udpPort) > 65535)) {
      diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed subnet'} has BACnet/IP devices but no valid UDP port.` });
    }
    if ((subnet.networkType === 'mstp' || subnet.networkType === 'arcnet' || subnet.networkType === 'bacnet-sc')
      && (!Number.isInteger(Number(subnet.bacnetNetworkNumber)) || Number(subnet.bacnetNetworkNumber) < 1 || Number(subnet.bacnetNetworkNumber) > 65534)) {
      diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed network'} needs a BACnet network number from 1–65534.` });
    }
    if (subnet.networkType === 'mstp' || subnet.networkType === 'arcnet') {
      const upstream = project.subnets.find(item => item.id === subnet.upstreamSubnetId && item.id !== subnet.id
        && ((!item.networkType || item.networkType === 'bacnet-ip') || item.networkType === subnet.networkType));
      const router = project.subnets.flatMap(item => item.devices).find(device => device.id === subnet.routerId);
      const routerAddress = router?.nics.flatMap(nic => nic.addresses).find(address => address.subnetId === upstream?.id);
      if (!upstream) diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed field bus'} must select an upstream BACnet/IP or ${subnet.networkType === 'mstp' ? 'MS/TP' : 'ARCNET'} network.` });
      if (!router) diagnostics.push({ level: 'error', message: `${subnet.name || 'Unnamed field bus'} must be routed by a BACnet device on the upstream network.` });
      else if (!routerAddress || addressState(routerAddress, upstream) !== 'valid') diagnostics.push({ level: 'error', message: `${router.name || 'Field-bus router'} needs a valid address on the selected upstream network.` });
    }
    for (const device of subnet.devices) {
      for (const nic of device.nics) {
        if (!nic.bacnetIpEnabled && !nic.bacnetScEnabled) diagnostics.push({ level: 'warning', message: `${device.name || 'Unnamed device'} ${nic.name || 'NIC'} has neither BACnet/IP nor BACnet/SC enabled.` });
        for (const address of nic.addresses) {
          const addressSubnet = project.subnets.find(candidate => candidate.id === address.subnetId);
          const ownerType = subnet.networkType || 'bacnet-ip';
          const addressType = addressSubnet?.networkType || 'bacnet-ip';
          const state = addressState(address, addressSubnet);
          const addressName = `${device.name || 'Unnamed device'} ${nic.name || 'NIC'} ${address.label || 'address'}`;
          if (!addressSubnet) diagnostics.push({ level: 'error', message: `${addressName} is not assigned to an available subnet.` });
          else if (ownerType !== addressType && ownerType !== 'bacnet-sc' && addressType !== 'bacnet-sc') diagnostics.push({ level: 'error', message: `${addressName} cannot use ${subnetCidr(addressSubnet)} because the device belongs to a different datalink type.` });
          else if (state === 'invalid') diagnostics.push({ level: 'error', message: `${addressName} has an invalid ${addressSubnet.networkType === 'mstp' ? 'MS/TP MAC' : addressSubnet.networkType === 'arcnet' ? 'ARCNET node' : addressSubnet.networkType === 'bacnet-sc' ? 'BACnet/SC node IP' : 'IP'} address.` });
          else if (state === 'outside') diagnostics.push({ level: 'warning', message: `${addressName} (${address.ip}) is outside ${subnetCidr(addressSubnet)}.` });
          else if (state === 'valid') {
            const key = addressSubnet.networkType === 'mstp' || addressSubnet.networkType === 'arcnet' || addressSubnet.networkType === 'bacnet-sc' ? `${addressSubnet.id}:${address.ip.trim()}` : address.ip.trim();
            usedIps.set(key, [...(usedIps.get(key) ?? []), addressName]);
          }
        }
      }
    }
  }

  const deviceEntries = project.subnets.flatMap(subnet => subnet.devices.map(device => ({ device, subnet })));
  const deviceById = new Map(deviceEntries.map(entry => [entry.device.id, entry]));
  for (const { device, subnet } of deviceEntries) {
    const primaryAddress = device.nics.flatMap(nic => nic.addresses).find(address => address.subnetId === subnet.id);
    if (device.bbmdEnabled) {
      if (subnet.networkType !== 'bacnet-ip' || !primaryAddress || addressState(primaryAddress, subnet) !== 'valid') {
        diagnostics.push({ level: 'error', message: `${device.name || 'Unnamed BBMD'} needs a valid BACnet/IP address on its local IP subnet.` });
      }
      for (const peerId of device.bdtPeerDeviceIds ?? []) {
        const peer = deviceById.get(peerId);
        if (!peer?.device.bbmdEnabled) diagnostics.push({ level: 'error', message: `${device.name || 'Unnamed BBMD'} references a missing or disabled BDT peer.` });
        else if (!(peer.device.bdtPeerDeviceIds ?? []).includes(device.id) && !project.allowSplitHorizonBdt) diagnostics.push({ level: 'warning', message: `${device.name || 'Unnamed BBMD'} and ${peer.device.name || 'unnamed BBMD'} do not have a mutual BDT relationship.` });
        else if ((subnet.udpPort ?? 47808) !== (peer.subnet.udpPort ?? 47808)) diagnostics.push({ level: 'error', message: `${device.name || 'Unnamed BBMD'} and ${peer.device.name || 'unnamed BBMD'} use different BACnet/IP UDP ports and cannot form one BDT relationship.` });
        else if (peer.subnet.id === subnet.id) diagnostics.push({ level: 'warning', message: `${device.name || 'Unnamed BBMD'} and ${peer.device.name || 'unnamed BBMD'} share one IP subnet; a BDT relationship is normally used across subnet boundaries.` });
      }
    } else if ((device.bdtPeerDeviceIds ?? []).length) {
      diagnostics.push({ level: 'warning', message: `${device.name || 'Unnamed device'} has BDT peers configured but its BBMD capability is disabled.` });
    }
    if (device.foreignDeviceBbmdId) {
      const target = deviceById.get(device.foreignDeviceBbmdId);
      if (subnet.networkType !== 'bacnet-ip' || !device.nics.some(nic => nic.bacnetIpEnabled)) diagnostics.push({ level: 'error', message: `${device.name || 'Unnamed foreign device'} needs BACnet/IP enabled on an IP subnet to use FDR.` });
      if (!target?.device.bbmdEnabled) diagnostics.push({ level: 'error', message: `${device.name || 'Unnamed foreign device'} references a missing or disabled registration BBMD.` });
      else if (target.subnet.id === subnet.id) diagnostics.push({ level: 'warning', message: `${device.name || 'Unnamed foreign device'} is registered to a BBMD on its own IP subnet; FDR is intended for a foreign IP subnet.` });
    }
  }

  const bipNetworks = project.subnets.filter(subnet => !subnet.networkType || subnet.networkType === 'bacnet-ip');
  for (let firstIndex = 0; firstIndex < bipNetworks.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < bipNetworks.length; secondIndex++) {
      const first = bipNetworks[firstIndex];
      const second = bipNetworks[secondIndex];
      const firstDetails = getSubnetDetails(first.address, first.cidr);
      const secondDetails = getSubnetDetails(second.address, second.cidr);
      if (!firstDetails || !secondDetails || first.vlan !== second.vlan) continue;
      const overlap = firstDetails.networkLong <= secondDetails.broadcastLong && secondDetails.networkLong <= firstDetails.broadcastLong;
      if (overlap && first.udpPort !== '' && second.udpPort !== '' && (first.udpPort ?? 47808) === (second.udpPort ?? 47808)) {
        diagnostics.push({ level: 'error', message: `${first.name} and ${second.name} share an IP/VLAN range and UDP ${first.udpPort ?? 47808}; distinct BACnet/IP networks on one IP subnet require distinct UDP ports.` });
      } else if (overlap && first.udpPort !== '' && second.udpPort !== '' && first.udpPort !== second.udpPort) {
        const firstNetwork = Number(first.bacnetNetworkNumber);
        const secondNetwork = Number(second.bacnetNetworkNumber);
        if (!Number.isInteger(firstNetwork) || firstNetwork < 1 || firstNetwork > 65534 || !Number.isInteger(secondNetwork) || secondNetwork < 1 || secondNetwork > 65534 || firstNetwork === secondNetwork) {
          diagnostics.push({ level: 'error', message: `${first.name} and ${second.name} use different UDP ports on one IP/VLAN range; assign each B/IP datalink a distinct BACnet network number from 1–65534.` });
        }
      }
    }
  }

  for (const item of project.infrastructure) {
    if (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster') {
      if (!item.uri?.startsWith('wss://')) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub'} needs a primary wss:// hub URI.` });
      if (!item.ip.trim() || ipToLong(item.ip) === null) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub'} needs a valid primary hub IP for L3 reachability checks.` });
      if (item.kind === 'sc-hub-cluster') {
        if (!item.failoverUri?.startsWith('wss://')) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub cluster'} needs a failover wss:// hub URI.` });
        if (!item.failoverIp?.trim() || ipToLong(item.failoverIp) === null) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub cluster'} needs a valid failover hub IP.` });
      }
      const underlays = item.subnetIds.map(id => project.subnets.find(subnet => subnet.id === id && (!subnet.networkType || subnet.networkType === 'bacnet-ip'))).filter((subnet): subnet is DiagramSubnet => Boolean(subnet));
      if (!underlays.length) diagnostics.push({ level: 'error', message: `${item.name || 'BACnet/SC hub'} must attach to at least one physical IP underlay.` });
      else if (ipToLong(item.ip) !== null && !underlays.some(subnet => addressState({ id: '', subnetId: subnet.id, ip: item.ip, label: '' }, subnet) === 'valid')) diagnostics.push({ level: 'warning', message: `${item.name} is outside its attached IP-underlay prefixes; document the routed path to the hub.` });
    }
    if (item.ip.trim()) {
      if (ipToLong(item.ip) === null) diagnostics.push({ level: 'error', message: `${item.name || 'Unnamed infrastructure'} has an invalid IP address.` });
      else usedIps.set(item.ip.trim(), [...(usedIps.get(item.ip.trim()) ?? []), item.name || 'Unnamed infrastructure']);
    }
  }

  const scHubs = project.infrastructure.filter(item => item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster');
  for (const hub of scHubs) {
    for (const peerId of hub.peerInfrastructureIds ?? []) {
      const peer = scHubs.find(item => item.id === peerId);
      if (!peer) diagnostics.push({ level: 'error', message: `${hub.name} references a missing BACnet/SC hub connection.` });
      else if (!(peer.peerInfrastructureIds ?? []).includes(hub.id)) diagnostics.push({ level: 'warning', message: `${hub.name} → ${peer.name} is modeled one-way; verify the intended BACnet/SC hub continuity.` });
    }
  }
  const deviceNics = project.subnets.flatMap(owner => owner.devices.flatMap(device => device.nics.map(nic => ({ device, nic }))));
  const deviceHubNics = new Map(deviceNics.filter(({ nic }) => nic.bacnetScEnabled && (nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub')).map(entry => [entry.nic.id, entry]));
  const infrastructureHubIds = new Set(scHubs.map(hub => hub.id));
  for (const { device, nic } of deviceNics.filter(entry => entry.nic.bacnetScEnabled)) {
    const label = `${device.name || 'Unnamed device'} ${nic.name || 'NIC'}`;
    const role = nic.scHubRole ?? 'node';
    if ((role === 'hub' || role === 'ha-hub') && !nic.scHubUri?.startsWith('wss://')) diagnostics.push({ level: 'error', message: `${label} is an SC hub and needs a wss:// hub URI.` });
    if (role === 'ha-hub' && !nic.scFailoverHubUri?.startsWith('wss://')) diagnostics.push({ level: 'error', message: `${label} is an HA SC hub and needs a failover wss:// URI.` });
    if (role === 'node' && !nic.scHubId) diagnostics.push({ level: 'error', message: `${label} must be assigned to a BACnet/SC hub or HA hub.` });
    if (nic.scHubId === nic.id) diagnostics.push({ level: 'error', message: `${label} cannot federate with itself.` });
    if (nic.scHubId && !infrastructureHubIds.has(nic.scHubId) && !deviceHubNics.has(nic.scHubId)) diagnostics.push({ level: 'error', message: `${label} references a missing BACnet/SC hub.` });
    if (nic.scHubId && !nic.scHubL3Reachable) diagnostics.push({ level: 'error', message: `${label} has no verified L3/TLS path to its SC hub. Verify forward and return routing, DNS, firewall policy, TCP reachability, and TLS trust.` });

    const visited = new Set<string>([nic.id]);
    let parentId = nic.scHubId;
    while (parentId && deviceHubNics.has(parentId)) {
      if (visited.has(parentId)) {
        diagnostics.push({ level: 'error', message: `${label} is part of a BACnet/SC hub federation cycle.` });
        break;
      }
      visited.add(parentId);
      parentId = deviceHubNics.get(parentId)?.nic.scHubId;
    }
  }
  const assignedInfrastructureHubs = [...new Set(deviceNics.flatMap(({ nic }) => nic.bacnetScEnabled && nic.scHubId && infrastructureHubIds.has(nic.scHubId) ? [nic.scHubId] : []))];
  if (assignedInfrastructureHubs.length > 1) {
    const visited = new Set<string>();
    const queue = [assignedInfrastructureHubs[0]];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const hub = scHubs.find(item => item.id === id);
      for (const peer of hub?.peerInfrastructureIds ?? []) if (!visited.has(peer)) queue.push(peer);
      for (const reverse of scHubs.filter(item => (item.peerInfrastructureIds ?? []).includes(id))) if (!visited.has(reverse.id)) queue.push(reverse.id);
    }
    if (assignedInfrastructureHubs.some(id => !visited.has(id))) diagnostics.push({ level: 'error', message: 'BACnet/SC nodes are assigned to hubs without a modeled hub-to-hub path. Add the required hub connections.' });
  }

  for (const [ip, names] of usedIps) {
    if (names.length > 1) diagnostics.push({ level: 'error', message: `${ip.includes(':') ? 'Duplicate datalink address' : 'Duplicate IP'} ${ip.includes(':') ? ip.split(':').pop() : ip}: ${names.join(', ')}.` });
  }
  const endpointIds = new Set([
    ...project.infrastructure.map(item => item.id),
    ...project.subnets.flatMap(subnet => subnet.devices.flatMap(device => device.nics.flatMap(nic => nic.addresses.map(address => address.id))))
  ]);
  for (const path of project.paths) {
    if (path.hops.length < 2) diagnostics.push({ level: 'warning', message: `${path.name || 'Unnamed test path'} needs at least two endpoints.` });
    else if (path.hops.some(id => !endpointIds.has(id))) diagnostics.push({ level: 'warning', message: `${path.name || 'Unnamed test path'} references an endpoint that no longer exists.` });
    if (path.testType === 'bacnet-whois') {
      const broadcast = ipToLong(path.broadcastAddress);
      if (broadcast === null) diagnostics.push({ level: 'error', message: `${path.name || 'BACnet Who-Is'} needs a valid broadcast address.` });
      const suggested = getWhoIsSuggestedBroadcast(project, path);
      if (broadcast !== null && suggested && path.broadcastAddress !== suggested && path.broadcastAddress !== '255.255.255.255') {
        diagnostics.push({ level: 'warning', message: `${path.name || 'BACnet Who-Is'} uses ${path.broadcastAddress}; the source subnet broadcast is ${suggested}.` });
      }
      if (!Number.isInteger(path.udpPort) || (path.udpPort ?? 0) < 1 || (path.udpPort ?? 0) > 65535) diagnostics.push({ level: 'error', message: `${path.name || 'BACnet Who-Is'} needs a valid destination UDP port.` });
    }
  }
  return diagnostics.concat(getPhysicalDiagnostics(project));
}
