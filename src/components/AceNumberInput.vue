<template>
  <div class="ace-number-input" :class="{ 'is-disabled': disabled, 'is-invalid': invalid }">
    <button
      type="button"
      class="ace-number-input__step"
      :aria-label="decrementLabel"
      :aria-controls="inputId"
      :disabled="disabled || readonly || !canStep(-1)"
      @click="nudge(-1)"
    >−</button>
    <div class="ace-number-input__value">
      <input
        :id="inputId"
        v-bind="$attrs"
        ref="input"
        class="ace-number-input__input"
        type="text"
        inputmode="decimal"
        role="spinbutton"
        :value="draft"
        :disabled="disabled"
        :readonly="readonly"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="numericDraft ?? undefined"
        :aria-valuetext="unit && numericDraft !== null ? `${draft} ${unit}` : undefined"
        :aria-invalid="invalid || undefined"
        @input="onInput"
        @blur="commit"
        @keydown.enter.prevent="commit"
        @keydown.up.prevent="nudge(1)"
        @keydown.down.prevent="nudge(-1)"
      />
      <span v-if="unit" class="ace-number-input__unit" aria-hidden="true">{{ unit }}</span>
    </div>
    <button
      type="button"
      class="ace-number-input__step"
      :aria-label="incrementLabel"
      :aria-controls="inputId"
      :disabled="disabled || readonly || !canStep(1)"
      @click="nudge(1)"
    >+</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue: number | null
  id?: string
  step?: number
  precision?: number
  min?: number
  max?: number
  unit?: string
  disabled?: boolean
  readonly?: boolean
  error?: boolean | string
  incrementLabel?: string
  decrementLabel?: string
}>(), {
  step: 1,
  unit: '',
  disabled: false,
  readonly: false,
  error: false,
  incrementLabel: 'Increase value',
  decrementLabel: 'Decrease value',
})

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()
const generatedId = useId()
const inputId = computed(() => props.id ?? generatedId)
const input = ref<HTMLInputElement>()
const digits = computed(() => props.precision === undefined ? undefined : Math.min(20, Math.max(0, Math.trunc(props.precision))))
const increment = computed(() => Number.isFinite(props.step) && props.step > 0 ? props.step : 1)

function format(value: number | null) {
  if (value === null || !Number.isFinite(value)) return ''
  if (digits.value === undefined) return String(value)
  const fixed = value.toFixed(digits.value)
  // An exact bound takes priority over precision when they cannot both be met.
  return (value === props.min || value === props.max) && Number(fixed) !== value ? String(value) : fixed
}

const draft = ref(format(props.modelValue))
// Keep incomplete edits such as "-" or "1." in the input until committed.
const numericDraft = computed(() => {
  const value = draft.value.trim()
  return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) && Number.isFinite(Number(value)) ? Number(value) : null
})
const invalidDraft = computed(() => draft.value.trim() !== '' && (
  numericDraft.value === null ||
  (props.min !== undefined && numericDraft.value < props.min) ||
  (props.max !== undefined && numericDraft.value > props.max)
))
const invalid = computed(() => Boolean(props.error) || invalidDraft.value)

watch(() => [props.modelValue, props.precision] as const, ([value]) => {
  // A parent accepting an input update must not replace the draft's trailing decimal.
  if (value !== numericDraft.value || typeof document === 'undefined' || document.activeElement !== input.value) draft.value = format(value)
})

function normalize(value: number) {
  const rounded = digits.value === undefined ? value : Number(value.toFixed(digits.value))
  return Math.min(props.max ?? Infinity, Math.max(props.min ?? -Infinity, rounded))
}

function update(value: number | null) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}

function onInput(event: Event) {
  draft.value = (event.target as HTMLInputElement).value
  if (disabledOrReadonly()) return
  if (draft.value.trim() === '') update(null)
  else if (!invalidDraft.value) update(numericDraft.value)
}

function disabledOrReadonly() {
  return props.disabled || props.readonly
}

function commit() {
  if (disabledOrReadonly()) return
  const value = draft.value.trim() === '' ? null : numericDraft.value === null ? props.modelValue : normalize(numericDraft.value)
  draft.value = format(value)
  update(value)
}

function nextValue(direction: number) {
  const base = numericDraft.value ?? props.modelValue ?? 0
  // Round decimal arithmetic (0.1 + 0.2) without forcing typed values onto a step grid.
  const places = (value: number) => {
    const [coefficient = '', exponent = '0'] = String(value).toLowerCase().split('e')
    return Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponent))
  }
  const value = Number((base + direction * increment.value).toFixed(Math.min(20, Math.max(places(base), places(increment.value)))))
  return normalize(value)
}

function canStep(direction: number) {
  const base = numericDraft.value ?? props.modelValue
  const next = nextValue(direction)
  return Number.isFinite(next) && (base === null || (direction > 0 ? next > base : next < base))
}

function nudge(direction: number) {
  if (disabledOrReadonly() || !canStep(direction)) return
  const value = nextValue(direction)
  draft.value = format(value)
  update(value)
}
</script>

<style scoped>
.ace-number-input {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
  width: 100%;
  border: 1px solid var(--ace-border);
  border-radius: var(--ace-radius-md);
  background: rgba(17, 19, 26, 0.74);
  padding: 0.25rem;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.ace-number-input:focus-within {
  border-color: rgba(173, 252, 249, 0.62);
  box-shadow: 0 0 0 3px var(--ace-focus);
}

.ace-number-input.is-invalid {
  border-color: var(--ace-danger);
}

.ace-number-input.is-invalid:focus-within {
  box-shadow: 0 0 0 3px var(--ace-danger-soft);
}

.ace-number-input__step {
  flex: 0 0 44px;
  min-height: 44px;
  border: 1px solid var(--ace-border-strong);
  border-radius: var(--ace-radius-sm);
  background: var(--ace-bg-soft);
  color: var(--ace-secondary);
  font: inherit;
  font-size: 1.4rem;
  cursor: pointer;
}

.ace-number-input__step:hover:not(:disabled) {
  border-color: var(--ace-secondary);
  background: var(--ace-secondary-soft);
}

.ace-number-input__step:focus-visible,
.ace-number-input__input:focus-visible {
  outline: 2px solid var(--ace-secondary);
  outline-offset: -2px;
}

.ace-number-input__step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ace-number-input__value {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.ace-number-input__input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 0;
  border-radius: var(--ace-radius-sm);
  background: transparent;
  color: var(--ace-text);
  padding: 0.4rem;
  font: inherit;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.ace-number-input__unit {
  flex: 0 0 auto;
  color: var(--ace-text-subtle);
  padding-right: 0.4rem;
  font-size: 0.8rem;
}

.ace-number-input.is-disabled {
  opacity: 0.5;
}
</style>
