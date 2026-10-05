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
          <DeviceEditor v-for="device in subnet.devices" :key="device.id" :device="device" :subnet="subnet" :active-config-target="activeConfigTarget" :device-kind-options="deviceKindOptions" :actions="actions" />
        </article>
</template>

<script setup lang="ts">
import AceToggle from '../AceToggle.vue';
import DeviceEditor from './DeviceEditor.vue';
import type { DeviceKind, DiagramProject, DiagramSubnet } from '../../lib/network-diagram';
import type { SubnetEditorActions } from './editor-types';

defineProps<{
  project: DiagramProject; subnet: DiagramSubnet; subnetIndex: number; advancedBacnetPorts: boolean; activeConfigTarget: string;
  cidrOptions: number[]; mstpBaudRates: number[]; deviceKindOptions: { value: DeviceKind; label: string }[]; actions: SubnetEditorActions;
}>();
</script>
