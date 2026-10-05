<template>
  <input
    class="ace-input"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  >
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
  type?: string;
  autocomplete?: string;
}>(), {
  placeholder: '',
  type: 'text',
  autocomplete: 'off'
});

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
