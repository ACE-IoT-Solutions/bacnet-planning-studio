<template>
  <dialog ref="dialog" class="pdf-export-dialog" aria-labelledby="pdf-export-title">
    <div class="pdf-export-dialog-header"><div><p class="eyebrow">PDF EXPORT</p><h3 id="pdf-export-title">Choose an appearance</h3></div><button class="pdf-dialog-close" type="button" aria-label="Close PDF export options" @click="close">×</button></div>
    <p class="pdf-export-description">Use the screen-ready dark version, or a high-contrast light version designed to conserve ink when printed.</p>
    <fieldset class="pdf-theme-options"><legend class="visually-hidden">PDF appearance</legend><label :class="['pdf-theme-option', { selected: theme === 'light' }]"><input :checked="theme === 'light'" type="radio" value="light" @change="$emit('update:theme', 'light')"><span class="pdf-theme-swatch light" aria-hidden="true"></span><span><strong>Light / print</strong><small>White background and print-optimized contrast</small></span></label><label :class="['pdf-theme-option', { selected: theme === 'dark' }]"><input :checked="theme === 'dark'" type="radio" value="dark" @change="$emit('update:theme', 'dark')"><span class="pdf-theme-swatch dark" aria-hidden="true"></span><span><strong>Dark</strong><small>Matches the diagram builder preview</small></span></label></fieldset>
    <div v-if="bbmdCount" class="pdf-bbmd-option"><AceToggle :model-value="includeBbmd" label="Include BBMD table pages" :description="`Add compact schedule pages for ${bbmdCount} BBMD ${bbmdCount === 1 ? 'device' : 'devices'}`" @update:model-value="$emit('update:includeBbmd', $event)" /></div>
    <div v-if="hasPhysicalSchedules" class="pdf-bbmd-option"><AceToggle :model-value="includeCables" label="Include cable schedule pages" @update:model-value="$emit('update:includeCables', $event)" /><AceToggle :model-value="includeSerial" label="Include MS/TP and ARC156 segment tables" @update:model-value="$emit('update:includeSerial', $event)" /></div>
    <div class="pdf-export-dialog-actions"><AppButton @click="close">Cancel</AppButton><AppButton variant="primary" @click="$emit('export')">Export PDF</AppButton></div>
  </dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AceToggle from '../../AceToggle.vue';
import AppButton from '../../AppButton.vue';
defineProps<{ theme: 'dark' | 'light'; includeBbmd: boolean; includeCables: boolean; includeSerial: boolean; bbmdCount: number; hasPhysicalSchedules: boolean }>();
defineEmits<{ 'update:theme': [value: 'dark' | 'light']; 'update:includeBbmd': [value: boolean]; 'update:includeCables': [value: boolean]; 'update:includeSerial': [value: boolean]; export: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
function open() { dialog.value?.showModal(); }
function close() { dialog.value?.close(); }
defineExpose({ open, close });
</script>
