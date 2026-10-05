# Physical Layer Modeling Workplan

Status: **IMPLEMENTED** for release 1.2.0. ARCNET scope is explicitly the Automated Logic/Carrier ARC156 physical layer; implementation details that differ from the original proposal are reflected below.

Goal: extend BACnet Studio so a project can model the physical layer (locations, switches and their ports, cabling, patch panels, media converters, MS/TP bus wiring, and Automated Logic/Carrier ARC156 wiring) alongside the existing logical model (IP subnets, VLANs, BACnet datalinks, BBMD/FDR, BACnet/SC), with diagnostics that connect the two layers, while every project saved by the current app (diagram `version: 1`, planner `version: 1`, and the pre-NIC "legacy" diagram shape) continues to import unchanged.

Target release: `1.2.0` (minor; additive, backward-compatible file format).

---

## 1. Evaluation of the current codebase

### 1.1 What exists today

| Layer | Modeled? | Where |
|---|---|---|
| IP subnets, CIDR, VLAN id, UDP port, BACnet network number | Yes | `DiagramSubnet` (`src/lib/network-diagram.ts:52`), `PlannerSubnet` (`src/lib/planner.ts:3`) |
| Devices → NICs → addresses | Yes | `DiagramDevice` / `DiagramNic` / `DiagramDeviceAddress` (`network-diagram.ts:10-50`) |
| BBMD, BDT, FDR, BACnet/SC hubs and federation | Yes | device/NIC fields plus `DiagramInfrastructure` kinds `sc-hub`, `sc-hub-cluster` |
| MS/TP and ARCNET as datalinks (baud, max master, MAC range, upstream router) | Yes, logical only | `DiagramSubnet.networkType`, `mstpBaudRate`, `mstpMaxMaster`, `routerId` |
| IT infrastructure (router, switch, firewall, gateway) | Yes, as a box attached to subnets | `DiagramInfrastructure` (`network-diagram.ts:71`): one `ip`, `subnetIds[]`, no ports |
| Switch ports, port VLAN mode, PoE | No | The primer explains access vs. trunk ports (`PrimerPage.vue:735-738`) but nothing is modeled |
| Cabling, media, lengths, patch panels | No | — |
| Physical locations (building / floor / closet / rack / panel) | No | — |
| MS/TP and ALC ARC156 bus wiring (segment order, termination, bias where applicable, repeaters, segment length) | No | Only `EIA-485` is mentioned, in the glossary (`src/lib/glossary.ts:199`) |

### 1.2 Structural facts that shape this plan

1. **No schema migration path.** Both file formats hard-code `version: 1` (`network-diagram.ts:98,691`; `planner.ts:53,64`). Legacy shapes (device-level `ip`, infrastructure `bbmd` kind, standalone `bacnet-sc` subnets) are migrated *implicitly* inside `normalizeDiagramProject` (`network-diagram.ts:579-686`) and `migrateLegacyScNetworks` (`PlannerPage.vue:476`). There are no frozen fixtures of real old files; the only compatibility test builds a legacy object by hand (`network-diagram.test.ts:94`).
2. **Two id namespaces already collide.** `DiagramTestPath.hops` mixes infrastructure ids and address ids; every consumer (`endpointOptions`, `endpointPoint`, `resolveAddressEndpoint`, `endpointName` in `NetworkDiagramPage.vue`) resolves by trial. Physical links must not extend that pattern.
3. **Reference cleanup on delete is manual and scattered** across `removeSubnet`, `removeDevice`, `removeDeviceNic`, `removeNicAddress`, `removeInfrastructure`, `setDeviceBbmd` (`NetworkDiagramPage.vue:995-1041, 1142`). `peerInfrastructureIds` and `scHubId` are already not cleaned. Adding a link entity that references NIC and port ids would multiply this.
4. **Layout is a fixed vertical stack of layers** (infrastructure → routed datalinks → IP hosts → field buses → field hosts) computed by a chain of `computed`s (`NetworkDiagramPage.vue:744-779`). Nothing has saved coordinates. A physical view needs a different grouping (by location) rather than another layer.
5. **File size.** `NetworkDiagramPage.vue` is 1616 lines and `network-diagram.ts` is 753 lines; the workspace guideline is 500 lines per file. Physical modeling must land in new modules and extracted components, not in these files.
6. **Diagnostics are classified by regex on message text** (`src/lib/diagram-diagnostics.ts:14-22`) and carry no entity reference, so they cannot be clicked through to a card or highlighted on the SVG.
7. **Infrastructure has no ports or NICs**, only `ip` and `subnetIds`. Switches are drawn as 150×72 boxes with attachment curves keyed on `kind` (`connectionKindClass`).
8. **Devices are owned by a subnet** (`subnet.devices[]`). Physical links between a device NIC and a switch port must look up devices across subnets; the `project.subnets.flatMap(s => s.devices)` idiom is repeated throughout.
9. **Planner has no entity model beyond subnets.** `PlannerSubnet` is a flat record; `exportPlannerXlsx(subnets, splitHorizon)` and `createDiagramProjectFromPlan(plan, splitHorizon)` take only that.
10. **SVG styling lives in three places** (global `<style>` in the page, `SVG_*_STYLES` export constants, `PDF_LIGHT_STYLES`). Any new SVG class must be added to all three or exports render unstyled.
11. **Storage keys** are literals: `aceiot-network-diagram-v1` (duplicated in `PlannerPage.vue:920`), `bacnet_planner_subnets`, `bacnet_planner_split_horizon`, plus layout/relationship/advanced-port keys. Key names should not change; migration happens on read.
12. **Imports** (Nmap, ACE BBMD state) produce logical data only and replace or merge the project. Neither source carries physical information.

### 1.3 Compatibility contract (non-negotiable)

- Every JSON file that `isDiagramProject` or `isPlannerProject` accepts today must be accepted after this work, produce the same logical topology, and emit no *new* diagnostics unless the user opts into physical modeling.
- Every localStorage payload written by 1.1.0 must load on first launch of 1.2.0 without user action.
- Saving and reloading a migrated project must be idempotent (`migrate(save(migrate(x))) ≡ migrate(x)`).
- Physical data is optional everywhere. A project with no physical entities behaves exactly like 1.1.0.

---

## 2. Design decisions

### 2.1 Schema versioning: bump to `version: 2` with an explicit migration registry

Recommendation: introduce `DIAGRAM_SCHEMA_VERSION = 2` and `PLANNER_SCHEMA_VERSION = 2`, and a `migrateDiagramProject(raw: unknown): DiagramProject` pipeline that applies ordered steps (`1 → 2`), then runs the existing normalization. `isDiagramProject` accepts any version from 1 to current and validates against that version's shape.

Why not stay on `version: 1` and just add optional fields: that keeps *forward* compatibility (new files open in the old deployed app) but leaves the codebase with no migration mechanism, and it hides the fact that the file's meaning grew. The app is a static site where everyone gets the latest build, so forward compatibility is low value. Mitigation for the rare case: an "Export legacy (v1) JSON" action that strips the physical block and writes `version: 1`.

The `version: 1 → 2` step itself is trivial (`physical ??= createEmptyPhysicalLayer()`). Its value is that later steps have somewhere to live.

### 2.2 Where physical data lives

- **New namespaced block on the project:** `DiagramProject.physical: DiagramPhysicalLayer` holding `locations[]`, `patchPanels[]`, `links[]`, `mstpSegments[]`, `arcnetSegments[]`, and `enabled: boolean` (opt-in flag that gates physical diagnostics and the "not cabled" class of warnings).
- **Extend existing entities with optional fields** instead of creating parallel collections where the entity already exists:
  - `DiagramInfrastructure` gains `ports?: PhysicalPort[]`, `locationId?`, `model?`, `poeBudgetWatts?`. New `InfrastructureKind` values: `patch-panel` is *not* an infrastructure kind (it has no IP and belongs to `physical.patchPanels`), but `media-converter`, `mstp-repeater`, and `wireless-ap` are added because they behave like attachable boxes.
  - `DiagramDevice` gains `locationId?`, `poeClass?`.
  - `DiagramNic` gains `physical?: { media, speedMbps, poePowered }` (a NIC *is* the device's physical port; no separate port entity for devices).
  - `DiagramSubnet` (mstp/arcnet) gains nothing; MS/TP wiring lives in `physical.mstpSegments[]` and ALC ARC156 wiring in `physical.arcnetSegments[]`, both keyed by `subnetId`.
- **Planner:** `PlannerSubnet` gains an optional `physical?: PlannerPhysicalHints` (closet/IDF name, expected switch count and port count, PoE device count, MS/TP or ARC156 segment count and estimated length, cable type). `PlannerProject` moves to `version: 2` with the same registry approach.

### 2.3 Typed endpoint references for links

Physical links reference endpoints with a discriminated union, never a bare id:

```ts
type PhysicalEndpointRef =
  | { kind: 'device-nic'; deviceId: string; nicId: string }
  | { kind: 'infrastructure-port'; infrastructureId: string; portId: string }
  | { kind: 'patch-panel-port'; panelId: string; portId: string };
```

`DiagramTestPath.hops` is left untouched.

### 2.4 MS/TP and ALC ARC156 buses are ordered chains, not per-link entities

An EIA-485 daisy chain is represented as an ordered member list (device, repeater, or router reference plus termination and, for MS/TP, bias metadata), cable, length, and notes. `MstpSegment` and `ArcnetSegment` are separate collections because ARC156 has ALC-specific defaults and limits: 156.25 kbps, 610 m (2000 ft), and 32 nodes per segment. This makes protocol-specific validation and rendering explicit instead of treating ARCNET as MS/TP.

### 2.5 Physical view is a separate render, not another layer

Add `viewMode: 'physical'` to the project (`'detailed' | 'networks' | 'physical'`). The physical view groups nodes by location (swimlane per closet/room, unassigned lane last), draws switches with port strips, patch panels, and links, and draws MS/TP and ARC156 segments as chains. The logical views gain an optional faint **physical overlay** toggle (links drawn under the logical edges) so users can see both without switching. Layout code moves into `src/lib/diagram-layout.ts` (logical) and `src/lib/physical-layout.ts` (physical), both DOM-free and unit-testable.

### 2.6 Diagnostics get optional targets

`DiagramDiagnostic` gains `targets?: { kind: ConfigTargetKind; id: string }[]` and an optional stable `code?: string`. Existing diagnostics are unaffected (fields optional); new physical diagnostics always set them. `DIAGNOSTIC_CLASSES` gains `physical-cabling`, `mstp-wiring`, `vlan-port`, and `power` classes, matched by `code` first and message regex second.

### 2.7 Reference pruning becomes one function

`pruneDanglingReferences(project)` in `src/lib/network-diagram-prune.ts` removes every reference to ids that no longer exist (BDT peers, FDR targets, `scHubId`, `peerInfrastructureIds`, `subnetIds`, `underlaySubnetIds`, path hops, physical link endpoints, segment members, location parents). It runs at the end of `normalizeDiagramProject` and after every remove action in the UI. The scattered inline cleanup in the page is replaced by calls to it.

---

## 3. Target schema (diagram project, version 2)

```ts
export type PhysicalMedia = 'copper-utp' | 'copper-stp' | 'fiber-mm' | 'fiber-sm' | 'rs485' | 'coax' | 'wireless' | 'other';
export type PoeClass = 'none' | 'af' | 'at' | 'bt-type3' | 'bt-type4';
export type PortVlanMode = 'access' | 'trunk' | 'unmanaged';
export type LocationKind = 'campus' | 'building' | 'floor' | 'room' | 'closet' | 'rack' | 'panel';
export type LinkStatus = 'planned' | 'installed' | 'verified' | 'faulted';

export interface PhysicalLocation { id: string; name: string; kind: LocationKind; parentId?: string; notes: string }

export interface PhysicalPort {
  id: string; name: string; media: PhysicalMedia; speedMbps?: number; enabled: boolean;
  vlanMode: PortVlanMode; accessVlan?: string; allowedVlans?: string[]; nativeVlan?: string;
  poe?: PoeClass; notes: string;
}

export interface PatchPanel { id: string; name: string; locationId?: string; ports: PhysicalPort[]; notes: string }

export interface PhysicalLink {
  id: string; label: string; media: PhysicalMedia; lengthMeters?: number; status: LinkStatus;
  a: PhysicalEndpointRef; b: PhysicalEndpointRef; notes: string;
}

export interface MstpSegmentMember {
  ref: { kind: 'device'; deviceId: string } | { kind: 'infrastructure'; infrastructureId: string }; // router, repeater
  terminated: boolean; biasSource: boolean;
}
export interface MstpSegment {
  id: string; subnetId: string; name: string; cable: 'stp-18awg' | 'stp-22awg' | 'stp-24awg' | 'other';
  lengthMeters?: number; members: MstpSegmentMember[]; notes: string;
}

export interface ArcnetSegment {
  id: string; subnetId: string; name: string; cable: 'stp-22awg' | 'stp-24awg' | 'other';
  lengthMeters?: number; members: MstpSegmentMember[]; notes: string;
}

export interface DiagramPhysicalLayer {
  enabled: boolean; locations: PhysicalLocation[]; patchPanels: PatchPanel[]; links: PhysicalLink[];
  mstpSegments: MstpSegment[]; arcnetSegments: ArcnetSegment[];
}

export interface DiagramProject {
  version: 2; title: string; notes: string; subnets: DiagramSubnet[]; infrastructure: DiagramInfrastructure[];
  paths: DiagramTestPath[]; viewMode?: 'detailed' | 'networks' | 'physical'; allowSplitHorizonBdt?: boolean;
  physical: DiagramPhysicalLayer;
}
```

Additive optional fields: `DiagramInfrastructure.{ports, locationId, model, poeBudgetWatts}`, `DiagramDevice.{locationId, poeClass}`, `DiagramNic.physical`. `InfrastructureKind` adds `media-converter`, `mstp-repeater`, `wireless-ap`.

Planner v2: `PlannerSubnet.physical?: { closetName?: string; switchCount?: number; portsPerSwitch?: number; poeDevices?: number; mstpSegments?: number; mstpSegmentLengthMeters?: number; arcnetSegments?: number; arcnetSegmentLengthMeters?: number; cable?: MstpSegment['cable'] }`.

---

## 4. Physical-layer rules (diagnostics)

All rules are gated: they run only when `physical.enabled` is true **or** the project contains at least one physical entity. Limits live in one table (`src/lib/physical-limits.ts`) with a citation comment; confirm each against the source standard before hardcoding.

| Code | Level | Rule |
|---|---|---|
| `PHY-LINK-MEDIA` | error | Link media differs from either endpoint's media, unless one endpoint is a media converter |
| `PHY-LINK-LENGTH` | warning | Copper > 100 m; fiber beyond the reach table for its media/speed (OM3/OM4/OS2 by 1G/10G) |
| `PHY-PORT-DOUBLE` | error | One port or NIC appears in more than one link endpoint |
| `PHY-LINK-DANGLING` | error | Link endpoint references a missing device, NIC, infrastructure, port, or panel |
| `PHY-PORT-VLAN` | error | Access port's VLAN differs from the VLAN of the subnet of the NIC's address on that link |
| `PHY-TRUNK-VLAN` | error | Trunk between two switches does not allow a VLAN that devices on both sides need |
| `PHY-L2-PATH` | warning | Two NICs on the same subnet have no physical L2 path (through links, patch panels, and trunks carrying that VLAN) |
| `PHY-NIC-UNCABLED` | info (new level, hidden by default) | NIC with a BACnet service enabled has no physical link |
| `PHY-POE-BUDGET` | warning | Sum of connected devices' PoE class draw exceeds the switch budget |
| `PHY-POE-CLASS` | error | Device requires a PoE class the port does not supply |
| `MSTP-TERM` | error | Segment does not have exactly two terminations, or a termination is not at an end |
| `MSTP-BIAS` | warning | Segment has zero or more than one bias source |
| `MSTP-NODES` | error | More than 32 unit-load nodes on one segment (repeater required) |
| `MSTP-LENGTH` | warning | Segment length exceeds the limit for its baud rate and cable |
| `MSTP-ORDER` | warning | A router or repeater sits mid-chain on a segment with more than one such device; or a device on the subnet is on no segment |
| `MSTP-SEGMENT-SUBNET` | error | Segment member's device does not have an address on the segment's subnet |
| `ARCNET-TERM` | error | ALC ARC156 segment does not have termination at exactly the two chain ends |
| `ARCNET-NODES` | error | More than 32 nodes/unit loads are assigned to one ARC156 segment |
| `ARCNET-LENGTH` | warning | ARC156 segment exceeds 610 m (2000 ft) |
| `ARCNET-ORDER` | warning | A router or repeater is mid-chain, or an ARCNET device is assigned to no physical segment |
| `ARCNET-SEGMENT-SUBNET` | error | Segment member's device does not have an address on the ARCNET subnet |
| `LOC-CYCLE` | error | Location parent chain forms a cycle |

Note: `info` is a new diagnostic level; `groupDiagramDiagnostics` treats it as lower than `warning` and the panel hides it unless "show hints" is on. Existing consumers only compare `=== 'error'`, so they are unaffected.

---

## 5. Work phases

Each phase ends with `npm run typecheck && npm test && npm run build` green and is a squash-merged PR on its own branch. Phases 1 and 2 have no UI and can be reviewed purely through tests.

### Phase 1 — Schema versioning, fixtures, and pruning (foundation)

Branch: `feature/diagram-schema-v2-foundation`

1. Capture real fixtures **before any code changes**:
   - `src/lib/fixtures/diagram-v1-default.json` (output of `createDefaultProject` saved through `saveJson`)
   - `src/lib/fixtures/diagram-v1-planner-import.json` (planner with IP, MS/TP, ARCNET, SC hub, BMS as FDR, split horizon, sent to diagram)
   - `src/lib/fixtures/diagram-v1-bbmd-state-import.json` (import of `950-alerton-2026-08-13.state`; keep IPs as they are non-secret RFC1918/private ranges, or anonymize)
   - `src/lib/fixtures/diagram-v1-nmap-import.json`
   - `src/lib/fixtures/diagram-legacy-pre-nic.json` (device-level `ip`, `additionalInterfaces`, infrastructure `bbmd`, standalone `bacnet-sc` subnet, host-id path hops)
   - `src/lib/fixtures/planner-v1-full.json`, `planner-v1-wizard.json` (wizard output is un-normalized and lacks `networkType`)
   - A `README.md` in the fixtures folder stating these files are frozen and must never be regenerated.
2. Add `src/lib/schema-migrations.ts`: `migrateDiagramProject(raw)`, `migratePlannerProject(raw)`, ordered step arrays, `DIAGRAM_SCHEMA_VERSION`, `PLANNER_SCHEMA_VERSION`. Step `1→2` adds `physical` and sets `version: 2`.
3. Change `isDiagramProject` / `isPlannerProject` to accept versions `1..current`, delegating shape checks to per-version validators. Keep every existing check verbatim for v1.
4. Add `pruneDanglingReferences(project)` and call it from `normalizeDiagramProject`. Do not yet change the page's remove functions.
5. Add "Export legacy (v1) JSON" helper `toLegacyDiagramProject(project)` (strips `physical`, new infrastructure kinds become `other`-like `gateway` with a note, sets `version: 1`). UI hook comes in Phase 3.
6. Tests:
   - Every fixture: `isDiagramProject` true → migrate → `isDiagramProject` true → diagnostics identical to a snapshot taken on 1.1.0 (store the snapshot alongside the fixture).
   - Idempotence: `migrate(JSON.parse(JSON.stringify(migrate(fixture))))` deep-equals `migrate(fixture)`.
   - Pruning: removing a device leaves no reference anywhere (property-style test over a generated project).
   - Legacy export round trip: `migrate(toLegacy(project))` preserves logical topology.
7. Update `PlannerPage.vue` and `NetworkDiagramPage.vue` load paths to call the migration functions instead of the bare validators (small change; no UI).

Exit criteria: all 1.1.0 files and localStorage payloads load; no user-visible change.

### Phase 2 — Physical model, limits, and diagnostics (library only, TDD)

Branch: `feature/physical-layer-model`

1. `src/lib/physical.ts`: types from §3, factories (`createLocation`, `createPort`, `createPortRange('Gi1/0/', 1, 24, template)`, `createPatchPanel`, `createLink`, `createMstpSegment`, `createArcnetSegment`), endpoint resolvers (`resolveEndpoint(project, ref)`), and `endpointLabel`.
2. `src/lib/physical-limits.ts`: media reach table, PoE class draw and supply table, MS/TP node and length limits by baud, and ALC ARC156's 156.25 kbps / 610 m / 32-node limits, each with a source comment.
3. `src/lib/physical-graph.ts`: build an L2 adjacency graph from links, ports (respecting `vlanMode`, `accessVlan`, `allowedVlans`), patch panels (port pairs pass through), and media converters; `hasL2Path(project, nicA, nicB, vlan)`.
4. `src/lib/physical-diagnostics.ts`: every rule in §4, returning `DiagramDiagnostic` with `code` and `targets`. `getDiagramDiagnostics` concatenates them when gated on.
5. `src/lib/diagram-diagnostics.ts`: add the four classes and `code`-first matching; add `info` level handling.
6. Extend `normalizeDiagramProject` to default the new optional fields, and `pruneDanglingReferences` to cover physical refs.
7. `src/lib/network-diagram.ts` is already over budget; move `createDiagramProjectFromPlan` and the ACE/planner import helpers into `src/lib/diagram-import.ts` in this phase so the file drops under 500 lines before physical code touches it.
8. Tests: one `describe` per rule with positive and negative cases; graph tests for trunk/access VLAN pass-through and patch-panel pass-through; gating test proving a v1 project with `physical.enabled === false` and no entities yields zero physical diagnostics.

Exit criteria: library complete and covered; no UI yet.

### Phase 3 — Diagram page: component extraction and physical editors

Branch: `feature/physical-layer-editor`

Pre-work (mechanical, separate PR if preferred): split `NetworkDiagramPage.vue` into

- `src/components/diagram/DiagramSettingsCard.vue`
- `src/components/diagram/SubnetEditorCard.vue` (with nested `DeviceEditor.vue`, `NicEditor.vue`)
- `src/components/diagram/InfrastructureEditorCard.vue`
- `src/components/diagram/TestPathEditorCard.vue`
- `src/components/diagram/DiagnosticsPanel.vue`
- `src/components/diagram/LogicalDiagramSvg.vue` (+ `src/lib/diagram-layout.ts` for the geometry computeds)
- `src/components/diagram/dialogs/*.vue`
- `src/composables/useDiagramProject.ts` (project ref, autosave, focus model, remove actions calling `pruneDanglingReferences`)

with the page reduced to composition. `ConfigTargetKind` widens to include `location`, `panel`, `link`, `segment`, `port`.

Then add the physical editors as **Step 4 — Physical layer** in the editor aside, collapsed by default and headed by an "Enable physical modeling" toggle bound to `physical.enabled`:

1. **Locations card**: tree editor (add child, rename, kind select, drag to re-parent); breadcrumb labels reused everywhere a location is shown.
2. **Infrastructure card additions**: location select, model text, PoE budget; **Ports table** for `switch`, `router`, `firewall`, `media-converter`, `wireless-ap`: inline editable rows (name, media, speed, VLAN mode, access VLAN or allowed VLANs, PoE, enabled), a "Generate ports" dialog (prefix, start, count, media, speed, PoE), bulk-select to set VLAN mode.
3. **Patch panels card**: name, location, port generation, and a two-column "front / rear" pairing hint.
4. **Device and NIC additions**: device location select and PoE class; on each NIC a **"Connected to"** control that opens an endpoint picker (search across switches/ports/panels, filtered to same or compatible media, unused ports first) and creates or updates a link inline; media/speed fields; link status chip.
5. **Links card**: full list with filters (location, media, status, problems), each row editable (endpoints via picker, media, length, status, label), cable-schedule style. Row click focuses the SVG edge.
6. **Serial bus wiring**: inside each mstp/arcnet subnet card, a `<details>` "Bus wiring" with segment list. MS/TP and ALC ARC156 use separate segment collections and limits. The editor shows an ordered chain (move up/down, or drag), per-member termination and applicable bias toggles, cable, length, and a live budget line. "Auto-chain" seeds members from the subnet's devices plus its router.
7. **Diagnostics panel**: clicking an item with `targets` calls `focusConfig` for the first target and highlights all targets on the SVG for 2 s; "show hints" toggle for `info`.
8. **Getting started dialog**: add a "Model the physical layer" step. Header actions: "Export legacy JSON".

All new `<style>` rules go in `style.css` using existing custom properties; no Tailwind, no scoped-only rules for SVG classes.

Exit criteria: users can fully describe cabling, ports, panels, locations, MS/TP wiring, and ALC ARC156 wiring; diagnostics link to cards; typecheck and tests pass; every new component under 500 lines.

### Phase 4 — Physical view, overlay, and exports

Branch: `feature/physical-layer-view`

1. `src/lib/physical-layout.ts`: DOM-free layout. Swimlane per top-level location (children nested as sub-bands), nodes ordered by kind (switches → panels → devices), port strips drawn along the bottom of switches and panels, link routing as orthogonal polylines with lane assignment to reduce crossings, and MS/TP/ARC156 segments drawn as chains with termination glyphs and applicable bias markers. Returns plain geometry; unit-tested for determinism and overlap-freedom on fixtures.
2. `src/components/diagram/PhysicalDiagramSvg.vue`: renders the layout; nodes are `diagram-node-action` click targets that focus the right card; edges *are* clickable (unlike logical edges) and focus the link or segment card; hover shows endpoint labels.
3. View mode select gains "Physical"; logical views gain an "Overlay physical links" toggle (persisted under a new layout key) that draws links faintly under the logical layer using the logical node positions.
4. Legend entries for media types, port modes, termination and bias glyphs; light-theme rules added to `PDF_LIGHT_STYLES`; new classes added to the export style constants (single source: move all SVG style constants to `src/lib/diagram-svg-styles.ts` and import them into the page `<style>` via a build-time approach or keep one exported constant used by both — decide in the extraction PR).
5. Exports:
   - SVG/PDF: whichever view is active; PDF dialog gains "Include cable schedule pages" and "Include MS/TP and ARC156 segment tables" (new `src/lib/export-physical-pdf.ts` mirroring `export-bbmd-pdf.ts`).
   - New **diagram XLSX** export (`src/lib/export-diagram-xlsx.ts`, lazy-loaded): sheets "Cable Schedule", "Port Map" (per switch), "MS/TP Segments", "ARC156 Segments", and "Locations". Reuse `STYLES`/`makeCell` from `export-xlsx.ts` after extracting them into `src/lib/xlsx-styles.ts`.
6. Tests: layout determinism, no node overlap on fixtures, export sheet row snapshots, PDF page count.

Exit criteria: a physical project renders, overlays, and exports in all three formats.

### Phase 5 — Planner integration and handoff

Branch: `feature/planner-physical-hints`

1. `PlannerSubnet.physical` fields (§3) with UI in the subnet card under a collapsed "Physical planning" section: closet/IDF name, switch count, ports per switch, PoE devices; for MS/TP or ARC156: segment count, segment length estimate, and cable type. Show computed hints: port headroom vs. `plannedDevices`, segments needed from node count, and protocol-specific length budget.
2. `validationAlerts` adds planner-level physical checks (port budget below planned devices, MS/TP length over limit, ARC156 length over 610 m, and ARC156 node count over 32 per segment).
3. `createDiagramProjectFromPlan` (now in `diagram-import.ts`) emits: one `PhysicalLocation` per distinct closet name, one `switch` infrastructure per planned switch with generated ports (access ports on the subnet VLAN, one trunk uplink), and an empty `MstpSegment` or `ArcnetSegment` per planned serial segment with the planner router as first member. Devices are not generated (the planner has none); links are not generated.
4. `visualizePlan` handoff: replace the silent overwrite with a confirm dialog ("Replace current diagram?" with the current title), and read the storage key from a shared constant in `src/lib/storage-keys.ts`.
5. `exportPlannerXlsx` gains a "Physical Budget" summary block per subnet sheet when hints exist; signature becomes `exportPlannerXlsx(project: PlannerProject)`.
6. Tests: planner v1 fixtures still load and export identically; plan → diagram produces valid v2 with physical entities; overwrite confirmation is unit-tested at the composable level.

### Phase 6 — Primer, glossary, docs, onboarding

Branch: `feature/physical-layer-docs`

1. Primer section "Physical layer: cabling, ports, MS/TP, and ARC156" with scenario cards using `PrimerScenarioIntro`: access-port VLAN mismatch, MS/TP termination, PoE budget exhaustion, and ALC ARC156 topology/limits. Reuse the existing VLAN simulator SVG pattern. `PrimerPage.vue` is also over budget: add the section as `src/components/primer/PhysicalLayerSection.vue`.
2. Glossary entries: EIA-485 / RS-485, termination, network bias, MS/TP segment, ALC ARC156, repeater, access port, trunk port, native VLAN, 802.1Q, PoE (af/at/bt), patch panel, MDF/IDF, SFP, single-mode/multimode fiber, media converter, unit load. Link them from the new UI via `GlossaryLink`.
3. README feature bullets, `CLAUDE.md`/`AGENTS.md` project layout (new `src/components/diagram/`, `src/composables/`, `src/lib/fixtures/`), and a `docs/schema/diagram-project-v2.md` describing the file format and the migration policy ("never regenerate fixtures; every schema bump adds a migration step and a fixture").
4. Getting-started dialog and in-app help text.

### Phase 7 — Hardening and release

Branch: `feature/physical-layer-release`

1. Performance: the deep `watch(project)` autosave serializes the whole project on every keystroke; debounce it (≈300 ms) and measure with a 50-switch × 48-port fixture. Memoize `physical-graph` builds keyed on a structural hash.
2. Accessibility: port tables and endpoint picker are keyboard-operable; SVG click targets keep `role="button"` and labels; color is never the only indicator (termination/bias glyphs have shapes).
3. Mobile: Step 4 editors collapse to single column; physical SVG scroll-frame reuses the existing one.
4. Manual QA matrix (see §7). Version bump to `1.2.0` in `package.json` and `pyproject.toml`; changelog entry.

---

## 6. Test strategy summary

| Kind | Location | Purpose |
|---|---|---|
| Frozen fixtures + diagnostic snapshots | `src/lib/fixtures/` | Backward compatibility; never regenerated |
| Migration unit tests | `src/lib/schema-migrations.test.ts` | Version acceptance, idempotence, legacy export round trip |
| Pruning property tests | `src/lib/network-diagram-prune.test.ts` | No dangling refs after any delete |
| Rule tests | `src/lib/physical-diagnostics.test.ts` | One describe per §4 code |
| Graph tests | `src/lib/physical-graph.test.ts` | VLAN pass-through semantics |
| Layout tests | `src/lib/physical-layout.test.ts` | Determinism, overlap-free |
| Export tests | `src/lib/export-diagram-xlsx.test.ts`, `export-physical-pdf.test.ts` | Row and page snapshots |
| Component tests (new) | `src/components/diagram/*.test.ts` with `@vue/test-utils` | Endpoint picker filtering, segment reorder, remove → prune |
| CI | `.github/workflows/deploy.yml` already runs `npm test` and `npm run build` (which runs typecheck) | Unchanged |

Add `@vue/test-utils` and `jsdom` as dev dependencies in Phase 3 (first component tests). No Playwright in this plan; note it as a follow-up.

---

## 7. Manual QA matrix (Phase 7)

1. Load each fixture through **Open JSON** on the built site; confirm the diagnostics panel matches 1.1.0 and no "Physical" group appears.
2. Start 1.2.0 with 1.1.0 localStorage present (copy from a 1.1.0 session); confirm the diagram and planner appear unchanged and autosave writes `version: 2`.
3. Planner → Visualize on a plan with physical hints; confirm confirm-dialog, locations, switches with ports, empty segments.
4. Build a two-closet topology: core switch, two access switches on fiber trunks, patch panels, six controllers, one MS/TP router with a 12-node segment, and one ALC router with an ARC156 segment; verify each §4 rule can be triggered and cleared.
5. Export SVG, PDF (with and without schedule pages), diagram XLSX, legacy JSON; reopen legacy JSON in the 1.1.0 build (kept in `dist/` history or a preview deploy).
6. Nmap and ACE BBMD imports into a project with physical data: merge must not drop `physical` (Nmap merges; ACE import replaces the project and must warn that physical data will be lost).

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Physical editors bloat the diagram page further | Component extraction is a prerequisite in Phase 3, not an afterthought; enforce the 500-line budget in review |
| New diagnostics nag users with old projects | Gating on `physical.enabled` or presence of entities; `info` level hidden by default |
| Limits tables encode wrong numbers | Single `physical-limits.ts` with source comments; review against ASHRAE 135 Clause 9 and TIA-568 reach tables before merge; make limits overridable per project in a later release |
| Link endpoint picker becomes slow on large estates | Precomputed endpoint index in the composable; virtualized list if more than ~500 candidates |
| SVG export loses new styles | Consolidate style constants into one module in Phase 3/4 and add an export snapshot test that asserts every `class` used in the SVG has a rule |
| ACE state import silently discards physical data | Explicit warning dialog; offer "merge BBMD data into current project" as a follow-up |
| Forward compatibility (new file in old app) | "Export legacy JSON" action; documented in `docs/schema/` |

---

## 9. Open questions (answer before Phase 3)

1. Should devices get their own multi-port model (for example, a controller with a built-in two-port switch that daisy-chains Ethernet)? Proposed: no in 1.2.0; represent as two NICs on the device and note the limitation.
2. Wireless: model APs as infrastructure with a `wireless` media "port" and links of media `wireless`, or exclude? Proposed: include the kind, exclude reach rules.
3. Should MS/TP slave-only nodes count differently toward the 32-node unit-load limit (some devices are ½ or ¼ unit load)? Proposed: add optional `unitLoad` on the segment member, default 1.
4. Do we want per-project overrides of limits (copper reach, PoE budget) now or later? Proposed: later.
5. Location kinds: is `campus` needed for multi-building customers in the first release? Proposed: yes, it is cheap.

---

## 10. Recommended order and sizing

| Phase | Size | Depends on |
|---|---|---|
| 1 Foundation | M | — |
| 2 Model + diagnostics | L | 1 |
| 3 Extraction + editors | XL | 2 |
| 4 View + exports | L | 3 |
| 5 Planner | M | 2 (library), 3 (dialog) |
| 6 Docs + primer | M | 3 |
| 7 Hardening + release | S | 4, 5, 6 |

Phases 5 and 6 can run in parallel with 4 once Phase 3 has landed.

---

## 11. Implementation review (2026-09-27)

Reviewed commit: `07200f0` ("feat: add physical layer modeling and ARC156 support"), pushed to `deploy`; the Pages deployment for it succeeded, so 1.2.0 is live. `npm run typecheck`, `npm test` (22 files, 101 tests) and `npm run build` all pass.

### 11.1 Verification performed

The committed fixtures do not exercise the compatibility contract (see 11.2), so compatibility was verified independently: the 1.1.0 library (`network-diagram.ts`, `planner.ts`, `subnet.ts`, `ace-bbmd-state.ts` at `f1b2cc8`) was used to generate real 1.1.0 projects, which were then pushed through the 1.2.0 loader. Cases: default project, empty project, full planner import (IP with split horizon, port-separated network, SC hub with failover, BMS as FDR, MS/TP, ARCNET), the real ACE BBMD state file, and a legacy pre-NIC project with device-level `ip`, `additionalInterfaces`, a `bbmd` infrastructure item, a standalone `bacnet-sc` subnet and host-id path hops. Every case: accepted by the new validator, migrated to `version: 2` with an empty disabled `physical` block, produced identical diagnostic messages to 1.1.0, migrated idempotently, and its legacy export was accepted by the 1.1.0 validator with the same diagnostics. Planner v1 files load unchanged.

Verdict: **the compatibility contract in §1.3 holds.** The evidence for it in the repository does not.

### 11.2 Findings

Ordered by importance.

1. **Frozen fixtures are hollow.** All five diagram fixtures in `src/lib/fixtures/` have `subnets: []`; every `.diagnostics.json` baseline is `[]`. `fixtures/README.md` describes them as 1.1.0 captures, which they are not. `fixtures.test.ts` passes trivially. Phase 1 step 1 is therefore not done.
2. **Component extraction is cosmetic.** `NetworkDiagramPage.vue` is 1426 lines (was 1616). `LogicalDiagramSvg.vue` receives an untyped `Record<string, any>` model of roughly forty computeds and functions; `SubnetEditorCard.vue` receives an `actions` bag of 24 callbacks. `useDiagramProject` holds only the ref and autosave. `DeviceEditor`, `NicEditor` and the dialog components from Phase 3 were not extracted. The 500-line budget is still exceeded.
3. **Physical view is rudimentary.** `physical-layout.ts` stacks nodes vertically per location lane; every link is a four-point polyline dropped below the nodes with no lane assignment or crossing avoidance; MS/TP and ARC156 segments are drawn as full-width horizontal lines at the bottom of the canvas rather than as member chains; the logical overlay draws straight lines between node centres. Functional, but well short of Phase 4 step 1.
4. **Limit tables are uncited.** `physical-limits.ts` was required to carry a source per row. The MS/TP per-baud, per-gauge length table is invented ("conservative"); ASHRAE 135 Clause 9 gives 1200 m. The ARC156 610 m and 32-node limits reference "installation guides" without naming one. Fiber and PoE rows are consistent with IEEE 802.3 and TIA-568.
5. **ARCNET data-rate regression.** The select option changed from `156` to `156.25` in both planner and diagram cards. v1 projects saved with `arcnetDataRate: 156` now show a blank Data rate select. The 1→2 migration should map 156 to 156.25.
6. **Legacy export keeps `viewMode: 'physical'`.** 1.1.0 has no such option; it falls back to detailed behaviour but the select renders blank. `toLegacyDiagramProject` should map it to `'detailed'`.
7. **`MSTP-ORDER` / `ARCNET-ORDER` miss router devices.** The mid-chain check only counts `infrastructure` members, but BACnet routers are devices (`requiredForRouting`), and Auto-chain inserts them as devices. A router device mid-chain is never reported.
8. **Port generation UX.** "Generate ports" uses `window.prompt` and silently replaces existing ports, pruning any cables attached to them, with no confirmation. Plan called for a dialog.
9. **Scope shortfalls against Phase 6/7.** The primer section is a static four-card block, not the interactive scenarios. `CLAUDE.md` / `AGENTS.md` project layout was not updated for `src/components/diagram/`, `src/composables/` and `src/lib/fixtures/`. New tests are mostly single happy-path cases (export tests count rows; the PDF test mocks jsPDF and counts pages).
10. **Process.** Delivered as one commit straight to the deployment branch instead of one squash-merged PR per phase on a feature branch.

Items confirmed working: schema versioning and migration registry, typed endpoint references, `pruneDanglingReferences` called from `normalizeDiagramProject` and every UI remove action, diagnostics with `code`/`targets` and click-to-focus, `info` level hidden behind "Show hints", gating of physical diagnostics, planner physical hints with handoff confirmation, storage-key constants, XLSX/PDF schedule exports, glossary entries, legacy JSON export, and the ACE state import warning when physical data would be lost.

### 11.3 Follow-up work

Priority A (correctness, small; one PR on a feature branch):

- [x] Replace the fixtures with real 1.1.0 captures generated from the `f1b2cc8` library (the six cases in 11.1) and regenerate their diagnostics baselines from 1.1.0 output; keep the "never regenerate" rule from that point on.
- [x] Add migration step: `arcnetDataRate === 156` → `156.25` (diagram and planner).
- [x] `toLegacyDiagramProject`: map `viewMode: 'physical'` to `'detailed'`.
- [x] Cite each row of `physical-limits.ts`; replace the invented MS/TP derating table with the ASHRAE 135 1200 m limit unless a source for derating is found.
- [x] Extend the mid-chain check to router devices.

Priority B (quality; separate PRs):

- [x] Finish the Phase 3 extraction: typed props for `LogicalDiagramSvg`, `DeviceEditor`/`NicEditor`, dialogs, and move remove actions into `useDiagramProject`; bring `NetworkDiagramPage.vue` under 500 lines.
- [x] Physical layout: lane-assigned orthogonal link routing, segments drawn as member chains with per-member termination/bias glyphs.
- [x] Replace the `window.prompt` port generator with the planned dialog and confirm before replacing ports that have cables.
- [x] Deepen tests: negative cases per rule, export row content snapshots, layout tests on a multi-lane fixture.
- [x] Update `CLAUDE.md` / `AGENTS.md` layout section; add interactive physical-layer primer scenarios.

Extraction complete: `LogicalDiagramSvg` has a fully typed model contract; `DeviceEditor`, `NicEditor`, and all six diagram dialogs are separate components; destructive remove actions live in `useDiagramProject`; and focused import, export, editor, and logical-link composables reduce `NetworkDiagramPage.vue` to 497 lines.
