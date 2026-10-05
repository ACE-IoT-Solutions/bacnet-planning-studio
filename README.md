# BACnet Studio by ACE IoT

An interactive workspace for planning, diagramming, validating, and troubleshooting BACnet networks, including a visual subnet calculator and primer explaining how IP subnet masks and Layer 2/Layer 3 networking affect **BACnet/IP** and **BACnet/Ethernet** networks.

This is designed for control engineers, network integrators, and building automation specialists who need to configure and troubleshoot communications on modern building automation networks.

## Features

- **Interactive Subnet Calculator:** Compute Network ID, Broadcast IP, usable range, and host count for two devices simultaneously.
- **Port-Separated BACnet/IP Networks:** Model multiple BACnet/IP network numbers on one IP subnet using distinct UDP ports, with an always-available calculator scenario and advanced planner/diagram controls.
- **Dynamic Binary Breakdown:** Visualizes IP address structures in binary, highlighting the dividing line between network and host bits.
- **Verdict & Trap Analyzer:** Automatically identifies misconfigurations, such as:
  - **Broadcast Intersection Traps:** (e.g. Device A: `192.168.0.5/23` & Device B: `192.168.1.6/24`) sharing a broadcast address but belonging to different logical subnets.
  - **Asymmetrical Subnets:** Where subnet mask mismatch causes one-way local routing conflicts.
  - **Isolated Subnets:** Standard routed separation requiring BBMD configuration.
- **Live Network Simulator:** Send simulated Who-Is (Broadcast) and ReadProperty (Unicast) packets and trace their paths across switches, routers, and BBMD tunnels in real-time.
- **Network Diagram Builder:** Document any number of subnets, devices with multiple NICs and multiple addresses per NIC, routers, switches, firewalls, and gateways in a live topology. Jump from any diagram node to its configuration card, move configured devices between compatible subnets, switch between compact, balanced, and wide layouts, inspect large BBMD estates with peer highlights or focused edges, model mutual and one-way BDT peers, show foreign-device registrations, draw ordered connectivity tests, surface address warnings, and export shareable SVG, PDF, or editable JSON files. PDF exports can include a paginated peering summary and per-device BDT tables.
- **Physical Layer Modeling:** Organize equipment by campus/building/closet/rack, generate switch and patch-panel ports, record copper/fiber/wireless cable schedules, validate VLAN and PoE configuration, and render a dedicated physical topology. Ordered BACnet MS/TP and Automated Logic ARC156 buses include termination, bias, unit-load, node-count, and length checks. Physical schedules export to XLSX; legacy v1 JSON export remains available.
- **Diagram Getting-Started Guide:** Follow an in-app workflow for manual diagrams, ACE BBMD Manager state capture/import, and authorized Nmap host discovery.
- **Nmap Inventory Import:** Paste standard Nmap host-discovery output, choose the scanned network prefix, preview responsive hosts, and merge deduplicated IP-only devices and named gateway infrastructure into the diagram.
- **ACE BBMD Manager Import:** Upload a `.state` store to create device-level BBMDs and observed BDT links. Because the state store omits subnet definitions, imported networks begin as reviewable `/24` assumptions.
- **Interactive Networking Primer:**
  - **BACnet Introduction:** Explains the object model, services, supported transports, interoperability goals, and how BACnet is used from field equipment through supervisory systems.
  - **Layer 2 vs Layer 3:** Compares BACnet/Ethernet (MAC-level) vs BACnet/IP (UDP-level) with an interactive encapsulation packet inspector.
  - **BBMD Tunneling Simulator:** Traces how BACnet Broadcast Management Devices encapsulate and tunnel broadcasts across IP routers.
  - **Discovery vs. Reachability:** Demonstrates how a BBMD-forwarded I-Am can make a device visible even though later ReadProperty and other unicast services fail because the advertised address is not routable.
- **Searchable BACnet Glossary:** Defines protocol, message, datalink, IP-networking, and system-delivery terminology, with direct links from explanatory content throughout every application page.
- **Updates Signup:** Presents a dismissible, one-time email signup and keeps an always-available signup control in the footer.

## Technology Stack

- **Core:** Vue 3, TypeScript, and modern ESM modules
- **Styling:** Custom responsive CSS3 with glassmorphism effects and modern typography
- **Graphics:** Dynamic animated vector SVGs for all diagram elements
- **Project schema:** Version 2 with automatic migration of diagram and planner v1 files; see `docs/schema/diagram-project-v2.md`
- **Agent discovery:** The deployed app publishes `llms.txt`, `capabilities.json`, a browser-accessible agent guide, and JSON Schemas for diagram and planner project files under `schemas/`.
- **Local Dev Server:** Vite (optional, zero-config)

## Getting Started

### Local Development

To run the application locally, you can use the Vite server configured in `package.json`:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

Alternatively, because the app is built on standard HTML/JS/CSS modules, you can serve it locally using any simple static web server (such as Python's HTTP server):
```bash
python3 -m http.server --bind 127.0.0.1 8000
```

> [!TIP]
> **LAN Sharing:** To expose the servers to your local network (LAN) for testing on mobile or other devices, run `npx vite --host` or `python3 -m http.server --bind 0.0.0.0 8000`.

## GitHub Pages Deployment

This project includes an automated GitHub Actions workflow to build and deploy the application.

To deploy:
1. Push or merge changes to the `deploy` branch.
2. The GitHub Actions workflow defined in [.github/workflows/deploy.yml](file:///.github/workflows/deploy.yml) will automatically run, installing dependencies via `npm ci`, compiling the production bundle, and deploying the resulting `dist/` directory.
3. In your GitHub repository settings under **Pages**, ensure that **Build and deployment** -> **Source** is set to **GitHub Actions**.
