<template>
  <dialog class="nmap-import-dialog port-generator-dialog" :open="visible" aria-labelledby="port-generator-title">
    <div class="pdf-export-dialog-header">
      <div><p class="eyebrow">PHYSICAL PORTS</p><h3 id="port-generator-title">Generate {{ mode === 'panel' ? 'patch-panel pairs' : 'equipment ports' }}</h3></div>
      <button class="pdf-dialog-close" type="button" aria-label="Close port generator" @click="close">×</button>
    </div>
    <p>Generate a consistent port range for <strong>{{ targetName }}</strong>. This replaces its current {{ mode === 'panel' ? 'pairs' : 'ports' }}.</p>
    <div class="editor-grid two-columns">
      <div class="form-group"><label>Prefix</label><input v-model="prefix" aria-label="Port prefix"></div>
      <div class="form-group"><label>Start number</label><input v-model.number="start" type="number" min="0"></div>
      <div class="form-group"><label>{{ mode === 'panel' ? 'Pairs' : 'Count' }}</label><input v-model.number="count" type="number" min="1" max="512"></div>
      <template v-if="mode === 'infrastructure'">
        <div class="form-group"><label>Media</label><select v-model="media"><option v-for="item in mediaTypes" :key="item" :value="item">{{ item }}</option></select></div>
        <div class="form-group"><label>Speed (Mbps)</label><input v-model.number="speedMbps" type="number" min="0" step="0.001"></div>
        <div class="form-group"><label>PoE</label><select v-model="poe"><option v-for="item in poeClasses" :key="item" :value="item">{{ item }}</option></select></div>
      </template>
    </div>
    <label v-if="connectedCount" class="port-replacement-warning"><input v-model="acknowledged" type="checkbox"> I understand that replacing these ports removes {{ connectedCount }} attached cable{{ connectedCount === 1 ? '' : 's' }}.</label>
    <div class="dialog-actions"><button type="button" @click="close">Cancel</button><button type="button" class="primary-button" :disabled="!valid" @click="confirm">Replace and generate</button></div>
  </dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PhysicalMedia, PoeClass } from '../../../lib/physical';

export interface PortGenerationRequest {
  kind: 'infrastructure' | 'panel';
  id: string;
  name: string;
  connectedCount: number;
}

export interface PortGenerationResult extends PortGenerationRequest {
  prefix: string;
  start: number;
  count: number;
  media: PhysicalMedia;
  speedMbps?: number;
  poe: PoeClass;
}

const emit = defineEmits<{ generate: [result: PortGenerationResult] }>();
const mediaTypes: PhysicalMedia[] = ['copper-utp', 'copper-stp', 'fiber-mm', 'fiber-sm', 'rs485', 'coax', 'wireless', 'other'];
const poeClasses: PoeClass[] = ['none', 'af', 'at', 'bt-type3', 'bt-type4'];
const visible = ref(false);
const mode = ref<PortGenerationRequest['kind']>('infrastructure');
const targetId = ref('');
const targetName = ref('');
const connectedCount = ref(0);
const prefix = ref('Gi1/0/');
const start = ref(1);
const count = ref(24);
const media = ref<PhysicalMedia>('copper-utp');
const speedMbps = ref<number | undefined>(1000);
const poe = ref<PoeClass>('none');
const acknowledged = ref(false);
const valid = computed(() => Number.isInteger(start.value) && start.value >= 0 && Number.isInteger(count.value) && count.value >= 1 && count.value <= 512 && (!connectedCount.value || acknowledged.value));

function open(request: PortGenerationRequest) {
  mode.value = request.kind; targetId.value = request.id; targetName.value = request.name; connectedCount.value = request.connectedCount;
  prefix.value = request.kind === 'panel' ? '' : 'Gi1/0/'; start.value = 1; count.value = 24; acknowledged.value = false; visible.value = true;
}
function close() { visible.value = false; }
function confirm() {
  if (!valid.value) return;
  emit('generate', { kind: mode.value, id: targetId.value, name: targetName.value, connectedCount: connectedCount.value, prefix: prefix.value, start: start.value, count: count.value, media: media.value, speedMbps: speedMbps.value, poe: poe.value });
  close();
}
defineExpose({ open });
</script>
