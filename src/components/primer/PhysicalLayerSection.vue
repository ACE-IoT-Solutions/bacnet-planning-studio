<template>
  <section id="primer-physical-layer" class="glass-card primer-section-anchor">
    <p class="eyebrow">FROM LOGICAL TO INSTALLED</p>
    <h3 class="card-title">7. Physical layer: cabling, ports, MS/TP, and ARC156</h3>
    <p>A correct BACnet address plan still depends on the installed path. Switch VLANs, cable media and reach, power delivery, and serial-bus order can each make a logically correct controller unreachable.</p>
    <PrimerScenarioIntro difference="BACnet discovery depends on the broadcast domain and the installed serial or Ethernet path, not only on a valid device address." risk="A VLAN, termination, cable-length, or power fault can keep a logically correct controller offline.">Change the controls in each field scenario to see when the physical layer invalidates a BACnet plan.</PrimerScenarioIntro>
    <div class="physical-primer-grid">
      <article>
        <strong>Access-port VLAN mismatch</strong>
        <p>A controller addressed for VLAN 20 is patched to an access port in VLAN 10. Its IP settings look correct, but its untagged Ethernet frames enter the wrong broadcast domain.</p>
        <label>Controller VLAN <input v-model.number="controllerVlan" type="number" min="1" max="4094"></label><label>Switch access VLAN <input v-model.number="accessVlan" type="number" min="1" max="4094"></label>
        <small :class="controllerVlan === accessVlan ? 'scenario-pass' : 'scenario-fail'">{{ controllerVlan === accessVlan ? 'PASS · Frames enter the intended broadcast domain.' : 'FAIL · The access port places traffic in the wrong VLAN.' }}</small>
      </article>
      <article>
        <strong>MS/TP termination and bias</strong>
        <p>An EIA-485 daisy chain needs termination at its two physical ends and one intentional bias source per segment. Mid-chain termination or accidental stars create reflections and intermittent token loss.</p>
        <label>Terminations <input v-model.number="terminations" type="number" min="0" max="4"></label><label>Bias sources <input v-model.number="biasSources" type="number" min="0" max="4"></label>
        <small :class="terminations === 2 && biasSources === 1 ? 'scenario-pass' : 'scenario-fail'">{{ terminations === 2 && biasSources === 1 ? 'PASS · Two end terminations and one bias source.' : 'FAIL · Configure exactly two end terminations and one bias source.' }}</small>
      </article>
      <article>
        <strong>PoE budget exhaustion</strong>
        <p>A port may advertise PoE while the switch cannot supply every attached load simultaneously. Compare each device class with its port and total switch power budget.</p>
        <label>Switch budget (W) <input v-model.number="poeBudget" type="number" min="0"></label><label>Connected load (W) <input v-model.number="poeLoad" type="number" min="0"></label>
        <small :class="poeLoad <= poeBudget ? 'scenario-pass' : 'scenario-fail'">{{ poeLoad <= poeBudget ? `PASS · ${poeBudget - poeLoad} W remains.` : `FAIL · Load exceeds budget by ${poeLoad - poeBudget} W.` }}</small>
      </article>
      <article>
        <strong>ALC BACnet ARC156</strong>
        <p>Automated Logic ARC156 runs BACnet ARCNET at 156.25 kbps over shielded EIA-485 cabling. Model it as an ordered daisy chain—not Ethernet—and track its 610 m (2000 ft) and 32-node segment limits.</p>
        <label>Nodes <input v-model.number="arcNodes" type="number" min="1"></label><label>Length (m) <input v-model.number="arcLength" type="number" min="0"></label>
        <small :class="arcNodes <= 32 && arcLength <= 610 ? 'scenario-pass' : 'scenario-fail'">{{ arcNodes <= 32 && arcLength <= 610 ? 'PASS · Segment is within the modeled ARC156 limits.' : `FAIL · ${arcNodes > 32 ? 'Add a repeater above 32 nodes. ' : ''}${arcLength > 610 ? 'Add a repeater beyond 610 m.' : ''}` }}</small>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PrimerScenarioIntro from '../PrimerScenarioIntro.vue';
const controllerVlan = ref(20); const accessVlan = ref(10);
const terminations = ref(1); const biasSources = ref(0);
const poeBudget = ref(120); const poeLoad = ref(145);
const arcNodes = ref(33); const arcLength = ref(650);
</script>
