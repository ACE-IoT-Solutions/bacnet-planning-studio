import { ref, watch } from 'vue';
import { createDefaultProject, createNic, type DiagramDevice, type DiagramNic, type DiagramProject, type DiagramSubnet } from '../lib/network-diagram';
import { migrateDiagramProject } from '../lib/schema-migrations';
import { DIAGRAM_STORAGE_KEY } from '../lib/storage-keys';
import { pruneDanglingReferences } from '../lib/network-diagram-prune';

export function useDiagramProject(storageKey = DIAGRAM_STORAGE_KEY) {
  const project = ref<DiagramProject>(createDefaultProject());
  let autosaveTimer: ReturnType<typeof window.setTimeout> | undefined;

  function loadStoredProject(): boolean {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return false;
    try {
      project.value = migrateDiagramProject(JSON.parse(saved));
      return true;
    } catch {
      return false;
    }
  }

  function replaceProject(next: unknown) {
    project.value = migrateDiagramProject(next);
  }

  function removeEndpointsFromPaths(endpointIds: string[]) {
    const removed = new Set(endpointIds);
    project.value.paths.forEach(path => { path.hops = path.hops.filter(endpointId => !removed.has(endpointId)); });
  }

  function removeSubnet(id: string) {
    const removed = project.value.subnets.find(subnet => subnet.id === id);
    const removedDeviceIds = new Set(removed?.devices.map(device => device.id) ?? []);
    const removedEndpointIds = project.value.subnets.flatMap(subnet => subnet.devices.flatMap(device => device.nics.flatMap(nic => nic.addresses.filter(address => subnet.id === id || address.subnetId === id).map(address => address.id))));
    project.value.subnets = project.value.subnets.filter(subnet => subnet.id !== id);
    for (const item of project.value.infrastructure) {
      item.subnetIds = item.subnetIds.filter(subnetId => subnetId !== id);
      item.underlaySubnetIds = (item.underlaySubnetIds ?? []).filter(subnetId => subnetId !== id);
    }
    for (const subnet of project.value.subnets) for (const device of subnet.devices) {
      device.bdtPeerDeviceIds = (device.bdtPeerDeviceIds ?? []).filter(peerId => !removedDeviceIds.has(peerId));
      if (removedDeviceIds.has(device.foreignDeviceBbmdId ?? '')) device.foreignDeviceBbmdId = '';
      for (const nic of device.nics) nic.addresses = nic.addresses.filter(address => address.subnetId !== id);
      device.nics = device.nics.filter(nic => nic.addresses.length > 0);
      if (!device.nics.length) device.nics.push(createNic(subnet.id));
    }
    removeEndpointsFromPaths(removedEndpointIds);
    pruneDanglingReferences(project.value);
  }

  function removeDevice(subnet: DiagramSubnet, id: string) {
    const device = subnet.devices.find(item => item.id === id);
    removeEndpointsFromPaths(device?.nics.flatMap(nic => nic.addresses.map(address => address.id)) ?? []);
    subnet.devices = subnet.devices.filter(item => item.id !== id);
    for (const owner of project.value.subnets) for (const candidate of owner.devices) {
      candidate.bdtPeerDeviceIds = (candidate.bdtPeerDeviceIds ?? []).filter(peerId => peerId !== id);
      if (candidate.foreignDeviceBbmdId === id) candidate.foreignDeviceBbmdId = '';
    }
    pruneDanglingReferences(project.value);
  }

  function removeDeviceNic(device: DiagramDevice, id: string) {
    if (device.nics.length <= 1) return;
    const nic = device.nics.find(item => item.id === id);
    removeEndpointsFromPaths(nic?.addresses.map(address => address.id) ?? []);
    device.nics = device.nics.filter(item => item.id !== id);
    pruneDanglingReferences(project.value);
  }

  function removeNicAddress(nic: DiagramNic, id: string) {
    if (nic.addresses.length <= 1) return;
    removeEndpointsFromPaths([id]);
    nic.addresses = nic.addresses.filter(address => address.id !== id);
    pruneDanglingReferences(project.value);
  }

  function removeInfrastructure(id: string) {
    project.value.infrastructure = project.value.infrastructure.filter(item => item.id !== id);
    project.value.paths.forEach(path => { path.hops = path.hops.filter(endpointId => endpointId !== id); });
    pruneDanglingReferences(project.value);
  }

  function persistNow() {
    if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
    localStorage.setItem(storageKey, JSON.stringify(project.value));
  }

  const stopAutosave = watch(project, value => {
    if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => localStorage.setItem(storageKey, JSON.stringify(value)), 300);
  }, { deep: true });

  function dispose() {
    stopAutosave();
    persistNow();
  }

  return { project, loadStoredProject, replaceProject, persistNow, dispose, removeSubnet, removeDevice, removeDeviceNic, removeNicAddress, removeInfrastructure };
}
