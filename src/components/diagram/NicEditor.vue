<template>
  <div :id="`config-nic-${nic.id}`" tabindex="-1" class="nic-editor-card config-target" :class="{ 'config-target-active': activeConfigTarget === `nic-${nic.id}` }">
    <div class="nic-editor-heading">
      <input v-model="nic.name" type="text" aria-label="NIC name" placeholder="NIC name">
      <button type="button" @click="actions.addNicAddress(nic, subnet.id)">+ Address</button>
      <button class="row-remove-button" type="button" :disabled="device.nics.length <= 1" title="Remove NIC" @click="actions.removeDeviceNic(device, nic.id)">×</button>
    </div>
    <div class="device-service-selection"><AceCheckbox :model-value="Boolean(nic.bacnetIpEnabled)" label="BACnet/IP" @update:model-value="nic.bacnetIpEnabled = $event" /><AceCheckbox :model-value="Boolean(nic.bacnetScEnabled)" label="BACnet/SC" @update:model-value="nic.bacnetScEnabled = $event" /></div>
    <div v-if="nic.bacnetScEnabled" class="form-group compact-group sc-hub-assignment"><label>SC role</label><select v-model="nic.scHubRole"><option value="node">Node</option><option value="hub">Hub</option><option value="ha-hub">HA hub</option></select><template v-if="nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub'"><label>Hub WebSocket URI</label><input v-model="nic.scHubUri" type="text" placeholder="wss://device-hub.example.com"><template v-if="nic.scHubRole === 'ha-hub'"><label>Failover hub URI</label><input v-model="nic.scFailoverHubUri" type="text" placeholder="wss://device-hub-failover.example.com"></template></template><label>{{ nic.scHubRole === 'node' ? 'Hub assignment' : 'Upstream federating hub (optional)' }}</label><select v-model="nic.scHubId"><option value="">{{ nic.scHubRole === 'node' ? 'Choose hub' : 'No upstream — root hub' }}</option><option v-for="hub in actions.scHubsForNic(nic)" :key="hub.id" :value="hub.id">{{ hub.name }} — {{ hub.label }}</option></select><AceToggle :model-value="Boolean(nic.scHubL3Reachable)" label="L3/TLS path verified" @update:model-value="nic.scHubL3Reachable = $event" /></div>
    <div v-for="(address, addressIndex) in nic.addresses" :key="address.id" class="interface-editor-row">
      <input v-model="address.label" type="text" aria-label="Address label" :placeholder="addressIndex === 0 && nicIndex === 0 ? 'Primary' : 'Address label'">
      <select v-model="address.subnetId" aria-label="Address network"><option value="">Choose network</option><option v-for="optionSubnet in actions.compatibleAddressNetworks(subnet)" :key="optionSubnet.id" :value="optionSubnet.id">{{ optionSubnet.name }}</option></select>
      <input v-model="address.ip" type="text" :aria-label="actions.addressFieldLabel(address)" :placeholder="actions.addressFieldLabel(address)" :class="actions.addressEntryClass(address)">
      <button class="row-remove-button" type="button" :disabled="nic.addresses.length <= 1" title="Remove address" @click="actions.removeNicAddress(nic, address.id)">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import AceCheckbox from '../AceCheckbox.vue';
import AceToggle from '../AceToggle.vue';
import type { DiagramDevice, DiagramNic, DiagramSubnet } from '../../lib/network-diagram';
import type { SubnetEditorActions } from './editor-types';
defineProps<{ device: DiagramDevice; nic: DiagramNic; nicIndex: number; subnet: DiagramSubnet; activeConfigTarget: string; actions: SubnetEditorActions }>();
</script>
