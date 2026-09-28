<template>
  <section id="primer-physical-layer" class="glass-card primer-section-anchor">
    <p class="eyebrow">FROM LOGICAL TO INSTALLED</p>
    <h3 class="card-title">7. Physical layer: cabling, ports, MS/TP, and ARC156</h3>
    <p>A correct BACnet address plan still depends on the installed path. Switch VLANs, cable media and reach, power delivery, and serial-bus order can each make a logically correct controller unreachable.</p>
    <div class="physical-primer-grid">
      <article>
        <strong>Access-port VLAN mismatch</strong>
        <p>A controller addressed for VLAN 20 is patched to an access port in VLAN 10. Its IP settings look correct, but its untagged Ethernet frames enter the wrong broadcast domain.</p>
        <small>Check the complete cable path, port mode, access VLAN, and every trunk that must carry the VLAN.</small>
      </article>
      <article>
        <strong>MS/TP termination and bias</strong>
        <p>An EIA-485 daisy chain needs termination at its two physical ends and one intentional bias source per segment. Mid-chain termination or accidental stars create reflections and intermittent token loss.</p>
        <small>Record node order, repeaters, cable length, baud, termination, bias, and unit load.</small>
      </article>
      <article>
        <strong>PoE budget exhaustion</strong>
        <p>A port may advertise PoE while the switch cannot supply every attached load simultaneously. Compare each device class with its port and total switch power budget.</p>
        <small>Reserve capacity for startup load, future devices, and the switch’s actual power-supply configuration.</small>
      </article>
      <article>
        <strong>ALC BACnet ARC156</strong>
        <p>Automated Logic ARC156 runs BACnet ARCNET at 156.25 kbps over shielded EIA-485 cabling. Model it as an ordered daisy chain—not Ethernet—and track its 610 m (2000 ft) and 32-node segment limits.</p>
        <small>Keep polarity consistent, carry the shield through each controller, terminate both ends, and use a router or repeater at segment boundaries.</small>
      </article>
    </div>
  </section>
</template>
