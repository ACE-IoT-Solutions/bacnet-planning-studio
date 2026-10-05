<template>
  <div class="app-container">
    <AceNetworkIconSymbols />
    <!-- Header -->
    <header>
      <div class="logo-section">
        <svg class="logo-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 201 56" style="height: 52px; width: auto; display: block;">
          <g fill="none" fill-rule="evenodd">
            <path class="solutions-wordmark" fill="#94a3b8" d="M74.272 41.586c3.286.291 5.611.982 5.611 3.453 0 2.21-1.909 3.715-5.554 3.715-2.583 0-4.75-.752-6.329-2.103l1.536-1.934c1.19 1.075 2.841 1.673 4.85 1.673 1.723 0 2.584-.337 2.584-1.044 0-.69-.804-.92-2.87-1.105-2.986-.276-5.698-.982-5.698-3.377 0-2.302 2.325-3.56 5.51-3.56 2.154 0 4.134.552 5.512 1.596l-1.478 1.949c-1.12-.844-2.469-1.182-4.033-1.197-1.177 0-2.598.2-2.598.967 0 .721 1.163.813 2.957.967zm16.253 7.168c-3.975 0-6.544-2.087-6.544-5.725 0-3.638 2.569-5.726 6.544-5.726 3.976 0 6.559 2.088 6.559 5.726s-2.583 5.725-6.559 5.725zm0-2.548c2.21 0 3.574-1.151 3.574-3.177 0-2.027-1.364-3.178-3.574-3.178-2.195 0-3.573 1.151-3.573 3.178 0 2.026 1.363 3.177 3.573 3.177zm14.288-.322h6.76V48.4h-9.688V37.656h2.928v8.228zm19.368-8.228h2.928v5.68c0 3.27-2.081 5.418-5.827 5.418s-5.841-2.149-5.841-5.418v-5.68h2.927v5.434c0 1.873.976 3.085 2.914 3.085 1.937 0 2.899-1.212 2.899-3.085v-5.434zm18.435 0v2.502h-4.176v8.243h-2.928v-8.243h-4.148v-2.502h11.252zm7.341 10.745h-2.928V37.656h2.928v10.745zm11.36.353c-3.976 0-6.545-2.087-6.545-5.725 0-3.638 2.57-5.726 6.545-5.726s6.559 2.088 6.559 5.726-2.584 5.725-6.56 5.725zm0-2.548c2.21 0 3.573-1.151 3.573-3.177 0-2.027-1.363-3.178-3.573-3.178-2.196 0-3.574 1.151-3.574 3.178 0 2.026 1.364 3.177 3.574 3.177zm20.415-8.55h2.828v10.745h-2.57l-6.486-7.06v7.06h-2.827V37.656h3.1l5.955 6.57v-6.57zm13.656 3.93c3.287.291 5.612.982 5.612 3.453 0 2.21-1.909 3.715-5.554 3.715-2.583 0-4.75-.752-6.33-2.103l1.536-1.934c1.192 1.075 2.842 1.673 4.851 1.673 1.723 0 2.584-.337 2.584-1.044 0-.69-.804-.92-2.87-1.105-2.986-.276-5.698-.982-5.698-3.377 0-2.302 2.325-3.56 5.51-3.56 2.153 0 4.134.552 5.512 1.596l-1.478 1.949c-1.12-.844-2.469-1.182-4.033-1.197-1.177 0-2.598.2-2.598.967 0 .721 1.163.813 2.956.967z"></path>
            <path class="ace-wordmark" fill="#ffffff" d="M158.697 13.642V26.42c0 .704.455.957 1.124.957h2.355v2.364h-11.561v-2.364h2.462c.562 0 1.017-.394 1.017-.985V13.642c0-.591-.455-.957-1.017-.957h-2.462v-2.393h11.56v2.393h-2.354c-.67 0-1.124.253-1.124.957zm18.128 3.63c0 3.182-1.873 6.165-5.86 6.165-4.122 0-5.781-2.927-5.781-6.108 0-3.152 2.087-6.023 6.048-6.023 3.8 0 5.593 2.955 5.593 5.967zm-5.968 3.97c2.195 0 2.409-2.055 2.409-3.744 0-1.604-.107-3.969-2.221-3.969-2.195 0-2.302 2.393-2.302 3.94 0 1.436.107 3.773 2.114 3.773zm4.282 6.98h-8.403V25.24h8.403v2.983zm16.592-15.453v13.652c0 .704.455.957 1.124.957h2.328v2.364h-11.534v-2.364h2.435c.562 0 1.044-.394 1.044-.985V12.769h-2.114c-3.265 0-3.48 2.393-3.773 5.039h-2.302v-7.516H200v7.516h-2.275c-.294-2.674-.535-5.039-3.827-5.039h-2.167zM67 27.111c2 0 2.4-.113 3.147-1.778l6.88-15.488h4.108l6.907 15.573c.693 1.608 1.173 1.693 3.227 1.693v2.37H80.76v-2.37h2.08c.534 0 .854-.283.854-.734 0-.705-.827-2.116-1.334-3.216h-8.427c-.827 1.862-1.253 2.878-1.253 3.216 0 .62.613.734 2.026.734h.934v2.37H67v-2.37zm14.321-6.32l-3.2-7.137-3.174 7.137h6.374zm10.641-1.044c0-5.867 4.24-10.55 11.068-10.55 2.347 0 4.72.677 6.507 2.002l.96-1.608h2.214v7.646h-2.454c-.88-3.752-3.493-5.445-6.747-5.445-5.494 0-6.667 4.203-6.667 7.984 0 3.808 1.413 7.56 6.907 7.56 4.32 0 6.534-2.454 6.64-6.093h2.667c0 5.275-3.44 8.773-10.054 8.773-7.067 0-11.04-4.231-11.04-10.269zm23.229 7.364h2.454c.56 0 1.013-.395 1.013-.988V13.428c0-.762-.48-1.044-1.067-1.044h-2.4V9.986h21.229v7.505h-2.347c-.107-2.116-.267-5.107-3.494-5.107h-7.334v5.755h3.2c1.12 0 1.84-.677 1.84-1.608v-1.664h2.24v9.084h-2.266V22.71c0-1.27-.32-2.116-1.867-2.116h-3.147v6.488h7.654c3.334 0 3.334-3.639 3.467-5.811h2.4v8.21h-21.575v-2.37z"></path>
            <path fill="#c1d200" fill-rule="nonzero" d="M49.613 36.717a37.11 37.11 0 0 0-2.688-.933c.107-.427.2-.856.279-1.286a1.51 1.51 0 0 1 1.666-1.213c.78.103 1.298.813 1.158 1.586a23.028 23.028 0 0 1-.415 1.846zm-10.026-2.904a12.663 12.663 0 0 0-.73-7.277 12.54 12.54 0 0 0-1.217-2.253c-.446-.656-.268-1.562.397-2.024.665-.46 1.566-.305 2.013.35a15.529 15.529 0 0 1 2.338 11.925 411.835 411.835 0 0 0-2.801-.72zm1.142 4.337c-.34.146-.733.164-1.098.02a1.406 1.406 0 0 1-.87-1.05c.608.32 1.262.663 1.968 1.03zM23.374 15.957c.252 1.04.482 1.966.686 2.805a13.03 13.03 0 0 0-1.318.387 1.4 1.4 0 0 1-1.876-1.171 1.514 1.514 0 0 1 1.002-1.574c.493-.173.996-.322 1.506-.447zm3.637-.46a15.198 15.198 0 0 1 4.12.521 15.009 15.009 0 0 1 5.283 2.622c.622.483.721 1.396.22 2.039-.502.643-1.413.773-2.035.29a12.217 12.217 0 0 0-6.756-2.536c-.27-.017-.543-.025-.816-.025-.006-.869-.008-1.831-.016-2.91zm-.075-4.818a43.748 43.748 0 0 0-.175-2.99c.543-.022 1.085-.022 1.624-.001.78.03 1.379.728 1.336 1.55-.04.828-.706 1.475-1.485 1.445a18.706 18.706 0 0 0-1.3-.004zm-4.63.719c-.679.191-1.346.42-1.998.683a19.775 19.775 0 0 0-3.519 1.857 20.587 20.587 0 0 0-3.07 2.496 21.461 21.461 0 0 0-2.553 3.042c-.466.673-1.35.826-1.976.343-.312-.24-.5-.594-.554-.97-.053-.38.03-.784.264-1.121a24.505 24.505 0 0 1 2.915-3.473 23.516 23.516 0 0 1 3.506-2.852 22.64 22.64 0 0 1 4.021-2.121 22.198 22.198 0 0 1 2.401-.814 44.107 44.107 0 0 0 .563 2.93zm-12.38 30.06a38.185 38.185 0 0 0-2.428 1.831 21.374 21.374 0 0 1-2.407-6.21c-.166-.763.352-1.554 1.148-1.761.801-.21 1.584.239 1.75 1.002a18.821 18.821 0 0 0 1.937 5.138zm2.84 3.842a19.002 19.002 0 0 0 4.33 3.341 19.822 19.822 0 0 0 3.542 1.554c.758.248 1.125 1.059.82 1.81a1.588 1.588 0 0 1-.79.83 1.535 1.535 0 0 1-1.136.082 22.633 22.633 0 0 1-4.043-1.774 21.707 21.707 0 0 1-3.597-2.535 21.197 21.197 0 0 1-1.477-1.417 37.579 37.579 0 0 0 2.352-1.891zm1.09-6.397a15.515 15.515 0 0 1-1.71-7.216c.008-1.006.115-2.02.317-3.013.2-.981.495-1.953.878-2.885.307-.748 1.156-1.12 1.896-.828.74.29 1.091 1.131.784 1.878a12.9 12.9 0 0 0-.975 4.806 12.624 12.624 0 0 0 1.306 5.702c-.76.47-1.588.984-2.495 1.556zM7.79 28.132a1.502 1.502 0 0 1-.837 1.078c-.252.12-.539.172-.83.133a1.341 1.341 0 0 1-1.157-1.585 23.377 23.377 0 0 1 1.194-4.228c.286-.739 1.117-1.137 1.855-.89.74.248 1.107 1.047.821 1.786a20.454 20.454 0 0 0-1.046 3.706zm37.5-5.678a18.489 18.489 0 0 0-4.69-6.29 19.036 19.036 0 0 0-3.15-2.219 19.76 19.76 0 0 0-3.541-1.554c-.759-.248-1.126-1.059-.82-1.81.305-.752 1.167-1.16 1.925-.912a22.54 22.54 0 0 1 4.043 1.775 21.677 21.677 0 0 1 3.597 2.535 21.127 21.127 0 0 1 5.356 7.18 21.503 21.503 0 0 1 1.446 4.348c.145.668-.232 1.356-.865 1.657-.09.043-.185.079-.284.105-.8.21-1.584-.24-1.75-1.003a18.802 18.802 0 0 0-1.267-3.812zM21.575 43.087a12.332 12.332 0 0 0 4.72 1.26c.851.053 1.719.019 2.578-.102.86-.12 1.709-.327 2.524-.614a1.4 1.4 0 0 1 1.817.886c.24.758-.182 1.59-.944 1.858-1 .352-2.041.606-3.093.754-1.051.147-2.114.19-3.158.124a15.05 15.05 0 0 1-5.797-1.548c-.88-.438-1.72-.965-2.496-1.566a1.393 1.393 0 0 1-.533-.962 1.495 1.495 0 0 1 .312-1.075c.5-.643 1.412-.774 2.035-.292.633.49 1.318.92 2.035 1.277zm8.93 8.66a19.458 19.458 0 0 0 3.904-1.12 19.79 19.79 0 0 0 3.519-1.856 20.624 20.624 0 0 0 3.07-2.497 21.396 21.396 0 0 0 2.553-3.042c.466-.672 1.35-.826 1.976-.343.627.483.756 1.42.29 2.091a24.406 24.406 0 0 1-2.915 3.473 23.484 23.484 0 0 1-3.507 2.852 22.614 22.614 0 0 1-4.02 2.12c-.77.247-1.58-.2-1.747-.963a18.847 18.847 0 0 0-1.285-3.805z" opacity=".6"></path>
            <path fill="#c1d200" fill-rule="nonzero" d="M16.871 36.598a11.6 11.6 0 0 0 1.557 2.53c-1.574 1.153-3.498 2.573-5.988 4.329C3.77 49.569.818 48.132.581 47.723c-.236-.41-.005-3.683 9.624-8.137 2.726-1.26 4.895-2.208 6.666-2.988zm11.886-16.25a10.785 10.785 0 0 0-2.906-.1c-.193-2.03-.467-4.584-.734-7.993-.8-10.245 2.102-12.01 2.6-12.008.498.003 3.328 1.799 2.11 12.033-.41 3.453-.793 6.026-1.07 8.067zm6.882 18.537a11.615 11.615 0 0 0 1.436-2.448c1.941.8 4.427 1.776 7.755 3.203 9.472 4.063 9.612 7.411 9.366 7.844-.247.433-3.227 2.063-11.7-3.752-2.992-2.055-5.145-3.635-6.857-4.847zm-.836-11.888c2.505 4.502 1.019 10.258-3.319 12.857-4.338 2.6-9.884 1.057-12.388-3.445-2.504-4.501-1.018-10.258 3.32-12.857 4.337-2.6 9.883-1.057 12.387 3.445zm-3.205 1.921c-1.482-2.664-4.765-3.577-7.332-2.039-2.567 1.538-3.447 4.945-1.965 7.61 1.483 2.664 4.765 3.577 7.332 2.038 2.567-1.538 3.447-4.945 1.965-7.609zm-1.924 1.297c.87 1.561.354 3.559-1.151 4.46-1.505.902-3.43.367-4.298-1.195-.869-1.562-.353-3.559 1.151-4.46 1.505-.902 3.43-.367 4.298 1.195z"></path>
          </g>
        </svg>
        <div class="header-title-container">
          <h1 class="header-title">BACnet Studio <span class="header-title-byline">by ACE IoT</span></h1>
        </div>
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 201 56" style="height: 28px; width: auto; display: block;">
          <g fill="none" fill-rule="evenodd">
            <path class="solutions-wordmark" fill="#94a3b8" d="M74.272 41.586c3.286.291 5.611.982 5.611 3.453 0 2.21-1.909 3.715-5.554 3.715-2.583 0-4.75-.752-6.329-2.103l1.536-1.934c1.19 1.075 2.841 1.673 4.85 1.673 1.723 0 2.584-.337 2.584-1.044 0-.69-.804-.92-2.87-1.105-2.986-.276-5.698-.982-5.698-3.377 0-2.302 2.325-3.56 5.51-3.56 2.154 0 4.134.552 5.512 1.596l-1.478 1.949c-1.12-.844-2.469-1.182-4.033-1.197-1.177 0-2.598.2-2.598.967 0 .721 1.163.813 2.957.967zm16.253 7.168c-3.975 0-6.544-2.087-6.544-5.725 0-3.638 2.569-5.726 6.544-5.726 3.976 0 6.559 2.088 6.559 5.726s-2.583 5.725-6.559 5.725zm0-2.548c2.21 0 3.574-1.151 3.574-3.177 0-2.027-1.364-3.178-3.574-3.178-2.195 0-3.573 1.151-3.573 3.178 0 2.026 1.363 3.177 3.573 3.177zm14.288-.322h6.76V48.4h-9.688V37.656h2.928v8.228zm19.368-8.228h2.928v5.68c0 3.27-2.081 5.418-5.827 5.418s-5.841-2.149-5.841-5.418v-5.68h2.927v5.434c0 1.873.976 3.085 2.914 3.085 1.937 0 2.899-1.212 2.899-3.085v-5.434zm18.435 0v2.502h-4.176v8.243h-2.928v-8.243h-4.148v-2.502h11.252zm7.341 10.745h-2.928V37.656h2.928v10.745zm11.36.353c-3.976 0-6.545-2.087-6.545-5.725 0-3.638 2.57-5.726 6.545-5.726s6.559 2.088 6.559 5.726-2.584 5.725-6.56 5.725zm0-2.548c2.21 0 3.573-1.151 3.573-3.177 0-2.027-1.363-3.178-3.573-3.178-2.196 0-3.574 1.151-3.574 3.178 0 2.026 1.364 3.177 3.574 3.177zm20.415-8.55h2.828v10.745h-2.57l-6.486-7.06v7.06h-2.827V37.656h3.1l5.955 6.57v-6.57zm13.656 3.93c3.287.291 5.612.982 5.612 3.453 0 2.21-1.909 3.715-5.554 3.715-2.583 0-4.75-.752-6.33-2.103l1.536-1.934c1.192 1.075 2.842 1.673 4.851 1.673 1.723 0 2.584-.337 2.584-1.044 0-.69-.804-.92-2.87-1.105-2.986-.276-5.698-.982-5.698-3.377 0-2.302 2.325-3.56 5.51-3.56 2.153 0 4.134.552 5.512 1.596l-1.478 1.949c-1.12-.844-2.469-1.182-4.033-1.197-1.177 0-2.598.2-2.598.967 0 .721 1.163.813 2.956.967z"></path>
            <path class="ace-wordmark" fill="#ffffff" d="M158.697 13.642V26.42c0 .704.455.957 1.124.957h2.355v2.364h-11.561v-2.364h2.462c.562 0 1.017-.394 1.017-.985V13.642c0-.591-.455-.957-1.017-.957h-2.462v-2.393h11.56v2.393h-2.354c-.67 0-1.124.253-1.124.957zm18.128 3.63c0 3.182-1.873 6.165-5.86 6.165-4.122 0-5.781-2.927-5.781-6.108 0-3.152 2.087-6.023 6.048-6.023 3.8 0 5.593 2.955 5.593 5.967zm-5.968 3.97c2.195 0 2.409-2.055 2.409-3.744 0-1.604-.107-3.969-2.221-3.969-2.195 0-2.302 2.393-2.302 3.94 0 1.436.107 3.773 2.114 3.773zm4.282 6.98h-8.403V25.24h8.403v2.983zm16.592-15.453v13.652c0 .704.455.957 1.124.957h2.328v2.364h-11.534v-2.364h2.435c.562 0 1.044-.394 1.044-.985V12.769h-2.114c-3.265 0-3.48 2.393-3.773 5.039h-2.302v-7.516H200v7.516h-2.275c-.294-2.674-.535-5.039-3.827-5.039h-2.167zM67 27.111c2 0 2.4-.113 3.147-1.778l6.88-15.488h4.108l6.907 15.573c.693 1.608 1.173 1.693 3.227 1.693v2.37H80.76v-2.37h2.08c.534 0 .854-.283.854-.734 0-.705-.827-2.116-1.334-3.216h-8.427c-.827 1.862-1.253 2.878-1.253 3.216 0 .62.613.734 2.026.734h.934v2.37H67v-2.37zm14.321-6.32l-3.2-7.137-3.174 7.137h6.374zm10.641-1.044c0-5.867 4.24-10.55 11.068-10.55 2.347 0 4.72.677 6.507 2.002l.96-1.608h2.214v7.646h-2.454c-.88-3.752-3.493-5.445-6.747-5.445-5.494 0-6.667 4.203-6.667 7.984 0 3.808 1.413 7.56 6.907 7.56 4.32 0 6.534-2.454 6.64-6.093h2.667c0 5.275-3.44 8.773-10.054 8.773-7.067 0-11.04-4.231-11.04-10.269zm23.229 7.364h2.454c.56 0 1.013-.395 1.013-.988V13.428c0-.762-.48-1.044-1.067-1.044h-2.4V9.986h21.229v7.505h-2.347c-.107-2.116-.267-5.107-3.494-5.107h-7.334v5.755h3.2c1.12 0 1.84-.677 1.84-1.608v-1.664h2.24v9.084h-2.266V22.71c0-1.27-.32-2.116-1.867-2.116h-3.147v6.488h7.654c3.334 0 3.334-3.639 3.467-5.811h2.4v8.21h-21.575v-2.37z"></path>
            <path fill="#c1d200" fill-rule="nonzero" d="M49.613 36.717a37.11 37.11 0 0 0-2.688-.933c.107-.427.2-.856.279-1.286a1.51 1.51 0 0 1 1.666-1.213c.78.103 1.298.813 1.158 1.586a23.028 23.028 0 0 1-.415 1.846zm-10.026-2.904a12.663 12.663 0 0 0-.73-7.277 12.54 12.54 0 0 0-1.217-2.253c-.446-.656-.268-1.562.397-2.024.665-.46 1.566-.305 2.013.35a15.529 15.529 0 0 1 2.338 11.925 411.835 411.835 0 0 0-2.801-.72zm1.142 4.337c-.34.146-.733.164-1.098.02a1.406 1.406 0 0 1-.87-1.05c.608.32 1.262.663 1.968 1.03zM23.374 15.957c.252 1.04.482 1.966.686 2.805a13.03 13.03 0 0 0-1.318.387 1.4 1.4 0 0 1-1.876-1.171 1.514 1.514 0 0 1 1.002-1.574c.493-.173.996-.322 1.506-.447zm3.637-.46a15.198 15.198 0 0 1 4.12.521 15.009 15.009 0 0 1 5.283 2.622c.622.483.721 1.396.22 2.039-.502.643-1.413.773-2.035.29a12.217 12.217 0 0 0-6.756-2.536c-.27-.017-.543-.025-.816-.025-.006-.869-.008-1.831-.016-2.91zm-.075-4.818a43.748 43.748 0 0 0-.175-2.99c.543-.022 1.085-.022 1.624-.001.78.03 1.379.728 1.336 1.55-.04.828-.706 1.475-1.485 1.445a18.706 18.706 0 0 0-1.3-.004zm-4.63.719c-.679.191-1.346.42-1.998.683a19.775 19.775 0 0 0-3.519 1.857 20.587 20.587 0 0 0-3.07 2.496 21.461 21.461 0 0 0-2.553 3.042c-.466.673-1.35.826-1.976.343-.312-.24-.5-.594-.554-.97-.053-.38.03-.784.264-1.121a24.505 24.505 0 0 1 2.915-3.473 23.516 23.516 0 0 1 3.506-2.852 22.64 22.64 0 0 1 4.021-2.121 22.198 22.198 0 0 1 2.401-.814 44.107 44.107 0 0 0 .563 2.93zm-12.38 30.06a38.185 38.185 0 0 0-2.428 1.831 21.374 21.374 0 0 1-2.407-6.21c-.166-.763.352-1.554 1.148-1.761.801-.21 1.584.239 1.75 1.002a18.821 18.821 0 0 0 1.937 5.138zm2.84 3.842a19.002 19.002 0 0 0 4.33 3.341 19.822 19.822 0 0 0 3.542 1.554c.758.248 1.125 1.059.82 1.81a1.588 1.588 0 0 1-.79.83 1.535 1.535 0 0 1-1.136.082 22.633 22.633 0 0 1-4.043-1.774 21.707 21.707 0 0 1-3.597-2.535 21.197 21.197 0 0 1-1.477-1.417 37.579 37.579 0 0 0 2.352-1.891zm1.09-6.397a15.515 15.515 0 0 1-1.71-7.216c.008-1.006.115-2.02.317-3.013.2-.981.495-1.953.878-2.885.307-.748 1.156-1.12 1.896-.828.74.29 1.091 1.131.784 1.878a12.9 12.9 0 0 0-.975 4.806 12.624 12.624 0 0 0 1.306 5.702c-.76.47-1.588.984-2.495 1.556zM7.79 28.132a1.502 1.502 0 0 1-.837 1.078c-.252.12-.539.172-.83.133a1.341 1.341 0 0 1-1.157-1.585 23.377 23.377 0 0 1 1.194-4.228c.286-.739 1.117-1.137 1.855-.89.74.248 1.107 1.047.821 1.786a20.454 20.454 0 0 0-1.046 3.706zm37.5-5.678a18.489 18.489 0 0 0-4.69-6.29 19.036 19.036 0 0 0-3.15-2.219 19.76 19.76 0 0 0-3.541-1.554c-.759-.248-1.126-1.059-.82-1.81.305-.752 1.167-1.16 1.925-.912a22.54 22.54 0 0 1 4.043 1.775 21.677 21.677 0 0 1 3.597 2.535 21.127 21.127 0 0 1 5.356 7.18 21.503 21.503 0 0 1 1.446 4.348c.145.668-.232 1.356-.865 1.657-.09.043-.185.079-.284.105-.8.21-1.584-.24-1.75-1.003a18.802 18.802 0 0 0-1.267-3.812zM21.575 43.087a12.332 12.332 0 0 0 4.72 1.26c.851.053 1.719.019 2.578-.102.86-.12 1.709-.327 2.524-.614a1.4 1.4 0 0 1 1.817.886c.24.758-.182 1.59-.944 1.858-1 .352-2.041.606-3.093.754-1.051.147-2.114.19-3.158.124a15.05 15.05 0 0 1-5.797-1.548c-.88-.438-1.72-.965-2.496-1.566a1.393 1.393 0 0 1-.533-.962 1.495 1.495 0 0 1 .312-1.075c.5-.643 1.412-.774 2.035-.292.633.49 1.318.92 2.035 1.277zm8.93 8.66a19.458 19.458 0 0 0 3.904-1.12 19.79 19.79 0 0 0 3.519-1.856 20.624 20.624 0 0 0 3.07-2.497 21.396 21.396 0 0 0 2.553-3.042c.466-.672 1.35-.826 1.976-.343.627.483.756 1.42.29 2.091a24.406 24.406 0 0 1-2.915 3.473 23.484 23.484 0 0 1-3.507 2.852 22.614 22.614 0 0 1-4.02 2.12c-.77.247-1.58-.2-1.747-.963a18.847 18.847 0 0 0-1.285-3.805z" opacity=".6"></path>
            <path fill="#c1d200" fill-rule="nonzero" d="M16.871 36.598a11.6 11.6 0 0 0 1.557 2.53c-1.574 1.153-3.498 2.573-5.988 4.329C3.77 49.569.818 48.132.581 47.723c-.236-.41-.005-3.683 9.624-8.137 2.726-1.26 4.895-2.208 6.666-2.988zm11.886-16.25a10.785 10.785 0 0 0-2.906-.1c-.193-2.03-.467-4.584-.734-7.993-.8-10.245 2.102-12.01 2.6-12.008.498.003 3.328 1.799 2.11 12.033-.41 3.453-.793 6.026-1.07 8.067zm6.882 18.537a11.615 11.615 0 0 0 1.436-2.448c1.941.8 4.427 1.776 7.755 3.203 9.472 4.063 9.612 7.411 9.366 7.844-.247.433-3.227 2.063-11.7-3.752-2.992-2.055-5.145-3.635-6.857-4.847zm-.836-11.888c2.505 4.502 1.019 10.258-3.319 12.857-4.338 2.6-9.884 1.057-12.388-3.445-2.504-4.501-1.018-10.258 3.32-12.857 4.337-2.6 9.883-1.057 12.387 3.445zm-3.205 1.921c-1.482-2.664-4.765-3.577-7.332-2.039-2.567 1.538-3.447 4.945-1.965 7.61 1.483 2.664 4.765 3.577 7.332 2.038 2.567-1.538 3.447-4.945 1.965-7.609zm-1.924 1.297c.87 1.561.354 3.559-1.151 4.46-1.505.902-3.43.367-4.298-1.195-.869-1.562-.353-3.559 1.151-4.46 1.505-.902 3.43-.367 4.298 1.195z"></path>
          </g>
        </svg>
        <span style="font-family: var(--font-heading); font-size: 0.9rem; color: var(--text-muted); padding-left: 0.5rem;">BACnet Studio by ACE IoT</span>
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
