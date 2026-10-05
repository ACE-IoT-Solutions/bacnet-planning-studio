<template>
  <section class="physical-editor-section">
    <div class="editor-section-heading"><div><span class="step-number">4</span><h3>Physical layer</h3></div></div>
    <div class="glass-card physical-enable-card">
      <AceToggle :model-value="project.physical.enabled" label="Enable physical modeling" description="Model locations, ports, cable schedules, ARC156, and MS/TP wiring" @update:model-value="project.physical.enabled = $event" />
    </div>
    <template v-if="project.physical.enabled">
      <details class="glass-card physical-editor-card" open>
        <summary>Locations <em>{{ project.physical.locations.length }}</em></summary>
        <div class="physical-card-body">
          <button class="icon-text-button small" type="button" @click="addLocation">+ Location</button>
          <div v-for="location in project.physical.locations" :id="`config-location-${location.id}`" :key="location.id" class="physical-row physical-location-row config-target" draggable="true" @dragstart="draggingLocationId = location.id" @dragover.prevent @drop="reparentLocation(location.id)">
            <AceField class="physical-location-name" label="Name"><AceTextInput v-model="location.name" placeholder="IDF 1" /></AceField>
            <AceField label="Type"><select v-model="location.kind"><option v-for="kind in locationKinds" :key="kind" :value="kind">{{ kind }}</option></select></AceField>
            <AceField label="Parent"><select v-model="location.parentId"><option :value="undefined">No parent</option><option v-for="candidate in project.physical.locations.filter(item => item.id !== location.id)" :key="candidate.id" :value="candidate.id">{{ candidate.name }}</option></select></AceField>
            <button class="row-remove-button" type="button" @click="removeLocation(location.id)">×</button>
          </div>
        </div>
      </details>

      <details class="glass-card physical-editor-card" open>
        <summary>Equipment placement &amp; ports</summary>
        <div class="physical-card-body">
          <AceField label="Find an endpoint"><AceTextInput v-model="endpointSearch" type="search" placeholder="Search ports and endpoints" /></AceField>
          <article v-for="item in project.infrastructure" :key="item.id" class="physical-equipment-block">
            <strong>{{ item.name }}</strong>
            <div class="editor-grid two-columns">
              <div class="form-group"><label>Location</label><select v-model="item.locationId"><option value="">Unassigned</option><option v-for="location in project.physical.locations" :key="location.id" :value="location.id">{{ locationPath(location.id) }}</option></select></div>
              <div class="form-group"><label>Model</label><input v-model="item.model" type="text" placeholder="Manufacturer / model"></div>
              <div class="form-group"><label>PoE budget (W)</label><input v-model.number="item.poeBudgetWatts" type="number" min="0"></div>
            </div>
            <div class="physical-port-toolbar"><span>{{ item.ports?.length ?? 0 }} ports</span><label>Set all VLAN modes <select aria-label="Set all port VLAN modes" @change="setAllPortsVlanMode(item, ($event.target as HTMLSelectElement).value)"><option value="">Choose…</option><option value="unmanaged">Unmanaged</option><option value="access">Access</option><option value="trunk">Trunk</option></select></label><button type="button" @click="openPortGenerator(item)">Generate ports</button></div>
            <div v-for="port in item.ports" :id="`config-port-${port.id}`" :key="port.id" class="physical-port-row config-target">
              <input v-model="port.name" aria-label="Port name">
              <select v-model="port.media" aria-label="Port media"><option v-for="media in mediaTypes" :key="media" :value="media">{{ media }}</option></select>
              <select v-model="port.vlanMode" aria-label="VLAN mode"><option value="unmanaged">unmanaged</option><option value="access">access</option><option value="trunk">trunk</option></select>
              <input v-if="port.vlanMode === 'access'" v-model="port.accessVlan" aria-label="Access VLAN" placeholder="VLAN">
              <input v-else-if="port.vlanMode === 'trunk'" :value="port.allowedVlans?.join(', ')" aria-label="Allowed VLANs" placeholder="10, 20" @change="port.allowedVlans = csv(($event.target as HTMLInputElement).value)">
              <select v-model="port.poe" aria-label="PoE class"><option v-for="poe in poeClasses" :key="poe" :value="poe">{{ poe }}</option></select>
              <button class="row-remove-button" type="button" @click="removePort(item, port.id)">×</button>
            </div>
          </article>
          <article v-for="entry in devices" :key="entry.device.id" class="physical-equipment-block">
            <strong>{{ entry.device.name }} <small>· {{ entry.subnet.name }}</small></strong>
            <div class="editor-grid two-columns">
              <div class="form-group"><label>Location</label><select v-model="entry.device.locationId"><option value="">Unassigned</option><option v-for="location in project.physical.locations" :key="location.id" :value="location.id">{{ locationPath(location.id) }}</option></select></div>
              <div class="form-group"><label>PoE requirement</label><select v-model="entry.device.poeClass"><option v-for="poe in poeClasses" :key="poe" :value="poe">{{ poe }}</option></select></div>
            </div>
            <div v-for="nic in entry.device.nics" :key="nic.id" class="physical-nic-row">
              <div class="physical-nic-name"><small>Interface</small><span>{{ nic.name }}</span></div>
              <AceField label="Media"><select v-model="nic.physical!.media"><option v-for="media in mediaTypes" :key="media" :value="media">{{ media }}</option></select></AceField>
              <AceField label="Speed (Mbps)"><input v-model.number="nic.physical!.speedMbps" type="number" min="0" step="0.001" placeholder="Mbps"></AceField>
              <AceField label="Connection"><select :value="connectedEndpoint(entry.device.id, nic.id)" @change="connectNic(entry.device.id, nic.id, ($event.target as HTMLSelectElement).value)">
                <option value="">Not connected</option><option v-for="endpoint in availableEndpoints(entry.device.id, nic.id)" :key="endpoint.key" :value="endpoint.key">{{ endpoint.label }}</option>
              </select></AceField>
            </div>
          </article>
        </div>
      </details>

      <details class="glass-card physical-editor-card">
        <summary>Patch panels <em>{{ project.physical.patchPanels.length }}</em></summary>
        <div class="physical-card-body">
          <button class="icon-text-button small" type="button" @click="addPanel">+ Patch panel</button>
          <article v-for="panel in project.physical.patchPanels" :id="`config-panel-${panel.id}`" :key="panel.id" class="physical-equipment-block config-target">
            <div class="physical-row"><input v-model="panel.name" type="text"><select v-model="panel.locationId"><option value="">Unassigned</option><option v-for="location in project.physical.locations" :key="location.id" :value="location.id">{{ locationPath(location.id) }}</option></select><button type="button" @click="openPanelGenerator(panel)">Generate pairs</button><button class="row-remove-button" type="button" @click="removePanel(panel.id)">×</button></div>
            <small>{{ panel.ports.length / 2 }} front / rear pass-through pairs</small>
          </article>
        </div>
      </details>

      <details class="glass-card physical-editor-card" open>
        <summary>Cable schedule <em>{{ project.physical.links.length }}</em></summary>
        <div class="physical-card-body">
          <button class="icon-text-button small" type="button" :disabled="endpointOptions.length < 2" @click="addCable">+ Cable</button>
          <article v-for="link in project.physical.links" :id="`config-link-${link.id}`" :key="link.id" class="physical-link-row config-target">
            <input v-model="link.label" type="text" placeholder="Cable label">
            <select :value="endpointKey(link.a)" @change="link.a = endpointRef(($event.target as HTMLSelectElement).value)!"><option v-for="endpoint in filteredEndpointOptions" :key="endpoint.key" :value="endpoint.key">{{ endpoint.label }}</option></select>
            <span>→</span>
            <select :value="endpointKey(link.b)" @change="link.b = endpointRef(($event.target as HTMLSelectElement).value)!"><option v-for="endpoint in filteredEndpointOptions" :key="endpoint.key" :value="endpoint.key">{{ endpoint.label }}</option></select>
            <select v-model="link.media"><option v-for="media in mediaTypes" :key="media" :value="media">{{ media }}</option></select>
            <input v-model.number="link.lengthMeters" type="number" min="0" placeholder="m" aria-label="Length meters">
            <select v-model="link.status"><option value="planned">planned</option><option value="installed">installed</option><option value="verified">verified</option><option value="faulted">faulted</option></select>
            <button class="row-remove-button" type="button" @click="removeLink(link.id)">×</button>
          </article>
        </div>
      </details>

      <details class="glass-card physical-editor-card" open>
        <summary>Serial bus wiring <em>{{ project.physical.mstpSegments.length + project.physical.arcnetSegments.length }}</em></summary>
        <div class="physical-card-body">
          <article v-for="subnet in serialSubnets" :key="subnet.id" class="physical-equipment-block">
            <div class="physical-port-toolbar"><strong>{{ subnet.name }} · {{ subnet.networkType === 'arcnet' ? 'ARC156' : 'MS/TP' }}</strong><button type="button" @click="addSerialSegment(subnet)">+ Segment</button></div>
            <article v-for="segment in segmentsFor(subnet)" :id="`config-segment-${segment.id}`" :key="segment.id" class="serial-editor config-target">
              <div class="physical-row"><input v-model="segment.name" type="text"><select v-model="segment.cable"><option value="stp-18awg">18 AWG STP</option><option value="stp-22awg">22 AWG STP</option><option value="stp-24awg">24 AWG STP</option><option value="other">Other</option></select><input v-model.number="segment.lengthMeters" type="number" min="0" placeholder="Length m"><button type="button" @click="autoChain(subnet, segment)">Auto-chain</button><button class="row-remove-button" type="button" @click="removeSegment(subnet, segment.id)">×</button></div>
              <div class="serial-budget">{{ segment.members.reduce((sum, member) => sum + (member.unitLoad ?? 1), 0) }} nodes · {{ segment.lengthMeters ?? 0 }} m</div>
              <div v-for="(member, index) in segment.members" :key="memberKey(member)" class="serial-member-row"><button type="button" :disabled="index === 0" @click="moveMember(segment, index, -1)">↑</button><button type="button" :disabled="index === segment.members.length - 1" @click="moveMember(segment, index, 1)">↓</button><span>{{ memberLabel(member) }}</span><label><input v-model="member.terminated" type="checkbox"> Terminated</label><label v-if="subnet.networkType === 'mstp'"><input v-model="member.biasSource" type="checkbox"> Bias</label></div>
            </article>
          </article>
        </div>
      </details>
    </template>
    <PortGeneratorDialog ref="portGeneratorDialog" @generate="replaceGeneratedPorts" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AceToggle from '../AceToggle.vue';
import AceField from '../AceField.vue';
import AceTextInput from '../AceTextInput.vue';
import PortGeneratorDialog, { type PortGenerationResult } from './dialogs/PortGeneratorDialog.vue';
import type { DiagramDevice, DiagramInfrastructure, DiagramProject, DiagramSubnet } from '../../lib/network-diagram';
import { pruneDanglingReferences } from '../../lib/network-diagram-prune';
import { createArcnetSegment, createLink, createLocation, createMstpSegment, createPatchPanel, createPortRange, endpointKey, resolveEndpoint, type ArcnetSegment, type LocationKind, type MstpSegment, type MstpSegmentMember, type PatchPanel, type PhysicalEndpointRef, type PhysicalMedia, type PoeClass } from '../../lib/physical';

const props = defineProps<{ project: DiagramProject }>();
const project = computed(() => props.project);
const locationKinds: LocationKind[] = ['campus', 'building', 'floor', 'room', 'closet', 'rack', 'panel'];
const mediaTypes: PhysicalMedia[] = ['copper-utp', 'copper-stp', 'fiber-mm', 'fiber-sm', 'rs485', 'coax', 'wireless', 'other'];
const poeClasses: PoeClass[] = ['none', 'af', 'at', 'bt-type3', 'bt-type4'];
const draggingLocationId = ref('');
const endpointSearch = ref('');
const portGeneratorDialog = ref<InstanceType<typeof PortGeneratorDialog> | null>(null);
const devices = computed(() => props.project.subnets.flatMap(subnet => subnet.devices.map(device => ({ subnet, device }))));
const serialSubnets = computed(() => props.project.subnets.filter(subnet => subnet.networkType === 'mstp' || subnet.networkType === 'arcnet'));
const endpointOptions = computed(() => [
  ...devices.value.flatMap(({ device }) => device.nics.map(nic => ({ key: endpointKey({ kind: 'device-nic', deviceId: device.id, nicId: nic.id }), label: `${device.name} · ${nic.name}`, ref: { kind: 'device-nic', deviceId: device.id, nicId: nic.id } as PhysicalEndpointRef }))),
  ...props.project.infrastructure.flatMap(item => (item.ports ?? []).map(port => ({ key: endpointKey({ kind: 'infrastructure-port', infrastructureId: item.id, portId: port.id }), label: `${item.name} · ${port.name}`, ref: { kind: 'infrastructure-port', infrastructureId: item.id, portId: port.id } as PhysicalEndpointRef }))),
  ...props.project.physical.patchPanels.flatMap(panel => panel.ports.map(port => ({ key: endpointKey({ kind: 'patch-panel-port', panelId: panel.id, portId: port.id }), label: `${panel.name} · ${port.name}`, ref: { kind: 'patch-panel-port', panelId: panel.id, portId: port.id } as PhysicalEndpointRef })))
]);
const filteredEndpointOptions = computed(() => {
  const query = endpointSearch.value.trim().toLocaleLowerCase();
  return query ? endpointOptions.value.filter(item => item.label.toLocaleLowerCase().includes(query)) : endpointOptions.value;
});
function csv(value: string) { return value.split(',').map(item => item.trim()).filter(Boolean); }
function endpointRef(key: string) { return endpointOptions.value.find(item => item.key === key)?.ref; }
function addLocation() { props.project.physical.locations.push(createLocation()); }
function removeLocation(id: string) { props.project.physical.locations = props.project.physical.locations.filter(item => item.id !== id); pruneDanglingReferences(props.project); }
function reparentLocation(parentId: string) {
  const location = props.project.physical.locations.find(item => item.id === draggingLocationId.value);
  if (!location || location.id === parentId) return;
  const descendants = new Set<string>([location.id]); let changed = true;
  while (changed) { changed = false; for (const candidate of props.project.physical.locations) if (candidate.parentId && descendants.has(candidate.parentId) && !descendants.has(candidate.id)) { descendants.add(candidate.id); changed = true; } }
  if (!descendants.has(parentId)) location.parentId = parentId;
  draggingLocationId.value = '';
}
function locationPath(id: string) { const parts: string[] = []; const seen = new Set<string>(); let item = props.project.physical.locations.find(candidate => candidate.id === id); while (item && !seen.has(item.id)) { seen.add(item.id); parts.unshift(item.name); item = props.project.physical.locations.find(candidate => candidate.id === item!.parentId); } return parts.join(' / '); }
function connectedPortCount(portIds: string[]) { const ids = new Set(portIds); return props.project.physical.links.filter(link => [link.a, link.b].some(endpoint => endpoint.kind !== 'device-nic' && ids.has(endpoint.portId))).length; }
function openPortGenerator(item: DiagramInfrastructure) { portGeneratorDialog.value?.open({ kind: 'infrastructure', id: item.id, name: item.name, connectedCount: connectedPortCount((item.ports ?? []).map(port => port.id)) }); }
function setAllPortsVlanMode(item: DiagramInfrastructure, mode: string) { if (mode === 'access' || mode === 'trunk' || mode === 'unmanaged') for (const port of item.ports ?? []) port.vlanMode = mode; }
function removePort(item: DiagramInfrastructure, id: string) { item.ports = (item.ports ?? []).filter(port => port.id !== id); pruneDanglingReferences(props.project); }
function addPanel() { props.project.physical.patchPanels.push(createPatchPanel()); }
function removePanel(id: string) { props.project.physical.patchPanels = props.project.physical.patchPanels.filter(item => item.id !== id); pruneDanglingReferences(props.project); }
function openPanelGenerator(panel: PatchPanel) { portGeneratorDialog.value?.open({ kind: 'panel', id: panel.id, name: panel.name, connectedCount: connectedPortCount(panel.ports.map(port => port.id)) }); }
function replaceGeneratedPorts(result: PortGenerationResult) {
  if (result.kind === 'infrastructure') {
    const item = props.project.infrastructure.find(candidate => candidate.id === result.id); if (!item) return;
    item.ports = createPortRange(result.prefix, result.start, result.count, { media: result.media, speedMbps: result.speedMbps, poe: result.poe });
  } else {
    const panel = props.project.physical.patchPanels.find(candidate => candidate.id === result.id); if (!panel) return;
    panel.ports = Array.from({ length: result.count }, (_, index) => createPortRange(`${result.prefix}${result.start + index}-`, 1, 2, { media: result.media, speedMbps: result.speedMbps })).flat();
  }
  pruneDanglingReferences(props.project);
}
function availableEndpoints(deviceId: string, nicId: string) {
  const current = connectedEndpoint(deviceId, nicId);
  const used = new Set(props.project.physical.links.flatMap(link => [endpointKey(link.a), endpointKey(link.b)]));
  const source = resolveEndpoint(props.project, { kind: 'device-nic', deviceId, nicId });
  return filteredEndpointOptions.value.filter(item => {
    if (item.ref.kind === 'device-nic' || (used.has(item.key) && item.key !== current)) return false;
    const destination = resolveEndpoint(props.project, item.ref);
    const infrastructureId = item.ref.kind === 'infrastructure-port' ? item.ref.infrastructureId : '';
    const converter = Boolean(infrastructureId && props.project.infrastructure.find(infrastructure => infrastructure.id === infrastructureId)?.kind === 'media-converter');
    return converter || !source || destination?.media === source.media;
  }).sort((a, b) => Number(used.has(a.key)) - Number(used.has(b.key)) || a.label.localeCompare(b.label));
}
function connectedEndpoint(deviceId: string, nicId: string) { const own = endpointKey({ kind: 'device-nic', deviceId, nicId }); const link = props.project.physical.links.find(item => endpointKey(item.a) === own || endpointKey(item.b) === own); return link ? endpointKey(endpointKey(link.a) === own ? link.b : link.a) : ''; }
function connectNic(deviceId: string, nicId: string, destinationKey: string) { const ownRef: PhysicalEndpointRef = { kind: 'device-nic', deviceId, nicId }; const own = endpointKey(ownRef); const existing = props.project.physical.links.find(item => endpointKey(item.a) === own || endpointKey(item.b) === own); if (!destinationKey) { if (existing) removeLink(existing.id); return; } const destination = endpointRef(destinationKey); if (!destination) return; if (existing) { if (endpointKey(existing.a) === own) existing.b = destination; else existing.a = destination; } else props.project.physical.links.push(createLink(ownRef, destination)); }
function addCable() { if (endpointOptions.value.length >= 2) props.project.physical.links.push(createLink(endpointOptions.value[0].ref, endpointOptions.value[1].ref)); }
function removeLink(id: string) { props.project.physical.links = props.project.physical.links.filter(item => item.id !== id); }
function segmentsFor(subnet: DiagramSubnet) { return subnet.networkType === 'arcnet' ? props.project.physical.arcnetSegments.filter(item => item.subnetId === subnet.id) : props.project.physical.mstpSegments.filter(item => item.subnetId === subnet.id); }
function addSerialSegment(subnet: DiagramSubnet) { if (subnet.networkType === 'arcnet') props.project.physical.arcnetSegments.push(createArcnetSegment(subnet.id)); else props.project.physical.mstpSegments.push(createMstpSegment(subnet.id)); }
function removeSegment(subnet: DiagramSubnet, id: string) { if (subnet.networkType === 'arcnet') props.project.physical.arcnetSegments = props.project.physical.arcnetSegments.filter(item => item.id !== id); else props.project.physical.mstpSegments = props.project.physical.mstpSegments.filter(item => item.id !== id); }
function autoChain(subnet: DiagramSubnet, segment: MstpSegment | ArcnetSegment) { const router = props.project.subnets.flatMap(item => item.devices).find(item => item.id === subnet.routerId); const members: MstpSegmentMember[] = [...(router ? [{ ref: { kind: 'device' as const, deviceId: router.id }, terminated: true, biasSource: true }] : []), ...subnet.devices.filter(item => item.id !== router?.id).map((device, index, list) => ({ ref: { kind: 'device' as const, deviceId: device.id }, terminated: !router && index === 0 || index === list.length - 1, biasSource: !router && index === 0 }))]; segment.members = members; }
function moveMember(segment: MstpSegment | ArcnetSegment, index: number, delta: number) { const target = index + delta; if (target < 0 || target >= segment.members.length) return; [segment.members[index], segment.members[target]] = [segment.members[target], segment.members[index]]; }
function memberKey(member: MstpSegmentMember) { return member.ref.kind === 'device' ? `d-${member.ref.deviceId}` : `i-${member.ref.infrastructureId}`; }
function memberLabel(member: MstpSegmentMember) {
  if (member.ref.kind === 'device') {
    const id = member.ref.deviceId;
    return devices.value.find(item => item.device.id === id)?.device.name ?? 'Missing device';
  }
  const id = member.ref.infrastructureId;
  return props.project.infrastructure.find(item => item.id === id)?.name ?? 'Missing infrastructure';
}
</script>
