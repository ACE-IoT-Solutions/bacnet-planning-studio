<template>
  <dialog ref="dialog" class="nmap-import-dialog" aria-labelledby="nmap-import-title">
    <div class="pdf-export-dialog-header"><div><p class="eyebrow">DISCOVERED NETWORK INVENTORY</p><h3 id="nmap-import-title">Import Nmap scan output</h3></div><button class="pdf-dialog-close" type="button" aria-label="Close Nmap import" @click="close">×</button></div>
    <p class="pdf-export-description">Paste text containing <code>Nmap scan report for…</code> and <code>Host is up…</code> lines. Host discovery does not prove BACnet support, so imported devices begin as IP-only inventory.</p>
    <label class="nmap-import-output"><span>Nmap output</span><textarea :value="output" rows="11" spellcheck="false" placeholder="Nmap scan report for _gateway (10.115.12.1)&#10;Host is up (0.0015s latency)." @input="$emit('update:output', ($event.target as HTMLTextAreaElement).value)"></textarea></label>
    <div class="nmap-import-options"><label><span>Network prefix</span><select :value="cidr" @change="$emit('update:cidr', Number(($event.target as HTMLSelectElement).value))"><option v-for="option in cidrOptions" :key="option" :value="option">/{{ option }}</option></select></label><p>Nmap does not report the subnet mask. Select the prefix that matches the scanned LAN.</p></div>
    <div class="nmap-import-preview" aria-live="polite"><template v-if="hosts.length"><div class="nmap-import-summary"><span><strong>{{ hosts.length }}</strong> responsive {{ hosts.length === 1 ? 'address' : 'addresses' }}</span><span><strong>{{ groupCount }}</strong> {{ groupCount === 1 ? 'subnet' : 'subnets' }}</span><span><strong>{{ nodeCount }}</strong> diagram {{ nodeCount === 1 ? 'node' : 'nodes' }}</span></div><p v-if="duplicateCount" class="nmap-import-duplicates">{{ duplicateCount }} existing {{ duplicateCount === 1 ? 'address will' : 'addresses will' }} be skipped.</p><div class="nmap-import-hosts"><div v-for="host in hosts" :key="host.ip"><span class="nmap-import-host-status" aria-hidden="true"></span><span><strong>{{ hostName(host) }}</strong><small>{{ host.ip }}<template v-if="host.latencySeconds !== undefined"> · {{ latency(host.latencySeconds) }}</template></small></span><em v-if="isGateway(host)">Gateway</em><em v-else-if="existingIps.has(host.ip)">Existing</em></div></div></template><p v-else class="nmap-import-empty">No responsive IPv4 hosts found yet.</p></div>
    <div class="pdf-export-dialog-actions"><AppButton @click="close">Cancel</AppButton><AppButton variant="primary" :disabled="newHostCount === 0" @click="$emit('import')">Import {{ newHostCount || '' }} {{ newHostCount === 1 ? 'host' : 'hosts' }}</AppButton></div>
  </dialog>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '../../AppButton.vue';
import type { NmapHost } from '../../../lib/nmap-import';
defineProps<{ output: string; cidr: number; cidrOptions: number[]; hosts: NmapHost[]; groupCount: number; nodeCount: number; duplicateCount: number; newHostCount: number; existingIps: Set<string>; hostName: (host: NmapHost) => string; isGateway: (host: NmapHost) => boolean; latency: (seconds: number) => string }>();
defineEmits<{ 'update:output': [value: string]; 'update:cidr': [value: number]; import: [] }>();
const dialog = ref<HTMLDialogElement | null>(null); function open() { dialog.value?.showModal(); } function close() { dialog.value?.close(); } defineExpose({ open, close });
</script>
