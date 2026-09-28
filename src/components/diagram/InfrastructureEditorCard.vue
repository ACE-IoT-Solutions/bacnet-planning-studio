<template>
  <article :id="`config-infrastructure-${item.id}`" tabindex="-1" class="glass-card infrastructure-editor-card config-target" :class="{ 'config-target-active': active }">
    <div class="editor-card-header"><strong>{{ item.name || 'Unnamed infrastructure' }}</strong><button class="remove-button" type="button" @click="$emit('remove', item.id)">Remove</button></div>
    <div class="editor-grid two-columns">
      <div class="form-group"><label>Name</label><input v-model="item.name" type="text" placeholder="Core Router"></div>
      <div class="form-group"><label>Type</label><select v-model="item.kind"><option v-for="option in kindOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></div>
    </div>
    <div class="form-group"><label>Management / interface IP (optional)</label><input v-model="item.ip" type="text" placeholder="10.0.0.1" :class="{ 'input-invalid': item.ip && ipToLong(item.ip) === null }"></div>
    <template v-if="item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster'">
      <div class="form-group"><label>Primary hub WebSocket URI</label><input v-model="item.uri" type="text" placeholder="wss://sc-hub.example.com"></div>
      <div v-if="item.kind === 'sc-hub-cluster'" class="editor-grid two-columns"><div class="form-group"><label>Failover hub IP</label><input v-model="item.failoverIp" type="text" placeholder="10.0.1.10"></div><div class="form-group"><label>Failover hub WebSocket URI</label><input v-model="item.failoverUri" type="text" placeholder="wss://sc-failover.example.com"></div></div>
      <div class="form-group compact-group"><label>Connected physical IP networks</label><div class="subnet-checkboxes"><label v-for="subnet in ipSubnets" :key="subnet.id" class="checkbox-chip"><input v-model="item.subnetIds" type="checkbox" :value="subnet.id"><span :style="{ '--chip-color': subnet.color }">{{ subnet.name }}</span></label></div></div>
      <div class="form-group compact-group"><label>Connections to other SC hubs</label><div class="subnet-checkboxes"><label v-for="peer in otherScHubs" :key="peer.id" class="checkbox-chip"><input v-model="item.peerInfrastructureIds" type="checkbox" :value="peer.id"><span>{{ peer.name }}</span></label></div></div>
    </template>
    <div v-else class="form-group compact-group"><label>Connected BACnet/IP subnets</label><div v-if="project.subnets.length" class="subnet-checkboxes"><label v-for="subnet in ipSubnets" :key="subnet.id" class="checkbox-chip"><input v-model="item.subnetIds" type="checkbox" :value="subnet.id"><span :style="{ '--chip-color': subnet.color }">{{ subnet.name || 'Unnamed subnet' }}</span></label></div><span v-else class="field-hint">Add a subnet before making connections.</span></div>
    <div class="form-group compact-group"><label>Notes</label><input v-model="item.notes" type="text" placeholder="Interface, ACL, NAT, or routing detail"></div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ipToLong } from '../../lib/subnet';
import type { DiagramInfrastructure, DiagramProject, DiagramSubnet, InfrastructureKind } from '../../lib/network-diagram';

const props = defineProps<{ item: DiagramInfrastructure; project: DiagramProject; ipSubnets: DiagramSubnet[]; active: boolean }>();
defineEmits<{ remove: [id: string] }>();
const kindOptions: { value: InfrastructureKind; label: string }[] = [
  { value: 'router', label: 'Router' }, { value: 'switch', label: 'Switch' }, { value: 'firewall', label: 'Firewall' }, { value: 'gateway', label: 'Gateway' },
  { value: 'media-converter', label: 'Media converter' }, { value: 'mstp-repeater', label: 'MS/TP repeater' }, { value: 'arcnet-repeater', label: 'ARC156 repeater' }, { value: 'wireless-ap', label: 'Wireless access point' },
  { value: 'sc-hub', label: 'BACnet/SC Hub' }, { value: 'sc-hub-cluster', label: 'BACnet/SC HA Hub Cluster' }
];
const otherScHubs = computed(() => props.project.infrastructure.filter(candidate => candidate.id !== props.item.id && (candidate.kind === 'sc-hub' || candidate.kind === 'sc-hub-cluster')));
</script>
