<template>
  <section class="token-demo" aria-label="Token passing animation" aria-live="off">
    <header><strong>Follow the token</strong><button type="button" @click="playing = !playing">{{ playing ? 'Pause' : 'Play' }}</button><button type="button" @click="step">Step</button><button type="button" @click="previewPoll">Jump to maintenance</button></header>
    <p>Rotation {{ rotation }} · {{ message }}</p>
    <svg viewBox="0 0 640 240" role="img" :aria-label="message">
      <ellipse cx="320" cy="115" rx="245" ry="80" fill="none" stroke="currentColor" opacity=".25" />
      <g v-for="(mac, index) in addresses" :key="mac">
        <circle :cx="point(index).x" :cy="point(index).y" :r="addresses.length > 24 ? 4 : 16" :class="{ holder: index === holder }" />
        <text v-if="addresses.length <= 24 || index === holder" :x="point(index).x" :y="point(index).y - 22" text-anchor="middle">{{ mac }}</text>
      </g>
      <circle :cx="tokenPoint.x" :cy="tokenPoint.y" r="7" fill="var(--primary)" stroke="var(--bg-color)" stroke-width="2" />
      <text x="320" y="110" text-anchor="middle">{{ polling ? `PFM → MAC ${pollTarget}` : `TOKEN · MAC ${addresses[holder]}` }}</text>
      <text x="320" y="133" text-anchor="middle">{{ polling ? 'No reply · waiting Tusage_timeout' : 'Known successor handoff' }}</text>
      <text x="320" y="230" text-anchor="middle">Slowed schematic · MAC order, not physical cable layout</text>
    </svg>
    <div class="mac-slots" aria-label="MAC address slots">
      <span v-for="slot in slots" :key="slot" :class="{ active: addresses.includes(slot), owner: slot === addresses[holder], probing: polling && slot === pollTarget }">{{ slot }}<small>{{ polling && slot === pollTarget ? 'PFM' : slot === addresses[holder] ? 'token' : addresses.includes(slot) ? 'node' : 'empty' }}</small></span>
    </div>
    <small>Token passes directly to known managers. After 50 token uses, each manager probes one unused slot before its successor per visit, continuing on later rotations. Orange marks an unanswered poll, not a token sent to an empty address. All managers remain online in this demonstration.</small>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { MstpMacGap } from '../../lib/mstp-simulator';
const props = defineProps<{ addresses: number[]; gaps: MstpMacGap[]; maxManager: number }>();
const holder = ref(0), rotation = ref(1), polling = ref(false), progress = ref(0), playing = ref(false);
let frame = 0;
let lastTime = 0;
const gap = computed(() => props.gaps[holder.value]);
const scanOffset = computed(() => (rotation.value - 1) % (50 + (gap.value?.unused ?? 0)) - 50);
const pollTarget = computed(() => ((gap.value?.from ?? 0) + 1 + Math.max(0, scanOffset.value)) % (Math.max(props.maxManager, ...props.addresses) + 1));
const slots = computed(() => Array.from({ length: Math.min(128, Math.max(props.maxManager, ...props.addresses) + 1) }, (_, i) => i));
const message = computed(() => polling.value ? `MAC ${props.addresses[holder.value]} polls empty MAC ${pollTarget.value}` : `MAC ${props.addresses[holder.value]} → MAC ${props.addresses[(holder.value + 1) % props.addresses.length]}`);
function point(index: number) { const angle = 2 * Math.PI * index / props.addresses.length - Math.PI / 2; return { x: 320 + 245 * Math.cos(angle), y: 115 + 80 * Math.sin(angle) }; }
const tokenPoint = computed(() => {
  const a = point(holder.value), b = point((holder.value + 1) % props.addresses.length);
  const t = polling.value ? 0 : progress.value;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
});
function step() {
  progress.value = 0;
  if (polling.value) { polling.value = false; return; }
  holder.value++;
  if (holder.value >= props.addresses.length) { holder.value = 0; rotation.value++; }
  polling.value = (gap.value?.unused ?? 0) > 0 && scanOffset.value >= 0;
}
function previewPoll() { playing.value = false; holder.value = Math.max(0, props.gaps.findIndex(g => g.unused > 0)); rotation.value = 51; progress.value = 0; polling.value = (gap.value?.unused ?? 0) > 0; }
watch(() => [props.addresses, props.maxManager], () => { holder.value = 0; rotation.value = 1; polling.value = false; progress.value = 0; });
onMounted(() => {
  playing.value = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function animate(now: number) {
    const elapsed = Math.min(100, now - (lastTime || now));
    lastTime = now;
    if (playing.value && !document.hidden) {
      progress.value += elapsed / 1000;
      if (progress.value >= 1) step();
    }
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
});
onUnmounted(() => cancelAnimationFrame(frame));
</script>

<style scoped>
.token-demo { min-width: 0; max-width: 100%; box-sizing: border-box; padding: .8rem; background: rgba(0,0,0,.18); border-radius: var(--radius-md); overflow-wrap: anywhere; }
header { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; } header strong { margin-right: auto; }
button { padding: .4rem .6rem; background: transparent; border: 1px solid var(--border-color); color: var(--secondary); border-radius: var(--radius-sm); cursor: pointer; }
p, small { font-size: .75rem; color: var(--text-secondary); line-height: 1.5; }
svg { display: block; width: 100%; max-width: 100%; min-width: 0; height: auto; color: var(--secondary); }
svg circle:not([fill]) { fill: var(--bg-color, #161820); stroke: var(--secondary); } svg circle.holder { fill: var(--secondary); }
text { fill: currentColor; font: 12px var(--font-mono, monospace); }
.mac-slots { display: flex; flex-wrap: wrap; gap: .25rem; max-height: 11rem; overflow: auto; margin-bottom: .75rem; }
.mac-slots span { display: grid; place-items: center; min-width: 2.5rem; padding: .25rem; border: 1px dashed var(--border-color); color: var(--text-muted); font-size: .8rem; }
.mac-slots small { font-size: .55rem; color: inherit; }
.mac-slots .active { border-style: solid; color: var(--secondary); }.mac-slots .owner { background: var(--primary); color: #17191e; }.mac-slots .probing { background: #fbbf24; color: #17191e; }
</style>
