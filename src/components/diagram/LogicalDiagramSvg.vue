<template>
<svg ref="svg" class="network-diagram-svg" :viewBox="`0 0 ${m.canvasWidth} ${m.canvasHeight}`" :width="m.canvasWidth" :height="m.canvasHeight" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="m.project.title">
            <defs>
              <marker id="path-arrow-success" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#14ae5c" /></marker>
              <marker id="path-arrow-failure" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#df1219" /></marker>
              <marker id="bdt-arrow" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#a78bfa" /></marker>
              <marker id="fdr-arrow" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#fb923c" /></marker>
              <symbol id="ace-icon-network" viewBox="0 0 24 24"><path d="M17 3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4v2h1a1 1 0 0 1 1 1h7v2h-7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1H2v-2h7a1 1 0 0 1 1-1h1v-2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10Z" /></symbol>
              <symbol id="ace-icon-subnet" viewBox="0 0 24 24"><path d="M23.25 12.75v-1.5h-10.5V9h2.625A1.125 1.125 0 0 0 16.5 7.875v-6A1.125 1.125 0 0 0 15.375.75h-6.75A1.125 1.125 0 0 0 7.5 1.875v6A1.125 1.125 0 0 0 8.625 9h2.625v2.25H.75v1.5H4.5V15H1.94a1.125 1.125 0 0 0-1.125 1.125v6A1.125 1.125 0 0 0 1.94 23.25h6.685A1.125 1.125 0 0 0 9.75 22.125v-6A1.125 1.125 0 0 0 8.625 15H6v-2.25h12V15h-2.625a1.125 1.125 0 0 0-1.125 1.125v6a1.125 1.125 0 0 0 1.125 1.125h6.75a1.125 1.125 0 0 0 1.125-1.125v-6A1.125 1.125 0 0 0 22.125 15H19.5v-2.25h3.75ZM9 2.25h6V7.5H9Zm-.75 19.5H2.315V16.5H8.25Zm13.5 0h-6V16.5h6Z" /></symbol>
              <symbol id="ace-icon-device" viewBox="0 0 24 24"><path d="M13 18h1a1 1 0 0 1 1 1h7v2h-7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1H2v-2h7a1 1 0 0 1 1-1h1v-2H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3v2Zm0-12h1V4h-1v2ZM9 4v2h2V4H9Zm0 4v2h2V8H9Zm0 4v2h2v-2H9Z" /></symbol>
              <symbol id="ace-icon-router" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm1-7v3h2l-3 3-3-3h2v-3H5v2l-3-3 3-3v2h6V8H9l3-3 3 3h-2v3h6V9l3 3-3 3v-2h-6Z" /></symbol>
            </defs>
            <rect class="export-bg" width="100%" height="100%" rx="14" />
            <text class="export-title" x="40" y="42">{{ m.clipped(m.project.title || 'Untitled network diagram', 70) }}</text>
            <text v-if="m.project.notes" class="export-notes" x="40" y="67">{{ m.clipped(m.project.notes, 130) }}</text>
            <text class="layer-label" x="24" y="102">INFRASTRUCTURE</text>
            <text class="layer-label" x="24" :y="m.subnetY - 10">ROUTED BACNET DATALINKS</text>
            <text v-if="m.ipHostNodes.length" class="layer-label" x="24" :y="m.ipHostY - 10">IP DEVICES &amp; ROUTERS</text>
            <text v-if="m.fieldSegments.length" class="layer-label" x="24" :y="m.fieldBusY - 10">ROUTED FIELD BUSES</text>
            <text v-if="m.fieldHostNodes.length" class="layer-label" x="24" :y="m.fieldHostY - 10">FIELD DEVICES</text>

            <g v-if="m.showPhysicalOverlay" class="logical-physical-overlay">
              <polyline v-for="link in m.physicalOverlayLinks" :key="link.id" class="physical-overlay-link" :points="link.points"><title>{{ link.label }}</title></polyline>
            </g>

            <g v-for="(item, index) in m.project.infrastructure" :key="`preview-${item.id}`">
              <g v-for="subnetId in m.validConnections(item)" :key="`${item.id}-${subnetId}`">
                <title>{{ m.infrastructureConnectionLabel(item, subnetId) }}</title>
                <path :class="['connection', m.connectionKindClass(item)]" :d="m.connectionPath(index, item.id, subnetId)" />
                <circle :class="['connection-dot', `${m.connectionKindClass(item)}-dot`]" :cx="m.connectionTargetX(item.id, subnetId)" :cy="m.connectionTargetY(subnetId)" r="4" />
              </g>
              <g :class="['diagram-node-action', { 'diagnostic-target-highlight': m.diagnosticTargetKeys.includes(`infrastructure-${item.id}`) }]" role="button" tabindex="0" :aria-label="`Edit infrastructure ${item.name || 'Unnamed infrastructure'}`" :transform="`translate(${m.infrastructureX(index) - 75}, ${m.infrastructureY(index)})`" @click="m.focusConfig('infrastructure', item.id)" @keydown.enter.prevent="m.focusConfig('infrastructure', item.id)" @keydown.space.prevent="m.focusConfig('infrastructure', item.id)">
                <title>{{ item.name }}{{ item.ip ? ` — ${item.ip}` : '' }}</title>
                <rect class="infra-box" width="150" height="72" rx="10" />
              <text class="infra-type" x="12" y="18">{{ item.kind.toUpperCase() }}</text>
                <use :href="item.kind === 'router' || item.kind === 'gateway' ? '#ace-icon-router' : '#ace-icon-network'" class="ace-node-icon infra-node-icon" x="116" y="12" width="22" height="22" />
                <text class="infra-name" x="12" y="39">{{ m.clipped(item.name || 'Unnamed', 20) }}</text>
                <text v-if="item.ip" class="infra-ip" x="12" y="58">{{ item.ip }}</text>
              </g>
            </g>

            <g v-for="segment in m.fieldSegments" :key="`route-${segment.id}`">
              <path v-if="segment.upstreamSubnetId" class="connection field-bus-route" :d="m.fieldBusRoutePath(segment)" />
              <text v-if="segment.routerId" class="address-link-label" :x="m.networkCenter(segment.id)" :y="m.networkY(segment) - 18" text-anchor="middle">via {{ m.clipped(m.routerName(segment.routerId), 28) }}</text>
            </g>

            <g v-for="link in m.addressLinks" :key="link.id">
              <title>{{ link.label }}</title>
              <path class="address-link" :d="link.path" :stroke="link.color" />
              <circle class="address-endpoint" :cx="link.startX" :cy="link.startY" r="3.5" :fill="link.color" />
              <circle class="address-endpoint" :cx="link.endX" :cy="link.endY" r="3.5" :fill="link.color" />
            </g>
            <g v-for="link in m.scLinks" :key="link.id">
              <title>{{ link.label }}</title>
              <path class="sc-service-link" :d="link.path" />
              <circle class="sc-service-endpoint" :cx="link.startX" :cy="link.startY" r="3.5" />
              <circle class="sc-service-endpoint" :cx="link.endX" :cy="link.endY" r="3.5" />
            </g>
            <g v-for="link in m.displayedBdtLinks" :key="link.id">
              <title>{{ link.label }}</title>
              <path class="bdt-link" :d="link.path" :marker-end="link.mutual ? undefined : 'url(#bdt-arrow)'" />
              <circle class="bdt-endpoint" :cx="link.startX" :cy="link.startY" r="4" />
              <circle class="bdt-endpoint" :cx="link.endX" :cy="link.endY" r="4" />
              <text class="relationship-link-label bdt" :x="link.labelX" :y="link.labelY" text-anchor="middle">{{ link.mutual ? 'MUTUAL BDT' : 'BDT ENTRY' }}</text>
            </g>
            <g v-for="link in m.displayedFdrLinks" :key="link.id">
              <title>{{ link.label }}</title>
              <path class="fdr-link" :d="link.path" marker-end="url(#fdr-arrow)" />
              <circle class="fdr-endpoint" :cx="link.startX" :cy="link.startY" r="4" />
              <text class="relationship-link-label fdr" :x="link.labelX" :y="link.labelY" text-anchor="middle">FDR</text>
            </g>

            <g v-for="(subnet, subnetIndex) in m.project.subnets" :key="`preview-${subnet.id}`" :class="['diagram-node-action', { 'diagnostic-target-highlight': m.diagnosticTargetKeys.includes(`subnet-${subnet.id}`) }]" role="button" tabindex="0" :aria-label="`Edit network ${subnet.name || `Subnet ${subnetIndex + 1}`}`" :transform="`translate(${m.networkX(subnet)}, ${m.networkY(subnet)})`" @click="m.focusConfig('subnet', subnet.id)" @keydown.enter.prevent="m.focusConfig('subnet', subnet.id)" @keydown.space.prevent="m.focusConfig('subnet', subnet.id)">
              <title>{{ subnet.name }} — {{ m.subnetCidr(subnet) }}{{ subnet.vlan ? ` — VLAN ${subnet.vlan}` : '' }}</title>
              <rect class="subnet-box" :width="m.subnetWidth" :height="m.subnetHeight" rx="14" :stroke="subnet.color" />
              <path class="subnet-accent" :d="m.roundedTopAccentPath(m.subnetWidth)" :style="{ '--subnet-accent-color': subnet.color }" />
              <use :href="(!subnet.networkType || subnet.networkType === 'bacnet-ip') ? '#ace-icon-subnet' : '#ace-icon-network'" class="ace-node-icon" x="15" y="17" width="22" height="22" :style="{ color: subnet.color }" />
              <text class="node-category" x="44" y="25">{{ m.networkDiagramLabel(subnet) }}</text>
              <text class="subnet-name" x="16" y="52">{{ m.clipped(subnet.name || `Subnet ${subnetIndex + 1}`, 27) }}</text>
              <text class="subnet-address" x="16" y="72">{{ m.subnetCidr(subnet) }}</text>
              <text v-if="subnet.vlan" class="subnet-meta" :x="m.subnetWidth - 16" y="25" text-anchor="end">VLAN {{ m.clipped(subnet.vlan, 8) }}</text>
              <text class="subnet-meta subnet-footer-meta" x="16" y="92">{{ m.subnetMetaLabel(subnet) }}</text>
            </g>

            <g v-for="(host, hostIndex) in m.hostNodes" :key="`host-${host.device.id}`" :class="['diagram-node-action', m.hostRelationshipClass(host.device), { 'diagnostic-target-highlight': m.diagnosticTargetKeys.includes(`device-${host.device.id}`) || host.device.nics.some(nic => m.diagnosticTargetKeys.includes(`nic-${nic.id}`)) }]" role="button" tabindex="0" :aria-label="`Edit device ${host.device.name || 'Unnamed device'}`" :transform="`translate(${m.hostX(host, hostIndex)}, ${m.hostYFor(host)})`" @click="m.activateHostNode(host.device)" @keydown.enter.prevent="m.activateHostNode(host.device)" @keydown.space.prevent="m.activateHostNode(host.device)">
              <title>{{ m.deviceTooltip(host.device) }}</title>
              <rect class="host-box" :width="m.hostWidth" :height="m.hostHeight" rx="12" />
              <text class="node-category" x="16" y="21">{{ m.deviceServiceLabel(host.device) }}</text>
              <circle class="device-icon" cx="25" cy="45" r="15" />
              <use :href="host.device.requiredForRouting ? '#ace-icon-router' : host.device.bbmdEnabled ? '#ace-icon-network' : '#ace-icon-device'" class="ace-node-icon host-node-icon" x="15" y="35" width="20" height="20" />
              <text class="device-name" x="47" y="42">{{ m.clipped(host.device.name || 'Unnamed device', 25) }}</text>
              <text class="device-kind" x="47" y="58">{{ host.device.kind }}</text>
              <g v-for="(row, addressIndex) in m.hostAddressRows(host.device)" :key="row.id">
                <circle :cx="18" :cy="77 + addressIndex * 30" r="3" :fill="row.color" />
                <text class="host-address-label" x="28" :y="80 + addressIndex * 30">{{ m.clipped(row.label, 38) }}</text>
                <text class="host-address-summary" x="28" :y="93 + addressIndex * 30">{{ row.address || 'Address not set' }}</text>
              </g>
              <rect class="host-count-badge" :x="m.hostWidth - 61" y="10" width="47" height="18" rx="9" />
              <text class="host-count-text" :x="m.hostWidth - 37.5" y="22" text-anchor="middle">{{ host.device.nics.length }} NIC / {{ m.addressCount(host.device) }} addr</text>
              <text v-if="m.hostRelationshipBadge(host.device)" class="host-relationship-badge" :x="m.hostWidth - 14" y="43" text-anchor="end">{{ m.hostRelationshipBadge(host.device) }}</text>
            </g>
            <g v-for="segment in m.pathSegments" :key="segment.id" class="test-path-group">
              <title>{{ segment.label }}</title>
              <path :class="['test-path', segment.outcome]" :d="segment.path" :marker-end="`url(#path-arrow-${segment.outcome})`" />
            </g>
            <g v-if="m.pathLegends.length">
              <text class="layer-label" x="40" :y="m.legendStart - 14">CONNECTIVITY TESTS</text>
              <g v-for="legend in m.pathLegends" :key="`legend-${legend.id}`" class="diagram-node-action" role="button" tabindex="0" :aria-label="`Edit connectivity test ${legend.name}`" :transform="`translate(${legend.x}, ${legend.y})`" @click="m.focusConfig('path', legend.id)" @keydown.enter.prevent="m.focusConfig('path', legend.id)" @keydown.space.prevent="m.focusConfig('path', legend.id)">
                <rect :class="['path-legend-bg', legend.outcome]" :width="m.legendCardWidth" :height="m.legendCardHeight(legend)" rx="9" />
                <circle :class="['path-legend-dot', legend.outcome]" cx="16" cy="17" r="4" />
                <text class="path-legend-title" x="28" y="21">{{ m.clipped(`${legend.name} · ${legend.protocol}`, m.legendTextLimit - 10) }}</text>
                <rect :class="['path-result-badge', legend.outcome]" :x="m.legendCardWidth - 64" y="8" width="50" height="19" rx="9.5" />
                <text :class="['path-result-text', legend.outcome]" :x="m.legendCardWidth - 39" y="21" text-anchor="middle">{{ legend.outcome === 'success' ? 'PASS' : 'FAIL' }}</text>
                <g v-for="(row, rowIndex) in legend.rows" :key="`${legend.id}-${row.label}`">
                  <text class="path-route-label" x="16" :y="43 + rowIndex * 19">{{ row.label }}</text>
                  <text class="path-route-text" x="76" :y="43 + rowIndex * 19">{{ m.clipped(row.value, m.legendTextLimit - 3) }}</text>
                </g>
              </g>
            </g>
            <text class="footer-label export-footer" x="40" :y="m.canvasHeight - 22">BACnet Studio by ACE IoT · https://ace-iot-solutions.github.io/bacnet-planning-studio/</text>
          </svg>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ConfigTargetKind, DiagramDevice, DiagramInfrastructure, DiagramProject, DiagramSubnet } from '../../lib/network-diagram';

interface HostNode { device: DiagramDevice; ownerSubnet: DiagramSubnet }
interface BasicLink { id: string; label: string; path: string; startX: number; startY: number; endX: number; endY: number }
interface RelationshipLink extends BasicLink { labelX: number; labelY: number; mutual?: boolean }
interface PathLegend { id: string; outcome: string; name: string; protocol: string; rows: { label: string; value: string }[]; x: number; y: number }

export interface LogicalDiagramModel {
  project: DiagramProject;
  canvasWidth: number;
  canvasHeight: number;
  subnetY: number;
  ipHostNodes: HostNode[];
  ipHostY: number;
  fieldSegments: DiagramSubnet[];
  fieldBusY: number;
  fieldHostNodes: HostNode[];
  fieldHostY: number;
  showPhysicalOverlay: boolean;
  physicalOverlayLinks: { id: string; label: string; points: string }[];
  diagnosticTargetKeys: string[];
  addressLinks: (BasicLink & { color: string })[];
  scLinks: BasicLink[];
  displayedBdtLinks: RelationshipLink[];
  displayedFdrLinks: RelationshipLink[];
  hostNodes: HostNode[];
  hostHeight: number;
  pathSegments: { id: string; label: string; path: string; outcome: string }[];
  pathLegends: PathLegend[];
  legendStart: number;
  legendCardWidth: number;
  legendTextLimit: number;
  subnetWidth: number;
  subnetHeight: number;
  hostWidth: number;
  clipped: (value: string, length: number) => string;
  validConnections: (item: DiagramInfrastructure) => string[];
  infrastructureConnectionLabel: (item: DiagramInfrastructure, subnetId: string) => string;
  connectionPath: (index: number, itemId: string, subnetId: string) => string;
  connectionKindClass: (item: DiagramInfrastructure) => string;
  connectionTargetX: (itemId: string, subnetId: string) => number;
  connectionTargetY: (subnetId: string) => number;
  infrastructureX: (index: number) => number;
  infrastructureY: (index: number) => number;
  focusConfig: (kind: ConfigTargetKind, id: string) => void;
  fieldBusRoutePath: (segment: DiagramSubnet) => string;
  networkCenter: (id: string) => number;
  networkY: (subnet: DiagramSubnet) => number;
  routerName: (id: string) => string;
  networkX: (subnet: DiagramSubnet) => number;
  roundedTopAccentPath: (width: number) => string;
  networkDiagramLabel: (subnet: DiagramSubnet) => string;
  subnetCidr: (subnet: DiagramSubnet) => string;
  subnetMetaLabel: (subnet: DiagramSubnet) => string;
  hostRelationshipClass: (device: DiagramDevice) => string;
  hostX: (host: HostNode, fallbackIndex?: number) => number;
  hostYFor: (host: HostNode) => number;
  activateHostNode: (device: DiagramDevice) => void;
  deviceTooltip: (device: DiagramDevice) => string;
  deviceServiceLabel: (device: DiagramDevice) => string;
  hostAddressRows: (device: DiagramDevice) => { id: string; color: string; label: string; address: string }[];
  addressCount: (device: DiagramDevice) => number;
  hostRelationshipBadge: (device: DiagramDevice) => string;
  legendCardHeight: (legend: { rows: unknown[] }) => number;
}

const props = defineProps<{ model: LogicalDiagramModel }>();
const m = computed(() => props.model);
const svg = ref<SVGSVGElement | null>(null);
defineExpose({ svg });
</script>
