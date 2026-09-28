<template>
  <div class="glass-card diagram-settings-card">
    <div class="form-group"><label for="diagram-title">Diagram title</label><input id="diagram-title" v-model="project.title" type="text" placeholder="Network condition or site name"></div>
    <div class="form-group"><label for="diagram-scope">Diagram scope</label><select id="diagram-scope" v-model="project.viewMode"><option value="detailed">Detailed — all devices</option><option value="networks">Network topology — infrastructure &amp; key hosts</option><option value="physical">Physical — locations, ports &amp; cabling</option></select></div>
    <AceToggle :model-value="advancedBacnetPorts" label="Advanced BACnet/IP ports" description="Configure multiple B/IP networks on one IP subnet" @update:model-value="$emit('update:advancedBacnetPorts', $event)" />
    <AceToggle :model-value="Boolean(project.allowSplitHorizonBdt)" label="Allow split-horizon BDTs" description="Treat intentional one-way BDT entries as valid and suppress missing-mutual-peer warnings" @update:model-value="project.allowSplitHorizonBdt = $event" />
    <div class="form-group compact-group"><label for="diagram-notes">Condition / troubleshooting notes</label><textarea id="diagram-notes" v-model="project.notes" rows="3" placeholder="Describe symptoms, expected traffic, or the condition being illustrated."></textarea></div>
    <span class="autosave-status">Saved automatically in this browser</span>
  </div>
</template>

<script setup lang="ts">
import AceToggle from '../AceToggle.vue';
import type { DiagramProject } from '../../lib/network-diagram';

defineProps<{ project: DiagramProject; advancedBacnetPorts: boolean }>();
defineEmits<{ 'update:advancedBacnetPorts': [value: boolean] }>();
</script>
