<template>
  <article :id="`config-path-${path.id}`" tabindex="-1" class="glass-card path-editor-card config-target" :class="[path.outcome, { 'config-target-active': active }]">
    <div class="editor-card-header"><strong>{{ path.name || 'Unnamed connectivity test' }}</strong><button class="remove-button" type="button" @click="$emit('remove', path.id)">Remove</button></div>
    <div class="editor-grid path-settings-grid">
      <div class="form-group"><label>Test name</label><input v-model="path.name" type="text" placeholder="Gateway ping"></div>
      <div class="form-group"><label>Test type</label><select v-model="path.testType" @change="$emit('testTypeChange', path)"><option value="ping">Ping (ICMP)</option><option value="bacnet-whois">BACnet Who-Is</option><option value="custom">Custom service</option></select></div>
      <div class="form-group"><label>Observed result</label><select v-model="path.outcome"><option value="success">Successful</option><option value="failure">Unsuccessful</option></select></div>
    </div>
    <div v-if="path.testType === 'custom'" class="form-group"><label>Protocol / service</label><input v-model="path.protocol" type="text" placeholder="BACnet ReadProperty, TCP 47808, etc."></div>
    <div v-if="path.testType === 'bacnet-whois'" class="form-group whois-broadcast-field"><label>Broadcast address used</label><div class="input-row"><input v-model="path.broadcastAddress" type="text" placeholder="e.g. 172.28.131.255" :class="{ 'input-invalid': ipToLong(path.broadcastAddress) === null }"><input v-if="advancedBacnetPorts" v-model.number="path.udpPort" class="whois-port-input" type="number" min="1" max="65535" aria-label="Who-Is destination UDP port" placeholder="47808"><button type="button" class="use-broadcast-button" :disabled="!suggestedBroadcast" @click="$emit('syncBroadcast', path)">Use subnet broadcast</button></div><span class="field-hint">Record the actual limited or directed broadcast and UDP destination port used for this Who-Is.</span></div>
    <label>Ordered path</label>
    <div class="path-hop-list"><div v-for="(_, hopIndex) in path.hops" :key="`${path.id}-${hopIndex}`" class="path-hop-row"><span>{{ hopIndex === 0 ? 'FROM' : hopIndex === path.hops.length - 1 ? 'TO' : `VIA ${hopIndex}` }}</span><select v-model="path.hops[hopIndex]" @change="hopIndex === 0 && $emit('syncBroadcast', path)"><option value="">Choose endpoint</option><option v-for="endpoint in endpointOptions" :key="endpoint.id" :value="endpoint.id">{{ endpoint.label }}</option></select><button class="row-remove-button" type="button" :disabled="path.hops.length <= 2" title="Remove hop" @click="removeHop(hopIndex)">×</button></div></div>
    <button class="add-hop-button" type="button" @click="path.hops.splice(Math.max(1, path.hops.length - 1), 0, '')">+ Add intermediate hop</button>
    <div class="form-group compact-group path-notes"><label>Notes</label><input v-model="path.notes" type="text" placeholder="Timeout, ACL, expected route, or test context"></div>
  </article>
</template>

<script setup lang="ts">
import { ipToLong } from '../../lib/subnet';
import type { DiagramTestPath } from '../../lib/network-diagram';

const props = defineProps<{ path: DiagramTestPath; endpointOptions: { id: string; label: string }[]; advancedBacnetPorts: boolean; active: boolean; suggestedBroadcast: string }>();
defineEmits<{ remove: [id: string]; testTypeChange: [path: DiagramTestPath]; syncBroadcast: [path: DiagramTestPath] }>();
function removeHop(index: number) { if (props.path.hops.length > 2) props.path.hops.splice(index, 1); }
</script>
