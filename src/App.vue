<template>
  <div class="app-container">
    <AceNetworkIconSymbols />
    <!-- Header -->
    <header>
      <div class="logo-section">
        <img class="brand-logo brand-logo-header" :src="brandLogoWhiteUrl" alt="" aria-hidden="true">
        <h1 class="visually-hidden">BACnet Studio by ACE IoT</h1>
      </div>
      <p class="subtitle">Plan, diagram, validate, and troubleshoot BACnet networks in one interactive workspace from ACE IoT.</p>
      <nav class="agent-discovery-links" aria-label="Agent and data documentation">
        <a href="./agent-guide.html">Agent &amp; data access</a>
        <a href="./capabilities.json">Capabilities</a>
        <a href="./llms.txt">llms.txt</a>
      </nav>
    </header>

    <!-- Navigation Tabs -->
    <nav class="tabs-navigation" aria-label="BACnet Studio tools" role="tablist">
      <button id="tab-planner" class="tab-btn" :class="{ active: activeTab === 'planner' }" role="tab" :aria-selected="activeTab === 'planner'" aria-controls="panel-planner" @click="setActiveTab('planner')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        Network Planner
      </button>
      <button id="tab-diagram" class="tab-btn" :class="{ active: activeTab === 'diagram' }" role="tab" :aria-selected="activeTab === 'diagram'" aria-controls="panel-diagram" @click="setActiveTab('diagram')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="6" height="6" rx="1"></rect>
          <rect x="15" y="15" width="6" height="6" rx="1"></rect>
          <path d="M9 6h4a4 4 0 0 1 4 4v5"></path>
          <path d="M6 9v6a3 3 0 0 0 3 3h6"></path>
        </svg>
        Diagram Builder
      </button>
      <button id="tab-calculator" class="tab-btn" :class="{ active: activeTab === 'calculator' }" role="tab" :aria-selected="activeTab === 'calculator'" aria-controls="panel-calculator" @click="setActiveTab('calculator')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="13" x2="15" y2="13"></line>
          <line x1="9" y1="17" x2="15" y2="17"></line>
          <line x1="12" y1="9" x2="12" y2="17"></line>
        </svg>
        Calculator & Simulator
      </button>
      <button id="tab-primer" class="tab-btn" :class="{ active: activeTab === 'primer' }" role="tab" :aria-selected="activeTab === 'primer'" aria-controls="panel-primer" @click="setActiveTab('primer')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
        Interactive Primer
      </button>
      <button id="tab-glossary" class="tab-btn" :class="{ active: activeTab === 'glossary' }" role="tab" :aria-selected="activeTab === 'glossary'" aria-controls="panel-glossary" @click="setActiveTab('glossary')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          <path d="M9 7h7M9 11h5"></path>
        </svg>
        Glossary
      </button>
    </nav>

    <!-- Active Tab Page Content -->
    <div id="panel-planner" v-show="activeTab === 'planner'" class="page-tab" :class="{ active: activeTab === 'planner' }" role="tabpanel" aria-labelledby="tab-planner">
      <PlannerPage />
    </div>
    <div id="panel-diagram" v-show="activeTab === 'diagram'" class="page-tab" :class="{ active: activeTab === 'diagram' }" role="tabpanel" aria-labelledby="tab-diagram">
      <NetworkDiagramPage />
    </div>
    <div id="panel-calculator" v-show="activeTab === 'calculator'" class="page-tab" :class="{ active: activeTab === 'calculator' }" role="tabpanel" aria-labelledby="tab-calculator">
      <CalculatorPage />
    </div>
    <div id="panel-primer" v-show="activeTab === 'primer'" class="page-tab" :class="{ active: activeTab === 'primer' }" role="tabpanel" aria-labelledby="tab-primer">
      <PrimerPage />
    </div>
    <div id="panel-glossary" v-show="activeTab === 'glossary'" class="page-tab" :class="{ active: activeTab === 'glossary' }" role="tabpanel" aria-labelledby="tab-glossary">
      <GlossaryPage :target="glossaryTarget" @navigate="openGlossary" />
    </div>

    <!-- Footer -->
    <footer>
      <div class="footer-logo" style="display: flex; align-items: center; gap: 0.75rem;">
        <img class="brand-logo brand-logo-footer" :src="brandLogoWhiteUrl" alt="BACnet Studio by ACE IoT">
      </div>
      <p>Designed for control engineers, network integrators, and building automation specialists. &copy; 2026. Hosted on GitHub Pages via Actions.</p>
      <p class="footer-resource-links"><a href="./agent-guide.html">Agent &amp; data access</a><span aria-hidden="true">·</span><a href="./capabilities.json">Capability manifest</a><span aria-hidden="true">·</span><a href="./schemas/diagram-project-v2.schema.json">Diagram schema</a><span aria-hidden="true">·</span><a href="./schemas/planner-project-v2.schema.json">Planner schema</a></p>
      <button class="footer-signup-button" type="button" @click="openSignup">
        Sign up for updates
      </button>
    </footer>

    <SignupBanner :visible="signupVisible" @close="closeSignup" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, watch } from 'vue';
import CalculatorPage from './components/CalculatorPage.vue';
import PrimerPage from './components/PrimerPage.vue';
import PlannerPage from './components/PlannerPage.vue';
import NetworkDiagramPage from './components/NetworkDiagramPage.vue';
import GlossaryPage from './components/GlossaryPage.vue';
import AceNetworkIconSymbols from './components/AceNetworkIconSymbols.vue';
import SignupBanner from './components/SignupBanner.vue';
import brandLogoWhiteUrl from './assets/brand/bacnet-studio-white.svg';

interface LogEntry {
  text: string;
  type: 'system' | 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

type AppTab = 'calculator' | 'primer' | 'planner' | 'diagram' | 'glossary';
const activeTab = ref<AppTab>('planner');
const glossaryTarget = ref<string | null>(null);
const signupVisible = ref(false);
const advancedBacnetPorts = ref(localStorage.getItem('ace-advanced-bacnet-ports') === 'true');
const SIGNUP_SEEN_KEY = 'ace-updates-signup-seen-v1';

// Synchronize hash to activeTab
const updateTabFromHash = () => {
  const [tab, target] = window.location.hash.replace('#', '').split('/');
  if (tab === 'calculator' || tab === 'primer' || tab === 'planner' || tab === 'diagram' || tab === 'glossary') {
    activeTab.value = tab;
    glossaryTarget.value = tab === 'glossary' && target ? decodeURIComponent(target) : null;
  } else {
    // Default to current tab if invalid or empty hash
    window.location.hash = activeTab.value;
  }
};

// Set hash when activeTab is clicked
const setActiveTab = (tab: AppTab) => {
  activeTab.value = tab;
  glossaryTarget.value = null;
  window.location.hash = tab;
};

const openGlossary = (term: string) => {
  glossaryTarget.value = term;
  activeTab.value = 'glossary';
  window.location.hash = `glossary/${encodeURIComponent(term)}`;
};

const openSignup = () => {
  signupVisible.value = true;
};

const closeSignup = () => {
  signupVisible.value = false;
};

// Initial resolve before mount
updateTabFromHash();

onMounted(() => {
  window.addEventListener('hashchange', updateTabFromHash);
  window.addEventListener('ace-open-planned-diagram', openPlannedDiagram);
  try {
    if (localStorage.getItem(SIGNUP_SEEN_KEY) !== 'true') {
      signupVisible.value = true;
      localStorage.setItem(SIGNUP_SEEN_KEY, 'true');
    }
  } catch {
    // Storage can be unavailable in privacy-restricted contexts; the footer control remains usable.
  }
});

const openPlannedDiagram = () => setActiveTab('diagram');

onUnmounted(() => {
  window.removeEventListener('hashchange', updateTabFromHash);
  window.removeEventListener('ace-open-planned-diagram', openPlannedDiagram);
});

const logs = ref<LogEntry[]>([
  {
    text: '[System] BACnet simulator initialized. Choose preset or adjust subnets below to begin testing traffic.',
    type: 'system',
    timestamp: new Date().toLocaleTimeString()
  }
]);

const logToConsole = (text: string, type: 'system' | 'info' | 'success' | 'warning' | 'error' = 'info') => {
  logs.value.push({
    text,
    type,
    timestamp: new Date().toLocaleTimeString()
  });
};

const clearConsole = () => {
  logs.value = [
    {
      text: '[System] Console cleared. Ready.',
      type: 'system',
      timestamp: new Date().toLocaleTimeString()
    }
  ];
};

provide('logs', logs);
provide('logToConsole', logToConsole);
provide('advancedBacnetPorts', advancedBacnetPorts);
provide('openGlossary', openGlossary);

watch(advancedBacnetPorts, value => localStorage.setItem('ace-advanced-bacnet-ports', String(value)));
provide('clearConsole', clearConsole);
</script>

<style>
/* Maintain tab visual heights for clean transition */
.page-tab {
  display: none;
}
.page-tab.active {
  display: block;
}
</style>
