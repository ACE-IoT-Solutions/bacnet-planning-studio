<template>
  <div class="mstp-labs">
    <header class="mstp-labs__heading">
      <p class="eyebrow">INTERACTIVE MS/TP LABS</p>
      <h4>See the electrical and token rules change together</h4>
      <p>These planning models expose the arithmetic behind common field symptoms. They use the standard limits shown in each lab; actual transceivers, cable, traffic mix, and implementation timing still matter.</p>
    </header>

    <section class="mstp-lab" aria-labelledby="electrical-lab-title">
      <div class="mstp-lab__title">
        <div>
          <span class="mstp-lab__number">A</span>
          <div>
            <p class="eyebrow">EIA-485 ELECTRICAL SIMULATOR</p>
            <h5 id="electrical-lab-title">Loading, termination, and signal margin</h5>
          </div>
        </div>
        <span class="mstp-status" :class="electricalHealthy ? 'is-good' : 'is-warning'">
          {{ electricalHealthy ? 'Within modeled limits' : 'Review highlighted limits' }}
        </span>
      </div>

      <div class="mstp-lab__layout">
        <div class="mstp-controls">
          <fieldset>
            <legend><GlossaryLink term="unit-load">Receiver loading</GlossaryLink></legend>
            <div class="mstp-control-grid mstp-control-grid--four">
              <PrimerNumberField v-model="fullLoads" label="1 UL devices" :min="0" :max="256" :precision="0">1 UL devices</PrimerNumberField>
              <PrimerNumberField v-model="halfLoads" label="1/2 UL devices" :min="0" :max="256" :precision="0">1/2 UL devices</PrimerNumberField>
              <PrimerNumberField v-model="quarterLoads" label="1/4 UL devices" :min="0" :max="256" :precision="0">1/4 UL devices</PrimerNumberField>
              <PrimerNumberField v-model="eighthLoads" label="1/8 UL devices" :min="0" :max="256" :precision="0">1/8 UL devices</PrimerNumberField>
            </div>
          </fieldset>

          <fieldset>
            <legend><GlossaryLink term="differential-voltage">Transmitter voltage levels</GlossaryLink></legend>
            <div class="mstp-control-grid">
              <PrimerNumberField v-model="nonInvertingVolts" label="Transmitter A, reference bit" :min="-12" :max="18" :step="0.05" :precision="2" unit="V">Transmitter A, reference bit</PrimerNumberField>
              <PrimerNumberField v-model="invertingVolts" label="Transmitter B, reference bit" :min="-12" :max="18" :step="0.05" :precision="2" unit="V">Transmitter B, reference bit</PrimerNumberField>
              <PrimerNumberField v-model="terminations" label="120 Ω terminations" :min="0" :max="4" :precision="0">120 Ω terminations</PrimerNumberField>
            </div>
            <p class="mstp-model-note">Open-circuit source levels for one bit polarity; A and B swap for the opposite bit. Their difference sets source swing and their average sets common mode.</p>
          </fieldset>
          <fieldset>
            <legend>Cable &amp; driver equivalent</legend>
            <div class="mstp-control-grid">
              <PrimerNumberField v-model="cableLength" label="Cable length" :min="0" :max="5000" :step="10" :precision="0" unit="m">Cable length</PrimerNumberField>
              <PrimerNumberField v-model="driverOhms" label="Driver differential resistance" :min="1" :max="200" :precision="0" unit="Ω">Driver differential resistance</PrimerNumberField>
            </div>
            <p class="mstp-model-note">Default: 150 m of 120 Ω cable, 78.7 Ω/km per conductor, 5.25 ns/m delay. Driver assumption: 40 Ω differential output resistance and 1 μs rise time. One termination is at the far end; two put one at each end. Extra terminations and all receiver loads are lumped at the far end.</p>
          </fieldset>
        </div>

        <div class="mstp-results" aria-live="polite">
          <div class="mstp-meter">
            <div><span>Electrical load</span><strong>{{ formatNumber(electrical.unitLoads, 2) }} UL</strong></div>
            <div class="mstp-meter__track"><span :class="{ over: electrical.unitLoads > 32 }" :style="{ width: `${Math.min(100, electrical.loadUtilizationPercent)}%` }"></span></div>
            <small>{{ electrical.deviceCount }} transceivers · {{ formatSigned(electrical.remainingUnitLoads, 2) }} UL remaining from the 32 UL budget</small>
          </div>

          <div class="mstp-metric-grid">
            <div :class="terminations === 2 ? 'is-good' : 'is-warning'">
              <span>Termination load</span>
              <strong>{{ electrical.terminationOhms === null ? 'Open' : `${formatNumber(electrical.terminationOhms, 1)} Ω` }}</strong>
              <small>{{ terminations }} × 120 Ω in parallel</small>
            </div>
            <div :class="electrical.commonModeValid ? 'is-good' : 'is-danger'">
              <span><GlossaryLink term="common-mode-voltage">Common mode</GlossaryLink></span>
              <strong>{{ formatSigned(electrical.commonModeVolts, 2) }} V</strong>
              <small>Required range: −7 V to +12 V</small>
            </div>
            <div :class="electrical.receiverState === 'undefined' || electrical.receiverState === 'outside-common-mode' ? 'is-danger' : 'is-good'">
              <span>Receiver differential / reference-bit plateau</span>
              <strong>{{ formatSigned(electrical.differentialVolts * 1000, 0) }} mV</strong>
              <small>{{ receiverStateLabel }}</small>
              <small>Receiver A {{ formatSigned(sourceCommonMode + receiverSwing / 2, 3) }} V · B {{ formatSigned(sourceCommonMode - receiverSwing / 2, 3) }} V</small>
            </div>
            <div>
              <span>Transmitter differential A − B</span>
              <strong>{{ formatSigned(sourceDifferential, 2) }} V</strong>
              <small>A {{ formatSigned(nonInvertingVolts, 2) }} V · B {{ formatSigned(invertingVolts, 2) }} V</small>
            </div>
          </div>

          <MstpWaveform :unit-loads="electrical.unitLoads" :terminations="terminations" :common-mode="electrical.commonModeVolts" :driver-volts="sourceDifferential" :baud-rate="baudRate" :length-meters="cableLength" :driver-ohms="driverOhms" />
        </div>
      </div>
    </section>

    <section class="mstp-lab" aria-labelledby="timing-lab-title">
      <div class="mstp-lab__title">
        <div>
          <span class="mstp-lab__number">B</span>
          <div>
            <p class="eyebrow">TOKEN TIMING PLAYGROUND</p>
            <h5 id="timing-lab-title">MAC spacing, rotation time, and payload throughput</h5>
          </div>
        </div>
        <span class="mstp-status" :class="timing.configurationValid && !timing.wasClipped ? 'is-good' : 'is-warning'">
          {{ timing.configurationValid && !timing.wasClipped ? 'Configuration modeled' : 'Address range needs review' }}
        </span>
      </div>

      <div class="mstp-preset-row" aria-label="Token playground presets">
        <button type="button" @click="applyTimingPreset('compact')">Compact trunk</button>
        <button type="button" @click="applyTimingPreset('gapped')">Gapped addresses</button>
        <button type="button" @click="applyTimingPreset('sparse')">Sparse default range</button>
      </div>

      <div class="mstp-lab__layout">
        <div class="mstp-controls">
          <fieldset>
            <legend>Token ring configuration</legend>
            <div class="mstp-control-grid">
              <PrimerNumberField v-model="managerCount" label="Manager count" :min="1" :max="128" :precision="0">Manager count</PrimerNumberField>
              <PrimerNumberField v-model="macGap" label="Empty MACs between managers" :min="0" :max="31" :precision="0">Empty MACs between managers</PrimerNumberField>
              <PrimerNumberField v-model="maxManager" label="Max_Manager" :min="0" :max="127" :precision="0"><GlossaryLink term="max-master">Max_Manager</GlossaryLink></PrimerNumberField>
              <label>Baud rate<select v-model.number="baudRate"><option v-for="rate in baudRates" :key="rate" :value="rate">{{ rate.toLocaleString() }} bps</option></select></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Loaded traffic assumption</legend>
            <div class="mstp-control-grid">
              <PrimerNumberField v-model="maxInfoFrames" label="Max_Info_Frames" :min="1" :max="20" :precision="0"><GlossaryLink term="max-info-frames">Max_Info_Frames</GlossaryLink></PrimerNumberField>
              <PrimerNumberField v-model="payloadBytes" label="NPDU payload" :min="1" :max="501" :precision="0" unit="bytes">NPDU payload</PrimerNumberField>
              <PrimerNumberField v-model="tokenUseDelayMs" label="Observed token-use delay" :min="0" :max="15" :step="0.5" :precision="1" unit="ms">Observed token-use delay</PrimerNumberField>
              <PrimerNumberField v-model="usageTimeoutMs" label="Tusage_timeout" :min="20" :max="35" :precision="0" unit="ms"><GlossaryLink term="tusage-timeout">Tusage_timeout</GlossaryLink> (ms)</PrimerNumberField>
            </div>
          </fieldset>
        </div>

        <div class="mstp-results" aria-live="polite">
          <MstpTokenAnimation :addresses="timing.addresses" :gaps="timing.gaps" :max-manager="maxManager" />
          <section class="mstp-latency" aria-label="Device token access latency">
            <strong>Device token-access latency</strong>
            <div class="mstp-metric-grid mstp-metric-grid--latency">
              <div><span>Minimum</span><strong>{{ formatDuration(timing.deviceLatencyMs.min) }}</strong><small>Request ready at a token visit</small></div>
              <div><span>Median estimate</span><strong>{{ formatDuration(timing.deviceLatencyMs.median) }}</strong><small>Uniform request arrival</small></div>
              <div><span>Maximum budget</span><strong>{{ formatDuration(timing.deviceLatencyMs.max) }}</strong><small>Full rotation with concurrent maintenance polls</small></div>
            </div>
            <p>Estimated wait from a ready request to the next token visit, with no queued work ahead of it. Median ≈ half the estimated rotation; the maximum budgets one unanswered PFM per manager with a gap on the same rotation. The model gives every device the same traffic load. Transmission of the request, response time, retries, and faults are excluded.</p>
            <p v-if="!timing.configurationValid || timing.wasClipped" class="is-warning">These estimates describe the modeled managers only; review the address-range warning below.</p>
          </section>
          <div class="mstp-ring">
            <div class="mstp-ring__summary">
              <span>{{ timing.managerCount }} active managers</span>
              <span>{{ timing.emptyAddresses }} unused addresses through {{ Math.max(maxManager, timing.addresses.at(-1) ?? 0) }}</span>
            </div>
            <div class="mstp-ring__addresses">
              <template v-for="gap in timing.gaps" :key="`${gap.from}-${gap.to}`">
                <b>MAC {{ gap.from }}</b>
                <span v-if="gap.unused">+{{ gap.unused }} empty</span>
                <i aria-hidden="true">→</i>
              </template>
            </div>
            <p v-if="timing.wasClipped" class="mstp-callout is-warning">The requested count does not fit below MAC 127 with this gap; only {{ timing.managerCount }} managers are modeled.</p>
            <p v-if="!timing.configurationValid" class="mstp-callout is-danger">Max_Manager is below the highest active manager ({{ timing.addresses.at(-1) }}). Raise it before treating this as a valid ring.</p>
          </div>

          <div class="mstp-metric-grid mstp-metric-grid--timing">
            <div><span>Normal loaded rotation</span><strong>{{ formatDuration(timing.normalRotationMs) }}</strong><small>Known successors; no maintenance PFM</small></div>
            <div><span>Estimated rotation</span><strong>{{ formatDuration(timing.estimatedRotationMs) }}</strong><small>Includes periodic PFM budget</small></div>
            <div><span>Payload throughput</span><strong>{{ formatThroughput(timing.payloadThroughputBps) }}</strong><small>{{ formatNumber(timing.wireEfficiencyPercent, 1) }}% of selected baud</small></div>
            <div><span>Largest-gap scan horizon</span><strong>{{ timing.largestGapScanRotations ? `${timing.largestGapScanRotations} rotations` : 'No gap' }}</strong><small>{{ timing.largestGapScanRotations ? formatDuration(timing.largestGapScanMs) : 'No unused address to probe' }}</small></div>
          </div>

          <div class="mstp-timing-breakdown">
            <div><span>Data frame wire time</span><b>{{ formatDuration(timing.dataFrameMs) }}</b></div>
            <div><span>Token frame wire time</span><b>{{ formatDuration(timing.tokenFrameMs) }}</b></div>
            <div><span><GlossaryLink term="tturnaround">40-bit turnaround</GlossaryLink></span><b>{{ formatDuration(timing.turnaroundMs) }}</b></div>
            <div><span>PFM events / rotation</span><b>{{ formatNumber(timing.pollEventsPerRotation, 3) }}</b></div>
          </div>

          <aside class="mstp-model-note">
            <strong><GlossaryLink term="poll-for-master">Poll For Master runs periodically.</GlossaryLink></strong>
            <p>After <GlossaryLink term="npoll">Npoll</GlossaryLink> token uses, a manager with unused addresses before its known successor begins maintenance polling. It advances its Poll Station by one address on each subsequent token possession until it reaches the successor, then resets the counter. A gap of <em>g</em> addresses therefore produces a burst of <em>g</em> unanswered polls. Larger gaps extend the scan and consume more maintenance time; outside that periodic scan, steady token passing still targets the known successor directly.</p>
            <p><strong>Throughput model:</strong> every manager sends the selected number of maximum-sized unconfirmed information frames each rotation. It includes 8N1 serial framing, MS/TP frame overhead, 40-bit turnaround, token frames, observed token-use delay, and an amortized periodic-PFM cost. Confirmed replies, retries, CRC errors, application idle time, and implementation jitter are intentionally excluded.</p>
          </aside>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import GlossaryLink from '../GlossaryLink.vue';
import MstpWaveform from './MstpWaveform.vue';
import PrimerNumberField from './PrimerNumberField.vue';
import MstpTokenAnimation from './MstpTokenAnimation.vue';
import { calculateMstpElectrical, calculateMstpTiming, calculateMstpLine } from '../../lib/mstp-simulator';

const fullLoads = ref(8);
const halfLoads = ref(16);
const quarterLoads = ref(0);
const eighthLoads = ref(0);
const terminations = ref(2);
const nonInvertingVolts = ref(4);
const invertingVolts = ref(1);
const cableLength = ref(150);
const driverOhms = ref(40);
const sourceDifferential = computed(() => Number(nonInvertingVolts.value) - Number(invertingVolts.value));
const sourceCommonMode = computed(() => (Number(nonInvertingVolts.value) + Number(invertingVolts.value)) / 2);
const unitLoads = computed(() => Math.max(0, fullLoads.value) + Math.max(0, halfLoads.value) / 2 + Math.max(0, quarterLoads.value) / 4 + Math.max(0, eighthLoads.value) / 8);
const receiverSwing = computed(() => calculateMstpLine({ sourceDifferential: sourceDifferential.value, unitLoads: unitLoads.value, terminations: terminations.value, lengthMeters: cableLength.value, driverOhms: driverOhms.value }).plateauVolts);

const electrical = computed(() => calculateMstpElectrical({
  fullLoads: fullLoads.value,
  halfLoads: halfLoads.value,
  quarterLoads: quarterLoads.value,
  eighthLoads: eighthLoads.value,
  terminations: terminations.value,
  nonInvertingVolts: sourceCommonMode.value + receiverSwing.value / 2,
  invertingVolts: sourceCommonMode.value - receiverSwing.value / 2,
  loadedDriverVolts: Math.abs(sourceDifferential.value)
}));

const electricalHealthy = computed(() => electrical.value.unitLoads <= 32
  && terminations.value === 2
  && electrical.value.commonModeValid
  && !['undefined', 'outside-common-mode'].includes(electrical.value.receiverState));

const receiverStateLabel = computed(() => ({
  high: 'Guaranteed high region (≥ +200 mV)',
  low: 'Guaranteed low region (≤ −200 mV)',
  undefined: 'Undefined threshold band (−200 to +200 mV)',
  'outside-common-mode': 'Outside the −7 V to +12 V common-mode range'
}[electrical.value.receiverState]));

const managerCount = ref(8);
const macGap = ref(1);
const maxManager = ref(15);
const baudRate = ref(38400);
const maxInfoFrames = ref(1);
const payloadBytes = ref(100);
const tokenUseDelayMs = ref(2);
const usageTimeoutMs = ref(20);
const baudRates = [9600, 19200, 38400, 57600, 76800, 115200];

const timing = computed(() => calculateMstpTiming({
  managerCount: managerCount.value,
  macGap: macGap.value,
  maxManager: maxManager.value,
  baudRate: baudRate.value,
  maxInfoFrames: maxInfoFrames.value,
  payloadBytes: payloadBytes.value,
  tokenUseDelayMs: tokenUseDelayMs.value,
  usageTimeoutMs: usageTimeoutMs.value,
  pollInterval: 50
}));

function applyTimingPreset(preset: 'compact' | 'gapped' | 'sparse'): void {
  const values = {
    compact: { count: 8, gap: 0, max: 7 },
    gapped: { count: 8, gap: 1, max: 15 },
    sparse: { count: 8, gap: 3, max: 127 }
  }[preset];
  managerCount.value = values.count;
  macGap.value = values.gap;
  maxManager.value = values.max;
}

function formatNumber(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
}

function formatSigned(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  const formatted = Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: digits });
  return `${value >= 0 ? '+' : '−'}${formatted}`;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds >= 1000) return `${formatNumber(milliseconds / 1000, 2)} s`;
  if (milliseconds >= 1) return `${formatNumber(milliseconds, 2)} ms`;
  return `${formatNumber(milliseconds * 1000, 1)} μs`;
}

function formatThroughput(bitsPerSecond: number): string {
  return bitsPerSecond >= 1000 ? `${formatNumber(bitsPerSecond / 1000, 2)} kbps` : `${formatNumber(bitsPerSecond, 0)} bps`;
}

</script>

<style scoped>
.mstp-labs { display: grid; min-width: 0; gap: 1rem; margin-top: 1.25rem; }
.mstp-labs__heading { padding: 1rem 1.1rem; border-left: 3px solid var(--primary); background: rgba(var(--primary-rgb), .045); }
.mstp-labs__heading h4 { margin: .15rem 0 .35rem; color: var(--text-primary); font: 750 1.05rem/1.3 var(--font-heading); }
.mstp-labs__heading > p:last-child { max-width: 900px; margin: 0; color: var(--text-secondary); font-size: .82rem; line-height: 1.55; }
.mstp-lab { min-width: 0; box-sizing: border-box; padding: 1.1rem; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: rgba(15,17,24,.62); }
.mstp-lab__title, .mstp-lab__title > div { display: flex; align-items: center; gap: .75rem; }
.mstp-lab__title { justify-content: space-between; margin-bottom: 1rem; }
.mstp-lab__title h5 { margin: .12rem 0 0; color: var(--text-primary); font: 750 1rem/1.3 var(--font-heading); }
.mstp-lab__number { display: grid; place-items: center; width: 2.1rem; height: 2.1rem; border: 1px solid rgba(var(--primary-rgb),.5); border-radius: 50%; color: var(--primary); font: 800 .85rem var(--font-heading); }
.mstp-status { padding: .38rem .6rem; border: 1px solid currentColor; border-radius: 999px; font: 700 .66rem var(--font-heading); text-transform: uppercase; letter-spacing: .04em; }
.is-good { color: var(--secondary); }.is-warning { color: var(--warning); }.is-danger { color: #ff8c66; }
.mstp-lab__layout { display: grid; grid-template-columns: minmax(270px,.78fr) minmax(0,1.22fr); gap: 1rem; }
.mstp-controls, .mstp-results { display: grid; min-width: 0; align-content: start; gap: .8rem; }
.mstp-controls fieldset { min-width: 0; margin: 0; padding: .8rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
.mstp-controls legend { padding: 0 .35rem; color: var(--text-primary); font: 700 .76rem var(--font-heading); }
.mstp-control-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,220px),1fr)); gap: .65rem; }
.mstp-control-grid label { display: grid; gap: .3rem; color: var(--text-muted); font-size: .7rem; }
.mstp-control-grid input, .mstp-control-grid select { width: 100%; min-width: 0; padding: .55rem .6rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--input-bg); color: var(--text-primary); font: 650 .8rem var(--font-mono); }
.mstp-meter { padding: .8rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: rgba(255,255,255,.025); }
.mstp-meter > div:first-child { display: flex; justify-content: space-between; gap: .5rem; }
.mstp-meter span, .mstp-metric-grid span { color: var(--text-muted); font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; }
.mstp-meter strong { color: var(--text-primary); font: 800 .95rem var(--font-heading); }
.mstp-meter small, .mstp-metric-grid small { color: var(--text-muted); font-size: .68rem; line-height: 1.4; }
.mstp-meter__track { height: .42rem; margin: .55rem 0; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.08); }
.mstp-meter__track span { display: block; height: 100%; background: var(--secondary); transition: width .2s; }.mstp-meter__track span.over { background: #ff8c66; }
.mstp-metric-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: .65rem; }
.mstp-metric-grid > div { display: grid; gap: .25rem; padding: .75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: rgba(255,255,255,.025); }
.mstp-metric-grid > div.is-good { border-color: rgba(var(--secondary-rgb),.28); }.mstp-metric-grid > div.is-danger { border-color: rgba(255,140,102,.35); }
.mstp-metric-grid strong { color: currentColor; font: 800 1.05rem var(--font-heading); }
.mstp-pair { display: grid; gap: .45rem; padding: .7rem; border-radius: var(--radius-md); background: rgba(0,0,0,.18); }
.mstp-pair__wire { display: grid; grid-template-columns: 1.2rem 1fr 4.6rem; align-items: center; gap: .5rem; color: var(--text-muted); font-size: .72rem; }
.mstp-pair__wire i { display: block; height: 3px; border-radius: 3px; background: currentColor; }.mstp-pair__wire.plus { color: var(--primary); }.mstp-pair__wire.minus { color: var(--secondary); }
.mstp-pair__wire b { text-align: right; font-family: var(--font-mono); }
.mstp-preset-row { display: flex; flex-wrap: wrap; gap: .45rem; margin: -.2rem 0 .8rem; }
.mstp-preset-row button { padding: .42rem .65rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: rgba(255,255,255,.035); color: var(--text-secondary); font: 700 .7rem var(--font-heading); cursor: pointer; }
.mstp-preset-row button:hover { border-color: var(--primary); color: var(--primary); }
.mstp-ring { min-width: 0; padding: .75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: rgba(255,255,255,.02); }
.mstp-ring__summary { display: flex; justify-content: space-between; gap: .5rem; color: var(--text-secondary); font-size: .72rem; }
.mstp-ring__addresses { display: flex; align-items: center; gap: .35rem; margin-top: .65rem; padding-bottom: .3rem; overflow-x: auto; }
.mstp-ring__addresses b { flex: 0 0 auto; padding: .34rem .46rem; border: 1px solid rgba(var(--primary-rgb),.35); border-radius: var(--radius-sm); color: var(--primary); font: 750 .68rem var(--font-mono); }
.mstp-ring__addresses span { flex: 0 0 auto; color: var(--warning); font: 650 .62rem var(--font-mono); }.mstp-ring__addresses i { color: var(--text-muted); }
.mstp-callout { margin: .55rem 0 0; font-size: .7rem; line-height: 1.45; }
.mstp-timing-breakdown { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: .45rem; }
.mstp-timing-breakdown div { display: grid; gap: .2rem; padding: .55rem; border-top: 2px solid var(--border-color); background: rgba(255,255,255,.018); }
.mstp-timing-breakdown span { color: var(--text-muted); font-size: .62rem; }.mstp-timing-breakdown b { color: var(--text-primary); font: 750 .72rem var(--font-mono); }
.mstp-model-note { padding: .8rem; border-left: 3px solid var(--warning); background: var(--warning-bg); }
.mstp-latency { min-width: 0; }
.mstp-latency > strong { color: var(--text-primary); font-size: .85rem; }
.mstp-metric-grid--latency { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: .6rem; }
.mstp-latency p { color: var(--text-secondary); font-size: .72rem; line-height: 1.5; }
.mstp-model-note > strong { color: var(--text-primary); font: 750 .78rem var(--font-heading); }.mstp-model-note p { margin: .35rem 0 0; color: var(--text-secondary); font-size: .7rem; line-height: 1.5; }
@media (max-width: 960px) { .mstp-lab__layout { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .mstp-lab { padding: .8rem; }.mstp-lab__title { align-items: flex-start; flex-direction: column; }.mstp-control-grid, .mstp-metric-grid { grid-template-columns: 1fr; }.mstp-timing-breakdown { grid-template-columns: repeat(2,minmax(0,1fr)); }.mstp-ring__summary { flex-direction: column; } }
</style>
