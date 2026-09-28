<template>
  <div style="display: flex; flex-direction: column; gap: 1.5rem; width: 100%;">

    <!-- Planner Description -->
    <div class="glass-card" style="display: flex; flex-direction: column; gap: 0.75rem; padding: 1.5rem;">
      <div class="planner-heading-row">
        <div class="planner-heading-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <line x1="15" y1="3" x2="15" y2="21"></line>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="3" y1="15" x2="21" y2="15"></line>
          </svg>
          <h2>BACnet Network Planner</h2>
        </div>
        <div class="planner-project-actions">
          <AppButton size="sm" @click="plannerFileInput?.click()">Load plan</AppButton>
          <AppButton size="sm" variant="secondary" @click="savePlannerProject">Save plan</AppButton>
          <input ref="plannerFileInput" class="visually-hidden" type="file" accept="application/json,.json" @change="loadPlannerProject">
        </div>
      </div>
      <p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem; line-height: 1.55; max-width: 900px;">
        Design <GlossaryLink term="bacnet-ip">BACnet/IP</GlossaryLink>, <GlossaryLink term="bacnet-sc">BACnet/SC</GlossaryLink>,
        <GlossaryLink term="mstp">MS/TP</GlossaryLink>, and <GlossaryLink term="arcnet">ARCNET</GlossaryLink> networks, define their infrastructure
        and communications paths, and generate structured design spreadsheets and diagrams.
      </p>
      <p v-if="plannerFileNotice" class="planner-file-notice" role="status">{{ plannerFileNotice }}</p>
    </div>

    <!-- Grid layout: left column for Subnet Config cards, right column for preview and download -->
    <div class="planner-grid-container">

      <!-- Left side: Subnets Management -->
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0.5rem; flex-wrap: wrap; width: 100%;">
          <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
            <h3 style="font-family: var(--font-heading); font-size: 1.15rem; color: #fff; margin: 0;">Configured Networks</h3>
            <AceToggle v-model="splitHorizon" label="Split horizon routing" />
            <AceToggle v-model="advancedBacnetPorts" label="Advanced BACnet/IP ports" description="Configure multiple B/IP networks on one IP subnet" />
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <AppButton variant="primary" @click="addNetwork('bacnet-ip')" style="flex: none; min-width: auto; height: 38px; padding: 0 1.25rem; font-size: 0.85rem; border-radius: var(--radius-md);">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 15px; height: 15px; margin-right: 0.5rem;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </template>
              <span style="white-space: nowrap;">Add IP subnet</span>
            </AppButton>
            <AppButton variant="secondary" size="sm" @click="addNetwork('mstp')" style="flex: none; min-width: auto;">+ MS/TP segment</AppButton>
            <AppButton variant="secondary" size="sm" @click="addNetwork('arcnet')" style="flex: none; min-width: auto;">+ ARCNET segment</AppButton>

            <!-- Secondary Action: Quick Setup Wizard (Blue) -->
            <AppButton variant="secondary" @click="showWizard = true" style="flex: none; min-width: auto; height: 38px; padding: 0 1.25rem; font-size: 0.85rem; border-radius: var(--radius-md);">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 15px; height: 15px; margin-right: 0.5rem;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
              </template>
              <span style="white-space: nowrap;">Quick Setup Wizard</span>
            </AppButton>

            <!-- Utility Action: Reset (Outline/Glass) -->
            <AppButton variant="default" @click="resetToDefaults" style="flex: none; min-width: auto; height: 38px; padding: 0 1.25rem; font-size: 0.85rem; border-radius: var(--radius-md);" title="Reset Planner to Default Example Subnets">
              <span style="white-space: nowrap;">Reset</span>
            </AppButton>

            <!-- Utility Action: Clear All (Subtle Red Outline/Glass) -->
            <AppButton variant="default" @click="clearAllSubnets" style="flex: none; min-width: auto; height: 38px; padding: 0 1.25rem; font-size: 0.85rem; border-radius: var(--radius-md); border-color: rgba(239, 68, 68, 0.45); color: #f87171;" title="Clear All Subnets">
              <span style="white-space: nowrap;">Clear All</span>
            </AppButton>
          </div>
        </div>

        <div id="planner-subnets-list" style="display: flex; flex-direction: column; gap: 1rem;">
          <!-- Subnet Card -->
          <div v-for="sub in subnets" :key="sub.id" class="planner-subnet-card">
            <div class="planner-card-header">
              <input type="text" v-model="sub.name" style="font-family: var(--font-heading); font-weight: bold; font-size: 1rem; border: none; background: transparent; color: #fff; width: 80%; padding: 0.2rem; border-bottom: 1px dashed transparent;" placeholder="Subnet Name">
              <button class="planner-btn-delete" title="Delete Subnet" @click="deleteSubnet(sub.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>

            <div class="form-group" style="margin: 0 0 0.8rem; max-width: 240px;">
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Datalink type</label>
              <select v-model="sub.networkType" @change="handleNetworkTypeChange(sub)" style="width: 100%; padding: 0.4rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm);">
                <option value="bacnet-ip">IP subnet</option><option value="mstp">BACnet MS/TP</option><option value="arcnet">BACnet ARCNET</option>
              </select>
            </div>
            <div v-if="isIpNetwork(sub)" class="planner-card-grid">
              <!-- Left Column: IP Configuration -->
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display: flex; gap: 0.6rem;">
                  <div class="form-group" style="margin-bottom: 0; flex: 1.8;">
                    <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Subnet IP & Mask</label>
                    <div style="display: flex; gap: 0.3rem; align-items: center;">
                      <input type="text" v-model="sub.ip" style="flex: 2; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;" placeholder="e.g. 192.168.1.0">
                      <select v-model.number="sub.cidr" style="flex: 1.2; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;">
                        <option v-for="c in cidrOptions" :key="c" :value="c">/{{ c }}</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group" style="margin-bottom: 0; flex: 0.8;">
                    <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">VLAN ID</label>
                    <input type="number" v-model.number="sub.vlan" min="1" max="4094" style="width: 100%; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;" placeholder="e.g. 10">
                  </div>

                  <div v-if="advancedBacnetPorts" class="form-group" style="margin-bottom: 0; flex: 1;">
                    <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">BACnet Port</label>
                    <input type="number" v-model.number="sub.port" min="1024" max="65535" style="width: 100%; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;" placeholder="47808">
                  </div>
                  <div v-if="advancedBacnetPorts" class="form-group" style="margin-bottom: 0; flex: 1;">
                    <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">BACnet Network</label>
                    <input type="number" v-model.number="sub.bacnetNetworkNumber" min="1" max="65534" style="width: 100%; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;" placeholder="1001">
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Gateway Host Offset (.{{ sub.gatewayOffset }})</label>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="number" v-model.number="sub.gatewayOffset" min="1" max="254" style="width: 70px; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm);">
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">IP: <strong style="color: #fff;">{{ getOffsetIp(sub.ip, sub.cidr, sub.gatewayOffset) || 'Invalid' }}</strong></span>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 0; margin-top: 0.25rem;">
                  <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Planned Device Count (for Construction)</label>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="number" v-model.number="sub.plannedDevices" min="0" max="65530" style="width: 100px; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;" placeholder="e.g. 20">
                    <AppButton variant="secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; flex: none; min-width: auto; height: auto;" @click.prevent="autoSizeSubnet(sub)">Auto-Size</AppButton>
                  </div>
                </div>
              </div>

              <!-- Right Column: BACnet Configuration -->
              <div style="display: flex; flex-direction: column; gap: 0.6rem; border-left: 1px solid rgba(255, 255, 255, 0.05); padding-left: 1rem;">
                <!-- BBMD configuration -->
                <AceToggle :model-value="sub.bbmdEnabled" label="Enable BBMD router" @update:model-value="handleBbmdToggle(sub, $event)" />

                <div v-if="sub.bbmdEnabled" style="margin-left: 1.25rem;">
                  <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem;">BBMD Host Offset (.{{ sub.bbmdOffset }})</label>
                  <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                    <input type="number" v-model.number="sub.bbmdOffset" min="1" max="254" style="width: 70px; padding: 0.25rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.8rem;">
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">IP: <strong style="color: #fff;">{{ getOffsetIp(sub.ip, sub.cidr, sub.bbmdOffset) || 'Invalid' }}</strong></span>
                  </div>

                  <!-- Split Horizon Targets selection -->
                  <div v-if="splitHorizon" style="margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px dashed rgba(255,255,255,0.08);">
                    <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Route Broadcasts to BBMDs:</label>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem;">
                      <div v-for="obs in otherBbmdSubnets(sub)" :key="obs.id">
                        <AceCheckbox :model-value="isRouteTarget(sub, obs.id)" :label="obs.name" @update:model-value="toggleRouteTarget(sub, obs.id)" />
                      </div>
                      <div v-if="otherBbmdSubnets(sub).length === 0" style="font-size: 0.72rem; color: var(--text-muted);">No other BBMD routers found.</div>
                    </div>
                  </div>
                </div>

                <!-- BMS Server Configuration -->
                <AceToggle :model-value="sub.bmsPlaced" label="Host BMS server here" @update:model-value="toggleBmsPlaced(sub)" />

                <div v-if="sub.bmsPlaced" style="margin-left: 1.25rem; margin-top: 0.2rem;">
                  <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">BMS IP: <strong style="color: #fff;">{{ getOffsetIp(sub.ip, sub.cidr, getBmsHostOffset(sub)) || 'Invalid' }}</strong> (.{{ getBmsHostOffset(sub) }})</span>
                  <div class="device-service-selection"><AceCheckbox :model-value="Boolean(sub.bmsUsesBacnetIp)" label="BACnet/IP" @update:model-value="sub.bmsUsesBacnetIp = $event" /><AceCheckbox :model-value="Boolean(sub.bmsUsesBacnetSc)" label="BACnet/SC" @update:model-value="sub.bmsUsesBacnetSc = $event" /></div>
                  <span v-if="sub.bmsRole === 'bbmd'" class="field-hint">The BMS owns the configured BBMD address.</span>

                  <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 0.15rem;">BMS Network Role:</label>
                  <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem;">
                    <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; margin: 0;">
                      <input type="radio" :name="'bms-role-' + sub.id" v-model="sub.bmsRole" value="bbmd" :disabled="!sub.bbmdEnabled">
                      Participate as local BBMD
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; margin: 0;">
                      <input type="radio" :name="'bms-role-' + sub.id" v-model="sub.bmsRole" value="fdr" :disabled="otherBbmdSubnets(sub).length === 0">
                      Register as FDR client to BBMD:
                    </label>
                    <select v-if="sub.bmsRole === 'fdr'" v-model="sub.fdrTargetSubnetId" style="margin-left: 1.25rem; padding: 0.15rem 0.3rem; font-size: 0.7rem; background: #000; color: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); max-width: 180px;">
                      <option v-for="t in otherBbmdSubnets(sub)" :key="t.id" :value="t.id">{{ t.name }}</option>
                    </select>
                    <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; margin: 0;">
                      <input type="radio" :name="'bms-role-' + sub.id" v-model="sub.bmsRole" value="none">
                      Local segment host only
                    </label>
                  </div>
                  <div v-if="otherBbmdSubnets(sub).length === 0" style="font-size: 0.72rem; color: var(--text-muted);">No other BBMD routers found.</div>
                </div>
                <AceToggle :model-value="Boolean(sub.scEnabled)" label="Provide BACnet/SC hub infrastructure" description="Devices on this IP subnet may independently use BACnet/IP, BACnet/SC, or both" @update:model-value="sub.scEnabled = $event" />
                <div v-if="sub.scEnabled" class="planner-sc-inline">
                  <div class="form-group"><label>Hub name</label><input v-model="sub.scPrimaryHubName" type="text" placeholder="Primary SC Hub"></div>
                  <div class="form-group"><label>Hub IP</label><input v-model="sub.scPrimaryHubIp" type="text" placeholder="10.20.0.10"></div>
                  <div class="form-group"><label>Hub WebSocket URI</label><input v-model="sub.scPrimaryHubUri" type="text" placeholder="wss://sc-hub.example.com"></div>
                  <AceToggle :model-value="Boolean(sub.scFailoverEnabled)" label="High-availability hub pair" @update:model-value="sub.scFailoverEnabled = $event" />
                  <template v-if="sub.scFailoverEnabled"><div class="form-group"><label>Failover hub IP</label><input v-model="sub.scFailoverHubIp" type="text"></div><div class="form-group"><label>Failover hub URI</label><input v-model="sub.scFailoverHubUri" type="text" placeholder="wss://sc-failover.example.com"></div></template>
                </div>
              </div>
            </div>
            <div v-else-if="sub.networkType === 'bacnet-sc'" class="planner-card-grid">
              <div class="standards-note" style="grid-column:1/-1"><strong>BACnet/SC topology</strong><span>The BACnet/SC annex defines TLS-secured WebSocket connections, a logical hub-and-spoke model, one active primary or failover hub connection per node, and optional direct connections for unicast. “HA hub cluster” here groups the standard’s primary and failover hub functions for planning.</span><a href="https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/135_2016_bj_20191118.pdf" target="_blank" rel="noopener">ASHRAE Addendum 135-2016bj</a></div>
              <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <div class="form-group" style="margin:0;"><label>BACnet network number</label><input v-model.number="sub.bacnetNetworkNumber" type="number" min="1" max="65534" placeholder="e.g. 3001"></div>
                <div class="form-group" style="margin:0;"><label>Planned BACnet/SC nodes</label><input v-model.number="sub.plannedDevices" type="number" min="0"></div>
                <div class="form-group compact-group"><label>IP underlays carrying hub connections</label><div class="subnet-checkboxes"><label v-for="underlay in ipSubnets" :key="underlay.id" class="checkbox-chip"><input v-model="sub.scUnderlaySubnetIds" type="checkbox" :value="underlay.id"><span>{{ underlay.name }}</span></label></div></div>
              </div>
              <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <strong>Primary hub function</strong>
                <div class="form-group" style="margin:0;"><label>Hub name</label><input v-model="sub.scPrimaryHubName" type="text" placeholder="Primary SC Hub"></div>
                <div class="form-group" style="margin:0;"><label>Hub IP</label><input v-model="sub.scPrimaryHubIp" type="text" placeholder="10.20.0.10"></div>
                <div class="form-group" style="margin:0;"><label>Hub WebSocket URI</label><input v-model="sub.scPrimaryHubUri" type="text" placeholder="wss://sc-hub.example.com"></div>
              </div>
              <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <AceToggle :model-value="Boolean(sub.scFailoverEnabled)" label="High-availability hub pair" description="Configure the failover hub URI required by the node failover model" @update:model-value="sub.scFailoverEnabled = $event" />
                <template v-if="sub.scFailoverEnabled">
                  <div class="form-group" style="margin:0;"><label>Failover hub name</label><input v-model="sub.scFailoverHubName" type="text" placeholder="Failover SC Hub"></div>
                  <div class="form-group" style="margin:0;"><label>Failover hub IP</label><input v-model="sub.scFailoverHubIp" type="text" placeholder="10.30.0.10"></div>
                  <div class="form-group" style="margin:0;"><label>Failover WebSocket URI</label><input v-model="sub.scFailoverHubUri" type="text" placeholder="wss://sc-hub-failover.example.com"></div>
                </template>
              </div>
            </div>
            <div v-else class="planner-card-grid">
              <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <div class="form-group" style="margin:0;"><label>Upstream routed network</label><select v-model="sub.upstreamIpSubnetId"><option value="">Choose upstream network</option><option v-for="upstream in upstreamNetworkOptions(sub)" :key="upstream.id" :value="upstream.id">{{ upstream.name }} — {{ networkSummary(upstream) }}</option></select></div>
                <div class="form-group" style="margin:0;"><label>BACnet network number</label><input v-model.number="sub.bacnetNetworkNumber" type="number" min="1" max="65534" placeholder="e.g. 2001"></div>
                <div class="form-group" style="margin:0;"><label>Planned device count</label><input v-model.number="sub.plannedDevices" type="number" min="0" :max="sub.networkType === 'mstp' ? 128 : 256"></div>
              </div>
              <div v-if="sub.networkType === 'mstp'" style="display:flex; flex-direction:column; gap:0.75rem;">
                <div class="form-group" style="margin:0;"><label>Baud rate</label><select v-model.number="sub.mstpBaudRate"><option v-for="baud in mstpBaudRates" :key="baud" :value="baud">{{ baud.toLocaleString() }} baud</option></select></div>
                <div class="form-group" style="margin:0;"><label>Max Master</label><input v-model.number="sub.mstpMaxMaster" type="number" min="0" max="127"><span style="font-size:.72rem;color:var(--text-muted)">Valid master MAC range: 0–{{ sub.mstpMaxMaster }}</span></div>
              </div>
              <div v-else style="display:flex; flex-direction:column; gap:0.75rem;">
                <div class="form-group" style="margin:0;"><label>Data rate</label><select v-model.number="sub.arcnetDataRate"><option :value="156.25">156.25 kbps</option><option :value="2500">2.5 Mbps</option><option :value="5000">5 Mbps</option><option :value="10000">10 Mbps</option></select></div>
                <span style="font-size:.78rem;color:var(--text-muted)">ARCNET node addresses are entered as 0–255 in the diagram tool.</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <div class="form-group" style="margin:0;"><label>Routing device name</label><input v-model="sub.routerName" type="text" placeholder="e.g. AHU Controller / Router"></div>
                <div class="form-group" style="margin:0;"><label>Routing device address on upstream</label><input v-model="sub.routerIp" type="text" :placeholder="routerAddressPlaceholder(sub)"></div>
              </div>
            </div>
            <details class="planner-physical-hints">
              <summary>Physical planning</summary>
              <div class="planner-physical-grid">
                <div class="form-group"><label>Closet / IDF</label><input v-model="physicalHints(sub).closetName" placeholder="IDF 1"></div>
                <template v-if="isIpNetwork(sub)">
                  <div class="form-group"><label>Switch count</label><input v-model.number="physicalHints(sub).switchCount" type="number" min="0"></div>
                  <div class="form-group"><label>Ports per switch</label><input v-model.number="physicalHints(sub).portsPerSwitch" type="number" min="1"></div>
                  <div class="form-group"><label>PoE devices</label><input v-model.number="physicalHints(sub).poeDevices" type="number" min="0"></div>
                  <span class="physical-budget-hint">{{ physicalPortBudget(sub) }} ports · {{ Math.max(0, physicalPortBudget(sub) - (sub.plannedDevices ?? 0)) }} spare</span>
                </template>
                <template v-else>
                  <div v-if="sub.networkType === 'arcnet'" class="form-group"><label>ARC156 segments</label><input v-model.number="physicalHints(sub).arcnetSegments" type="number" min="0"></div>
                  <div v-else class="form-group"><label>MS/TP segments</label><input v-model.number="physicalHints(sub).mstpSegments" type="number" min="0"></div>
                  <div v-if="sub.networkType === 'arcnet'" class="form-group"><label>Estimated length / segment (m)</label><input v-model.number="physicalHints(sub).arcnetSegmentLengthMeters" type="number" min="0"></div>
                  <div v-else class="form-group"><label>Estimated length / segment (m)</label><input v-model.number="physicalHints(sub).mstpSegmentLengthMeters" type="number" min="0"></div>
                  <div class="form-group"><label>Cable</label><select v-model="physicalHints(sub).cable"><option value="stp-18awg">18 AWG STP</option><option value="stp-22awg">22 AWG STP</option><option value="stp-24awg">24 AWG STP</option><option value="other">Other</option></select></div>
                  <span class="physical-budget-hint">{{ Math.max(1, Math.ceil((sub.plannedDevices ?? 0) / 32)) }} segments recommended for {{ sub.plannedDevices ?? 0 }} nodes</span>
                </template>
              </div>
            </details>
          </div>
          <div v-if="subnets.length === 0" style="text-align: center; color: var(--text-muted); padding: 2rem; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
            No networks added. Click "Add Network" to start designing.
          </div>
        </div>
      </div>

      <!-- Right side: BDT Schedule & Network Preview -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">

        <!-- Global BMS & BDT Preview -->
        <div class="glass-card" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;">
          <h3 class="card-title" style="font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--primary); margin: 0;">
            Network Preview & Validation
          </h3>

          <!-- Validation Alerts Pane -->
          <div id="planner-validation-alerts" style="display: flex; flex-direction: column; gap: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 0.25rem;">
            <h4 style="font-size: 0.75rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 0 0 0.4rem 0;">Design Validation</h4>
            <div v-for="(alert, idx) in validationAlerts" :key="idx" class="planner-alert" :class="alert.type" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%;">
              <div style="display: flex; align-items: center; gap: 0.4rem; flex: 1;">
                <svg v-if="alert.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <span style="font-size: 0.82rem;">{{ alert.text }}</span>
              </div>
              <AppButton v-if="alert.action" variant="secondary" style="padding: 0.25rem 0.5rem; font-size: 0.72rem; min-width: auto; flex: none; height: auto;" @click="alert.action">
                {{ alert.actionText }}
              </AppButton>
            </div>
            <div v-if="validationAlerts.length === 0" style="font-size: 0.85rem; color: var(--success); display: flex; align-items: center; gap: 0.5rem;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
              All subnet address designs validate successfully!
            </div>
          </div>

          <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.85rem;">
            <h4 style="font-size: 0.75rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 0 0 0.4rem 0;">BMS Server Placement</h4>
            <div id="planner-preview-bms-status" style="font-size: 0.85rem; color: #fff; line-height: 1.4;">
              {{ bmsStatus }}
            </div>
          </div>

          <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.85rem;">
            <h4 style="font-size: 0.75rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 0 0 0.4rem 0;">Broadcast Distribution Table (BDT) Schedule</h4>
            <div id="planner-preview-bdt" style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45; font-family: var(--font-mono);">
              <div v-if="bdtScheduleData.length === 0">
                No BBMDs configured.
              </div>
              <div v-else v-for="(entry, idx) in bdtScheduleData" :key="idx" style="margin-bottom: 0.75rem;">
                <strong>BBMD on "{{ entry.subnetName }}" (IP: {{ entry.selfIp }}, Port: {{ entry.port }}):</strong>
                <div v-if="entry.targets.length === 0" style="padding-left: 1.25rem;">
                  &bull; No other BBMD entries (isolated subnet)
                </div>
                <div v-else v-for="(target, tIdx) in entry.targets" :key="tIdx" style="padding-left: 1.25rem;">
                  &bull; {{ target.ip }} ({{ target.name }})
                </div>
              </div>
            </div>
          </div>

          <AppButton variant="secondary" style="font-size: 0.95rem; padding: 0.7rem 1.25rem; font-weight: bold; margin-top: 0.25rem; width: 100%; display: flex; justify-content: center;" @click="exportXlsx">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 0.5rem;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </template>
            Export Planning Spreadsheet (.xlsx)
          </AppButton>
          <AppButton variant="primary" block @click="visualizePlan">Visualize in Diagram Builder</AppButton>
        </div>

        <!-- Live Spreadsheet Preview -->
        <div class="glass-card" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <h3 class="card-title" style="font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--secondary); margin: 0;">
            Live Spreadsheet Structure
          </h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
            Below is a live preview of the Excel sheets and layout:
          </p>
          <div id="planner-preview-sheets-structure" style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8rem; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: var(--radius-sm);">
            <div><strong>1. "Network Summary"</strong> (Master schedule, BDT overview)</div>
            <div v-for="(sheet, idx) in sheetStructureData" :key="idx">
              <strong>{{ sheet.index }}. "{{ sheet.name }}"</strong> (VLAN {{ sheet.vlan }} | Port {{ sheet.port }} | pre-populating {{ sheet.limit }} planned IPs)
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Setup Wizard Modal -->
    <div v-if="showWizard" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1.5rem;">
      <div class="glass-card" style="width: 100%; max-width: 500px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; border: 1px solid var(--border-color); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
          <h3 style="font-family: var(--font-heading); font-size: 1.2rem; color: #fff; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; color: var(--primary);"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
            Quick Setup Wizard
          </h3>
          <button @click="showWizard = false" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.2rem;" title="Close Modal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
          Specify a base IP address and the number of subnets needed. The wizard will automatically compute a contiguous, non-overlapping subnet plan.
        </p>

        <!-- Form fields -->
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Starting IP Address</label>
            <input type="text" v-model="wizardStartIp" style="width: 100%; padding: 0.45rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.85rem;" placeholder="e.g. 192.168.1.0">
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <div class="form-group" style="margin: 0; flex: 1;">
              <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Number of Subnets</label>
              <input type="number" v-model.number="wizardSubnetCount" min="1" max="24" style="width: 100%; padding: 0.45rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.85rem;">
            </div>

            <div class="form-group" style="margin: 0; flex: 1.2;">
              <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Subnet Size / Mask</label>
              <select v-model.number="wizardSubnetCidr" style="width: 100%; padding: 0.45rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.85rem;">
                <option v-for="c in cidrOptions" :key="c" :value="c">/{{ c }} ({{ Math.max(0, Math.pow(2, 32 - c) - 2) }} hosts)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <div class="form-group" style="margin: 0; flex: 1;">
              <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Devices Per Subnet</label>
              <input type="number" v-model.number="wizardDevicesPerSubnet" min="0" style="width: 100%; padding: 0.45rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.85rem;">
            </div>

            <div class="form-group" style="margin: 0; flex: 1;">
              <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Naming Prefix</label>
              <input type="text" v-model="wizardNamingPrefix" style="width: 100%; padding: 0.45rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.85rem;" placeholder="e.g. Subnet">
            </div>
          </div>
        </div>

        <div v-if="wizardError" style="font-size: 0.78rem; color: var(--error); background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.5rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 0.4rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {{ wizardError }}
        </div>

        <!-- Buttons -->
        <div style="display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
          <AppButton variant="default" style="padding: 0.45rem 1rem; min-width: auto; flex: none;" @click="showWizard = false">
            Cancel
          </AppButton>
          <AppButton variant="primary" style="padding: 0.45rem 1rem; min-width: auto; flex: none;" @click="generateWizardPlan">
            Generate Plan
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject, type Ref } from 'vue';
import { getSubnetDetails, getOffsetIp, ipToLong, longToIp } from '../lib/subnet';
import { calculateAutoSizeCidr, findNextAvailableSubnetBlock, classifyOverlap, createPlannerProject, getBmsHostOffset, isIpNetwork, type PlannerSubnet } from '../lib/planner';
import { exportPlannerXlsx } from '../lib/export-xlsx';
import { createDiagramProjectFromPlan } from '../lib/network-diagram';
import { migratePlannerProject } from '../lib/schema-migrations';
import { DIAGRAM_STORAGE_KEY, PLANNER_SPLIT_HORIZON_STORAGE_KEY, PLANNER_SUBNETS_STORAGE_KEY } from '../lib/storage-keys';
import { ARC156_MAX_LENGTH_METERS, mstpLengthLimit } from '../lib/physical-limits';
import { handoffPlannerDiagram } from '../composables/usePlannerDiagramHandoff';
import AppButton from './AppButton.vue';
import AceCheckbox from './AceCheckbox.vue';
import GlossaryLink from './GlossaryLink.vue';
import AceToggle from './AceToggle.vue';

const splitHorizon = ref(false);
const plannerFileInput = ref<HTMLInputElement | null>(null);
const plannerFileNotice = ref('');
const advancedBacnetPorts = inject<Ref<boolean>>('advancedBacnetPorts', ref(false));
const mstpBaudRates = [9600, 19200, 38400, 76800, 115200];

const DEFAULT_SUBNETS: PlannerSubnet[] = [
  {
    id: 'sub-1',
    name: 'Core BMS Subnet',
    ip: '192.168.1.0',
    cidr: 24,
    gatewayOffset: 1,
    vlan: 10,
    port: 47808,
    bbmdEnabled: true,
    bbmdOffset: 10,
    bmsPlaced: true,
    bmsRole: 'bbmd',
    fdrTargetSubnetId: '',
    plannedDevices: 0,
    routeTargets: []
  },
  {
    id: 'sub-2',
    name: 'Chiller & Boiler Plant',
    ip: '192.168.2.0',
    cidr: 24,
    gatewayOffset: 1,
    vlan: 20,
    port: 47808,
    bbmdEnabled: true,
    bbmdOffset: 10,
    bmsPlaced: false,
    bmsRole: 'none',
    fdrTargetSubnetId: '',
    plannedDevices: 0,
    routeTargets: []
  },
  {
    id: 'sub-3',
    name: 'VAV Floor Controllers',
    ip: '192.168.4.0',
    cidr: 23,
    gatewayOffset: 1,
    vlan: 30,
    port: 47808,
    bbmdEnabled: false,
    bbmdOffset: 10,
    bmsPlaced: false,
    bmsRole: 'none',
    fdrTargetSubnetId: '',
    plannedDevices: 0,
    routeTargets: []
  }
];

const subnets = ref<PlannerSubnet[]>(JSON.parse(JSON.stringify(DEFAULT_SUBNETS)).map((sub: PlannerSubnet) => ({
  ...sub, networkType: sub.networkType || 'bacnet-ip', bacnetNetworkNumber: sub.bacnetNetworkNumber ?? '',
  mstpBaudRate: sub.mstpBaudRate ?? 38400, mstpMaxMaster: sub.mstpMaxMaster ?? 127, arcnetDataRate: sub.arcnetDataRate ?? 2500
})));
const normalizeNetwork = (sub: PlannerSubnet) => Object.assign(sub, {
  networkType: sub.networkType || 'bacnet-ip', bacnetNetworkNumber: sub.bacnetNetworkNumber ?? '',
  mstpBaudRate: sub.mstpBaudRate ?? 38400, mstpMaxMaster: sub.mstpMaxMaster ?? 127, arcnetDataRate: sub.arcnetDataRate ?? 2500,
  upstreamIpSubnetId: sub.upstreamIpSubnetId ?? '', routerName: sub.routerName ?? '', routerIp: sub.routerIp ?? '',
  bmsUsesBacnetIp: sub.bmsUsesBacnetIp ?? true, bmsUsesBacnetSc: sub.bmsUsesBacnetSc ?? false,
  scEnabled: sub.scEnabled ?? sub.networkType === 'bacnet-sc', scPrimaryHubName: sub.scPrimaryHubName ?? '', scPrimaryHubIp: sub.scPrimaryHubIp ?? '', scPrimaryHubUri: sub.scPrimaryHubUri ?? '',
  scFailoverEnabled: sub.scFailoverEnabled ?? false, scFailoverHubName: sub.scFailoverHubName ?? '', scFailoverHubIp: sub.scFailoverHubIp ?? '',
  physical: sub.physical ?? {},
  scFailoverHubUri: sub.scFailoverHubUri ?? '', scUnderlaySubnetIds: sub.scUnderlaySubnetIds ?? []
});
const migrateLegacyScNetworks = (networks: PlannerSubnet[]) => {
  for (const legacy of networks.filter(network => network.networkType === 'bacnet-sc')) {
    const underlay = networks.find(network => legacy.scUnderlaySubnetIds?.includes(network.id) && isIpNetwork(network));
    if (!underlay) continue;
    Object.assign(underlay, {
      scEnabled: true, scPrimaryHubName: legacy.scPrimaryHubName, scPrimaryHubIp: legacy.scPrimaryHubIp, scPrimaryHubUri: legacy.scPrimaryHubUri,
      scFailoverEnabled: legacy.scFailoverEnabled, scFailoverHubName: legacy.scFailoverHubName, scFailoverHubIp: legacy.scFailoverHubIp, scFailoverHubUri: legacy.scFailoverHubUri
    });
  }
  return networks.filter(network => network.networkType !== 'bacnet-sc' || !network.scUnderlaySubnetIds?.some(id => networks.some(candidate => candidate.id === id && isIpNetwork(candidate))));
};
const ipSubnets = computed(() => subnets.value.filter(isIpNetwork));
const upstreamNetworkOptions = (sub: PlannerSubnet) => subnets.value.filter(candidate => candidate.id !== sub.id
  && (isIpNetwork(candidate) || candidate.networkType === sub.networkType));
const networkSummary = (sub: PlannerSubnet) => isIpNetwork(sub) ? `${sub.ip}/${sub.cidr}` : `${sub.networkType === 'mstp' ? 'MS/TP' : sub.networkType === 'arcnet' ? 'ARCNET' : 'BACnet/SC'} network ${sub.bacnetNetworkNumber || 'not set'}`;
const upstreamFor = (sub: PlannerSubnet) => subnets.value.find(item => item.id === sub.upstreamIpSubnetId);
const routerAddressPlaceholder = (sub: PlannerSubnet) => upstreamFor(sub)?.networkType === 'mstp' ? 'MS/TP MAC' : upstreamFor(sub)?.networkType === 'arcnet' ? 'ARCNET node' : 'e.g. 192.168.1.40';
const routerAddressValid = (sub: PlannerSubnet, upstream: PlannerSubnet | undefined) => {
  if (!upstream || !sub.routerIp?.trim()) return false;
  if (isIpNetwork(upstream)) return ipToLong(sub.routerIp) !== null;
  const address = Number(sub.routerIp);
  return Number.isInteger(address) && address >= 0 && address <= (upstream.networkType === 'mstp' ? (upstream.mstpMaxMaster ?? 127) : 255);
};

// Wizard setup properties
const showWizard = ref(false);
const wizardStartIp = ref('192.168.1.0');
const wizardSubnetCount = ref(4);
const wizardSubnetCidr = ref(24);
const wizardDevicesPerSubnet = ref(0);
const wizardNamingPrefix = ref('Building Subnet');
const wizardError = ref('');

// Load from localStorage if available
onMounted(() => {
  const savedSubnets = localStorage.getItem(PLANNER_SUBNETS_STORAGE_KEY);
  const savedSplitHorizon = localStorage.getItem(PLANNER_SPLIT_HORIZON_STORAGE_KEY);

  if (savedSubnets) {
    try {
      subnets.value = migrateLegacyScNetworks(JSON.parse(savedSubnets).map(normalizeNetwork));
    } catch (e) {
      console.error("Failed to parse saved subnets", e);
    }
  }

  if (savedSplitHorizon) {
    splitHorizon.value = savedSplitHorizon === 'true';
  }
});

// Watch and save to localStorage
watch(subnets, (newVal) => {
  localStorage.setItem(PLANNER_SUBNETS_STORAGE_KEY, JSON.stringify(newVal));
}, { deep: true });

watch(splitHorizon, (newVal) => {
  localStorage.setItem(PLANNER_SPLIT_HORIZON_STORAGE_KEY, newVal.toString());
});

const cidrOptions = Array.from({ length: 15 }, (_, i) => 16 + i); // /16 to /30

const addNetwork = (networkType: 'bacnet-ip' | 'bacnet-sc' | 'mstp' | 'arcnet') => {
  const newId = `sub-${Date.now()}`;
  let maxThirdOctet = 0;
  subnets.value.forEach(s => {
    const parts = s.ip.split('.').map(Number);
    if (parts.length === 4 && parts[2] > maxThirdOctet) {
      maxThirdOctet = parts[2];
    }
  });
  const nextIp = `192.168.${maxThirdOctet + 1}.0`;
  const serialCount = subnets.value.filter(item => item.networkType === 'mstp' || item.networkType === 'arcnet').length;
  const upstream = ipSubnets.value[0];
  subnets.value.push({
    id: newId,
    name: networkType === 'bacnet-ip' ? `New IP Subnet ${ipSubnets.value.length + 1}` : networkType === 'bacnet-sc' ? 'New BACnet/SC Network' : networkType === 'mstp' ? `New MS/TP Segment ${serialCount + 1}` : `New ARCNET Segment ${serialCount + 1}`,
    ip: nextIp,
    cidr: 24,
    gatewayOffset: 1,
    vlan: '',
    port: 47808,
    bbmdEnabled: false,
    bbmdOffset: 10,
    bmsPlaced: false,
    bmsRole: 'none',
    bmsUsesBacnetIp: true, bmsUsesBacnetSc: false,
    fdrTargetSubnetId: '',
    plannedDevices: 0,
    routeTargets: [], networkType, bacnetNetworkNumber: networkType === 'bacnet-ip' ? '' : 2000 + serialCount + 1, mstpBaudRate: 38400, mstpMaxMaster: 127, arcnetDataRate: networkType === 'arcnet' ? 156.25 : 2500,
    upstreamIpSubnetId: networkType === 'mstp' || networkType === 'arcnet' ? upstream?.id || '' : '', routerName: '', routerIp: '',
    scEnabled: false, scPrimaryHubName: '', scPrimaryHubIp: '', scPrimaryHubUri: '', scFailoverEnabled: false,
    scFailoverHubName: '', scFailoverHubIp: '', scFailoverHubUri: '', scUnderlaySubnetIds: networkType === 'bacnet-sc' && upstream ? [upstream.id] : []
  });
};
const handleNetworkTypeChange = (sub: PlannerSubnet) => {
  normalizeNetwork(sub);
  if (sub.networkType === 'mstp' || sub.networkType === 'arcnet') {
    sub.bbmdEnabled = false; sub.bmsPlaced = false; sub.bmsRole = 'none';
    sub.upstreamIpSubnetId ||= ipSubnets.value.find(item => item.id !== sub.id)?.id || '';
    if (sub.networkType === 'arcnet') sub.arcnetDataRate = 156.25;
  }
};
const physicalHints = (sub: PlannerSubnet) => (sub.physical ??= {});
const physicalPortBudget = (sub: PlannerSubnet) => (sub.physical?.switchCount ?? 0) * (sub.physical?.portsPerSwitch ?? 0);

const deleteSubnet = (id: string) => {
  subnets.value = subnets.value.filter(s => s.id !== id);
};

const autoSizeSubnet = (sub: PlannerSubnet) => {
  const targetCidr = calculateAutoSizeCidr(sub.plannedDevices || 0);
  sub.cidr = targetCidr;
};

const resetToDefaults = () => {
  if (confirm("Reset planner to the default example subnets? All current changes will be lost.")) {
    subnets.value = JSON.parse(JSON.stringify(DEFAULT_SUBNETS));
    splitHorizon.value = false;
  }
};

const clearAllSubnets = () => {
  if (confirm("Clear all subnets from the planner?")) {
    subnets.value = [];
    splitHorizon.value = false;
  }
};

const generateWizardPlan = () => {
  wizardError.value = '';
  const startLong = ipToLong(wizardStartIp.value);
  if (startLong === null) {
    wizardError.value = 'Invalid starting IP address configuration.';
    return;
  }

  if (wizardSubnetCount.value < 1 || wizardSubnetCount.value > 100) {
    wizardError.value = 'Subnet count must be between 1 and 100.';
    return;
  }

  const cidr = wizardSubnetCidr.value;
  const size = Math.pow(2, 32 - cidr);
  const generated: PlannerSubnet[] = [];

  for (let i = 0; i < wizardSubnetCount.value; i++) {
    const subnetLong = startLong + i * size;
    if (subnetLong > 4294967295) {
      wizardError.value = `IP space exceeded. Generated ${i} subnets before hitting IPv4 limit.`;
      return;
    }

    const ip = longToIp(subnetLong);
    const id = `sub-${Date.now()}-${i}`;
    const name = `${wizardNamingPrefix.value} ${i + 1}`;
    const vlan = 10 * (i + 1);

    generated.push({
      id,
      name,
      ip,
      cidr,
      gatewayOffset: 1,
      vlan,
      port: 47808,
      bbmdEnabled: i < 3, // Enable BBMD on first 3 subnets by default
      bbmdOffset: 10,
      bmsPlaced: i === 0, // Put BMS on first subnet
      bmsRole: i === 0 ? 'bbmd' : 'none',
      fdrTargetSubnetId: '',
      plannedDevices: wizardDevicesPerSubnet.value,
      routeTargets: []
    });
  }

  subnets.value = generated;
  showWizard.value = false;
};

// Route target helpers for split horizon
const otherBbmdSubnets = (sub: PlannerSubnet) => {
  return subnets.value.filter(s => s.id !== sub.id && s.bbmdEnabled);
};

const isRouteTarget = (sub: PlannerSubnet, targetId: string) => {
  if (!sub.routeTargets) {
    sub.routeTargets = subnets.value.filter(s => s.id !== sub.id && s.bbmdEnabled).map(s => s.id);
  }
  return sub.routeTargets.includes(targetId);
};

const toggleRouteTarget = (sub: PlannerSubnet, targetId: string) => {
  if (!sub.routeTargets) {
    sub.routeTargets = subnets.value.filter(s => s.id !== sub.id && s.bbmdEnabled).map(s => s.id);
  }
  if (sub.routeTargets.includes(targetId)) {
    sub.routeTargets = sub.routeTargets.filter(id => id !== targetId);
  } else {
    sub.routeTargets.push(targetId);
  }
};

// BMS Single placement toggle handler
const toggleBmsPlaced = (targetSub: PlannerSubnet) => {
  const newVal = !targetSub.bmsPlaced;
  subnets.value.forEach(s => {
    s.bmsPlaced = false;
  });
  targetSub.bmsPlaced = newVal;
};
const handleBbmdToggle = (sub: PlannerSubnet, enabled: boolean) => {
  sub.bbmdEnabled = enabled;
  if (!enabled && sub.bmsRole === 'bbmd') sub.bmsRole = 'none';
};

// Global network validation checks
interface ValidationAlert {
  type: 'error' | 'warning';
  text: string;
  actionText?: string;
  action?: () => void;
}

const validationAlerts = computed<ValidationAlert[]>(() => {
  const alerts: ValidationAlert[] = [];

  for (let i = 0; i < subnets.value.length; i++) {
    const s1 = subnets.value[i];
    if (s1.networkType === 'bacnet-sc') {
      const number = Number(s1.bacnetNetworkNumber);
      if (!Number.isInteger(number) || number < 1 || number > 65534) alerts.push({ type: 'error', text: `BACnet/SC network "${s1.name}" needs a BACnet network number from 1–65534.` });
      if (!s1.scUnderlaySubnetIds?.length) alerts.push({ type: 'error', text: `BACnet/SC network "${s1.name}" must select at least one IP underlay for node-to-hub L3 reachability.` });
      if (!s1.scPrimaryHubName?.trim()) alerts.push({ type: 'error', text: `BACnet/SC network "${s1.name}" needs a primary hub name.` });
      if (!s1.scPrimaryHubIp?.trim() || ipToLong(s1.scPrimaryHubIp) === null) alerts.push({ type: 'error', text: `BACnet/SC network "${s1.name}" needs a valid primary hub IP.` });
      if (!s1.scPrimaryHubUri?.startsWith('wss://')) alerts.push({ type: 'error', text: `BACnet/SC network "${s1.name}" needs a primary wss:// hub URI.` });
      if (s1.scFailoverEnabled) {
        if (!s1.scFailoverHubIp?.trim() || ipToLong(s1.scFailoverHubIp) === null) alerts.push({ type: 'error', text: `BACnet/SC network "${s1.name}" needs a valid failover hub IP.` });
        if (!s1.scFailoverHubUri?.startsWith('wss://')) alerts.push({ type: 'error', text: `BACnet/SC network "${s1.name}" needs a failover wss:// hub URI.` });
      }
      const underlays = (s1.scUnderlaySubnetIds ?? []).map(id => subnets.value.find(item => item.id === id)).filter((item): item is PlannerSubnet => Boolean(item && isIpNetwork(item)));
      for (const [label, hubIp] of [['Primary', s1.scPrimaryHubIp], ['Failover', s1.scFailoverEnabled ? s1.scFailoverHubIp : '']] as const) {
        if (!hubIp || ipToLong(hubIp) === null) continue;
        const onUnderlay = underlays.some(underlay => {
          const details = getSubnetDetails(underlay.ip, underlay.cidr); const value = ipToLong(hubIp);
          return details && value !== null && value >= details.networkLong && value <= details.broadcastLong;
        });
        if (!onUnderlay) alerts.push({ type: 'warning', text: `${label} hub ${hubIp} is outside the selected IP underlays for "${s1.name}". Document the L3 route, return route, DNS resolution, firewall allowance, and TLS trust path.` });
      }
      continue;
    }
    if (!isIpNetwork(s1)) {
      const number = Number(s1.bacnetNetworkNumber);
      if (!Number.isInteger(number) || number < 1 || number > 65534) alerts.push({ type: 'error', text: `Network "${s1.name}" needs a BACnet network number from 1–65534.` });
      const upstream = subnets.value.find(item => item.id === s1.upstreamIpSubnetId && item.id !== s1.id && (isIpNetwork(item) || item.networkType === s1.networkType));
      if (!upstream) alerts.push({ type: 'error', text: `Field bus "${s1.name}" must select an upstream BACnet/IP or same-type field network.` });
      if (!s1.routerName?.trim()) alerts.push({ type: 'error', text: `Field bus "${s1.name}" needs the BACnet routing device name.` });
      if (!routerAddressValid(s1, upstream)) alerts.push({ type: 'error', text: `Field bus "${s1.name}" needs a valid routing-device address on its upstream network.` });
      if (s1.networkType === 'mstp' && (s1.plannedDevices || 0) > (s1.mstpMaxMaster ?? 127) + 1) alerts.push({ type: 'error', text: `MS/TP network "${s1.name}" has more planned devices than its Max Master setting permits.` });
      if (s1.networkType === 'arcnet' && (s1.plannedDevices || 0) > 256) alerts.push({ type: 'error', text: `ARCNET network "${s1.name}" exceeds the 256-node address space.` });
      const plannedSegments = s1.networkType === 'arcnet' ? s1.physical?.arcnetSegments : s1.physical?.mstpSegments;
      if (plannedSegments !== undefined && plannedSegments * 32 < (s1.plannedDevices ?? 0)) alerts.push({ type: 'warning', text: `${s1.name} needs at least ${Math.ceil((s1.plannedDevices ?? 0) / 32)} physical segments for its planned node count.` });
      const plannedLength = s1.networkType === 'arcnet' ? s1.physical?.arcnetSegmentLengthMeters : s1.physical?.mstpSegmentLengthMeters;
      const lengthLimit = s1.networkType === 'arcnet' ? ARC156_MAX_LENGTH_METERS : mstpLengthLimit(s1.physical?.cable ?? 'stp-18awg', s1.mstpBaudRate ?? 38400);
      if ((plannedLength ?? 0) > lengthLimit) alerts.push({ type: 'warning', text: `${s1.name} estimates ${plannedLength} m per segment, above the ${lengthLimit} m modeled limit.` });
      continue;
    }
    const details1 = getSubnetDetails(s1.ip, s1.cidr);
    if (!details1) continue;
    if (s1.scEnabled) {
      if (!s1.scPrimaryHubName?.trim()) alerts.push({ type: 'error', text: `IP subnet "${s1.name}" enables BACnet/SC but has no hub name.` });
      if (!s1.scPrimaryHubIp?.trim() || ipToLong(s1.scPrimaryHubIp) === null) alerts.push({ type: 'error', text: `BACnet/SC hub on "${s1.name}" needs a valid IP.` });
      if (!s1.scPrimaryHubUri?.startsWith('wss://')) alerts.push({ type: 'error', text: `BACnet/SC hub on "${s1.name}" needs a wss:// URI.` });
      if (s1.scFailoverEnabled && (!s1.scFailoverHubIp?.trim() || ipToLong(s1.scFailoverHubIp) === null || !s1.scFailoverHubUri?.startsWith('wss://'))) alerts.push({ type: 'error', text: `BACnet/SC HA infrastructure on "${s1.name}" needs a valid failover IP and wss:// URI.` });
    }
    if (s1.bmsPlaced && s1.bmsUsesBacnetSc && !s1.scEnabled) alerts.push({ type: 'error', text: `BMS on "${s1.name}" uses BACnet/SC but no SC hub infrastructure is configured on that IP network.` });
    if (s1.bmsPlaced && !s1.bmsUsesBacnetIp && !s1.bmsUsesBacnetSc) alerts.push({ type: 'warning', text: `BMS on "${s1.name}" has no BACnet service selected.` });
    if (s1.physical && physicalPortBudget(s1) < (s1.plannedDevices ?? 0)) alerts.push({ type: 'warning', text: `${s1.name} plans ${s1.plannedDevices ?? 0} devices but only ${physicalPortBudget(s1)} switch ports.` });

    // Capacity warning (> 500 usable IPs)
    if (details1.numHosts > 500) {
      alerts.push({
        type: 'warning',
        text: `Subnet "${s1.name}" contains ${details1.numHosts} usable IPs. Consider splitting to manage broadcast storm risks.`
      });
    }

    for (let j = i + 1; j < subnets.value.length; j++) {
      const s2 = subnets.value[j];
      const details2 = getSubnetDetails(s2.ip, s2.cidr);
      if (!details2) continue;

      const overlapClassification = classifyOverlap(s1, s2);
      if (overlapClassification) {
        alerts.push({
          type: overlapClassification.type,
          text: overlapClassification.text,
          actionText: `Shift "${s2.name}"`,
          action: () => {
            const nextIp = findNextAvailableSubnetBlock(s2, s2.cidr, subnets.value);
            if (nextIp) {
              s2.ip = nextIp;
            } else {
              alert("No free block found in candidate search.");
            }
          }
        });
      }
      const rangesOverlap = details1.networkLong <= details2.broadcastLong && details2.networkLong <= details1.broadcastLong;
      if (advancedBacnetPorts.value && rangesOverlap && s1.vlan === s2.vlan && (s1.port || 47808) !== (s2.port || 47808)) {
        const firstNetwork = Number(s1.bacnetNetworkNumber);
        const secondNetwork = Number(s2.bacnetNetworkNumber);
        if (!Number.isInteger(firstNetwork) || firstNetwork < 1 || firstNetwork > 65534 || !Number.isInteger(secondNetwork) || secondNetwork < 1 || secondNetwork > 65534 || firstNetwork === secondNetwork) {
          alerts.push({ type: 'error', text: `Port-separated B/IP networks "${s1.name}" and "${s2.name}" need distinct BACnet network numbers from 1–65534.` });
        }
      }
    }
  }

  // Split Horizon asymmetric validation
  if (splitHorizon.value) {
    const bbmds = subnets.value.filter(s => s.bbmdEnabled);
    for (const s1 of bbmds) {
      // Lazy load default targets
      if (!s1.routeTargets) {
        s1.routeTargets = bbmds.filter(s => s.id !== s1.id).map(s => s.id);
      }
      const s1Targets = s1.routeTargets || [];
      for (const s2 of bbmds) {
        if (s1.id === s2.id) continue;
        if (!s2.routeTargets) {
          s2.routeTargets = bbmds.filter(s => s.id !== s2.id).map(s => s.id);
        }
        const s2Targets = s2.routeTargets || [];

        const s1ToS2 = s1Targets.includes(s2.id);
        const s2ToS1 = s2Targets.includes(s1.id);

        if (s1ToS2 !== s2ToS1 && s1.port === s2.port) {
          alerts.push({
            type: 'warning',
            text: `Asymmetric split-horizon routing detected: BDT entry between "${s1.name}" and "${s2.name}" is one-way.`
          });
        }
      }
    }
  }

  return alerts;
});

// BMS Status computed text
const bmsStatus = computed(() => {
  const placedList = subnets.value.filter(s => s.bmsPlaced);
  if (placedList.length === 0) {
    return 'No BMS server placed in any subnet.';
  }
  if (placedList.length > 1) {
    return `Multiple BMS servers placed (${placedList.map(s => s.name).join(', ')}). Ensure only one master server exists.`;
  }
  const bmsSub = placedList[0];
  const bmsIp = getOffsetIp(bmsSub.ip, bmsSub.cidr, getBmsHostOffset(bmsSub));

  if (bmsSub.bmsRole === 'bbmd') {
    return `BMS Server placed on "${bmsSub.name}" at IP ${bmsIp}. Acting as Local BBMD.`;
  } else if (bmsSub.bmsRole === 'fdr') {
    const targetSub = subnets.value.find(s => s.id === bmsSub.fdrTargetSubnetId);
    return `BMS Server placed on "${bmsSub.name}" at IP ${bmsIp}. Configured as Foreign Device (FDR), registering to BBMD on "${targetSub ? targetSub.name : 'Unknown'}".`;
  } else {
    return `BMS Server placed on "${bmsSub.name}" at IP ${bmsIp}. Standard host without BBMD registration (local traffic only).`;
  }
});

// BDT Schedule computed structured data
const bdtScheduleData = computed(() => {
  const bbmds = subnets.value.filter(s => s.bbmdEnabled);
  return bbmds.map(sub => {
    const selfIp = getOffsetIp(sub.ip, sub.cidr, sub.bbmdOffset);

    // Default targets setup if missing
    if (!sub.routeTargets) {
      sub.routeTargets = bbmds.filter(b => b.id !== sub.id).map(b => b.id);
    }
    const allowedTargets = sub.routeTargets || [];
    const targets = bbmds.filter(b =>
      b.id !== sub.id &&
      b.port === (sub.port || 47808) &&
      (!splitHorizon.value || allowedTargets.includes(b.id))
    ).map(b => ({
      ip: getOffsetIp(b.ip, b.cidr, b.bbmdOffset),
      name: b.name
    }));

    return {
      subnetName: sub.name,
      selfIp,
      port: sub.port || 47808,
      targets
    };
  });
});

// Live sheet structure computed data
const sheetStructureData = computed(() => {
  return subnets.value.map((sub, idx) => {
    const details = getSubnetDetails(sub.ip, sub.cidr);
    const plannedCount = sub.plannedDevices || (details ? details.numHosts : 0);
    const limit = details ? (details.numHosts <= 1024 ? details.numHosts : Math.max(plannedCount, 100)) : 0;
    const sanitizedName = sub.name.replace(/[\\\?\*:\/\[\]]/g, "").substring(0, 30);
    return {
      index: idx + 2,
      name: sanitizedName,
      vlan: sub.vlan || 'None',
      port: sub.port,
      limit
    };
  });
});

// Trigger Excel download
const exportXlsx = () => {
  exportPlannerXlsx(createPlannerProject(subnets.value, splitHorizon.value));
};
const savePlannerProject = () => {
  const project = createPlannerProject(subnets.value, splitHorizon.value);
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const planName = subnets.value[0]?.name || 'bacnet-network-plan';
  const filename = planName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'bacnet-network-plan';
  link.href = url;
  link.download = `${filename}-plan.json`;
  link.click();
  URL.revokeObjectURL(url);
  plannerFileNotice.value = `Saved ${subnets.value.length} planned ${subnets.value.length === 1 ? 'network' : 'networks'} to ${link.download}.`;
};
const loadPlannerProject = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const parsed: unknown = JSON.parse(await file.text());
    const migrated = migratePlannerProject(parsed);
    subnets.value = migrateLegacyScNetworks(migrated.subnets.map(subnet => normalizeNetwork({ ...subnet })));
    splitHorizon.value = migrated.splitHorizon;
    plannerFileNotice.value = `Loaded ${subnets.value.length} planned ${subnets.value.length === 1 ? 'network' : 'networks'} from ${file.name}.`;
  } catch {
    window.alert('That file is not a valid BACnet Studio network plan.');
  } finally {
    input.value = '';
  }
};
const visualizePlan = () => {
  if (!handoffPlannerDiagram(createDiagramProjectFromPlan(subnets.value, splitHorizon.value))) return;
  window.dispatchEvent(new CustomEvent('ace-open-planned-diagram'));
};
</script>
