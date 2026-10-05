import { computed, ref, type Ref } from 'vue';
import {
  createDiagramProjectFromAceBbmdState,
  parseAceBbmdState,
  type AceBbmdStateImport
} from '../lib/ace-bbmd-state';
import {
  groupNmapHostsBySubnet,
  isNmapGatewayHost,
  nmapHostName,
  parseNmapOutput,
  type NmapHost,
  type NmapSubnetGroup
} from '../lib/nmap-import';
import {
  createDevice,
  createDeviceAddress,
  createInfrastructure,
  createSubnet,
  type DiagramDevice,
  type DiagramProject,
  type DiagramSubnet
} from '../lib/network-diagram';
import { getSubnetDetails } from '../lib/subnet';

interface DialogHandle {
  open: () => void;
  close: () => void;
}

function normalizedNetworkType(subnet: DiagramSubnet) {
  return subnet.networkType || 'bacnet-ip';
}

export function formatNmapLatency(seconds: number) {
  const milliseconds = seconds * 1000;
  return `${milliseconds < 0.01 ? milliseconds.toFixed(3) : milliseconds < 1 ? milliseconds.toFixed(2) : milliseconds.toFixed(1)} ms`;
}

export function useDiagramImports(project: Ref<DiagramProject>) {
  const nmapImportDialog = ref<DialogHandle | null>(null);
  const nmapOutput = ref('');
  const nmapCidr = ref(24);
  const nmapImportNotice = ref('');
  const bbmdStateDialog = ref<DialogHandle | null>(null);
  const bbmdStatePreview = ref<AceBbmdStateImport | null>(null);
  const bbmdStateError = ref('');

  const nmapHosts = computed(() => parseNmapOutput(nmapOutput.value));
  const nmapGroups = computed(() => groupNmapHostsBySubnet(nmapHosts.value, nmapCidr.value));
  const existingDiagramIps = computed(() => new Set([
    ...project.value.infrastructure.map(item => item.ip).filter(Boolean),
    ...project.value.subnets.flatMap(subnet => subnet.devices.flatMap(device =>
      device.nics.flatMap(nic => nic.addresses.map(address => address.ip).filter(Boolean))
    ))
  ]));
  const nmapDuplicateCount = computed(() => nmapHosts.value.filter(host => existingDiagramIps.value.has(host.ip)).length);
  const nmapNewHostCount = computed(() => nmapHosts.value.length - nmapDuplicateCount.value);
  const nmapNodeCount = computed(() => new Set(nmapHosts.value.map(host => {
    if (isNmapGatewayHost(host)) return `gateway:${host.ip}`;
    return host.hostname ? `host:${host.hostname.toLocaleLowerCase()}` : `host:${host.ip}`;
  })).size);
  const bbmdStateSubnetCount = computed(() => new Set(
    (bbmdStatePreview.value?.records ?? []).map(record => record.ip.split('.').slice(0, 3).join('.'))
  ).size);

  function openBbmdStateDialog() {
    bbmdStatePreview.value = null;
    bbmdStateError.value = '';
    bbmdStateDialog.value?.open();
  }

  async function readBbmdStateFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    bbmdStatePreview.value = null;
    bbmdStateError.value = '';
    if (!file) return;
    try {
      const parsedJson: unknown = JSON.parse(await file.text());
      const parsedState = parseAceBbmdState(parsedJson);
      if (!parsedState.records.length) throw new Error('No valid BBMD records were found.');
      bbmdStatePreview.value = parsedState;
    } catch (error) {
      bbmdStateError.value = error instanceof Error ? error.message : 'The selected file is not a valid ACE BBMD Manager state store.';
    } finally {
      input.value = '';
    }
  }

  function importBbmdState() {
    if (!bbmdStatePreview.value?.records.length) return;
    const physical = project.value.physical;
    const hasPhysicalData = physical.locations.length || physical.patchPanels.length || physical.links.length
      || physical.mstpSegments.length || physical.arcnetSegments.length;
    if (hasPhysicalData && !window.confirm('Replace this diagram? The imported BBMD state has no physical-layer data, so current locations, ports, cables, and serial wiring will be lost.')) return;
    project.value = createDiagramProjectFromAceBbmdState(bbmdStatePreview.value);
    const importedCount = bbmdStatePreview.value.records.length;
    const subnetCount = project.value.subnets.length;
    nmapImportNotice.value = `Imported ${importedCount} device-level BBMD${importedCount === 1 ? '' : 's'} across ${subnetCount} inferred /24 ${subnetCount === 1 ? 'network' : 'networks'}. Review and correct subnet definitions where needed.`;
    bbmdStateDialog.value?.close();
  }

  function openNmapImportDialog() {
    nmapImportNotice.value = '';
    nmapImportDialog.value?.open();
  }

  function matchingNmapSubnet(group: NmapSubnetGroup) {
    return project.value.subnets.find(subnet => {
      if (normalizedNetworkType(subnet) !== 'bacnet-ip' || subnet.cidr !== group.cidr) return false;
      return getSubnetDetails(subnet.address, subnet.cidr)?.network === group.network;
    });
  }

  function importNmapHosts() {
    const duplicateCount = nmapDuplicateCount.value;
    const freshHosts = nmapHosts.value.filter(host => !existingDiagramIps.value.has(host.ip));
    if (!freshHosts.length) return;
    const groups = groupNmapHostsBySubnet(freshHosts, nmapCidr.value);
    const subnetByHostIp = new Map<string, DiagramSubnet>();
    let createdSubnetCount = 0;

    groups.forEach(group => {
      let subnet = matchingNmapSubnet(group);
      if (!subnet) {
        subnet = createSubnet(project.value.subnets.length + 1);
        subnet.name = `Discovered ${group.network}/${group.cidr}`;
        subnet.address = group.network;
        subnet.cidr = group.cidr;
        subnet.vlan = '';
        subnet.udpPort = '';
        subnet.bacnetNetworkNumber = '';
        project.value.subnets.push(subnet);
        createdSubnetCount += 1;
      }
      group.hosts.forEach(host => subnetByHostIp.set(host.ip, subnet!));
    });

    const importedDevices = new Map<string, { device: DiagramDevice; hosts: NmapHost[] }>();
    let gatewayCount = 0;
    freshHosts.forEach(host => {
      const subnet = subnetByHostIp.get(host.ip);
      if (!subnet) return;
      if (isNmapGatewayHost(host)) {
        const gateway = createInfrastructure(project.value.infrastructure.length + 1);
        gateway.name = host.hostname.replace(/^_+/, '') || `Gateway ${host.ip}`;
        gateway.kind = 'gateway';
        gateway.ip = host.ip;
        gateway.subnetIds = [subnet.id];
        gateway.notes = `Imported from Nmap host discovery${host.latencySeconds === undefined ? '' : ` · observed latency ${formatNmapLatency(host.latencySeconds)}`}`;
        project.value.infrastructure.push(gateway);
        gatewayCount += 1;
        return;
      }
      const hostKey = host.hostname ? `name:${host.hostname.toLocaleLowerCase()}` : `ip:${host.ip}`;
      let imported = importedDevices.get(hostKey);
      if (!imported) {
        const device = createDevice(subnet.devices.length + 1, subnet.id);
        device.name = nmapHostName(host);
        device.kind = 'other';
        device.nics[0].name = 'Discovered interface';
        device.nics[0].bacnetIpEnabled = false;
        device.nics[0].addresses[0].ip = host.ip;
        imported = { device, hosts: [] };
        importedDevices.set(hostKey, imported);
        subnet.devices.push(device);
      } else {
        const address = createDeviceAddress(subnet.id, `Address ${imported.device.nics[0].addresses.length + 1}`);
        address.ip = host.ip;
        imported.device.nics[0].addresses.push(address);
      }
      imported.hosts.push(host);
      imported.device.notes = `Imported from Nmap host discovery · ${imported.hosts.length} responsive ${imported.hosts.length === 1 ? 'address' : 'addresses'}`;
    });

    project.value.viewMode = 'detailed';
    const nodeCount = importedDevices.size + gatewayCount;
    nmapImportNotice.value = `Imported ${freshHosts.length} responsive ${freshHosts.length === 1 ? 'address' : 'addresses'} as ${nodeCount} diagram ${nodeCount === 1 ? 'node' : 'nodes'}${createdSubnetCount ? ` and created ${createdSubnetCount} ${createdSubnetCount === 1 ? 'subnet' : 'subnets'}` : ''}.${duplicateCount ? ` Skipped ${duplicateCount} existing ${duplicateCount === 1 ? 'address' : 'addresses'}.` : ''}`;
    nmapOutput.value = '';
    nmapImportDialog.value?.close();
  }

  return {
    bbmdStateDialog, bbmdStateError, bbmdStatePreview, bbmdStateSubnetCount, existingDiagramIps,
    importBbmdState, importNmapHosts, nmapCidr, nmapDuplicateCount, nmapGroups, nmapHosts,
    nmapImportDialog, nmapImportNotice, nmapNewHostCount, nmapNodeCount, nmapOutput,
    openBbmdStateDialog, openNmapImportDialog, readBbmdStateFile
  };
}
