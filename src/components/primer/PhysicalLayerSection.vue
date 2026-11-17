<template>
  <section id="primer-physical-layer" class="glass-card primer-section-anchor">
    <p class="eyebrow">FROM LOGICAL TO INSTALLED</p>
    <h3 class="card-title">7. Physical layer: cabling, ports, MS/TP, and ARC156</h3>
    <p>A correct BACnet address plan still depends on the installed path. Switch VLANs, cable media and reach, power delivery, and serial-bus order can each make a logically correct controller unreachable.</p>
    <PrimerScenarioIntro difference="BACnet discovery depends on the broadcast domain and the installed serial or Ethernet path, not only on a valid device address." risk="A VLAN, termination, cable-length, or power fault can keep a logically correct controller offline.">Start with the installed path: where frames go, what happens to the signal, and whether equipment receives power. Use the electrical and token labs below to explore those mechanisms.</PrimerScenarioIntro>
    <div class="physical-primer-grid">
      <article>
        <strong>Access-port VLAN mismatch</strong>
        <p>A controller intended for VLAN 20 is patched into an access port assigned to VLAN 10. Its IP address does not tell the switch which VLAN to use: untagged frames enter the port’s configured broadcast domain.</p>
        <dl>
          <dt>What you observe</dt><dd>The controller has plausible IP settings, but its local discovery traffic does not reach the intended peers.</dd>
          <dt>What to check</dt><dd>Trace the patching to the actual switch port and inspect its access VLAN. Follow the frame’s Layer 2 path before changing IP settings or adding a BBMD.</dd>
        </dl>
      </article>
      <article>
        <strong>MS/TP termination and bias</strong>
        <p>Termination absorbs signal energy at the physical ends of the cable; bias establishes an idle differential when no transmitter drives the pair. They solve different problems. Counting resistors alone cannot establish that the wiring is correct.</p>
        <dl>
          <dt>What you observe</dt><dd>Reflections distort transitions; inadequate idle bias can leave a receiver near its switching threshold between transmissions.</dd>
          <dt>What to check</dt><dd>Locate the two physical cable ends, verify termination placement and values, and check the equipment’s bias arrangement. In the electrical lab below, compare source and receiver traces as termination and cable length change.</dd>
        </dl>
      </article>
      <article>
        <strong>PoE budget exhaustion</strong>
        <p>PoE capability on each port does not guarantee enough total switch power for every connected device. Per-port capability and the shared power budget are separate constraints.</p>
        <dl>
          <dt>What you observe</dt><dd>A controller cannot communicate because it is not receiving power, even though its network configuration is correct.</dd>
          <dt>What to check</dt><dd>Inspect the port’s power status and allocation, the endpoint’s required PoE class, and the switch’s remaining budget. Establish that the controller is powered before troubleshooting BACnet discovery.</dd>
        </dl>
      </article>
      <article>
        <strong>ALC BACnet ARC156</strong>
        <p>ARC156 combines ARCNET token handling with an EIA-485 physical path. Cable segments and the logical token loop describe different things: a repeater divides the electrical path without creating a new BACnet network.</p>
        <dl>
          <dt>What matters</dt><dd>ALC’s wiring requirements specify a daisy chain with up to 32 devices and 610 m (2000 ft) per segment. These are design limits, not a prediction that communication abruptly fails at the next device or metre.</dd>
          <dt>What to check</dt><dd>Trace segment boundaries, repeater placement, cable length, and end termination against the controller’s installation instructions. ARC156 token maintenance differs from the MS/TP Poll For Master process demonstrated below.</dd>
        </dl>
      </article>
    </div>
    <MstpPrimerLabs />
  </section>
</template>

<script setup lang="ts">
import PrimerScenarioIntro from '../PrimerScenarioIntro.vue';
import MstpPrimerLabs from './MstpPrimerLabs.vue';
</script>

<style scoped>
.physical-primer-grid dl { margin: .8rem 0 0; font-size: .84rem; line-height: 1.6; }
.physical-primer-grid dt { color: var(--text-primary); font-weight: 700; margin-top: .7rem; }
.physical-primer-grid dd { margin: .2rem 0 0; color: var(--text-secondary); }
@media (max-width: 700px) { .physical-primer-grid { grid-template-columns: 1fr; } }
</style>
