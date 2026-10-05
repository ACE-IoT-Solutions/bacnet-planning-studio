import { computed, ref, type Ref } from 'vue';
import {
  createDefaultProject,
  createDevice,
  createDeviceAddress,
  createEmptyProject,
  createInfrastructure,
  createNic,
  createSubnet,
  createTestPath,
  getWhoIsSuggestedBroadcast,
  moveDeviceToSubnet,
  type ConfigTargetKind,
  type DiagramDevice,
  type DiagramNic,
  type DiagramProject,
  type DiagramSubnet,
  type DiagramTestPath
} from '../lib/network-diagram';

interface DialogHandle { open: () => void; close: () => void }
interface EndpointOption { id: string; nodeId: string }
interface ResolvedAddress { address: { subnetId: string } }

export function normalizedNetworkType(subnet: DiagramSubnet) {
  return subnet.networkType || 'bacnet-ip';
}

export function useDiagramEditor(options: {
  project: Ref<DiagramProject>;
  endpointOptions: Ref<EndpointOption[]>;
  hostNodes: Ref<{ device: DiagramDevice }[]>;
  activeConfigTarget: Ref<string>;
  importNotice: Ref<string>;
  storageKey: string;
  focusConfig: (kind: ConfigTargetKind, id: string) => Promise<void>;
  resolveAddressEndpoint: (id: string) => ResolvedAddress | null | undefined;
}) {
  const { project, endpointOptions, hostNodes, activeConfigTarget, importNotice, storageKey, focusConfig, resolveAddressEndpoint } = options;
  const moveDeviceDialog = ref<DialogHandle | null>(null);
  const movingDeviceId = ref('');
  const moveSourceSubnetId = ref('');
  const moveTargetSubnetId = ref('');
  const movingDevice = computed(() => project.value.subnets.flatMap(subnet => subnet.devices).find(device => device.id === movingDeviceId.value));
  const moveTargetSubnets = computed(() => {
    const source = project.value.subnets.find(subnet => subnet.id === moveSourceSubnetId.value);
    return source ? movableSubnets(source) : [];
  });

  function addSubnet() { project.value.subnets.push(createSubnet(project.value.subnets.length + 1)); }
  function movableSubnets(source: DiagramSubnet) {
    const sourceType = normalizedNetworkType(source);
    return project.value.subnets.filter(candidate => candidate.id !== source.id && normalizedNetworkType(candidate) === sourceType);
  }
  function openMoveDeviceDialog(device: DiagramDevice, source: DiagramSubnet) {
    const targets = movableSubnets(source);
    if (!targets.length) return;
    movingDeviceId.value = device.id;
    moveSourceSubnetId.value = source.id;
    moveTargetSubnetId.value = targets[0].id;
    moveDeviceDialog.value?.open();
  }
  async function confirmMoveDevice() {
    const deviceId = movingDeviceId.value;
    if (!deviceId || !moveTargetSubnetId.value || !moveDeviceToSubnet(project.value, deviceId, moveTargetSubnetId.value)) return;
    moveDeviceDialog.value?.close();
    await focusConfig('device', deviceId);
  }
  function addDevice(subnet: DiagramSubnet) { subnet.devices.push(createDevice(subnet.devices.length + 1, subnet.id)); }
  function handleDiagramNetworkTypeChange(subnet: DiagramSubnet) { if (subnet.networkType === 'arcnet') subnet.arcnetDataRate = 156.25; }
  function addDeviceNic(device: DiagramDevice, defaultSubnetId: string) { device.nics.push(createNic(defaultSubnetId, device.nics.length + 1)); }
  function addNicAddress(nic: DiagramNic, defaultSubnetId: string) { nic.addresses.push(createDeviceAddress(defaultSubnetId, `Address ${nic.addresses.length + 1}`)); }
  function addInfrastructure() { project.value.infrastructure.push(createInfrastructure(project.value.infrastructure.length + 1)); }
  function addPath() {
    const first = endpointOptions.value[0];
    const second = endpointOptions.value.find(endpoint => endpoint.nodeId !== first?.nodeId);
    project.value.paths.push(createTestPath([first?.id, second?.id].filter((id): id is string => Boolean(id))));
  }
  function removePath(id: string) { project.value.paths = project.value.paths.filter(path => path.id !== id); }
  function suggestedWhoIsBroadcast(path: DiagramTestPath) { return getWhoIsSuggestedBroadcast(project.value, path); }
  function syncWhoIsBroadcast(path: DiagramTestPath) {
    if (path.testType !== 'bacnet-whois') return;
    const suggested = suggestedWhoIsBroadcast(path);
    if (suggested) path.broadcastAddress = suggested;
    const source = resolveAddressEndpoint(path.hops[0]);
    const sourceSubnet = project.value.subnets.find(subnet => subnet.id === source?.address.subnetId);
    if (sourceSubnet && normalizedNetworkType(sourceSubnet) === 'bacnet-ip' && sourceSubnet.udpPort !== '') path.udpPort = sourceSubnet.udpPort ?? 47808;
  }
  function handleTestTypeChange(path: DiagramTestPath) {
    if (path.testType === 'ping') {
      path.protocol = 'ICMP';
      path.broadcastAddress = '';
      if (!path.name || path.name === 'BACnet Who-Is') path.name = 'Ping test';
    } else if (path.testType === 'bacnet-whois') {
      path.protocol = 'BACnet/IP Who-Is';
      if (!path.name || path.name === 'Ping test') path.name = 'BACnet Who-Is';
      syncWhoIsBroadcast(path);
    }
  }
  function resetProject() { if (window.confirm('Replace the current diagram with the starter example?')) project.value = createDefaultProject(); }
  function newProject() {
    if (!window.confirm('Clear the current diagram and start a new project? This replaces the browser autosave. Save the project first if you want to keep a copy.')) return;
    const emptyProject = createEmptyProject();
    project.value = emptyProject;
    localStorage.setItem(storageKey, JSON.stringify(emptyProject));
    activeConfigTarget.value = '';
    importNotice.value = '';
  }
  function compatibleAddressNetworks(owner: DiagramSubnet) {
    return project.value.subnets.filter(candidate => normalizedNetworkType(candidate) === normalizedNetworkType(owner)
      || normalizedNetworkType(candidate) === 'bacnet-sc' || normalizedNetworkType(owner) === 'bacnet-sc');
  }
  function upstreamNetworkOptions(segment: DiagramSubnet) {
    return project.value.subnets.filter(candidate => candidate.id !== segment.id
      && (normalizedNetworkType(candidate) === 'bacnet-ip' || normalizedNetworkType(candidate) === normalizedNetworkType(segment)));
  }
  function bbmdDeviceEntries() {
    return project.value.subnets.flatMap(subnet => subnet.devices.filter(device => device.bbmdEnabled).map(device => ({ device, subnet })));
  }
  function otherBbmdDevices(device: DiagramDevice, subnetId: string) { return bbmdDeviceEntries().filter(entry => entry.device.id !== device.id && entry.subnet.id !== subnetId); }
  function foreignBbmdOptions(device: DiagramDevice, subnetId: string) { return bbmdDeviceEntries().filter(entry => entry.device.id !== device.id && entry.subnet.id !== subnetId); }
  function isBdtPeer(device: DiagramDevice, peerId: string) { return (device.bdtPeerDeviceIds ?? []).includes(peerId); }
  function toggleBdtPeer(device: DiagramDevice, peerId: string) {
    const peer = project.value.subnets.flatMap(subnet => subnet.devices).find(candidate => candidate.id === peerId && candidate.bbmdEnabled);
    if (!peer) return;
    device.bdtPeerDeviceIds ??= [];
    peer.bdtPeerDeviceIds ??= [];
    const enabled = !device.bdtPeerDeviceIds.includes(peerId);
    device.bdtPeerDeviceIds = enabled ? [...device.bdtPeerDeviceIds, peerId] : device.bdtPeerDeviceIds.filter(id => id !== peerId);
    peer.bdtPeerDeviceIds = enabled ? [...new Set([...peer.bdtPeerDeviceIds, device.id])] : peer.bdtPeerDeviceIds.filter(id => id !== device.id);
  }
  function setDeviceBbmd(device: DiagramDevice, enabled: boolean) {
    device.bbmdEnabled = enabled;
    device.bdtPeerDeviceIds ??= [];
    if (enabled) return;
    device.bdtPeerDeviceIds = [];
    project.value.subnets.forEach(subnet => subnet.devices.forEach(candidate => {
      candidate.bdtPeerDeviceIds = (candidate.bdtPeerDeviceIds ?? []).filter(id => id !== device.id);
      if (candidate.foreignDeviceBbmdId === device.id) candidate.foreignDeviceBbmdId = '';
    }));
  }
  function scHubsForNic(currentNic: DiagramNic) {
    const infrastructure = project.value.infrastructure.filter(item => item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster').map(item => ({ id: item.id, name: item.name, label: item.kind === 'sc-hub-cluster' ? 'HA infrastructure hub' : 'infrastructure hub' }));
    const deviceHubs = hostNodes.value.flatMap(host => host.device.nics.filter(nic => nic.id !== currentNic.id && nic.bacnetScEnabled && (nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub')).map(nic => ({ id: nic.id, name: `${host.device.name} · ${nic.name}`, label: nic.scHubRole === 'ha-hub' ? 'device HA hub' : 'device hub' })));
    return [...infrastructure, ...deviceHubs];
  }

  return {
    addDevice, addDeviceNic, addInfrastructure, addNicAddress, addPath, addSubnet, compatibleAddressNetworks,
    confirmMoveDevice, foreignBbmdOptions, handleDiagramNetworkTypeChange, handleTestTypeChange, isBdtPeer,
    movableSubnets, moveDeviceDialog, movingDevice, moveTargetSubnetId, moveTargetSubnets, newProject,
    openMoveDeviceDialog, otherBbmdDevices, removePath, resetProject, scHubsForNic, setDeviceBbmd,
    suggestedWhoIsBroadcast, syncWhoIsBroadcast, toggleBdtPeer, upstreamNetworkOptions
  };
}
