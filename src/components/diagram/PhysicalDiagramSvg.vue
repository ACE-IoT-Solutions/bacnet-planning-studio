<template>
  <svg ref="svg" class="network-diagram-svg physical-diagram-svg" :viewBox="`0 0 ${layout.width} ${layout.height}`" :width="layout.width" :height="layout.height" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="`${project.title} physical topology`">
    <rect class="export-bg" width="100%" height="100%" rx="14" />
    <text class="export-title" x="32" y="38">{{ project.title || 'Untitled physical topology' }}</text>
    <text class="export-notes" x="32" y="60">Physical layer · {{ project.physical.links.length }} cables · {{ serialCount }} serial segments</text>
    <g v-for="lane in layout.lanes" :key="lane.id">
      <rect class="physical-lane" :x="lane.x" :y="lane.y" :width="lane.width" :height="lane.height" rx="12" />
      <text class="physical-lane-label" :x="lane.x + 16" :y="lane.y + 27">{{ lane.label }}</text>
    </g>
    <g class="physical-links">
      <g v-for="link in layout.links" :key="link.id" :class="['diagram-node-action', { 'diagnostic-target-highlight': highlightedTargets.includes(`link-${link.id}`) }]" role="button" tabindex="0" :aria-label="link.label || `${link.media} cable`" @click="$emit('focus', 'link', link.id)" @keydown.enter="$emit('focus', 'link', link.id)">
        <polyline :class="['physical-link', `media-${link.media}`, `status-${link.status}`]" :points="link.points"><title>{{ link.label || link.media }} · {{ link.status }}</title></polyline>
      </g>
    </g>
    <g v-for="node in layout.nodes" :key="node.id" :class="['physical-node', 'diagram-node-action', { 'diagnostic-target-highlight': highlightedTargets.includes(`${node.targetKind}-${node.id}`) || node.ports.some(port => highlightedTargets.includes(`port-${port.id}`) || highlightedTargets.includes(`nic-${port.id}`)) }]" role="button" tabindex="0" :aria-label="node.label" @click="$emit('focus', node.targetKind, node.id)" @keydown.enter="$emit('focus', node.targetKind, node.id)">
      <rect class="physical-node-box" :x="node.x" :y="node.y" :width="node.width" :height="node.height" rx="9" />
      <text class="physical-node-kind" :x="node.x + 14" :y="node.y + 22">{{ node.detail }}</text>
      <text class="physical-node-name" :x="node.x + 14" :y="node.y + 45">{{ node.label }}</text>
      <g v-for="port in node.ports" :key="port.id">
        <circle class="physical-port" :cx="port.x" :cy="port.y" r="4"><title>{{ port.label }}</title></circle>
      </g>
    </g>
    <g v-for="(segment, index) in serialSegments" :key="segment.id" :class="['serial-segment', { 'diagnostic-target-highlight': highlightedTargets.includes(`segment-${segment.id}`) }]" role="button" tabindex="0" @click="$emit('focus', 'segment', segment.id)" @keydown.enter="$emit('focus', 'segment', segment.id)">
      <line :class="['serial-bus', segment.protocol]" x1="40" :y1="layout.height - 42 - index * 18" :x2="layout.width - 40" :y2="layout.height - 42 - index * 18" />
      <rect v-if="segment.members[0]?.terminated" class="serial-termination" x="36" :y="layout.height - 47 - index * 18" width="8" height="10"><title>End termination</title></rect>
      <rect v-if="segment.members.at(-1)?.terminated" class="serial-termination" :x="layout.width - 44" :y="layout.height - 47 - index * 18" width="8" height="10"><title>End termination</title></rect>
      <path v-if="segment.members.some(member => member.biasSource)" class="serial-bias" :d="`M ${layout.width / 2} ${layout.height - 51 - index * 18} l 5 9 h -10 z`"><title>Bias source</title></path>
      <text class="serial-label" x="44" :y="layout.height - 48 - index * 18">{{ segment.name }} · {{ segment.members.length }} nodes</text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ConfigTargetKind, DiagramProject } from '../../lib/network-diagram';
import { layoutPhysicalDiagram } from '../../lib/physical-layout';

const props = withDefaults(defineProps<{ project: DiagramProject; highlightedTargets?: string[] }>(), { highlightedTargets: () => [] });
defineEmits<{ focus: [kind: ConfigTargetKind, id: string] }>();
const svg = ref<SVGSVGElement | null>(null);
const layout = computed(() => layoutPhysicalDiagram(props.project));
const serialSegments = computed(() => [
  ...props.project.physical.mstpSegments.map(item => ({ ...item, protocol: 'mstp' })),
  ...props.project.physical.arcnetSegments.map(item => ({ ...item, protocol: 'arcnet' }))
]);
const serialCount = computed(() => serialSegments.value.length);
defineExpose({ svg });
</script>
