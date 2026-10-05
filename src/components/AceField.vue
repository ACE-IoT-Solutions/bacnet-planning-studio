<template>
  <label class="ace-field">
    <span class="ace-field__label">{{ label }}</span>
    <span v-if="hint" class="ace-field__hint">{{ hint }}</span>
    <slot />
    <span v-if="error" class="ace-field__error">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ label: string; hint?: string; error?: string }>();
</script>
