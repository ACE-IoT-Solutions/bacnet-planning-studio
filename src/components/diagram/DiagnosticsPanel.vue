<template>
  <div v-if="visibleDiagnostics.length" class="diagnostics-panel" aria-label="Diagram findings">
    <div class="diagnostics-summary">
      <span><strong>{{ visibleDiagnostics.length }}</strong> findings in {{ groups.length }} {{ groups.length === 1 ? 'class' : 'classes' }}</span>
      <label v-if="diagnostics.some(item => item.level === 'info')"><input v-model="showHints" type="checkbox"> Show hints</label>
    </div>
    <details v-for="group in groups" :key="group.key" :class="['diagnostic-group', group.level]">
      <summary>
        <span class="diagnostic-group-icon">{{ group.level === 'error' ? '!' : group.level === 'warning' ? '△' : 'i' }}</span>
        <span class="diagnostic-group-copy"><strong>{{ group.title }}</strong><small>{{ group.description }}</small></span>
        <span class="diagnostic-group-counts">
          <em v-if="group.errorCount" class="error">{{ group.errorCount }} {{ group.errorCount === 1 ? 'error' : 'errors' }}</em>
          <em v-if="group.warningCount" class="warning">{{ group.warningCount }} {{ group.warningCount === 1 ? 'warning' : 'warnings' }}</em>
          <em v-if="group.infoCount" class="info">{{ group.infoCount }} {{ group.infoCount === 1 ? 'hint' : 'hints' }}</em>
        </span>
      </summary>
      <div class="diagnostic-group-items">
        <button v-for="diagnostic in group.items" :key="`${diagnostic.code}-${diagnostic.message}`" type="button" :class="['diagnostic-item', diagnostic.level]" @click="$emit('focus', diagnostic)">
          <span>{{ diagnostic.level === 'error' ? '!' : diagnostic.level === 'warning' ? '△' : 'i' }}</span>{{ diagnostic.message }}
        </button>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { groupDiagramDiagnostics } from '../../lib/diagram-diagnostics';
import type { DiagramDiagnostic } from '../../lib/network-diagram';

const props = defineProps<{ diagnostics: DiagramDiagnostic[] }>();
defineEmits<{ focus: [diagnostic: DiagramDiagnostic] }>();
const showHints = ref(false);
const visibleDiagnostics = computed(() => props.diagnostics.filter(item => showHints.value || item.level !== 'info'));
const groups = computed(() => groupDiagramDiagnostics(visibleDiagnostics.value));
</script>
