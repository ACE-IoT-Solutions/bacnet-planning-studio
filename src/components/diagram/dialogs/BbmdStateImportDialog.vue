<template>
  <dialog ref="dialog" class="nmap-import-dialog" aria-labelledby="bbmd-state-import-title">
    <div class="pdf-export-dialog-header"><div><p class="eyebrow">BACNET BROADCAST TOPOLOGY</p><h3 id="bbmd-state-import-title">Import ACE BBMD Manager state</h3></div><button class="pdf-dialog-close" type="button" aria-label="Close BBMD state import" @click="close">×</button></div>
    <p class="pdf-export-description">Upload an ACE BBMD Manager <code>.state</code> file to create device-level BBMDs and observed BDT relationships. Distinct networks begin as reviewable <strong>/24</strong> assumptions.</p>
    <label class="bbmd-state-file-picker"><span>State-store file</span><input type="file" accept=".state,application/json" @change="$emit('file-change', $event)"></label>
    <p v-if="error" class="bbmd-state-error" role="alert">{{ error }}</p>
    <div v-else-if="preview" class="nmap-import-preview" aria-live="polite"><div class="nmap-import-summary"><span><strong>{{ preview.records.length }}</strong> BBMD devices</span><span><strong>{{ subnetCount }}</strong> inferred /24 networks</span><span><strong>{{ preview.reciprocalBdtPairs }}</strong> mutual BDT pairs</span></div><div class="bbmd-state-findings"><p v-if="preview.oneWayBdtEntries"><strong>{{ preview.oneWayBdtEntries }}</strong> one-way BDT entries will be preserved.</p><p v-if="preview.unresolvedBdtEntries"><strong>{{ preview.unresolvedBdtEntries }}</strong> unresolved BDT targets cannot be linked.</p><p v-if="preview.ignoredRecords"><strong>{{ preview.ignoredRecords }}</strong> malformed records were ignored.</p><p><strong>Review required:</strong> correct inferred addresses and prefixes where needed.</p></div></div><p v-else class="nmap-import-empty">Choose a state-store file to preview its topology.</p>
    <div class="pdf-export-dialog-actions"><AppButton @click="close">Cancel</AppButton><AppButton variant="primary" :disabled="!preview?.records.length" @click="$emit('import')">Replace diagram with imported topology</AppButton></div>
  </dialog>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '../../AppButton.vue';
import type { AceBbmdStateImport } from '../../../lib/ace-bbmd-state';
defineProps<{ preview: AceBbmdStateImport | null; error: string; subnetCount: number }>(); defineEmits<{ 'file-change': [event: Event]; import: [] }>();
const dialog = ref<HTMLDialogElement | null>(null); function open() { dialog.value?.showModal(); } function close() { dialog.value?.close(); } defineExpose({ open, close });
</script>
