<template>
  <section class="diagram-page">
    <div class="diagram-page-heading">
      <div>
        <p class="eyebrow">COMMUNICATE THE CONDITION</p>
        <h2>Network Diagram Builder</h2>
        <p>Document <GlossaryLink term="bacnet-ip">BACnet/IP</GlossaryLink> <GlossaryLink term="subnet">subnets</GlossaryLink>,
          <GlossaryLink term="mstp">MS/TP</GlossaryLink> trunks, <GlossaryLink term="arcnet">ARCNET</GlossaryLink> segments, field devices,
          and infrastructure. The diagram updates as you edit it.</p>
      </div>
      <div class="diagram-actions">
        <AppButton @click="openGettingStartedDialog">Getting started</AppButton>
        <AppButton variant="danger" @click="newProject">New project</AppButton>
        <AppButton @click="openBbmdStateDialog">Import BBMD state</AppButton>
        <AppButton @click="openNmapImportDialog">Import Nmap</AppButton>
        <AppButton @click="fileInput?.click()">Open JSON</AppButton>
        <AppButton @click="saveJson">Save project</AppButton>
        <AppButton @click="saveLegacyJson">Export legacy JSON</AppButton>
        <AppButton @click="saveXlsx">Export XLSX</AppButton>
        <AppButton variant="primary" @click="saveSvg">Export SVG</AppButton>
        <AppButton :disabled="isExportingPdf" @click="openPdfExportDialog">{{ isExportingPdf ? 'Building PDF…' : 'Export PDF' }}</AppButton>
        <input ref="fileInput" class="visually-hidden" type="file" accept="application/json,.json" @change="openJson">
      </div>
    </div>

    <div v-if="nmapImportNotice" class="diagram-import-notice" role="status">
      <span>{{ nmapImportNotice }}</span>
      <button type="button" aria-label="Dismiss import result" @click="nmapImportNotice = ''">×</button>
    </div>

    <div class="diagram-workspace">
      <aside class="diagram-editor">
        <DiagramSettingsCard v-model:advanced-bacnet-ports="advancedBacnetPorts" :project="project" />

        <div class="editor-section-heading">
          <div><span class="step-number">1</span><h3>Networks, overlays & devices</h3></div>
          <button class="icon-text-button" type="button" @click="addSubnet">+ Add network</button>
        </div>

        <SubnetEditorCard v-for="(subnet, subnetIndex) in project.subnets" :key="subnet.id" :project="project" :subnet="subnet" :subnet-index="subnetIndex" :advanced-bacnet-ports="advancedBacnetPorts" :active-config-target="activeConfigTarget" :cidr-options="cidrOptions" :mstp-baud-rates="mstpBaudRates" :device-kind-options="deviceKindOptions" :actions="subnetEditorActions" />
        <div class="editor-section-heading infrastructure-heading">
          <div><span class="step-number">2</span><h3>IT infrastructure</h3></div>
          <button class="icon-text-button" type="button" @click="addInfrastructure">+ Add infrastructure</button>
        </div>
        <div v-if="!project.infrastructure.length" class="glass-card empty-editor-state infrastructure-empty">Add routers, switches, firewalls, gateways, or BACnet/SC hubs and connect them to the relevant networks. BBMD service is configured on BACnet devices above.</div>
        <InfrastructureEditorCard v-for="item in project.infrastructure" :key="item.id" :item="item" :project="project" :ip-subnets="ipSubnets" :active="activeConfigTarget === `infrastructure-${item.id}`" @remove="removeInfrastructure" />

        <div class="editor-section-heading paths-heading">
          <div><span class="step-number">3</span><h3>Connectivity tests</h3></div>
          <button class="icon-text-button" type="button" :disabled="endpointOptions.length < 2" @click="addPath">+ Add path</button>
        </div>
        <div v-if="!project.paths.length" class="glass-card empty-editor-state infrastructure-empty">Add a ping or service test, order its endpoints and intermediate hops, then mark the observed result.</div>
        <TestPathEditorCard v-for="path in project.paths" :key="path.id" :path="path" :endpoint-options="endpointOptions" :advanced-bacnet-ports="advancedBacnetPorts" :active="activeConfigTarget === `path-${path.id}`" :suggested-broadcast="suggestedWhoIsBroadcast(path)" @remove="removePath" @test-type-change="handleTestTypeChange" @sync-broadcast="syncWhoIsBroadcast" />
        <PhysicalLayerEditor :project="project" />
      </aside>

      <main class="diagram-preview-column">
        <DiagnosticsPanel :diagnostics="diagnostics" @focus="focusDiagnostic" />
        <div class="diagram-preview-toolbar">
          <div><strong>Live preview</strong><span>{{ project.subnets.length }} subnets · {{ deviceCount }} devices · {{ project.infrastructure.length }} infrastructure · {{ project.paths.length }} tests</span></div>
          <div class="diagram-preview-controls">
            <label for="diagram-layout-mode">Layout</label>
            <select id="diagram-layout-mode" v-model="layoutMode">
              <option value="compact">Compact grid · 4 across</option>
              <option value="balanced">Balanced grid · 8 across</option>
              <option value="wide">Wide rows · no wrapping</option>
            </select>
            <label v-if="bbmdReport.devices.length" for="diagram-relationship-mode">BDT view</label>
            <select v-if="bbmdReport.devices.length" id="diagram-relationship-mode" v-model="relationshipMode">
              <option value="highlights">Peer highlights</option>
              <option value="focused">Focused edges</option>
              <option value="all">All edges</option>
              <option value="hidden">Hidden</option>
            </select>
            <select v-if="bbmdReport.devices.length && (relationshipMode === 'highlights' || relationshipMode === 'focused')" v-model="focusedBbmdId" aria-label="Focused BBMD">
              <option v-for="bbmd in bbmdReport.devices" :key="bbmd.id" :value="bbmd.id">{{ bbmd.name }} · {{ bbmd.endpoint }}</option>
            </select>
            <label v-if="project.physical.links.length && project.viewMode !== 'physical'" class="physical-overlay-toggle"><input v-model="showPhysicalOverlay" type="checkbox"> Cabling overlay</label>
            <button type="button" class="reset-button" @click="resetProject">Reset example</button>
          </div>
        </div>
        <div v-if="focusedBbmd && (relationshipMode === 'highlights' || relationshipMode === 'focused')" class="diagram-relationship-summary">
          <span><strong>{{ focusedBbmd.name }}</strong> · {{ focusedBbmd.entries.length }} outbound · {{ focusedBbmd.inboundPeerIds.length }} inbound</span>
          <span class="relationship-summary-legend"><em class="mutual">Mutual</em><em class="outbound">Outbound only</em><em class="inbound">Inbound only</em><em class="fdr">FDR client</em></span>
          <small>{{ relationshipMode === 'highlights' ? 'Cards are highlighted without drawing BDT edges.' : 'Only relationships involving this BBMD are drawn.' }} Click another BBMD card to focus it.</small>
        </div>
        <div class="diagram-scroll-frame">
          <PhysicalDiagramSvg v-if="project.viewMode === 'physical'" ref="physicalDiagram" :project="project" :highlighted-targets="diagnosticTargetKeys" @focus="focusConfig" />
          <LogicalDiagramSvg v-else ref="logicalDiagram" :model="logicalDiagramModel" />
        </div>
      </main>
    </div>

    <dialog ref="gettingStartedDialog" class="nmap-import-dialog diagram-guide-dialog" aria-labelledby="diagram-guide-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">BUILD AN AS-BUILT OR PLAN</p>
          <h3 id="diagram-guide-title">Get started with the Diagram Builder</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close getting-started guide" @click="gettingStartedDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">Start from known design information, discover the BBMD topology, or inventory responsive IP hosts. You can combine these approaches and correct the diagram as field conditions become clear.</p>

      <div class="diagram-guide-grid">
        <section class="diagram-guide-step">
          <span class="diagram-guide-number">1</span>
          <div>
            <h4>Start manually</h4>
            <p>Choose <strong>New project</strong>, add each BACnet datalink, then add devices and infrastructure. Use this path for a planned design or when you already know the subnet, VLAN, BACnet network number, and device details.</p>
            <ul>
              <li>Define the actual network address and prefix.</li>
              <li>Place BBMD service on the BACnet device that hosts it.</li>
              <li>Add BDT, FDR, routing, and connectivity-test relationships.</li>
            </ul>
          </div>
        </section>

        <section class="diagram-guide-step">
          <span class="diagram-guide-number">2</span>
          <div>
            <h4>Capture a BBMD topology</h4>
            <p><a href="https://github.com/ACE-IoT-Solutions/ace-bbmd-manager" target="_blank" rel="noopener noreferrer">ACE BBMD Manager</a> walks BDT entries from one or more known BBMDs and saves the discovered state. Install it from <a href="https://pypi.org/project/ace-bbmd-manager/" target="_blank" rel="noopener noreferrer">PyPI</a>:</p>
            <pre><code>python -m pip install ace-bbmd-manager</code></pre>
            <p>From a host with BACnet/IP access, identify its local interface address and a known BBMD, then write the scan to a dedicated state file:</p>
            <pre><code>bbmd-manager -l 192.0.2.50 -s site.state walk 192.0.2.10</code></pre>
            <p>Choose <strong>Import BBMD state</strong> and select <code>site.state</code>. Studio creates device-level BBMDs and directional BDT links. Because the state store does not include authoritative subnet definitions, imported networks begin as <strong>/24 assumptions</strong>; review and correct them.</p>
            <p class="diagram-guide-note">A BBMD walk follows readable BDT entries. It does not discover every BACnet or IP device, and ACLs, routing, UDP ports, or one-way BDTs can limit what it sees.</p>
            <AppButton size="sm" @click="openBbmdImportFromGuide">Open BBMD state importer</AppButton>
          </div>
        </section>

        <section class="diagram-guide-step">
          <span class="diagram-guide-number">3</span>
          <div>
            <h4>Discover responsive IP devices with Nmap</h4>
            <p>Install <a href="https://nmap.org/download.html" target="_blank" rel="noopener noreferrer">Nmap</a>, identify the subnet you are authorized to inspect, and run a host-discovery scan. The <code>-sn</code> option discovers hosts without performing a port scan:</p>
            <pre><code>nmap -sn 192.0.2.0/24</code></pre>
            <p>To retain a normal-text copy as well as terminal output:</p>
            <pre><code>nmap -sn 192.0.2.0/24 -oN subnet-scan.txt</code></pre>
            <p>Choose <strong>Import Nmap</strong> and paste the terminal output or the contents of <code>subnet-scan.txt</code>. Select the correct prefix before importing. Responsive hosts enter as IP-only inventory because host discovery alone does not prove BACnet capability.</p>
            <p class="diagram-guide-note warning">Only scan networks you own or are explicitly authorized to assess. Use the real subnet prefix and the appropriate connected interface; some probe types may require elevated privileges on your operating system.</p>
            <div class="diagram-guide-links">
              <a href="https://nmap.org/book/man-host-discovery.html" target="_blank" rel="noopener noreferrer">Nmap host-discovery reference</a>
              <AppButton size="sm" @click="openNmapImportFromGuide">Open Nmap importer</AppButton>
            </div>
          </div>
        </section>
        <section class="diagram-guide-step">
          <span class="diagram-guide-number">4</span>
          <div>
            <h4>Model the physical layer</h4>
            <p>Enable <strong>Physical modeling</strong> in Step 4, create the building and closet hierarchy, generate switch and patch-panel ports, then connect each device NIC. Use the physical view to inspect cable paths.</p>
            <ul><li>Set access and trunk VLANs, media, reach, and PoE capacity.</li><li>Build ordered MS/TP or ALC ARC156 chains with end termination and segment budgets.</li><li>Export the cable schedule and port map to XLSX, or export a legacy v1 JSON without physical data.</li></ul>
          </div>
        </section>
      </div>

      <div class="pdf-export-dialog-actions">
        <AppButton variant="primary" @click="gettingStartedDialog?.close()">Start diagramming</AppButton>
      </div>
    </dialog>

    <dialog ref="nmapImportDialog" class="nmap-import-dialog" aria-labelledby="nmap-import-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">DISCOVERED NETWORK INVENTORY</p>
          <h3 id="nmap-import-title">Import Nmap scan output</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close Nmap import" @click="nmapImportDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">
        Paste the text containing <code>Nmap scan report for…</code> and <code>Host is up…</code> lines. Host discovery does not prove that a device speaks BACnet, so imported devices begin as IP-only inventory.
      </p>

      <label class="nmap-import-output">
        <span>Nmap output</span>
        <textarea
          v-model="nmapOutput"
          rows="11"
          spellcheck="false"
          placeholder="Nmap scan report for _gateway (10.115.12.1)&#10;Host is up (0.0015s latency).&#10;Nmap scan report for 10.115.12.6&#10;Host is up (0.00077s latency)."
        ></textarea>
      </label>

      <div class="nmap-import-options">
        <label>
          <span>Network prefix</span>
          <select v-model.number="nmapCidr">
            <option v-for="cidr in cidrOptions" :key="`nmap-${cidr}`" :value="cidr">/{{ cidr }}</option>
          </select>
        </label>
        <p>Nmap does not report the subnet mask. The selected prefix groups addresses into diagram networks; change it to match the scanned LAN.</p>
      </div>

      <div class="nmap-import-preview" aria-live="polite">
        <template v-if="nmapHosts.length">
          <div class="nmap-import-summary">
            <span><strong>{{ nmapHosts.length }}</strong> responsive {{ nmapHosts.length === 1 ? 'address' : 'addresses' }}</span>
            <span><strong>{{ nmapGroups.length }}</strong> {{ nmapGroups.length === 1 ? 'subnet' : 'subnets' }}</span>
            <span><strong>{{ nmapNodeCount }}</strong> diagram {{ nmapNodeCount === 1 ? 'node' : 'nodes' }}</span>
          </div>
          <p v-if="nmapDuplicateCount" class="nmap-import-duplicates">
            {{ nmapDuplicateCount }} {{ nmapDuplicateCount === 1 ? 'address already exists' : 'addresses already exist' }} in this project and will be skipped.
          </p>
          <div class="nmap-import-hosts">
            <div v-for="host in nmapHosts" :key="host.ip">
              <span class="nmap-import-host-status" aria-hidden="true"></span>
              <span><strong>{{ nmapHostName(host) }}</strong><small>{{ host.ip }}<template v-if="host.latencySeconds !== undefined"> · {{ formatNmapLatency(host.latencySeconds) }}</template></small></span>
              <em v-if="isNmapGatewayHost(host)">Gateway</em>
              <em v-else-if="existingDiagramIps.has(host.ip)">Existing</em>
            </div>
          </div>
        </template>
        <p v-else class="nmap-import-empty">
          No responsive IPv4 hosts found yet. Paste standard Nmap text output to preview the import.
        </p>
      </div>

      <div class="pdf-export-dialog-actions">
        <AppButton @click="nmapImportDialog?.close()">Cancel</AppButton>
        <AppButton variant="primary" :disabled="nmapNewHostCount === 0" @click="importNmapHosts">
          Import {{ nmapNewHostCount || '' }} {{ nmapNewHostCount === 1 ? 'host' : 'hosts' }}
        </AppButton>
      </div>
    </dialog>

    <dialog ref="bbmdStateDialog" class="nmap-import-dialog" aria-labelledby="bbmd-state-import-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">BACNET BROADCAST TOPOLOGY</p>
          <h3 id="bbmd-state-import-title">Import ACE BBMD Manager state</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close BBMD state import" @click="bbmdStateDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">
        Upload an ACE BBMD Manager <code>.state</code> file to create device-level BBMDs and their observed BDT relationships. The state store does not contain subnet definitions, so every distinct BBMD network is initially inferred as a <strong>/24</strong> for you to review and correct.
      </p>

      <label class="bbmd-state-file-picker">
        <span>State-store file</span>
        <input type="file" accept=".state,application/json" @change="readBbmdStateFile">
      </label>

      <p v-if="bbmdStateError" class="bbmd-state-error" role="alert">{{ bbmdStateError }}</p>
      <div v-else-if="bbmdStatePreview" class="nmap-import-preview" aria-live="polite">
        <div class="nmap-import-summary">
          <span><strong>{{ bbmdStatePreview.records.length }}</strong> BBMD devices</span>
          <span><strong>{{ bbmdStateSubnetCount }}</strong> inferred /24 networks</span>
          <span><strong>{{ bbmdStatePreview.reciprocalBdtPairs }}</strong> mutual BDT pairs</span>
        </div>
        <div class="bbmd-state-findings">
          <p v-if="bbmdStatePreview.oneWayBdtEntries"><strong>{{ bbmdStatePreview.oneWayBdtEntries }}</strong> one-way BDT {{ bbmdStatePreview.oneWayBdtEntries === 1 ? 'entry' : 'entries' }} will be preserved and flagged in diagram diagnostics.</p>
          <p v-if="bbmdStatePreview.unresolvedBdtEntries"><strong>{{ bbmdStatePreview.unresolvedBdtEntries }}</strong> BDT {{ bbmdStatePreview.unresolvedBdtEntries === 1 ? 'target is' : 'targets are' }} not present as scanned BBMD records and cannot be linked.</p>
          <p v-if="bbmdStatePreview.ignoredRecords"><strong>{{ bbmdStatePreview.ignoredRecords }}</strong> malformed {{ bbmdStatePreview.ignoredRecords === 1 ? 'record was' : 'records were' }} ignored.</p>
          <p><strong>Review required:</strong> overlapping or incorrectly grouped devices should be corrected by editing the imported network addresses and prefixes.</p>
        </div>
      </div>
      <p v-else class="nmap-import-empty">Choose a state-store file to preview its BBMD and BDT topology.</p>

      <div class="pdf-export-dialog-actions">
        <AppButton @click="bbmdStateDialog?.close()">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!bbmdStatePreview?.records.length" @click="importBbmdState">Replace diagram with imported topology</AppButton>
      </div>
    </dialog>

    <dialog ref="moveDeviceDialog" class="pdf-export-dialog move-device-dialog" aria-labelledby="move-device-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">REASSIGN DEVICE</p>
          <h3 id="move-device-title">Move {{ movingDevice?.name || 'device' }} to another subnet</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close move-device dialog" @click="moveDeviceDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">The complete device configuration, relationships, and IDs will be preserved. Addresses assigned to the current owner subnet will follow the device; their IP values will not be changed.</p>
      <div class="form-group">
        <label for="move-device-target">Destination subnet</label>
        <select id="move-device-target" v-model="moveTargetSubnetId">
          <option v-for="target in moveTargetSubnets" :key="target.id" :value="target.id">{{ target.name || 'Unnamed subnet' }} — {{ subnetCidr(target) }}</option>
        </select>
        <span class="field-hint">If an existing address falls outside the destination prefix, the diagram will flag it for correction.</span>
      </div>
      <div class="pdf-export-dialog-actions">
        <AppButton @click="moveDeviceDialog?.close()">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!moveTargetSubnetId" @click="confirmMoveDevice">Move device</AppButton>
      </div>
    </dialog>

    <dialog ref="pdfExportDialog" class="pdf-export-dialog" aria-labelledby="pdf-export-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">PDF EXPORT</p>
          <h3 id="pdf-export-title">Choose an appearance</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close PDF export options" @click="pdfExportDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">Use the screen-ready dark version, or a high-contrast light version designed to conserve ink when printed.</p>
      <fieldset class="pdf-theme-options">
        <legend class="visually-hidden">PDF appearance</legend>
        <label :class="['pdf-theme-option', { selected: pdfTheme === 'light' }]">
          <input v-model="pdfTheme" type="radio" value="light">
          <span class="pdf-theme-swatch light" aria-hidden="true"></span>
          <span><strong>Light / print</strong><small>White background and print-optimized contrast</small></span>
        </label>
        <label :class="['pdf-theme-option', { selected: pdfTheme === 'dark' }]">
          <input v-model="pdfTheme" type="radio" value="dark">
          <span class="pdf-theme-swatch dark" aria-hidden="true"></span>
          <span><strong>Dark</strong><small>Matches the diagram builder preview</small></span>
        </label>
      </fieldset>
      <div v-if="bbmdReport.devices.length" class="pdf-bbmd-option">
        <AceToggle v-model="includeBbmdTablesInPdf" label="Include BBMD table pages" :description="`Add a peering summary and individual BDT sections for ${bbmdReport.devices.length} BBMD ${bbmdReport.devices.length === 1 ? 'device' : 'devices'}`" />
        <span>Table pages use a compact, paginated schedule so large BBMD estates remain readable even when diagram edges are hidden.</span>
      </div>
      <div v-if="project.physical.links.length || project.physical.mstpSegments.length || project.physical.arcnetSegments.length" class="pdf-bbmd-option">
        <AceToggle v-model="includeCableScheduleInPdf" label="Include cable schedule pages" />
        <AceToggle v-model="includeSerialTablesInPdf" label="Include MS/TP and ARC156 segment tables" />
      </div>
      <div class="pdf-export-dialog-actions">
        <AppButton @click="pdfExportDialog?.close()">Cancel</AppButton>
        <AppButton variant="primary" @click="confirmPdfExport">Export PDF</AppButton>
      </div>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import AppButton from './AppButton.vue';
import AceToggle from './AceToggle.vue';
import AceCheckbox from './AceCheckbox.vue';
import GlossaryLink from './GlossaryLink.vue';
import PhysicalLayerEditor from './diagram/PhysicalLayerEditor.vue';
import PhysicalDiagramSvg from './diagram/PhysicalDiagramSvg.vue';
import LogicalDiagramSvg from './diagram/LogicalDiagramSvg.vue';
import DiagramSettingsCard from './diagram/DiagramSettingsCard.vue';
import DiagnosticsPanel from './diagram/DiagnosticsPanel.vue';
import InfrastructureEditorCard from './diagram/InfrastructureEditorCard.vue';
import TestPathEditorCard from './diagram/TestPathEditorCard.vue';
import SubnetEditorCard from './diagram/SubnetEditorCard.vue';
import { getSubnetDetails, ipToLong } from '../lib/subnet';
import {
  groupNmapHostsBySubnet, isNmapGatewayHost, nmapHostName, parseNmapOutput, type NmapHost, type NmapSubnetGroup
} from '../lib/nmap-import';
import { createDiagramProjectFromAceBbmdState, parseAceBbmdState, type AceBbmdStateImport } from '../lib/ace-bbmd-state';
import { bbmdRelationshipClass, createBbmdReport } from '../lib/bbmd-report';
import { appendBbmdReportPages } from '../lib/export-bbmd-pdf';
import { appendPhysicalSchedulePages } from '../lib/export-physical-pdf';
import {
  addressState, createDefaultProject, createDevice, createDeviceAddress, createEmptyProject, createInfrastructure, createNic, createSubnet,
  createTestPath, getDiagramDiagnostics, getWhoIsSuggestedBroadcast, moveDeviceToSubnet, subnetCidr,
  type ConfigTargetKind, type DeviceKind, type DiagramDiagnostic, type DiagramDevice, type DiagramDeviceAddress, type DiagramInfrastructure, type DiagramNic,
  type DiagramProject, type DiagramSubnet, type DiagramTestPath
} from '../lib/network-diagram';
import { migrateDiagramProject, toLegacyDiagramProject } from '../lib/schema-migrations';
import { DIAGRAM_STORAGE_KEY } from '../lib/storage-keys';
import { pruneDanglingReferences } from '../lib/network-diagram-prune';
import type { PhysicalEndpointRef } from '../lib/physical';
import { layoutColumnCount, layoutGridPoint, layoutRowCount, layoutRowPixelWidth, type DiagramLayoutMode } from '../lib/diagram-layout';
import { useDiagramProject } from '../composables/useDiagramProject';

const STORAGE_KEY = DIAGRAM_STORAGE_KEY;
const LAYOUT_STORAGE_KEY = 'aceiot-network-diagram-layout-v1';
const RELATIONSHIP_MODE_STORAGE_KEY = 'aceiot-network-diagram-relationship-view-v1';
const PHYSICAL_OVERLAY_STORAGE_KEY = 'aceiot-network-diagram-physical-overlay-v1';
const advancedBacnetPorts = inject<Ref<boolean>>('advancedBacnetPorts', ref(false));
const TOOL_URL = 'https://ace-iot-solutions.github.io/bacnet-subnetting-primer/';
import { PDF_LIGHT_STYLES, SUBNET_ACCENT_EXPORT_STYLES, SVG_BACNET_RELATIONSHIP_STYLES, SVG_CONNECTION_STYLES, SVG_EXPORT_STYLES, SVG_PHYSICAL_STYLES, SVG_SC_LINK_STYLES } from '../lib/diagram-svg-styles';
const { project, loadStoredProject, replaceProject, dispose: disposeDiagramProject } = useDiagramProject(STORAGE_KEY);
const fileInput = ref<HTMLInputElement | null>(null);
const logicalDiagram = ref<InstanceType<typeof LogicalDiagramSvg> | null>(null);
const physicalDiagram = ref<InstanceType<typeof PhysicalDiagramSvg> | null>(null);
const gettingStartedDialog = ref<HTMLDialogElement | null>(null);
const nmapImportDialog = ref<HTMLDialogElement | null>(null);
const nmapOutput = ref('');
const nmapCidr = ref(24);
const nmapImportNotice = ref('');
const bbmdStateDialog = ref<HTMLDialogElement | null>(null);
const bbmdStatePreview = ref<AceBbmdStateImport | null>(null);
const bbmdStateError = ref('');
const moveDeviceDialog = ref<HTMLDialogElement | null>(null);
const movingDeviceId = ref('');
const moveSourceSubnetId = ref('');
const moveTargetSubnetId = ref('');
const pdfExportDialog = ref<HTMLDialogElement | null>(null);
const isExportingPdf = ref(false);
const pdfTheme = ref<'dark' | 'light'>('light');
const includeBbmdTablesInPdf = ref(false);
const includeCableScheduleInPdf = ref(false);
const includeSerialTablesInPdf = ref(false);
type DiagramRelationshipMode = 'highlights' | 'focused' | 'all' | 'hidden';
const layoutMode = ref<DiagramLayoutMode>('compact');
const relationshipMode = ref<DiagramRelationshipMode>('highlights');
const focusedBbmdId = ref('');
const showPhysicalOverlay = ref(localStorage.getItem(PHYSICAL_OVERLAY_STORAGE_KEY) === 'true');
const activeConfigTarget = ref('');
const diagnosticTargetKeys = ref<string[]>([]);
let configTargetTimer: ReturnType<typeof window.setTimeout> | undefined;
let diagnosticTargetTimer: ReturnType<typeof window.setTimeout> | undefined;
const subnetWidth = 240;
const subnetHeight = 104;
const hostWidth = 280;
const hostGap = 12;
const layoutGap = 28;
const cidrOptions = Array.from({ length: 25 }, (_, index) => index + 8);
const mstpBaudRates = [9600, 19200, 38400, 76800, 115200];
const deviceKindOptions: { value: DeviceKind; label: string }[] = [
  { value: 'controller', label: 'Controller' }, { value: 'workstation', label: 'Workstation' },
  { value: 'server', label: 'Server' }, { value: 'sensor', label: 'Sensor / field device' }, { value: 'other', label: 'Other' }
];
const infrastructureKindOptions = [
  { value: 'router', label: 'Router' }, { value: 'switch', label: 'Switch' }, { value: 'firewall', label: 'Firewall' },
  { value: 'gateway', label: 'Gateway' },
  { value: 'media-converter', label: 'Media converter' }, { value: 'mstp-repeater', label: 'MS/TP repeater' }, { value: 'arcnet-repeater', label: 'ARC156 repeater' }, { value: 'wireless-ap', label: 'Wireless access point' },
  { value: 'sc-hub', label: 'BACnet/SC Hub' }, { value: 'sc-hub-cluster', label: 'BACnet/SC HA Hub Cluster' }
];
const subnetEditorActions = {
  removeSubnet, subnetIsValid, upstreamNetworkOptions, subnetCidr, routingDevicesFor, addDevice, addressCount,
  movableSubnets, openMoveDeviceDialog, setDeviceBbmd, otherBbmdDevices, isBdtPeer, toggleBdtPeer, foreignBbmdOptions,
  addDeviceNic, addNicAddress, removeDeviceNic, scHubsForNic, compatibleAddressNetworks, addressFieldLabel,
  addressEntryClass, removeNicAddress, removeDevice, handleDiagramNetworkTypeChange
};
interface HostNode { device: DiagramDevice; ownerSubnet: DiagramSubnet }

const diagnostics = computed(() => getDiagramDiagnostics(project.value));
const bbmdReport = computed(() => createBbmdReport(project.value));
const focusedBbmd = computed(() => bbmdReport.value.devices.find(device => device.id === focusedBbmdId.value));
const movingDevice = computed(() => project.value.subnets.flatMap(subnet => subnet.devices).find(device => device.id === movingDeviceId.value));
const moveTargetSubnets = computed(() => {
  const source = project.value.subnets.find(subnet => subnet.id === moveSourceSubnetId.value);
  return source ? movableSubnets(source) : [];
});
const deviceCount = computed(() => project.value.subnets.reduce((total, subnet) => total + subnet.devices.length, 0));
const nmapHosts = computed(() => parseNmapOutput(nmapOutput.value));
const nmapGroups = computed(() => groupNmapHostsBySubnet(nmapHosts.value, nmapCidr.value));
const existingDiagramIps = computed(() => new Set([
  ...project.value.infrastructure.map(item => item.ip).filter(Boolean),
  ...project.value.subnets.flatMap(subnet => subnet.devices.flatMap(device =>
    device.nics.flatMap(nic => nic.addresses.map(address => address.ip).filter(Boolean))
  ))
]));
const nmapDuplicateCount = computed(() => nmapHosts.value.filter(host => existingDiagramIps.value.has(host.ip)).length);
const nmapNewHostCount = computed(() => nmapHosts.value.length - nmapDuplicateCount.value);
const nmapNodeCount = computed(() => new Set(nmapHosts.value.map(host => {
  if (isNmapGatewayHost(host)) return `gateway:${host.ip}`;
  return host.hostname ? `host:${host.hostname.toLocaleLowerCase()}` : `host:${host.ip}`;
})).size);
const bbmdStateSubnetCount = computed(() => new Set((bbmdStatePreview.value?.records ?? []).map(record => record.ip.split('.').slice(0, 3).join('.'))).size);
const ipSubnets = computed(() => project.value.subnets.filter(subnet => !subnet.networkType || subnet.networkType === 'bacnet-ip'));
const routedNetworks = computed(() => project.value.subnets.filter(subnet => !subnet.networkType || subnet.networkType === 'bacnet-ip' || subnet.networkType === 'bacnet-sc'));
const fieldSegments = computed(() => project.value.subnets.filter(subnet => subnet.networkType === 'mstp' || subnet.networkType === 'arcnet'));
const hostNodes = computed(() => project.value.subnets.flatMap(ownerSubnet => ownerSubnet.devices
  .filter(device => project.value.viewMode !== 'networks' || device.requiredForRouting || device.kind === 'server' || device.bbmdEnabled || device.foreignDeviceBbmdId || project.value.subnets.some(segment => segment.routerId === device.id))
  .map(device => ({ device, ownerSubnet }))));
const hostHeight = computed(() => Math.max(110, 80 + Math.max(1, ...hostNodes.value.map(host => addressCount(host.device))) * 30));
const ipHostNodes = computed(() => hostNodes.value.filter(host => !host.ownerSubnet.networkType || host.ownerSubnet.networkType === 'bacnet-ip' || host.ownerSubnet.networkType === 'bacnet-sc'));
const fieldHostNodes = computed(() => hostNodes.value.filter(host => host.ownerSubnet.networkType === 'mstp' || host.ownerSubnet.networkType === 'arcnet'));
const hasBacnetRelationships = computed(() => hostNodes.value.some(host => (host.device.bdtPeerDeviceIds ?? []).length > 0 || Boolean(host.device.foreignDeviceBbmdId)));
const hasVisibleBacnetRelationships = computed(() => hasBacnetRelationships.value && (relationshipMode.value === 'focused' || relationshipMode.value === 'all'));
function columnCount(count: number) { return layoutColumnCount(count, layoutMode.value); }
function rowCount(count: number) { return layoutRowCount(count, layoutMode.value); }
const infrastructureRows = computed(() => rowCount(project.value.infrastructure.length));
const routedNetworkRows = computed(() => rowCount(routedNetworks.value.length));
const ipHostRows = computed(() => rowCount(ipHostNodes.value.length));
const fieldNetworkRows = computed(() => rowCount(fieldSegments.value.length));
const fieldHostRows = computed(() => rowCount(fieldHostNodes.value.length));
const subnetY = computed(() => Math.max(210, 82 + infrastructureRows.value * 96 + 32));
const ipHostY = computed(() => subnetY.value + Math.max(1, routedNetworkRows.value) * (subnetHeight + layoutGap) + 42);
const fieldBusY = computed(() => ipHostY.value + Math.max(1, ipHostRows.value) * (hostHeight.value + layoutGap) + (hasVisibleBacnetRelationships.value ? 170 : 70));
const fieldHostY = computed(() => fieldBusY.value + Math.max(1, fieldNetworkRows.value) * (subnetHeight + layoutGap) + 42);
const ipHostLayerBottom = computed(() => ipHostY.value + ipHostRows.value * (hostHeight.value + layoutGap) - layoutGap);
const endpointOptions = computed(() => [
  ...project.value.infrastructure.map(item => ({ id: item.id, nodeId: item.id, label: `${item.name || 'Unnamed infrastructure'} — ${item.ip || 'IP not set'} (${item.kind})` })),
  ...hostNodes.value.flatMap(host => host.device.nics.flatMap(nic => nic.addresses.map(address => {
    const subnet = project.value.subnets.find(item => item.id === address.subnetId);
    return {
      id: address.id,
      nodeId: host.device.id,
      label: `${host.device.name || 'Unnamed host'} — ${displayAddress(address)} — ${nic.name} / ${subnet?.name || 'No network'}`
    };
  })))
]);
function rowPixelWidth(count: number, itemWidth: number, gap: number) {
  return layoutRowPixelWidth(count, itemWidth, gap, layoutMode.value);
}
const canvasWidth = computed(() => Math.max(
  960,
  80 + rowPixelWidth(Math.max(routedNetworks.value.length, fieldSegments.value.length), subnetWidth, layoutGap),
  80 + rowPixelWidth(Math.max(ipHostNodes.value.length, fieldHostNodes.value.length), hostWidth, hostGap),
  80 + rowPixelWidth(project.value.infrastructure.length, 150, 40)
));
const legendColumns = computed(() => canvasWidth.value >= 1250 ? 2 : 1);
const legendCardWidth = computed(() => (canvasWidth.value - 80 - (legendColumns.value - 1) * 20) / legendColumns.value);
const legendTextLimit = computed(() => Math.max(32, Math.floor((legendCardWidth.value - 90) / 6.3)));
const legendRows = computed(() => Math.ceil(project.value.paths.length / legendColumns.value));
const legendStart = computed(() => fieldHostNodes.value.length
  ? fieldHostY.value + fieldHostRows.value * (hostHeight.value + layoutGap) + 47 + project.value.paths.length * 18
  : ipHostNodes.value.length
    ? ipHostY.value + ipHostRows.value * (hostHeight.value + layoutGap) + (hasVisibleBacnetRelationships.value ? 147 : 47) + project.value.paths.length * 18
    : subnetY.value + Math.max(1, routedNetworkRows.value) * (subnetHeight + layoutGap) + 40);
const canvasHeight = computed(() => Math.max(hostNodes.value.length ? 625 : 430, legendStart.value + legendRows.value * 124 + 42));

onMounted(() => {
  const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (savedLayout === 'compact' || savedLayout === 'balanced' || savedLayout === 'wide') layoutMode.value = savedLayout;
  const savedRelationshipMode = localStorage.getItem(RELATIONSHIP_MODE_STORAGE_KEY);
  if (savedRelationshipMode === 'highlights' || savedRelationshipMode === 'focused' || savedRelationshipMode === 'all' || savedRelationshipMode === 'hidden') relationshipMode.value = savedRelationshipMode;
  loadStoredProject();
  window.addEventListener('ace-open-planned-diagram', loadPlannedDiagram);
});
onUnmounted(() => {
  window.removeEventListener('ace-open-planned-diagram', loadPlannedDiagram);
  if (configTargetTimer !== undefined) window.clearTimeout(configTargetTimer);
  if (diagnosticTargetTimer !== undefined) window.clearTimeout(diagnosticTargetTimer);
  disposeDiagramProject();
});

function loadPlannedDiagram() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed: unknown = JSON.parse(saved);
    replaceProject(parsed);
  } catch { /* Ignore invalid bridge data. */ }
}

watch(layoutMode, value => localStorage.setItem(LAYOUT_STORAGE_KEY, value));
watch(relationshipMode, value => localStorage.setItem(RELATIONSHIP_MODE_STORAGE_KEY, value));
watch(showPhysicalOverlay, value => localStorage.setItem(PHYSICAL_OVERLAY_STORAGE_KEY, String(value)));
watch(() => bbmdReport.value.devices.map(device => device.id).join('|'), () => {
  if (!bbmdReport.value.devices.some(device => device.id === focusedBbmdId.value)) focusedBbmdId.value = bbmdReport.value.devices[0]?.id ?? '';
}, { immediate: true });

async function focusConfig(kind: ConfigTargetKind, id: string) {
  const targetKey = `${kind}-${id}`;
  activeConfigTarget.value = targetKey;
  await nextTick();
  const target = document.getElementById(`config-${targetKey}`);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  target.focus({ preventScroll: true });
  if (configTargetTimer !== undefined) window.clearTimeout(configTargetTimer);
  configTargetTimer = window.setTimeout(() => {
    if (activeConfigTarget.value === targetKey) activeConfigTarget.value = '';
  }, 2200);
}
function focusDiagnostic(diagnostic: DiagramDiagnostic) {
  diagnosticTargetKeys.value = (diagnostic.targets ?? []).map(item => `${item.kind}-${item.id}`);
  if (diagnosticTargetTimer !== undefined) window.clearTimeout(diagnosticTargetTimer);
  diagnosticTargetTimer = window.setTimeout(() => { diagnosticTargetKeys.value = []; }, 2200);
  const first = diagnostic.targets?.[0];
  if (first) void focusConfig(first.kind, first.id);
}
function activateHostNode(device: DiagramDevice) {
  if (device.bbmdEnabled) focusedBbmdId.value = device.id;
  void focusConfig('device', device.id);
}
function hostRelationshipClass(device: DiagramDevice) {
  if ((relationshipMode.value !== 'highlights' && relationshipMode.value !== 'focused') || !focusedBbmdId.value) return '';
  if (device.foreignDeviceBbmdId === focusedBbmdId.value) return 'host-relationship-fdr';
  if (!device.bbmdEnabled) return '';
  const bdtClass = bbmdRelationshipClass(bbmdReport.value, focusedBbmdId.value, device.id);
  if (bdtClass !== 'none') return `host-relationship-${bdtClass}`;
  return 'host-relationship-muted';
}
function hostRelationshipBadge(device: DiagramDevice) {
  const relationshipClass = hostRelationshipClass(device);
  return relationshipClass === 'host-relationship-focus' ? 'FOCUS'
    : relationshipClass === 'host-relationship-mutual' ? 'MUTUAL'
      : relationshipClass === 'host-relationship-outbound' ? 'OUTBOUND'
        : relationshipClass === 'host-relationship-inbound' ? 'INBOUND'
          : relationshipClass === 'host-relationship-fdr' ? 'FDR' : '';
}

function addSubnet() { project.value.subnets.push(createSubnet(project.value.subnets.length + 1)); }
function movableSubnets(source: DiagramSubnet) {
  const sourceType = normalizedNetworkType(source);
  return project.value.subnets.filter(candidate => candidate.id !== source.id && normalizedNetworkType(candidate) === sourceType);
}
function openMoveDeviceDialog(device: DiagramDevice, source: DiagramSubnet) {
  const targets = movableSubnets(source);
  if (!targets.length) return;
  movingDeviceId.value = device.id;
  moveSourceSubnetId.value = source.id;
  moveTargetSubnetId.value = targets[0].id;
  moveDeviceDialog.value?.showModal();
}
async function confirmMoveDevice() {
  const deviceId = movingDeviceId.value;
  if (!deviceId || !moveTargetSubnetId.value || !moveDeviceToSubnet(project.value, deviceId, moveTargetSubnetId.value)) return;
  moveDeviceDialog.value?.close();
  await focusConfig('device', deviceId);
}
function openBbmdStateDialog() {
  bbmdStatePreview.value = null;
  bbmdStateError.value = '';
  bbmdStateDialog.value?.showModal();
}
function openGettingStartedDialog() {
  gettingStartedDialog.value?.showModal();
}
function openBbmdImportFromGuide() {
  gettingStartedDialog.value?.close();
  openBbmdStateDialog();
}
function openNmapImportFromGuide() {
  gettingStartedDialog.value?.close();
  openNmapImportDialog();
}
async function readBbmdStateFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  bbmdStatePreview.value = null;
  bbmdStateError.value = '';
  if (!file) return;
  try {
    const parsedJson: unknown = JSON.parse(await file.text());
    const parsedState = parseAceBbmdState(parsedJson);
    if (!parsedState.records.length) throw new Error('No valid BBMD records were found.');
    bbmdStatePreview.value = parsedState;
  } catch (error) {
    bbmdStateError.value = error instanceof Error ? error.message : 'The selected file is not a valid ACE BBMD Manager state store.';
  } finally {
    input.value = '';
  }
}
function importBbmdState() {
  if (!bbmdStatePreview.value?.records.length) return;
  const hasPhysicalData = project.value.physical.locations.length || project.value.physical.patchPanels.length || project.value.physical.links.length || project.value.physical.mstpSegments.length || project.value.physical.arcnetSegments.length;
  if (hasPhysicalData && !window.confirm('Replace this diagram? The imported BBMD state has no physical-layer data, so current locations, ports, cables, and serial wiring will be lost.')) return;
  project.value = createDiagramProjectFromAceBbmdState(bbmdStatePreview.value);
  const importedCount = bbmdStatePreview.value.records.length;
  const subnetCount = project.value.subnets.length;
  nmapImportNotice.value = `Imported ${importedCount} device-level BBMD${importedCount === 1 ? '' : 's'} across ${subnetCount} inferred /24 ${subnetCount === 1 ? 'network' : 'networks'}. Review and correct subnet definitions where needed.`;
  bbmdStateDialog.value?.close();
}
function openNmapImportDialog() {
  nmapImportNotice.value = '';
  nmapImportDialog.value?.showModal();
}
function matchingNmapSubnet(group: NmapSubnetGroup) {
  return project.value.subnets.find(subnet => {
    if (normalizedNetworkType(subnet) !== 'bacnet-ip' || subnet.cidr !== group.cidr) return false;
    return getSubnetDetails(subnet.address, subnet.cidr)?.network === group.network;
  });
}
function importNmapHosts() {
  const duplicateCount = nmapDuplicateCount.value;
  const freshHosts = nmapHosts.value.filter(host => !existingDiagramIps.value.has(host.ip));
  if (!freshHosts.length) return;

  const groups = groupNmapHostsBySubnet(freshHosts, nmapCidr.value);
  const subnetByHostIp = new Map<string, DiagramSubnet>();
  let createdSubnetCount = 0;

  groups.forEach(group => {
    let subnet = matchingNmapSubnet(group);
    if (!subnet) {
      subnet = createSubnet(project.value.subnets.length + 1);
      subnet.name = `Discovered ${group.network}/${group.cidr}`;
      subnet.address = group.network;
      subnet.cidr = group.cidr;
      subnet.vlan = '';
      subnet.udpPort = '';
      subnet.bacnetNetworkNumber = '';
      project.value.subnets.push(subnet);
      createdSubnetCount += 1;
    }
    group.hosts.forEach(host => subnetByHostIp.set(host.ip, subnet!));
  });

  const importedDevices = new Map<string, { device: DiagramDevice; hosts: NmapHost[] }>();
  let gatewayCount = 0;

  freshHosts.forEach(host => {
    const subnet = subnetByHostIp.get(host.ip);
    if (!subnet) return;

    if (isNmapGatewayHost(host)) {
      const gateway = createInfrastructure(project.value.infrastructure.length + 1);
      gateway.name = host.hostname.replace(/^_+/, '') || `Gateway ${host.ip}`;
      gateway.kind = 'gateway';
      gateway.ip = host.ip;
      gateway.subnetIds = [subnet.id];
      gateway.notes = `Imported from Nmap host discovery${host.latencySeconds === undefined ? '' : ` · observed latency ${formatNmapLatency(host.latencySeconds)}`}`;
      project.value.infrastructure.push(gateway);
      gatewayCount += 1;
      return;
    }

    const hostKey = host.hostname ? `name:${host.hostname.toLocaleLowerCase()}` : `ip:${host.ip}`;
    let imported = importedDevices.get(hostKey);
    if (!imported) {
      const device = createDevice(subnet.devices.length + 1, subnet.id);
      device.name = nmapHostName(host);
      device.kind = 'other';
      device.nics[0].name = 'Discovered interface';
      device.nics[0].bacnetIpEnabled = false;
      device.nics[0].addresses[0].ip = host.ip;
      imported = { device, hosts: [] };
      importedDevices.set(hostKey, imported);
      subnet.devices.push(device);
    } else {
      const address = createDeviceAddress(subnet.id, `Address ${imported.device.nics[0].addresses.length + 1}`);
      address.ip = host.ip;
      imported.device.nics[0].addresses.push(address);
    }
    imported.hosts.push(host);
    imported.device.notes = `Imported from Nmap host discovery · ${imported.hosts.length} responsive ${imported.hosts.length === 1 ? 'address' : 'addresses'}`;
  });

  project.value.viewMode = 'detailed';
  const nodeCount = importedDevices.size + gatewayCount;
  nmapImportNotice.value = `Imported ${freshHosts.length} responsive ${freshHosts.length === 1 ? 'address' : 'addresses'} as ${nodeCount} diagram ${nodeCount === 1 ? 'node' : 'nodes'}${createdSubnetCount ? ` and created ${createdSubnetCount} ${createdSubnetCount === 1 ? 'subnet' : 'subnets'}` : ''}.${duplicateCount ? ` Skipped ${duplicateCount} existing ${duplicateCount === 1 ? 'address' : 'addresses'}.` : ''}`;
  nmapOutput.value = '';
  nmapImportDialog.value?.close();
}
function formatNmapLatency(seconds: number) {
  const milliseconds = seconds * 1000;
  return `${milliseconds < 0.01 ? milliseconds.toFixed(3) : milliseconds < 1 ? milliseconds.toFixed(2) : milliseconds.toFixed(1)} ms`;
}
function removeSubnet(id: string) {
  const removedDeviceIds = new Set(project.value.subnets.find(subnet => subnet.id === id)?.devices.map(device => device.id) ?? []);
  const removedEndpointIds = project.value.subnets.flatMap(subnet => subnet.devices.flatMap(device =>
    device.nics.flatMap(nic => nic.addresses.filter(address => subnet.id === id || address.subnetId === id).map(address => address.id))
  ));
  project.value.subnets = project.value.subnets.filter(subnet => subnet.id !== id);
  project.value.infrastructure.forEach(item => {
    item.subnetIds = item.subnetIds.filter(subnetId => subnetId !== id);
    item.underlaySubnetIds = (item.underlaySubnetIds ?? []).filter(subnetId => subnetId !== id);
  });
  project.value.subnets.forEach(subnet => subnet.devices.forEach(device => {
    device.bdtPeerDeviceIds = (device.bdtPeerDeviceIds ?? []).filter(peerId => !removedDeviceIds.has(peerId));
    if (removedDeviceIds.has(device.foreignDeviceBbmdId ?? '')) device.foreignDeviceBbmdId = '';
    device.nics.forEach(nic => { nic.addresses = nic.addresses.filter(address => address.subnetId !== id); });
    device.nics = device.nics.filter(nic => nic.addresses.length > 0);
    if (!device.nics.length) device.nics.push(createNic(subnet.id));
  }));
  removeEndpointsFromPaths(removedEndpointIds);
  pruneDanglingReferences(project.value);
}
function addDevice(subnet: DiagramSubnet) { subnet.devices.push(createDevice(subnet.devices.length + 1, subnet.id)); }
function handleDiagramNetworkTypeChange(subnet: DiagramSubnet) { if (subnet.networkType === 'arcnet') subnet.arcnetDataRate = 156.25; }
function removeDevice(subnet: DiagramSubnet, id: string) {
  const device = subnet.devices.find(item => item.id === id);
  const removedEndpointIds = device ? allAddresses(device).map(address => address.id) : [];
  subnet.devices = subnet.devices.filter(device => device.id !== id);
  project.value.subnets.forEach(owner => owner.devices.forEach(candidate => {
    candidate.bdtPeerDeviceIds = (candidate.bdtPeerDeviceIds ?? []).filter(peerId => peerId !== id);
    if (candidate.foreignDeviceBbmdId === id) candidate.foreignDeviceBbmdId = '';
  }));
  removeEndpointsFromPaths(removedEndpointIds);
  pruneDanglingReferences(project.value);
}
function addDeviceNic(device: DiagramDevice, defaultSubnetId: string) { device.nics.push(createNic(defaultSubnetId, device.nics.length + 1)); }
function removeDeviceNic(device: DiagramDevice, id: string) {
  if (device.nics.length <= 1) return;
  const nic = device.nics.find(item => item.id === id);
  if (nic) removeEndpointsFromPaths(nic.addresses.map(address => address.id));
  device.nics = device.nics.filter(item => item.id !== id);
  pruneDanglingReferences(project.value);
}
function addNicAddress(nic: DiagramNic, defaultSubnetId: string) {
  nic.addresses.push(createDeviceAddress(defaultSubnetId, `Address ${nic.addresses.length + 1}`));
}
function removeNicAddress(nic: DiagramNic, id: string) {
  if (nic.addresses.length <= 1) return;
  removeEndpointsFromPaths([id]);
  nic.addresses = nic.addresses.filter(address => address.id !== id);
  pruneDanglingReferences(project.value);
}
function addInfrastructure() { project.value.infrastructure.push(createInfrastructure(project.value.infrastructure.length + 1)); }
function removeInfrastructure(id: string) {
  project.value.infrastructure = project.value.infrastructure.filter(item => item.id !== id);
  project.value.paths.forEach(path => { path.hops = path.hops.filter(endpointId => endpointId !== id); });
  pruneDanglingReferences(project.value);
}
function addPath() {
  const first = endpointOptions.value[0];
  const second = endpointOptions.value.find(endpoint => endpoint.nodeId !== first?.nodeId);
  project.value.paths.push(createTestPath([first?.id, second?.id].filter((id): id is string => Boolean(id))));
}
function removePath(id: string) { project.value.paths = project.value.paths.filter(path => path.id !== id); }
function addPathHop(path: DiagramTestPath) { path.hops.splice(Math.max(1, path.hops.length - 1), 0, ''); }
function removePathHop(path: DiagramTestPath, index: number) { if (path.hops.length > 2) path.hops.splice(index, 1); }
function suggestedWhoIsBroadcast(path: DiagramTestPath) { return getWhoIsSuggestedBroadcast(project.value, path); }
function syncWhoIsBroadcast(path: DiagramTestPath) {
  if (path.testType !== 'bacnet-whois') return;
  const suggested = suggestedWhoIsBroadcast(path);
  if (suggested) path.broadcastAddress = suggested;
  const source = resolveAddressEndpoint(path.hops[0]);
  const sourceSubnet = project.value.subnets.find(subnet => subnet.id === source?.address.subnetId);
  if (sourceSubnet && normalizedNetworkType(sourceSubnet) === 'bacnet-ip' && sourceSubnet.udpPort !== '') path.udpPort = sourceSubnet.udpPort ?? 47808;
}
function useSuggestedBroadcast(path: DiagramTestPath) {
  syncWhoIsBroadcast(path);
}
function handleTestTypeChange(path: DiagramTestPath) {
  if (path.testType === 'ping') {
    path.protocol = 'ICMP';
    path.broadcastAddress = '';
    if (!path.name || path.name === 'BACnet Who-Is') path.name = 'Ping test';
  } else if (path.testType === 'bacnet-whois') {
    path.protocol = 'BACnet/IP Who-Is';
    if (!path.name || path.name === 'Ping test') path.name = 'BACnet Who-Is';
    syncWhoIsBroadcast(path);
  }
}
function removeEndpointsFromPaths(endpointIds: string[]) {
  const removed = new Set(endpointIds);
  project.value.paths.forEach(path => { path.hops = path.hops.filter(endpointId => !removed.has(endpointId)); });
}
function resetProject() { if (window.confirm('Replace the current diagram with the starter example?')) project.value = createDefaultProject(); }
function newProject() {
  if (!window.confirm('Clear the current diagram and start a new project? This replaces the browser autosave. Save the project first if you want to keep a copy.')) return;
  const emptyProject = createEmptyProject();
  project.value = emptyProject;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyProject));
  activeConfigTarget.value = '';
  nmapImportNotice.value = '';
}
function subnetIsValid(subnet: DiagramSubnet) {
  if (subnet.networkType === 'bacnet-sc') return Number(subnet.bacnetNetworkNumber) >= 1 && Number(subnet.bacnetNetworkNumber) <= 65534;
  if (subnet.networkType === 'mstp' || subnet.networkType === 'arcnet') return Number(subnet.bacnetNetworkNumber) >= 1 && Number(subnet.bacnetNetworkNumber) <= 65534;
  return getSubnetDetails(subnet.address, subnet.cidr) !== null;
}
function isIpValid(ip: string) { return ipToLong(ip) !== null; }
function networkTypeLabel(subnet: DiagramSubnet) { return subnet.networkType === 'mstp' ? 'MS/TP' : subnet.networkType === 'arcnet' ? 'ARCNET' : subnet.networkType === 'bacnet-sc' ? 'BACnet/SC network' : 'BACnet/IP subnet'; }
function normalizedNetworkType(subnet: DiagramSubnet) { return subnet.networkType || 'bacnet-ip'; }
function networkDiagramLabel(subnet: DiagramSubnet) {
  return normalizedNetworkType(subnet) === 'bacnet-ip' ? (subnet.udpPort === '' ? 'IP SUBNET' : 'BACNET/IP') : networkTypeLabel(subnet).toUpperCase();
}
function subnetMetaLabel(subnet: DiagramSubnet) {
  const count = subnetAddressCount(subnet.id);
  if (normalizedNetworkType(subnet) === 'bacnet-ip' && subnet.udpPort === '') return `No BACnet/IP · ${count} addr`;
  const showPort = normalizedNetworkType(subnet) === 'bacnet-ip' && (advancedBacnetPorts.value || (subnet.udpPort !== undefined && subnet.udpPort !== 47808));
  return showPort ? `UDP ${subnet.udpPort} · ${count} addr` : `${count} address${count === 1 ? '' : 'es'}`;
}
function compatibleAddressNetworks(owner: DiagramSubnet) { return project.value.subnets.filter(candidate => normalizedNetworkType(candidate) === normalizedNetworkType(owner)
  || normalizedNetworkType(candidate) === 'bacnet-sc' || normalizedNetworkType(owner) === 'bacnet-sc'); }
function upstreamNetworkOptions(segment: DiagramSubnet) {
  return project.value.subnets.filter(candidate => candidate.id !== segment.id
    && (normalizedNetworkType(candidate) === 'bacnet-ip' || normalizedNetworkType(candidate) === normalizedNetworkType(segment)));
}
function addressFieldLabel(address: DiagramDeviceAddress) {
  const subnet = project.value.subnets.find(item => item.id === address.subnetId);
  return subnet?.networkType === 'mstp' ? 'MS/TP MAC (0–127)' : subnet?.networkType === 'arcnet' ? 'ARCNET node (0–255)' : subnet?.networkType === 'bacnet-sc' ? 'BACnet/SC node IP' : 'IP address';
}
function displayAddress(address: DiagramDeviceAddress) {
  const subnet = project.value.subnets.find(item => item.id === address.subnetId);
  if (!address.ip) return subnet?.networkType === 'mstp' ? 'MAC not set' : subnet?.networkType === 'arcnet' ? 'Node not set' : 'IP not set';
  return subnet?.networkType === 'mstp' ? `MAC ${address.ip}` : subnet?.networkType === 'arcnet' ? `Node ${address.ip}` : address.ip;
}
function scHubsFor(networkId: string) { return project.value.infrastructure.filter(item => (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster') && item.subnetIds.includes(networkId)); }
function otherScHubs(id: string) { return project.value.infrastructure.filter(item => item.id !== id && (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster')); }
function bbmdDeviceEntries() {
  return project.value.subnets.flatMap(subnet => subnet.devices.filter(device => device.bbmdEnabled).map(device => ({ device, subnet })));
}
function otherBbmdDevices(device: DiagramDevice, subnetId: string) {
  return bbmdDeviceEntries().filter(entry => entry.device.id !== device.id && entry.subnet.id !== subnetId);
}
function foreignBbmdOptions(device: DiagramDevice, subnetId: string) {
  return bbmdDeviceEntries().filter(entry => entry.device.id !== device.id && entry.subnet.id !== subnetId);
}
function isBdtPeer(device: DiagramDevice, peerId: string) { return (device.bdtPeerDeviceIds ?? []).includes(peerId); }
function toggleBdtPeer(device: DiagramDevice, peerId: string) {
  const peer = project.value.subnets.flatMap(subnet => subnet.devices).find(candidate => candidate.id === peerId && candidate.bbmdEnabled);
  if (!peer) return;
  device.bdtPeerDeviceIds ??= [];
  peer.bdtPeerDeviceIds ??= [];
  const enabled = !device.bdtPeerDeviceIds.includes(peerId);
  device.bdtPeerDeviceIds = enabled ? [...device.bdtPeerDeviceIds, peerId] : device.bdtPeerDeviceIds.filter(id => id !== peerId);
  peer.bdtPeerDeviceIds = enabled ? [...new Set([...peer.bdtPeerDeviceIds, device.id])] : peer.bdtPeerDeviceIds.filter(id => id !== device.id);
}
function setDeviceBbmd(device: DiagramDevice, enabled: boolean) {
  device.bbmdEnabled = enabled;
  device.bdtPeerDeviceIds ??= [];
  if (enabled) return;
  device.bdtPeerDeviceIds = [];
  project.value.subnets.forEach(subnet => subnet.devices.forEach(candidate => {
    candidate.bdtPeerDeviceIds = (candidate.bdtPeerDeviceIds ?? []).filter(id => id !== device.id);
    if (candidate.foreignDeviceBbmdId === device.id) candidate.foreignDeviceBbmdId = '';
  }));
}
function scHubsForNic(currentNic: DiagramNic) {
  const infrastructure = project.value.infrastructure.filter(item => item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster').map(item => ({ id: item.id, name: item.name, label: item.kind === 'sc-hub-cluster' ? 'HA infrastructure hub' : 'infrastructure hub' }));
  const deviceHubs = hostNodes.value.flatMap(host => host.device.nics.filter(nic => nic.id !== currentNic.id && nic.bacnetScEnabled && (nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub')).map(nic => ({ id: nic.id, name: `${host.device.name} · ${nic.name}`, label: nic.scHubRole === 'ha-hub' ? 'device HA hub' : 'device hub' })));
  return [...infrastructure, ...deviceHubs];
}
function deviceServiceLabel(device: DiagramDevice) {
  const hasIp = device.nics.some(nic => nic.bacnetIpEnabled);
  const hasSc = device.nics.some(nic => nic.bacnetScEnabled);
  const hasHub = device.nics.some(nic => nic.bacnetScEnabled && (nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub'));
  return device.bbmdEnabled
    ? device.requiredForRouting ? 'BACNET ROUTER / BBMD' : device.kind === 'server' ? 'BMS / BBMD' : 'BACNET/IP BBMD'
    : device.foreignDeviceBbmdId ? 'BACNET/IP FOREIGN DEVICE'
      : hasHub ? 'BACNET/SC HUB' : hasIp && hasSc ? 'BACNET/IP + SC' : hasSc ? 'BACNET/SC NODE' : hasIp ? 'BACNET/IP HOST' : 'IP HOST';
}
function addressEntryClass(address: DiagramDeviceAddress) {
  const subnet = project.value.subnets.find(item => item.id === address.subnetId);
  const state = addressState(address, subnet);
  return { 'input-invalid': state === 'invalid', 'input-warning': state === 'outside' };
}
function allAddresses(device: DiagramDevice) { return device.nics.flatMap(nic => nic.addresses); }
function addressCount(device: DiagramDevice) { return allAddresses(device).length; }
function hostAddressRows(device: DiagramDevice) { return device.nics.flatMap(nic => nic.addresses.map(address => {
  const network = project.value.subnets.find(item => item.id === address.subnetId);
  const services = [nic.bacnetIpEnabled ? 'B/IP' : '', nic.bacnetScEnabled ? 'SC' : ''].filter(Boolean).join('+') || 'IP';
  return { id: address.id, label: `${nic.name || 'NIC'} · ${services} · ${address.label || 'Address'} · ${network?.name || 'No network'}`, address: displayAddress(address), color: network?.color || '#64748b' };
})); }
function subnetAddressCount(subnetId: string) {
  return hostNodes.value.reduce((total, host) => total + allAddresses(host.device).filter(address => address.subnetId === subnetId).length, 0);
}
function deviceTooltip(device: DiagramDevice) {
  const addresses = device.nics.flatMap(nic => nic.addresses.map(address => `${nic.name}: ${displayAddress(address)}`));
  return `${device.name} — ${device.kind}${addresses.length ? ` — ${addresses.join(' · ')}` : ''}`;
}
function clipped(value: string, length: number) { return value.length > length ? `${value.slice(0, length - 1)}…` : value; }
function roundedTopAccentPath(width: number) {
  return `M 14 0 H ${width - 14} A 14 14 0 0 1 ${width} 14 H ${width - 6} A 8 8 0 0 0 ${width - 14} 6 H 14 A 8 8 0 0 0 6 14 H 0 A 14 14 0 0 1 14 0 Z`;
}
function deviceSymbol(kind: DeviceKind) { return kind === 'controller' ? 'C' : kind === 'workstation' ? 'W' : kind === 'server' ? 'S' : kind === 'sensor' ? '•' : '?'; }
function gridPoint(index: number, count: number, itemWidth: number, gap: number, startY: number, rowHeight: number) {
  return layoutGridPoint({ index, count, itemWidth, gap, startY, rowHeight, canvasWidth: canvasWidth.value, mode: layoutMode.value });
}
function networkX(subnet: DiagramSubnet) {
  const row = subnet.networkType === 'mstp' || subnet.networkType === 'arcnet' ? fieldSegments.value : routedNetworks.value;
  return gridPoint(row.findIndex(item => item.id === subnet.id), row.length, subnetWidth, layoutGap, 0, 0).x;
}
function networkY(subnet: DiagramSubnet) {
  const isFieldNetwork = subnet.networkType === 'mstp' || subnet.networkType === 'arcnet';
  const row = isFieldNetwork ? fieldSegments.value : routedNetworks.value;
  return gridPoint(
    row.findIndex(item => item.id === subnet.id),
    row.length,
    subnetWidth,
    layoutGap,
    isFieldNetwork ? fieldBusY.value : subnetY.value,
    subnetHeight + layoutGap
  ).y;
}
function networkCenter(id: string) { const subnet = project.value.subnets.find(item => item.id === id); return subnet ? networkX(subnet) + subnetWidth / 2 : 0; }
function subnetCenter(id: string) { return networkCenter(id); }
function hostRow(host: HostNode) { return host.ownerSubnet.networkType === 'mstp' || host.ownerSubnet.networkType === 'arcnet' ? fieldHostNodes.value : ipHostNodes.value; }
function hostX(host: HostNode, fallbackIndex = 0) {
  const row = hostRow(host);
  const index = row.findIndex(item => item.device.id === host.device.id);
  const resolvedIndex = index < 0 ? fallbackIndex : index;
  return gridPoint(resolvedIndex, row.length, hostWidth, hostGap, 0, 0).x;
}
function hostYFor(host: HostNode) {
  const row = hostRow(host);
  const index = row.findIndex(item => item.device.id === host.device.id);
  const isFieldHost = host.ownerSubnet.networkType === 'mstp' || host.ownerSubnet.networkType === 'arcnet';
  return gridPoint(index, row.length, hostWidth, hostGap, isFieldHost ? fieldHostY.value : ipHostY.value, hostHeight.value + layoutGap).y;
}
function routingDevicesFor(segment: DiagramSubnet) {
  return hostNodes.value.flatMap(host => host.device.nics.flatMap(nic => nic.addresses
    .filter(address => address.subnetId === segment.upstreamSubnetId)
    .map(address => ({ id: host.device.id, name: host.device.name || 'Unnamed device', ip: address.ip }))));
}
function infrastructureX(index: number) { return gridPoint(index, project.value.infrastructure.length, 150, 40, 82, 96).x + 75; }
function infrastructureY(index: number) { return gridPoint(index, project.value.infrastructure.length, 150, 40, 82, 96).y; }
function validConnections(item: DiagramInfrastructure) { return item.subnetIds.filter(id => project.value.subnets.some(subnet => subnet.id === id)); }
function connectionKindClass(item: DiagramInfrastructure) {
  if (item.kind === 'router' || item.kind === 'gateway' || item.kind === 'firewall') return 'connection--routing';
  if (item.kind === 'bbmd') return 'connection--bbmd';
  if (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster') return 'connection--sc';
  return 'connection--local';
}
function connectionTargetX(itemId: string, subnetId: string) {
  const connected = project.value.infrastructure.filter(item => validConnections(item).includes(subnetId));
  const connectionIndex = connected.findIndex(item => item.id === itemId);
  const offset = connectionIndex < 0 ? 0 : (connectionIndex - (connected.length - 1) / 2) * 18;
  return subnetCenter(subnetId) + offset;
}
function connectionTargetY(subnetId: string) {
  const subnet = project.value.subnets.find(candidate => candidate.id === subnetId);
  return subnet ? networkY(subnet) : subnetY.value;
}
function infrastructureConnectionLabel(item: DiagramInfrastructure, subnetId: string) {
  const subnet = project.value.subnets.find(candidate => candidate.id === subnetId);
  const relation = item.kind === 'bbmd' ? 'BBMD local attachment' : item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster' ? 'BACnet/SC underlay' : item.kind === 'router' || item.kind === 'gateway' || item.kind === 'firewall' ? 'routed interface' : 'local attachment';
  return `${item.name || 'Unnamed infrastructure'} → ${subnet?.name || 'missing network'} · ${relation}`;
}
function connectionPath(index: number, itemId: string, subnetId: string) {
  const item = project.value.infrastructure.find(candidate => candidate.id === itemId);
  if (!item) return '';
  const startX = infrastructureX(index);
  const startY = infrastructureY(index) + 72;
  const endX = connectionTargetX(itemId, subnetId);
  const target = project.value.subnets.find(candidate => candidate.id === subnetId);
  const endY = target ? networkY(target) : subnetY.value;
  const bend = Math.max(24, (endY - startY) / 2);
  return `M ${startX} ${startY} C ${startX} ${startY + bend}, ${endX} ${endY - bend}, ${endX} ${endY}`;
}
function fieldBusRoutePath(segment: DiagramSubnet) {
  if (!segment.upstreamSubnetId) return '';
  const routerHost = ipHostNodes.value.find(host => host.device.id === segment.routerId);
  const startX = routerHost ? hostX(routerHost) + hostWidth / 2 : networkCenter(segment.upstreamSubnetId);
  const upstream = project.value.subnets.find(candidate => candidate.id === segment.upstreamSubnetId);
  const startY = routerHost ? hostYFor(routerHost) + hostHeight.value : upstream ? networkY(upstream) + subnetHeight : subnetY.value + subnetHeight;
  const endX = networkCenter(segment.id);
  const endY = networkY(segment);
  const laneY = fieldBusY.value - 28;
  return `M ${startX} ${startY} L ${startX} ${laneY} L ${endX} ${laneY} L ${endX} ${endY}`;
}
function routerName(id: string) { return hostNodes.value.find(host => host.device.id === id)?.device.name || 'Unassigned router'; }

interface DiagramPoint { x: number; y: number }
const addressLinks = computed(() => hostNodes.value.flatMap((host, hostIndex) => {
  const addressTotal = addressCount(host.device);
  let flatAddressIndex = 0;
  return host.device.nics.flatMap(nic => nic.addresses.flatMap(address => {
    const target = project.value.subnets.find(candidate => candidate.id === address.subnetId);
    if (!target) return [];
    const offset = (flatAddressIndex++ - (addressTotal - 1) / 2) * 12;
    const start = { x: networkX(target) + subnetWidth / 2 + offset, y: networkY(target) + subnetHeight };
    const end = { x: hostX(host, hostIndex) + hostWidth / 2 + offset, y: hostYFor(host) };
    const midY = (start.y + end.y) / 2;
    return [{
      id: address.id,
      path: `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`,
      color: target.color,
      label: `${nic.name} · ${displayAddress(address)}`,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      labelX: (start.x + end.x) / 2,
      labelY: midY - 6
    }];
  }));
}));

const scLinks = computed(() => hostNodes.value.flatMap((host, hostIndex) => host.device.nics.flatMap((nic, nicIndex) => {
  if (!nic.bacnetScEnabled || !nic.scHubId) return [];
  const sourceX = hostX(host, hostIndex) + hostWidth / 2 + (nicIndex - (host.device.nics.length - 1) / 2) * 18;
  const sourceY = hostYFor(host) + hostHeight.value;
  const infrastructureIndex = project.value.infrastructure.findIndex(item => item.id === nic.scHubId);
  let targetX = 0;
  let targetY = 0;
  let targetName = '';
  if (infrastructureIndex >= 0) {
    const target = project.value.infrastructure[infrastructureIndex];
    targetX = infrastructureX(infrastructureIndex);
    targetY = infrastructureY(infrastructureIndex) + 72;
    targetName = target.name;
  } else {
    const targetHostIndex = hostNodes.value.findIndex(candidate => candidate.device.nics.some(candidateNic => candidateNic.id === nic.scHubId));
    if (targetHostIndex < 0) return [];
    const targetHost = hostNodes.value[targetHostIndex];
    targetX = hostX(targetHost, targetHostIndex) + hostWidth / 2;
    targetY = hostYFor(targetHost) + hostHeight.value;
    targetName = targetHost.device.name;
  }
  const controlY = Math.max(sourceY, targetY) + 52;
  return [{
    id: `sc-${nic.id}-${nic.scHubId}`,
    label: `BACnet/SC · ${host.device.name} ${nic.name} → ${targetName}`,
    path: `M ${sourceX} ${sourceY} C ${sourceX} ${controlY}, ${targetX} ${controlY}, ${targetX} ${targetY}`,
    startX: sourceX,
    startY: sourceY,
    endX: targetX,
    endY: targetY
  }];
})));

function deviceRelationshipPoint(deviceId: string, offset = 0): DiagramPoint | null {
  const hostIndex = hostNodes.value.findIndex(host => host.device.id === deviceId);
  if (hostIndex < 0) return null;
  const host = hostNodes.value[hostIndex];
  return { x: hostX(host, hostIndex) + hostWidth / 2 + offset, y: hostYFor(host) + hostHeight.value };
}

const bdtLinks = computed(() => {
  const seen = new Set<string>();
  return hostNodes.value.flatMap((host, relationshipIndex) => (host.device.bdtPeerDeviceIds ?? []).flatMap(peerId => {
    const pair = [host.device.id, peerId].sort();
    const peer = hostNodes.value.find(candidate => candidate.device.id === peerId && candidate.device.bbmdEnabled);
    const mutual = peer?.device.bdtPeerDeviceIds?.includes(host.device.id) ?? false;
    const id = mutual ? `bdt-${pair.join('-')}` : `bdt-${host.device.id}-${peerId}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const start = deviceRelationshipPoint(host.device.id, -12);
    const end = deviceRelationshipPoint(peerId, -12);
    if (!peer || !start || !end) return [];
    const depth = Math.max(start.y, end.y, ipHostLayerBottom.value) + 48 + (relationshipIndex % 4) * 14;
    return [{
      id,
      sourceId: host.device.id,
      targetId: peerId,
      mutual,
      label: mutual ? `Mutual BDT · ${host.device.name} ↔ ${peer.device.name}` : `BDT entry · ${host.device.name} → ${peer.device.name}`,
      path: `M ${start.x} ${start.y} C ${start.x} ${depth}, ${end.x} ${depth}, ${end.x} ${end.y}`,
      startX: start.x, startY: start.y, endX: end.x, endY: end.y,
      labelX: (start.x + end.x) / 2, labelY: depth - 5
    }];
  }));
});

const fdrLinks = computed(() => hostNodes.value.flatMap((host, relationshipIndex) => {
  const targetId = host.device.foreignDeviceBbmdId;
  if (!targetId) return [];
  const target = hostNodes.value.find(candidate => candidate.device.id === targetId && candidate.device.bbmdEnabled);
  const start = deviceRelationshipPoint(host.device.id, 12);
  const end = deviceRelationshipPoint(targetId, 12);
  if (!target || !start || !end) return [];
  const depth = Math.max(start.y, end.y, ipHostLayerBottom.value) + 104 + (relationshipIndex % 3) * 14;
  return [{
    id: `fdr-${host.device.id}-${targetId}`,
    sourceId: host.device.id,
    targetId,
    label: `Foreign Device Registration · ${host.device.name} → ${target.device.name}`,
    path: `M ${start.x} ${start.y} C ${start.x} ${depth}, ${end.x} ${depth}, ${end.x} ${end.y}`,
    startX: start.x, startY: start.y, endX: end.x, endY: end.y,
    labelX: (start.x + end.x) / 2, labelY: depth - 5
  }];
}));

const displayedBdtLinks = computed(() => {
  if (relationshipMode.value === 'all') return bdtLinks.value;
  if (relationshipMode.value !== 'focused' || !focusedBbmdId.value) return [];
  return bdtLinks.value.filter(link => link.sourceId === focusedBbmdId.value || link.targetId === focusedBbmdId.value);
});
const displayedFdrLinks = computed(() => {
  if (relationshipMode.value === 'all') return fdrLinks.value;
  if (relationshipMode.value !== 'focused' || !focusedBbmdId.value) return [];
  return fdrLinks.value.filter(link => link.sourceId === focusedBbmdId.value || link.targetId === focusedBbmdId.value);
});

function physicalEndpointPoint(ref: PhysicalEndpointRef): DiagramPoint | null {
  if (ref.kind === 'infrastructure-port') {
    const index = project.value.infrastructure.findIndex(item => item.id === ref.infrastructureId);
    return index < 0 ? null : { x: infrastructureX(index), y: infrastructureY(index) + 72 };
  }
  if (ref.kind === 'device-nic') {
    const index = hostNodes.value.findIndex(item => item.device.id === ref.deviceId);
    const host = hostNodes.value[index];
    return host ? { x: hostX(host, index) + hostWidth / 2, y: hostYFor(host) + hostHeight.value } : null;
  }
  return null;
}
const physicalOverlayLinks = computed(() => project.value.physical.links.flatMap(link => {
  const a = physicalEndpointPoint(link.a); const b = physicalEndpointPoint(link.b);
  return a && b ? [{ id: link.id, label: link.label || link.media, points: `${a.x},${a.y} ${b.x},${b.y}` }] : [];
}));

function endpointPoint(endpointId: string): DiagramPoint | null {
  const infrastructureIndex = project.value.infrastructure.findIndex(item => item.id === endpointId);
  if (infrastructureIndex >= 0) return { x: infrastructureX(infrastructureIndex), y: infrastructureY(infrastructureIndex) + 72 };
  const resolved = resolveAddressEndpoint(endpointId);
  if (resolved) {
    const addresses = allAddresses(resolved.host.device);
    const addressIndex = addresses.findIndex(address => address.id === endpointId);
    const offset = (addressIndex - (addresses.length - 1) / 2) * 12;
    return { x: hostX(resolved.host, resolved.hostIndex) + hostWidth / 2 + offset, y: hostYFor(resolved.host) + hostHeight.value };
  }
  return null;
}

function resolveAddressEndpoint(endpointId: string) {
  for (let hostIndex = 0; hostIndex < hostNodes.value.length; hostIndex++) {
    const host = hostNodes.value[hostIndex];
    for (const nic of host.device.nics) {
      const address = nic.addresses.find(item => item.id === endpointId);
      if (address) return { host, hostIndex, nic, address };
    }
  }
  return null;
}

const pathSegments = computed(() => project.value.paths.flatMap((path, pathIndex) => path.hops.slice(0, -1).flatMap((endpointId, index) => {
  const start = endpointPoint(endpointId);
  const end = endpointPoint(path.hops[index + 1]);
  if (!start || !end) return [];
  const bothHosts = start.y > 300 && end.y > 300;
  const controlY = bothHosts ? Math.max(start.y, end.y) + 38 + pathIndex * 18 : (start.y + end.y) / 2 + pathIndex * 12;
  return [{
    id: `${path.id}-${index}`,
    outcome: path.outcome,
    path: `M ${start.x} ${start.y} C ${start.x} ${controlY}, ${end.x} ${controlY}, ${end.x} ${end.y}`,
    showLabel: index === 0,
    label: `${path.name} — ${path.protocol || 'Test'} ${path.outcome === 'success' ? 'passed' : 'failed'}`,
    labelX: (start.x + end.x) / 2,
    labelY: controlY
  }];
})));

function endpointName(id: string) {
  const infrastructure = project.value.infrastructure.find(item => item.id === id);
  if (infrastructure) return `${infrastructure.name || 'Unnamed infrastructure'} [${infrastructure.ip || 'IP not set'}]`;
  const resolved = resolveAddressEndpoint(id);
  return resolved ? `${resolved.host.device.name || 'Unnamed host'} [${displayAddress(resolved.address)}]` : 'Missing endpoint';
}

const pathLegends = computed(() => project.value.paths.map((path, index) => {
  const rows = [
    { label: 'FROM', value: endpointName(path.hops[0] ?? '') },
    ...(path.hops.length > 2 ? [{ label: 'VIA', value: path.hops.slice(1, -1).map(endpointName).join(' → ') }] : []),
    { label: 'TO', value: endpointName(path.hops[path.hops.length - 1] ?? '') },
    ...(path.testType === 'bacnet-whois' ? [{ label: 'BROADCAST', value: `${path.broadcastAddress || 'Not specified'}:${path.udpPort || 47808}` }] : [])
  ];
  return {
    id: path.id,
    outcome: path.outcome,
    name: path.name || 'Connectivity test',
    protocol: path.protocol || 'Test',
    rows,
    x: 40 + (index % legendColumns.value) * (legendCardWidth.value + 20),
    y: legendStart.value + Math.floor(index / legendColumns.value) * 124
  };
}));

function legendCardHeight(legend: { rows: unknown[] }) { return 37 + legend.rows.length * 19; }

const logicalDiagramModel = computed(() => ({
  project: project.value,
  canvasWidth: canvasWidth.value,
  canvasHeight: canvasHeight.value,
  subnetY: subnetY.value,
  ipHostNodes: ipHostNodes.value,
  ipHostY: ipHostY.value,
  fieldSegments: fieldSegments.value,
  fieldBusY: fieldBusY.value,
  fieldHostNodes: fieldHostNodes.value,
  fieldHostY: fieldHostY.value,
  showPhysicalOverlay: showPhysicalOverlay.value,
  physicalOverlayLinks: physicalOverlayLinks.value,
  diagnosticTargetKeys: diagnosticTargetKeys.value,
  addressLinks: addressLinks.value,
  scLinks: scLinks.value,
  displayedBdtLinks: displayedBdtLinks.value,
  displayedFdrLinks: displayedFdrLinks.value,
  hostNodes: hostNodes.value,
  hostHeight: hostHeight.value,
  pathSegments: pathSegments.value,
  pathLegends: pathLegends.value,
  legendStart: legendStart.value,
  legendCardWidth: legendCardWidth.value,
  legendTextLimit: legendTextLimit.value,
  subnetWidth,
  subnetHeight,
  hostWidth,
  clipped,
  validConnections,
  infrastructureConnectionLabel,
  connectionPath,
  connectionKindClass,
  connectionTargetX,
  connectionTargetY,
  infrastructureX,
  infrastructureY,
  focusConfig,
  fieldBusRoutePath,
  networkCenter,
  networkY,
  routerName,
  networkX,
  roundedTopAccentPath,
  networkDiagramLabel,
  subnetCidr,
  subnetMetaLabel,
  hostRelationshipClass,
  hostX,
  hostYFor,
  activateHostNode,
  deviceTooltip,
  deviceServiceLabel,
  hostAddressRows,
  addressCount,
  hostRelationshipBadge,
  legendCardHeight
}));

function download(content: BlobPart, type: string, extension: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = (project.value.title || 'network-diagram').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  link.href = url;
  link.download = `${filename || 'network-diagram'}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}
function saveJson() { download(JSON.stringify(project.value, null, 2), 'application/json', 'json'); }
function saveLegacyJson() { download(JSON.stringify(toLegacyDiagramProject(project.value), null, 2), 'application/json', 'v1.json'); }
async function saveXlsx() { const { exportDiagramXlsx } = await import('../lib/export-diagram-xlsx'); await exportDiagramXlsx(project.value); }
function diagramFilename() {
  return (project.value.title || 'network-diagram').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'network-diagram';
}
function serializedDiagramSvg(theme: 'dark' | 'light' = 'dark', branded = false) {
  const source = project.value.viewMode === 'physical' ? physicalDiagram.value?.svg : logicalDiagram.value?.svg;
  if (!source) return;
  const clone = source.cloneNode(true) as SVGSVGElement;
  const originalIcons = source.querySelectorAll<SVGElement>('.ace-node-icon');
  clone.querySelectorAll<SVGElement>('.ace-node-icon').forEach((icon, index) => {
    icon.setAttribute('fill', getComputedStyle(originalIcons[index]).color || '#c1d301');
  });
  if (project.value.viewMode !== 'physical') {
    clone.setAttribute('width', String(canvasWidth.value));
    clone.setAttribute('height', String(canvasHeight.value));
  }
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `${SVG_EXPORT_STYLES}${SVG_SC_LINK_STYLES}${SVG_BACNET_RELATIONSHIP_STYLES}${SVG_CONNECTION_STYLES}${SVG_PHYSICAL_STYLES}${theme === 'light' ? PDF_LIGHT_STYLES : ''}${SUBNET_ACCENT_EXPORT_STYLES}`;
  clone.prepend(style);
  if (branded) {
    const appLogo = document.querySelector<SVGSVGElement>('.logo-icon-svg');
    if (appLogo) {
      const logo = appLogo.cloneNode(true) as SVGSVGElement;
      logo.removeAttribute('style');
      logo.setAttribute('class', 'export-ace-logo');
      logo.setAttribute('x', '36');
      logo.setAttribute('y', '15');
      logo.setAttribute('width', '170');
      logo.setAttribute('height', '47');
      clone.querySelector('.export-bg')?.after(logo);
      const title = clone.querySelector('.export-title');
      const notes = clone.querySelector('.export-notes');
      title?.setAttribute('x', '230');
      title?.setAttribute('y', '37');
      notes?.setAttribute('x', '230');
      notes?.setAttribute('y', '59');
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}
function saveSvg() {
  const svg = serializedDiagramSvg();
  if (svg) download(svg, 'image/svg+xml', 'svg');
}
function openPdfExportDialog() {
  pdfExportDialog.value?.showModal();
}
function confirmPdfExport() {
  pdfExportDialog.value?.close();
  void savePdf();
}
async function savePdf() {
  const svg = serializedDiagramSvg(pdfTheme.value, true);
  if (!svg || isExportingPdf.value) return;
  isExportingPdf.value = true;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to render diagram SVG'));
      image.src = svgUrl;
    });
    const exportWidth = image.naturalWidth || canvasWidth.value;
    const exportHeight = image.naturalHeight || canvasHeight.value;
    const renderScale = Math.min(2, 8192 / Math.max(exportWidth, exportHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(exportWidth * renderScale));
    canvas.height = Math.max(1, Math.round(exportHeight * renderScale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PDF canvas is unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const { jsPDF } = await import('jspdf');
    const padding = 24;
    const pointScale = Math.min(0.75, (14_400 - padding * 2) / Math.max(exportWidth, exportHeight));
    const drawingWidth = exportWidth * pointScale;
    const drawingHeight = exportHeight * pointScale;
    const pageWidth = drawingWidth + padding * 2;
    const pageHeight = drawingHeight + padding * 2;
    const pdf = new jsPDF({
      orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [pageWidth, pageHeight],
      compress: true,
      putOnlyUsedFonts: true
    });
    pdf.setFillColor(pdfTheme.value === 'light' ? '#ffffff' : '#121212');
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', padding, padding, drawingWidth, drawingHeight, undefined, 'FAST');
    pdf.link(
      padding + 38 * pointScale,
      padding + (exportHeight - 36) * pointScale,
      Math.min(360 * pointScale, drawingWidth - 38 * pointScale),
      20 * pointScale,
      { url: TOOL_URL }
    );
    if (includeBbmdTablesInPdf.value) {
      appendBbmdReportPages(pdf, bbmdReport.value, {
        projectTitle: project.value.title || 'Untitled BACnet Network',
        theme: pdfTheme.value
      });
    }
    if (includeCableScheduleInPdf.value || includeSerialTablesInPdf.value) appendPhysicalSchedulePages(pdf, project.value, {
      projectTitle: project.value.title || 'Untitled BACnet Network', theme: pdfTheme.value,
      includeCables: includeCableScheduleInPdf.value, includeSerial: includeSerialTablesInPdf.value
    });
    pdf.save(`${diagramFilename()}.pdf`);
  } catch (error) {
    console.error(error);
    window.alert('The PDF could not be generated. Please try exporting the SVG instead.');
  } finally {
    URL.revokeObjectURL(svgUrl);
    isExportingPdf.value = false;
  }
}
async function openJson(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const parsed: unknown = JSON.parse(await file.text());
    project.value = migrateDiagramProject(parsed);
  } catch {
    window.alert('That file is not a valid BACnet Studio diagram project.');
  } finally {
    input.value = '';
  }
}
</script>

<style>
.subnet-accent{fill:var(--subnet-accent-color);stroke:none}
.export-bg{fill:#121212}.export-title{font:700 24px Montserrat,Arial,sans-serif;fill:#f8fafc}.export-notes{font:13px Inter,Arial,sans-serif;fill:#94a3b8}.layer-label{font:700 8px Inter,Arial,sans-serif;fill:#475569;letter-spacing:1.5px}.connection{fill:none;stroke:#64748b;stroke-width:2.5}.connection-dot{fill:#94a3b8}.infra-box{fill:#1e293b;stroke:#94d8ff;stroke-width:2}.infra-type{font:700 10px Inter,Arial,sans-serif;fill:#94d8ff;letter-spacing:1px}.infra-name{font:600 13px Inter,Arial,sans-serif;fill:#f8fafc}.infra-ip{font:11px monospace;fill:#94a3b8}.subnet-box{fill:#171722;stroke-width:2}.subnet-name{font:700 15px Inter,Arial,sans-serif;fill:#f8fafc}.subnet-address{font:12px monospace;fill:#cbd5e1}.subnet-meta{font:11px Inter,Arial,sans-serif;fill:#94a3b8}.device-icon{fill:#334155}.device-name{font:600 12px Inter,Arial,sans-serif;fill:#f8fafc}.device-kind{font:9px Inter,Arial,sans-serif;fill:#94a3b8;text-transform:uppercase}.footer-label{font:10px Inter,Arial,sans-serif;fill:#64748b}.node-category{font:700 9px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:1.2px}.host-box{fill:#252536;stroke:#64748b;stroke-width:1.5}.host-address-label{font:700 8px Inter,Arial,sans-serif;fill:#94a3b8}.host-address-summary{font:10px monospace;fill:#cbd5e1}.host-count-badge{fill:#0f3d39;stroke:#2dd4bf}.host-count-text{font:700 7px Inter,Arial,sans-serif;fill:#99f6e4}.address-link{fill:none;stroke-width:2.5}.address-endpoint{stroke:#121212;stroke-width:1}.address-link-label{font:9px monospace;fill:#cbd5e1;paint-order:stroke;stroke:#121212;stroke-width:4px;stroke-linejoin:round}.test-path{fill:none;stroke-width:4;opacity:.9}.test-path.success{stroke:#14ae5c}.test-path.failure{stroke:#df1219;stroke-dasharray:9 6}.test-path-label-bg.success{fill:#0d3823;stroke:#14ae5c}.test-path-label-bg.failure{fill:#3d1719;stroke:#df1219}.test-path-label{font:700 9px Inter,Arial,sans-serif}.test-path-label.success{fill:#86efac}.test-path-label.failure{fill:#fca5a5}
.connection{stroke-width:2;stroke-linejoin:round}.address-link{stroke-width:2}.test-path{stroke-width:2.75;opacity:.78}.test-path.failure{stroke-dasharray:8 6}.path-legend-bg{fill:#181820;stroke:#334155}.path-legend-bg.success{stroke:#14ae5c}.path-legend-bg.failure{stroke:#df1219}.path-legend-dot.success{fill:#14ae5c}.path-legend-dot.failure{fill:#df1219}.path-legend-text{font:600 9px Inter,Arial,sans-serif;fill:#cbd5e1}
.connection--routing{stroke:#64748b;stroke-width:2.5}.connection--bbmd{stroke:#94d8ff;stroke-width:2.75;stroke-dasharray:9 6}.connection--sc{stroke:#2dd4bf;stroke-width:2.5;stroke-dasharray:2 6}.connection--local{stroke:#a78bfa;stroke-width:2}.connection--routing-dot{fill:#64748b}.connection--bbmd-dot{fill:#94d8ff}.connection--sc-dot{fill:#2dd4bf}.connection--local-dot{fill:#a78bfa}
.bdt-link{fill:none;stroke:#a78bfa;stroke-width:3;stroke-dasharray:10 5}.bdt-endpoint{fill:#a78bfa;stroke:#121212;stroke-width:1}.fdr-link{fill:none;stroke:#fb923c;stroke-width:2.75;stroke-dasharray:3 6}.fdr-endpoint{fill:#fb923c;stroke:#121212;stroke-width:1}.relationship-link-label{font:700 8px Inter,Arial,sans-serif;letter-spacing:.8px;paint-order:stroke;stroke:#121212;stroke-width:4px;stroke-linejoin:round}.relationship-link-label.bdt{fill:#c4b5fd}.relationship-link-label.fdr{fill:#fdba74}
.sc-service-link{fill:none;stroke:#2dd4bf;stroke-width:2.5;stroke-dasharray:8 6;opacity:.9}.sc-service-endpoint{fill:#2dd4bf;stroke:#121212;stroke-width:1}
.path-legend-title{font:700 10px Inter,Arial,sans-serif;fill:#f8fafc}.path-result-badge.success{fill:#0d3823;stroke:#14ae5c}.path-result-badge.failure{fill:#3d1719;stroke:#df1219}.path-result-text{font:700 8px Inter,Arial,sans-serif}.path-result-text.success{fill:#86efac}.path-result-text.failure{fill:#fca5a5}.path-route-label{font:700 8px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:.6px}.path-route-text{font:10px monospace;fill:#cbd5e1}
</style>
