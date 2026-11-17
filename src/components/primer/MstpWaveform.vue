<template>
  <section class="scope" aria-label="Animated EIA-485 waveform" aria-live="off">
    <header><strong>On the wire · A, B, and A − B</strong><button type="button" @click="playing = !playing">{{ playing ? 'Pause' : 'Play' }}</button></header>
    <p>Repeating data pattern · {{ baudRate.toLocaleString() }} bps · {{ unitLoads }} UL · {{ terminations }} terminations · {{ lengthMeters }} m / 120 Ω cable</p>
    <label class="scope-scale">Vertical scale <select v-model.number="voltsPerDivision"><option v-for="value in [.5, 1, 2, 5]" :key="value" :value="value">{{ value }} V/div</option></select></label>
    <p class="legend"><span class="line-a">A</span> · <span class="line-b">B</span> · solid: modeled wire · dashed: ideal square wave before loading</p>
    <svg viewBox="0 0 760 490" role="img" aria-label="A and B on one shared absolute voltage axis, with ideal square-wave references; differential A minus B below">
      <defs>
        <clipPath :id="`${scopeId}-pair`"><rect x="100" y="35" width="624" height="220" /></clipPath>
        <clipPath :id="`${scopeId}-diff`"><rect x="100" y="315" width="624" height="140" /></clipPath>
      </defs>
      <text x="100" y="18">A and B · shared voltage axis (relative to reference ground)</text>
      <g v-for="tick in 11" :key="tick">
        <line x1="100" x2="724" :y1="35 + (tick - 1) * 22" :y2="35 + (tick - 1) * 22" stroke="currentColor" opacity=".15" />
        <text x="88" :y="39 + (tick - 1) * 22" text-anchor="end">{{ (2.5 + (6 - tick) * voltsPerDivision).toFixed(1) }} V</text>
      </g>
      <g :clip-path="`url(#${scopeId}-pair)`">
        <line x1="100" x2="724" :y1="pairY(commonMode)" :y2="pairY(commonMode)" stroke="currentColor" stroke-dasharray="2 6" />
        <g v-for="trace in traces.slice(0, 2)" :key="trace.label">
          <path :d="trace.idealPath" fill="none" :stroke="trace.color" stroke-width="1.5" stroke-dasharray="6 5" opacity=".6" />
          <path :d="trace.path" fill="none" :stroke="trace.color" stroke-width="2.5" />
        </g>
      </g>
      <text x="100" y="278">Common mode: {{ commonMode.toFixed(2) }} V · A and B cross at this voltage</text>
      <text x="100" y="302">Differential A − B · same V/div · shaded band: ±200 mV</text>
      <g v-for="tick in [-2, -1, 0, 1, 2]" :key="tick">
        <line x1="100" x2="724" :y1="diffY(tick * voltsPerDivision)" :y2="diffY(tick * voltsPerDivision)" stroke="currentColor" opacity=".2" />
        <text x="88" :y="diffY(tick * voltsPerDivision) + 4" text-anchor="end">{{ (tick * voltsPerDivision).toFixed(1) }} V</text>
      </g>
      <g :clip-path="`url(#${scopeId}-diff)`">
        <rect x="100" :y="diffY(.2)" width="624" :height=".4 * scale" fill="#fbbf24" opacity=".18" />
        <path :d="traces[2].idealPath" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="6 5" opacity=".6" />
        <path :d="traces[2].path" fill="none" stroke="#fbbf24" stroke-width="2.5" />
      </g>
      <text x="100" y="480">Time → 12 bit times ({{ (12000000 / baudRate).toFixed(0) }} μs), slowed for viewing</text>
    </svg>
    <p>Open-circuit swing: ±{{ Math.abs(driverVolts).toFixed(3) }} V · Receiver plateau: ±{{ Math.abs(amplitude).toFixed(3) }} V · {{ distortionLabel }}</p>
    <p>Loop resistance: {{ line.loopOhms.toFixed(2) }} Ω · One-way delay: {{ (line.delaySeconds * 1e6).toFixed(3) }} μs · Far-end reflection coefficient: {{ line.gammaLoad.toFixed(3) }}</p>
    <small>A = non-inverting and B = inverting here; equipment lettering varies. Solid: far-end receiver; dashed: ideal open-circuit source. Common mode is held fixed. Receiver loading is approximated as 12 kΩ per pin per UL (24 kΩ differential), concentrated at the far end. DC plateaus use the resistor network; edge reflections use a traveling-wave approximation with cable loop resistance lumped at the source and a 1 μs driver rise time. Stubs, distributed receiver positions, bias, leakage asymmetry, and frequency-dependent losses are excluded. Scale stays fixed; widen V/div if traces clip. Cable defaults follow <a href="https://catalog.belden.com/techdatam/9841.pdf" target="_blank" rel="noopener noreferrer">Belden 9841 nominal data</a>. Driver values are adjustable teaching assumptions.</small>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId } from 'vue';
import { calculateMstpLine } from '../../lib/mstp-simulator';
const props = withDefaults(defineProps<{ unitLoads: number; terminations: number; commonMode: number; driverVolts: number; baudRate: number; lengthMeters?: number; driverOhms?: number }>(), { lengthMeters: 150, driverOhms: 40 });
const phase = ref(0);
const playing = ref(false);
const scopeId = useId();
const voltsPerDivision = ref(1);
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  playing.value = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  timer = setInterval(() => { if (playing.value && !document.hidden) phase.value = (phase.value + .09) % 12; }, 60);
});
onUnmounted(() => clearInterval(timer));
const load = computed(() => Math.max(0, Number.isFinite(props.unitLoads) ? props.unitLoads : 0));
const line = computed(() => calculateMstpLine({ sourceDifferential: props.driverVolts, unitLoads: load.value, terminations: props.terminations, lengthMeters: props.lengthMeters, driverOhms: props.driverOhms }));
const amplitude = computed(() => line.value.plateauVolts);
const scale = computed(() => 22 / voltsPerDivision.value);
function pairY(volts: number) { return 145 - (volts - 2.5) * scale.value; }
function diffY(volts: number) { return 385 - volts * scale.value; }
const distortionLabel = computed(() => props.terminations < 2 ? 'Reflections with incomplete termination' : props.terminations > 2 ? 'Extra termination loads the driver' : load.value > 32 ? 'Receiver loading exceeds the standard budget' : 'Two end terminations');
const traces = computed(() => {
  const pattern = [1, -1, 1, 1, -1, -1, 1, -1, 1, -1, -1, 1];
  const values: number[] = [];
  const ideals: number[] = [];
  const bitSeconds = 1 / Math.max(1, props.baudRate);
  const tau = line.value.riseSeconds / Math.log(9); // 10–90% rise time
  const decay = Math.exp(-bitSeconds / tau);
  let state = 0;
  for (const bit of pattern) state = bit + (state - bit) * decay;
  state /= 1 - decay ** pattern.length; // periodic initial condition
  const starts = pattern.map(bit => { const start = state; state = bit + (state - bit) * decay; return start; });
  const smoothSource = (time: number) => {
    const position = time / bitSeconds;
    const slot = ((Math.floor(position) % 12) + 12) % 12;
    return pattern[slot] + (starts[slot] - pattern[slot]) * Math.exp(-(position - Math.floor(position)) * bitSeconds / tau);
  };
  for (let i = 0; i <= 624; i++) {
    const target = pattern[Math.floor(i / 52 + phase.value) % 12];
    const time = (i / 52 + phase.value) * bitSeconds;
    let received = 0;
    let gain = line.value.equivalentSource * line.value.arrivalGain;
    for (let echo = 0; echo < 80; echo++) {
      received += gain * smoothSource(time - (1 + 2 * echo) * line.value.delaySeconds);
      gain *= line.value.gammaSource * line.value.gammaLoad;
      if (Math.abs(gain) < 1e-9) break;
    }
    values.push(received);
    ideals.push(target * (Number.isFinite(props.driverVolts) ? props.driverVolts : 0));
  }
  return [
    { label: 'A', color: 'var(--primary)', factor: .5 },
    { label: 'B', color: 'var(--secondary)', factor: -.5 },
    { label: 'A − B', color: '#fbbf24', factor: 1 }
  ].map((trace, index) => {
    const y = (v: number) => index === 2 ? diffY(v) : pairY(props.commonMode + v * trace.factor);
    return { ...trace,
      path: values.map((v, i) => `${i ? 'L' : 'M'}${100 + i},${y(v).toFixed(2)}`).join(' '),
      idealPath: ideals.map((v, i) => `${i ? 'H' : 'M'}${100 + i}${i ? 'V' : ','}${y(v).toFixed(2)}`).join(' ')
    };
  });
});
</script>

<style scoped>
.scope { background: rgba(0,0,0,.2); border-radius: var(--radius-md); padding: .8rem; }
header { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
p, small { color: var(--text-secondary); font-size: .75rem; line-height: 1.5; }
svg { width: 100%; color: var(--text-muted); }
text { fill: currentColor; font: 11px var(--font-mono, monospace); }
.scope-scale { display: flex; align-items: center; gap: .75rem; color: var(--text-secondary); font-size: .8rem; }
.scope-scale select { width: auto; padding: .35rem .6rem; }
.line-a { color: var(--primary); }.line-b { color: var(--secondary); }
button { background: transparent; color: var(--secondary); border: 1px solid currentColor; border-radius: var(--radius-sm); padding: .4rem .7rem; cursor: pointer; }
</style>
