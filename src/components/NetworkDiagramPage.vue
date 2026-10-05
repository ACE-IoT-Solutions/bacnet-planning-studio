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
            <label for="diagram-visualization-mode">Visualization</label>
            <select id="diagram-visualization-mode" v-model="project.viewMode">
              <option value="detailed">Detailed</option><option value="networks">Network topology</option><option value="physical">Physical layer</option>
            </select>
            <label v-if="project.viewMode !== 'physical'" for="diagram-layout-mode">Layout</label>
            <select v-if="project.viewMode !== 'physical'" id="diagram-layout-mode" v-model="layoutMode">
              <option value="compact">Compact grid · 4 across</option>
              <option value="balanced">Balanced grid · 8 across</option>
              <option value="wide">Wide rows · no wrapping</option>
            </select>
            <label v-if="project.viewMode !== 'physical' && bbmdReport.devices.length" for="diagram-relationship-mode">BDT view</label>
            <select v-if="project.viewMode !== 'physical' && bbmdReport.devices.length" id="diagram-relationship-mode" v-model="relationshipMode">
              <option value="highlights">Peer highlights</option>
              <option value="focused">Focused edges</option>
              <option value="all">All edges</option>
              <option value="hidden">Hidden</option>
            </select>
            <select v-if="project.viewMode !== 'physical' && bbmdReport.devices.length && (relationshipMode === 'highlights' || relationshipMode === 'focused')" v-model="focusedBbmdId" aria-label="Focused BBMD">
              <option v-for="bbmd in bbmdReport.devices" :key="bbmd.id" :value="bbmd.id">{{ bbmd.name }} · {{ bbmd.endpoint }}</option>
            </select>
            <label v-if="project.physical.links.length && project.viewMode !== 'physical'" class="physical-overlay-toggle"><input v-model="showPhysicalOverlay" type="checkbox"> Cabling overlay</label>
            <button type="button" class="reset-button" @click="resetProject">Reset example</button>
          </div>
        </div>
        <div v-if="project.viewMode !== 'physical' && focusedBbmd && (relationshipMode === 'highlights' || relationshipMode === 'focused')" class="diagram-relationship-summary">
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

    <GettingStartedDialog ref="gettingStartedDialog" @open-bbmd="openBbmdImportFromGuide" @open-nmap="openNmapImportFromGuide" />

    <NmapImportDialog ref="nmapImportDialog" v-model:output="nmapOutput" v-model:cidr="nmapCidr" :cidr-options="cidrOptions" :hosts="nmapHosts" :group-count="nmapGroups.length" :node-count="nmapNodeCount" :duplicate-count="nmapDuplicateCount" :new-host-count="nmapNewHostCount" :existing-ips="existingDiagramIps" :host-name="nmapHostName" :is-gateway="isNmapGatewayHost" :latency="formatNmapLatency" @import="importNmapHosts" />

    <BbmdStateImportDialog ref="bbmdStateDialog" :preview="bbmdStatePreview" :error="bbmdStateError" :subnet-count="bbmdStateSubnetCount" @file-change="readBbmdStateFile" @import="importBbmdState" />

    <MoveDeviceDialog ref="moveDeviceDialog" v-model:target-id="moveTargetSubnetId" :device-name="movingDevice?.name" :targets="moveTargetSubnets" :subnet-label="subnetCidr" @confirm="confirmMoveDevice" />

    <PdfExportDialog ref="pdfExportDialog" v-model:theme="pdfTheme" v-model:include-bbmd="includeBbmdTablesInPdf" v-model:include-cables="includeCableScheduleInPdf" v-model:include-serial="includeSerialTablesInPdf" :bbmd-count="bbmdReport.devices.length" :has-physical-schedules="Boolean(project.physical.links.length || project.physical.mstpSegments.length || project.physical.arcnetSegments.length)" @export="confirmPdfExport" />
  </section>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import AppButton from './AppButton.vue';
import GlossaryLink from './GlossaryLink.vue';
import PhysicalLayerEditor from './diagram/PhysicalLayerEditor.vue';
import PhysicalDiagramSvg from './diagram/PhysicalDiagramSvg.vue';
import LogicalDiagramSvg from './diagram/LogicalDiagramSvg.vue';
import DiagramSettingsCard from './diagram/DiagramSettingsCard.vue';
import DiagnosticsPanel from './diagram/DiagnosticsPanel.vue';
import InfrastructureEditorCard from './diagram/InfrastructureEditorCard.vue';
import TestPathEditorCard from './diagram/TestPathEditorCard.vue';
import SubnetEditorCard from './diagram/SubnetEditorCard.vue';
import GettingStartedDialog from './diagram/dialogs/GettingStartedDialog.vue';
import PdfExportDialog from './diagram/dialogs/PdfExportDialog.vue';
import NmapImportDialog from './diagram/dialogs/NmapImportDialog.vue';
import BbmdStateImportDialog from './diagram/dialogs/BbmdStateImportDialog.vue';
import MoveDeviceDialog from './diagram/dialogs/MoveDeviceDialog.vue';
import { getSubnetDetails } from '../lib/subnet';
import { isNmapGatewayHost, nmapHostName } from '../lib/nmap-import';
import { bbmdRelationshipClass, createBbmdReport } from '../lib/bbmd-report';
import {
  addressState, getDiagramDiagnostics, subnetCidr,
  type ConfigTargetKind, type DeviceKind, type DiagramDiagnostic, type DiagramDevice,
  type DiagramDeviceAddress, type DiagramInfrastructure, type DiagramSubnet
} from '../lib/network-diagram';
import { DIAGRAM_STORAGE_KEY } from '../lib/storage-keys';
import { layoutColumnCount, layoutGridPoint, layoutRowCount, layoutRowPixelWidth, type DiagramLayoutMode } from '../lib/diagram-layout';
import { useDiagramProject } from '../composables/useDiagramProject';
import { formatNmapLatency, useDiagramImports } from '../composables/useDiagramImports';
import { useDiagramExports } from '../composables/useDiagramExports';
import { normalizedNetworkType, useDiagramEditor } from '../composables/useDiagramEditor';
import { useLogicalDiagramLinks } from '../composables/useLogicalDiagramLinks';

const STORAGE_KEY = DIAGRAM_STORAGE_KEY;
const LAYOUT_STORAGE_KEY = 'aceiot-network-diagram-layout-v1';
const RELATIONSHIP_MODE_STORAGE_KEY = 'aceiot-network-diagram-relationship-view-v1';
const PHYSICAL_OVERLAY_STORAGE_KEY = 'aceiot-network-diagram-physical-overlay-v1';
const advancedBacnetPorts = inject<Ref<boolean>>('advancedBacnetPorts', ref(false));
const { project, loadStoredProject, replaceProject, dispose: disposeDiagramProject, removeSubnet, removeDevice, removeDeviceNic, removeNicAddress, removeInfrastructure } = useDiagramProject(STORAGE_KEY);
const logicalDiagram = ref<InstanceType<typeof LogicalDiagramSvg> | null>(null);
const physicalDiagram = ref<InstanceType<typeof PhysicalDiagramSvg> | null>(null);
const gettingStartedDialog = ref<InstanceType<typeof GettingStartedDialog> | null>(null);
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
const {
  bbmdStateDialog, bbmdStateError, bbmdStatePreview, bbmdStateSubnetCount, existingDiagramIps,
  importBbmdState, importNmapHosts, nmapCidr, nmapDuplicateCount, nmapGroups, nmapHosts,
  nmapImportDialog, nmapImportNotice, nmapNewHostCount, nmapNodeCount, nmapOutput,
  openBbmdStateDialog, openNmapImportDialog, readBbmdStateFile
} = useDiagramImports(project);
interface HostNode { device: DiagramDevice; ownerSubnet: DiagramSubnet }

const diagnostics = computed(() => getDiagramDiagnostics(project.value));
const bbmdReport = computed(() => createBbmdReport(project.value));
const focusedBbmd = computed(() => bbmdReport.value.devices.find(device => device.id === focusedBbmdId.value));
const deviceCount = computed(() => project.value.subnets.reduce((total, subnet) => total + subnet.devices.length, 0));
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
const {
  confirmPdfExport, fileInput, includeBbmdTablesInPdf, includeCableScheduleInPdf,
  includeSerialTablesInPdf, isExportingPdf, openJson, openPdfExportDialog, pdfExportDialog,
  pdfTheme, saveJson, saveLegacyJson, saveSvg, saveXlsx
} = useDiagramExports({ project, logicalDiagram, physicalDiagram, canvasWidth, canvasHeight });
const { logicalDiagramModel, resolveAddressEndpoint } = useLogicalDiagramLinks({
  project, hostNodes, hostHeight, ipHostLayerBottom, relationshipMode, focusedBbmdId,
  canvasWidth, canvasHeight, subnetY, ipHostNodes, ipHostY, fieldSegments, fieldBusY,
  fieldHostNodes, fieldHostY, showPhysicalOverlay, diagnosticTargetKeys, legendColumns,
  legendCardWidth, legendTextLimit, legendStart, subnetWidth, subnetHeight, hostWidth,
  displayAddress, allAddresses,
  helpers: {
    clipped, validConnections, infrastructureConnectionLabel, connectionPath, connectionKindClass,
    connectionTargetX, connectionTargetY, infrastructureX, infrastructureY, focusConfig,
    fieldBusRoutePath, networkCenter, networkY, routerName, networkX, roundedTopAccentPath,
    networkDiagramLabel, subnetCidr, subnetMetaLabel, hostRelationshipClass, hostX, hostYFor,
    activateHostNode, deviceTooltip, deviceServiceLabel, hostAddressRows, addressCount,
    hostRelationshipBadge
  }
});
const {
  addDevice, addDeviceNic, addInfrastructure, addNicAddress, addPath, addSubnet, compatibleAddressNetworks,
  confirmMoveDevice, foreignBbmdOptions, handleDiagramNetworkTypeChange, handleTestTypeChange, isBdtPeer,
  movableSubnets, moveDeviceDialog, movingDevice, moveTargetSubnetId, moveTargetSubnets, newProject,
  openMoveDeviceDialog, otherBbmdDevices, removePath, resetProject, scHubsForNic, setDeviceBbmd,
  suggestedWhoIsBroadcast, syncWhoIsBroadcast, toggleBdtPeer, upstreamNetworkOptions
} = useDiagramEditor({
  project, endpointOptions, hostNodes, activeConfigTarget, importNotice: nmapImportNotice,
  storageKey: STORAGE_KEY, focusConfig, resolveAddressEndpoint
});
const subnetEditorActions = {
  removeSubnet, subnetIsValid, upstreamNetworkOptions, subnetCidr, routingDevicesFor, addDevice, addressCount,
  movableSubnets, openMoveDeviceDialog, setDeviceBbmd, otherBbmdDevices, isBdtPeer, toggleBdtPeer, foreignBbmdOptions,
  addDeviceNic, addNicAddress, removeDeviceNic, scHubsForNic, compatibleAddressNetworks, addressFieldLabel,
  addressEntryClass, removeNicAddress, removeDevice, handleDiagramNetworkTypeChange
};

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

function openGettingStartedDialog() {
  gettingStartedDialog.value?.open();
}
function openBbmdImportFromGuide() {
  gettingStartedDialog.value?.close();
  openBbmdStateDialog();
}
function openNmapImportFromGuide() {
  gettingStartedDialog.value?.close();
  openNmapImportDialog();
}
function subnetIsValid(subnet: DiagramSubnet) {
  if (subnet.networkType === 'bacnet-sc') return Number(subnet.bacnetNetworkNumber) >= 1 && Number(subnet.bacnetNetworkNumber) <= 65534;
  if (subnet.networkType === 'mstp' || subnet.networkType === 'arcnet') return Number(subnet.bacnetNetworkNumber) >= 1 && Number(subnet.bacnetNetworkNumber) <= 65534;
  return getSubnetDetails(subnet.address, subnet.cidr) !== null;
}
function networkTypeLabel(subnet: DiagramSubnet) { return subnet.networkType === 'mstp' ? 'MS/TP' : subnet.networkType === 'arcnet' ? 'ARCNET' : subnet.networkType === 'bacnet-sc' ? 'BACnet/SC network' : 'BACnet/IP subnet'; }
function networkDiagramLabel(subnet: DiagramSubnet) {
  return normalizedNetworkType(subnet) === 'bacnet-ip' ? (subnet.udpPort === '' ? 'IP SUBNET' : 'BACNET/IP') : networkTypeLabel(subnet).toUpperCase();
}
function subnetMetaLabel(subnet: DiagramSubnet) {
  const count = subnetAddressCount(subnet.id);
  if (normalizedNetworkType(subnet) === 'bacnet-ip' && subnet.udpPort === '') return `No BACnet/IP · ${count} addr`;
  const showPort = normalizedNetworkType(subnet) === 'bacnet-ip' && (advancedBacnetPorts.value || (subnet.udpPort !== undefined && subnet.udpPort !== 47808));
  return showPort ? `UDP ${subnet.udpPort} · ${count} addr` : `${count} address${count === 1 ? '' : 'es'}`;
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

</script>
