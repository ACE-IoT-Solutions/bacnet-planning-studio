<template>
  <div class="primer-number-field" @focusout="restoreRequiredValue">
    <label :for="inputId"><slot>{{ label }}</slot></label>
    <AceNumberInput :id="inputId" :model-value="draft" :min="min" :max="max" :step="step" :precision="precision" :unit="unit" :increment-label="`Increase ${label}`" :decrement-label="`Decrease ${label}`" @update:model-value="update" />
  </div>
</template>

<script setup lang="ts">
import { ref, useId, watch } from 'vue';
import AceNumberInput from '../AceNumberInput.vue';
const props = withDefaults(defineProps<{ modelValue: number; label: string; min?: number; max?: number; step?: number; precision?: number; unit?: string }>(), { step: 1, precision: 0, unit: '' });
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
const inputId = useId();
const draft = ref<number | null>(props.modelValue);
watch(() => props.modelValue, value => { draft.value = value; });
function update(value: number | null) {
  draft.value = value;
  if (value !== null) emit('update:modelValue', value);
}
function restoreRequiredValue() {
  if (draft.value === null) draft.value = props.modelValue;
}
</script>

<style scoped>
.primer-number-field { --ace-radius-md: var(--radius-md); --ace-radius-sm: var(--radius-sm); display: grid; align-content: start; gap: .3rem; min-width: 0; }
label { color: var(--text-muted); font-size: .7rem; }
.primer-number-field :deep(.ace-number-input) { box-sizing: border-box; min-width: 0; }
.primer-number-field :deep(.ace-number-input__input) { font: 650 .8rem var(--font-mono); }
</style>
