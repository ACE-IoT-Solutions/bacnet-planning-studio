<template>
<article :id="`config-subnet-${subnet.id}`" tabindex="-1" class="glass-card subnet-editor-card config-target" :class="{ 'config-target-active': activeConfigTarget === `subnet-${subnet.id}` }" :style="{ '--subnet-color': subnet.color }">
          <div class="editor-card-header">
            <strong>{{ subnet.name || `Subnet ${subnetIndex + 1}` }}</strong>
            <button class="remove-button" type="button" title="Remove subnet" @click="actions.removeSubnet(subnet.id)">Remove</button>
          </div>
          <div class="editor-grid two-columns">
            <div class="form-group"><label>Name</label><input v-model="subnet.name" type="text" placeholder="Controls LAN"></div>
            <div class="form-group"><label>Datalink type</label><select v-model="subnet.networkType" @change="actions.handleDiagramNetworkTypeChange(subnet)"><option value="bacnet-ip">IP subnet</option><option value="mstp">BACnet MS/TP</option><option value="arcnet">BACnet ARCNET / ALC ARC156</option></select></div>
          </div>
          <div v-if="!subnet.networkType || subnet.networkType === 'bacnet-ip'" class="editor-grid network-address-grid">
            <div class="form-group"><label>VLAN (optional)</label><input v-model="subnet.vlan" type="text" placeholder="10"></div>
            <div class="form-group">
            <label>Network address & mask</label>
            <div class="input-row">
              <input v-model="subnet.address" type="text" placeholder="192.168.10.0" :class="{ 'input-invalid': !actions.subnetIsValid(subnet) }">
              <select v-model.number="subnet.cidr" class="cidr-select">
                <option v-for="cidr in cidrOptions" :key="cidr" :value="cidr">/{{ cidr }}</option>
              </select>
            </div>
            </div>
            <div v-if="advancedBacnetPorts" class="form-group"><label>BACnet UDP port</label><input v-model.number="subnet.udpPort" type="number" min="1" max="65535" placeholder="47808"></div>
            <div v-if="advancedBacnetPorts" class="form-group"><label>BACnet network number</label><input v-model="subnet.bacnetNetworkNumber" type="number" min="1" max="65534" placeholder="1001"></div>
          </div>
          <div v-else-if="subnet.networkType === 'bacnet-sc'" class="editor-grid two-columns">
            <div class="form-group"><label>BACnet network number</label><input v-model="subnet.bacnetNetworkNumber" type="number" min="1" max="65534" placeholder="3001"></div>
            <AceToggle :model-value="Boolean(subnet.scDirectConnections)" label="Model direct node connections" description="Optional unicast path; hub connectivity remains the baseline" @update:model-value="subnet.scDirectConnections = $event" />
            <span class="field-hint" style="grid-column:1/-1">BACnet/SC uses secure WebSockets over IPv4 or IPv6. A valid BACnet path requires both working IP transport to the selected hub and continuous SC hub/direct connections between nodes.</span>
          </div>
          <div v-else class="editor-grid two-columns">
            <div class="form-group"><label>Upstream routed network</label><select v-model="subnet.upstreamSubnetId"><option value="">Choose upstream network</option><option v-for="upstream in actions.upstreamNetworkOptions(subnet)" :key="upstream.id" :value="upstream.id">{{ upstream.name }} — {{ actions.subnetCidr(upstream) }}</option></select></div>
            <div class="form-group"><label>Routing device on upstream</label><select v-model="subnet.routerId"><option value="">Choose connected device</option><option v-for="router in actions.routingDevicesFor(subnet)" :key="router.id" :value="router.id">{{ router.name }} — {{ router.ip || 'Address not set' }}</option></select></div>
            <div class="form-group"><label>BACnet network number</label><input v-model="subnet.bacnetNetworkNumber" type="number" min="1" max="65534" placeholder="2001"></div>
            <div v-if="subnet.networkType === 'mstp'" class="form-group"><label>Baud rate</label><select v-model.number="subnet.mstpBaudRate"><option v-for="baud in mstpBaudRates" :key="baud" :value="baud">{{ baud.toLocaleString() }} baud</option></select></div>
            <div v-else class="form-group"><label>Data rate</label><select v-model.number="subnet.arcnetDataRate"><option :value="156.25">156.25 kbps</option><option :value="2500">2.5 Mbps</option><option :value="5000">5 Mbps</option><option :value="10000">10 Mbps</option></select></div>
            <div v-if="subnet.networkType === 'mstp'" class="form-group"><label>Max Master</label><input v-model.number="subnet.mstpMaxMaster" type="number" min="0" max="127"></div>
          </div>

          <div class="device-list-header">
            <span>Devices ({{ subnet.devices.length }})</span>
            <button class="icon-text-button small" type="button" @click="actions.addDevice(subnet)">+ Device</button>
          </div>
          <div v-if="!subnet.devices.length" class="empty-editor-state">No devices yet. Add the equipment involved in this condition.</div>
          <div v-for="device in subnet.devices" :id="`config-device-${device.id}`" :key="device.id" tabindex="-1" class="device-editor-block config-target" :class="{ 'config-target-active': activeConfigTarget === `device-${device.id}` }">
            <div class="device-editor-row">
              <div class="device-fields">
                <input v-model="device.name" type="text" aria-label="Device name" placeholder="Device name">
                <select v-model="device.kind" aria-label="Device type">
                  <option v-for="option in deviceKindOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <span class="device-address-count">{{ device.nics.length }} NIC{{ device.nics.length === 1 ? '' : 's' }} · {{ actions.addressCount(device) }} address{{ actions.addressCount(device) === 1 ? '' : 'es' }}</span>
              </div>
              <button class="row-remove-button" type="button" title="Remove device" @click="actions.removeDevice(subnet, device.id)">×</button>
            </div>
            <div class="device-secondary-actions">
              <button class="device-move-button" type="button" :disabled="!actions.movableSubnets(subnet).length" :title="actions.movableSubnets(subnet).length ? 'Move this device and its local addresses to another subnet' : 'Add another compatible subnet before moving this device'" @click="actions.openMoveDeviceDialog(device, subnet)">Move to subnet</button>
            </div>
            <AceToggle :model-value="Boolean(device.requiredForRouting)" label="BACnet router / bridge between datalinks" description="Route between services or networks assigned to this device's NICs" @update:model-value="device.requiredForRouting = $event" />
            <AceToggle v-if="(!subnet.networkType || subnet.networkType === 'bacnet-ip') && device.nics.some(nic => nic.bacnetIpEnabled)" :model-value="Boolean(device.bbmdEnabled)" label="Hosts a BBMD service" description="This BACnet device also distributes BACnet/IP broadcasts" @update:model-value="actions.setDeviceBbmd(device, $event)" />
            <details v-if="device.bbmdEnabled" class="device-relationship-editor bdt-peer-editor">
              <summary>
                <span>Broadcast Distribution Table</span>
                <em>{{ device.bdtPeerDeviceIds?.length ?? 0 }} {{ (device.bdtPeerDeviceIds?.length ?? 0) === 1 ? 'peer' : 'peers' }}</em>
              </summary>
              <div class="bdt-peer-editor-body">
                <span class="field-hint">Select a BBMD to create or remove a mutual BDT relationship.</span>
                <span v-if="!actions.otherBbmdDevices(device, subnet.id).length" class="field-hint">Enable BBMD service on a device in another IP subnet to create BDT relationships.</span>
                <div v-else class="subnet-checkboxes">
                  <label v-for="peer in actions.otherBbmdDevices(device, subnet.id)" :key="peer.device.id" class="checkbox-chip">
                    <input type="checkbox" :checked="actions.isBdtPeer(device, peer.device.id)" @change="actions.toggleBdtPeer(device, peer.device.id)">
                    <span>{{ peer.device.name }} · {{ peer.subnet.name }}</span>
                  </label>
                </div>
              </div>
            </details>
            <div v-if="(!subnet.networkType || subnet.networkType === 'bacnet-ip') && device.nics.some(nic => nic.bacnetIpEnabled)" class="device-relationship-editor">
              <label :for="`fdr-target-${device.id}`">Foreign Device Registration</label>
              <select :id="`fdr-target-${device.id}`" v-model="device.foreignDeviceBbmdId">
                <option value="">Not registered as a foreign device</option>
                <option v-for="target in actions.foreignBbmdOptions(device, subnet.id)" :key="target.device.id" :value="target.device.id">{{ target.device.name }} · {{ target.subnet.name }}</option>
              </select>
              <span class="field-hint">Registers this device with a BBMD on another IP subnet and adds it to that BBMD's Foreign Device Table.</span>
            </div>
            <div class="interface-summary"><span>Network interfaces and assigned addresses</span><button type="button" @click="actions.addDeviceNic(device, subnet.id)">+ Add NIC</button></div>
            <div v-for="(nic, nicIndex) in device.nics" :id="`config-nic-${nic.id}`" :key="nic.id" tabindex="-1" class="nic-editor-card config-target" :class="{ 'config-target-active': activeConfigTarget === `nic-${nic.id}` }">
              <div class="nic-editor-heading">
                <input v-model="nic.name" type="text" aria-label="NIC name" placeholder="NIC name">
                <button type="button" @click="actions.addNicAddress(nic, subnet.id)">+ Address</button>
                <button class="row-remove-button" type="button" :disabled="device.nics.length <= 1" title="Remove NIC" @click="actions.removeDeviceNic(device, nic.id)">×</button>
              </div>
              <div class="device-service-selection"><AceCheckbox :model-value="Boolean(nic.bacnetIpEnabled)" label="BACnet/IP" @update:model-value="nic.bacnetIpEnabled = $event" /><AceCheckbox :model-value="Boolean(nic.bacnetScEnabled)" label="BACnet/SC" @update:model-value="nic.bacnetScEnabled = $event" /></div>
              <div v-if="nic.bacnetScEnabled" class="form-group compact-group sc-hub-assignment"><label>SC role</label><select v-model="nic.scHubRole"><option value="node">Node</option><option value="hub">Hub</option><option value="ha-hub">HA hub</option></select><template v-if="nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub'"><label>Hub WebSocket URI</label><input v-model="nic.scHubUri" type="text" placeholder="wss://device-hub.example.com"><template v-if="nic.scHubRole === 'ha-hub'"><label>Failover hub URI</label><input v-model="nic.scFailoverHubUri" type="text" placeholder="wss://device-hub-failover.example.com"></template></template><label>{{ nic.scHubRole === 'node' ? 'Hub assignment' : 'Upstream federating hub (optional)' }}</label><select v-model="nic.scHubId"><option value="">{{ nic.scHubRole === 'node' ? 'Choose hub' : 'No upstream — root hub' }}</option><option v-for="hub in actions.scHubsForNic(nic)" :key="hub.id" :value="hub.id">{{ hub.name }} — {{ hub.label }}</option></select><AceToggle :model-value="Boolean(nic.scHubL3Reachable)" label="L3/TLS path verified" @update:model-value="nic.scHubL3Reachable = $event" /></div>
              <div v-for="(address, addressIndex) in nic.addresses" :key="address.id" class="interface-editor-row">
                <input v-model="address.label" type="text" aria-label="Address label" :placeholder="addressIndex === 0 && nicIndex === 0 ? 'Primary' : 'Address label'">
                <select v-model="address.subnetId" aria-label="Address network">
                  <option value="">Choose network</option>
                  <option v-for="optionSubnet in actions.compatibleAddressNetworks(subnet)" :key="optionSubnet.id" :value="optionSubnet.id">{{ optionSubnet.name }}</option>
                </select>
                <input v-model="address.ip" type="text" :aria-label="actions.addressFieldLabel(address)" :placeholder="actions.addressFieldLabel(address)" :class="actions.addressEntryClass(address)">
                <button class="row-remove-button" type="button" :disabled="nic.addresses.length <= 1" title="Remove address" @click="actions.removeNicAddress(nic, address.id)">×</button>
              </div>
            </div>
          </div>
        </article>
</template>

<script setup lang="ts">
import AceCheckbox from '../AceCheckbox.vue';
import AceToggle from '../AceToggle.vue';
import type { DeviceKind, DiagramDevice, DiagramDeviceAddress, DiagramNic, DiagramProject, DiagramSubnet } from '../../lib/network-diagram';

interface DeviceSubnetEntry { device: DiagramDevice; subnet: DiagramSubnet }
interface RoutingDevice { id: string; name: string; ip: string }
interface ScHubOption { id: string; name: string; label: string }
interface SubnetEditorActions {
  removeSubnet(id: string): void;
  subnetIsValid(subnet: DiagramSubnet): boolean;
  upstreamNetworkOptions(subnet: DiagramSubnet): DiagramSubnet[];
  subnetCidr(subnet: DiagramSubnet): string;
  routingDevicesFor(subnet: DiagramSubnet): RoutingDevice[];
  addDevice(subnet: DiagramSubnet): void;
  addressCount(device: DiagramDevice): number;
  movableSubnets(subnet: DiagramSubnet): DiagramSubnet[];
  openMoveDeviceDialog(device: DiagramDevice, subnet: DiagramSubnet): void;
  setDeviceBbmd(device: DiagramDevice, enabled: boolean): void;
  otherBbmdDevices(device: DiagramDevice, subnetId: string): DeviceSubnetEntry[];
  isBdtPeer(device: DiagramDevice, peerId: string): boolean;
  toggleBdtPeer(device: DiagramDevice, peerId: string): void;
  foreignBbmdOptions(device: DiagramDevice, subnetId: string): DeviceSubnetEntry[];
  addDeviceNic(device: DiagramDevice, subnetId: string): void;
  addNicAddress(nic: DiagramNic, subnetId: string): void;
  removeDeviceNic(device: DiagramDevice, nicId: string): void;
  scHubsForNic(nic: DiagramNic): ScHubOption[];
  compatibleAddressNetworks(subnet: DiagramSubnet): DiagramSubnet[];
  addressFieldLabel(address: DiagramDeviceAddress): string;
  addressEntryClass(address: DiagramDeviceAddress): Record<string, boolean>;
  removeNicAddress(nic: DiagramNic, addressId: string): void;
  removeDevice(subnet: DiagramSubnet, deviceId: string): void;
  handleDiagramNetworkTypeChange(subnet: DiagramSubnet): void;
}

defineProps<{
  project: DiagramProject; subnet: DiagramSubnet; subnetIndex: number; advancedBacnetPorts: boolean; activeConfigTarget: string;
  cidrOptions: number[]; mstpBaudRates: number[]; deviceKindOptions: { value: DeviceKind; label: string }[]; actions: SubnetEditorActions;
}>();
</script>
