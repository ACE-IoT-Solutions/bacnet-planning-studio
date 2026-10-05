<template>
  <dialog ref="dialog" class="nmap-import-dialog diagram-guide-dialog" aria-labelledby="diagram-guide-title">
    <div class="pdf-export-dialog-header"><div><p class="eyebrow">BUILD AN AS-BUILT OR PLAN</p><h3 id="diagram-guide-title">Get started with the Diagram Builder</h3></div><button class="pdf-dialog-close" type="button" aria-label="Close getting-started guide" @click="close">×</button></div>
    <p class="pdf-export-description">Start from known design information, discover the BBMD topology, or inventory responsive IP hosts. You can combine these approaches and correct the diagram as field conditions become clear.</p>
    <div class="diagram-guide-grid">
      <section class="diagram-guide-step"><span class="diagram-guide-number">1</span><div><h4>Start manually</h4><p>Choose <strong>New project</strong>, add each BACnet datalink, then add devices and infrastructure. Use this path for a planned design or when you already know the subnet, VLAN, BACnet network number, and device details.</p><ul><li>Define the actual network address and prefix.</li><li>Place BBMD service on the BACnet device that hosts it.</li><li>Add BDT, FDR, routing, and connectivity-test relationships.</li></ul></div></section>
      <section class="diagram-guide-step"><span class="diagram-guide-number">2</span><div><h4>Capture a BBMD topology</h4><p><a href="https://github.com/ACE-IoT-Solutions/ace-bbmd-manager" target="_blank" rel="noopener noreferrer">ACE BBMD Manager</a> walks BDT entries from one or more known BBMDs and saves the discovered state. Install it from <a href="https://pypi.org/project/ace-bbmd-manager/" target="_blank" rel="noopener noreferrer">PyPI</a>:</p><pre><code>python -m pip install ace-bbmd-manager</code></pre><p>From a host with BACnet/IP access, identify its local interface address and a known BBMD, then write the scan to a dedicated state file:</p><pre><code>bbmd-manager -l 192.0.2.50 -s site.state walk 192.0.2.10</code></pre><p>Choose <strong>Import BBMD state</strong> and select <code>site.state</code>. Imported networks begin as reviewable <strong>/24 assumptions</strong>.</p><p class="diagram-guide-note">A BBMD walk follows readable BDT entries. It does not discover every BACnet or IP device.</p><AppButton size="sm" @click="$emit('open-bbmd')">Open BBMD state importer</AppButton></div></section>
      <section class="diagram-guide-step"><span class="diagram-guide-number">3</span><div><h4>Discover responsive IP devices with Nmap</h4><p>Run authorized host discovery with <code>nmap -sn 192.0.2.0/24</code>, then paste the output into the Nmap importer. Responsive hosts enter as IP-only inventory because discovery alone does not prove BACnet capability.</p><p class="diagram-guide-note warning">Only scan networks you own or are explicitly authorized to assess.</p><AppButton size="sm" @click="$emit('open-nmap')">Open Nmap importer</AppButton></div></section>
      <section class="diagram-guide-step"><span class="diagram-guide-number">4</span><div><h4>Model the physical layer</h4><p>Enable physical modeling, create the location hierarchy, generate ports, connect device NICs, and build ordered MS/TP or ARC156 chains.</p><ul><li>Set VLAN, media, reach, and PoE data.</li><li>Record termination, bias, and segment budgets.</li><li>Export schedules or legacy v1 JSON.</li></ul></div></section>
    </div>
    <div class="pdf-export-dialog-actions"><AppButton variant="primary" @click="close">Start diagramming</AppButton></div>
  </dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '../../AppButton.vue';
defineEmits<{ 'open-bbmd': []; 'open-nmap': [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
function open() { dialog.value?.showModal(); }
function close() { dialog.value?.close(); }
defineExpose({ open, close });
</script>
