import { type PlannerProject, getBmsHostOffset, isIpNetwork } from './planner';
import { getSubnetDetails, getOffsetIp, longToIp } from './subnet';

// Style Constants matching ACE IoT Brand Colors (Charcoal background, white text, lime highlights)
export { STYLES, makeCell } from './xlsx-styles';
import { STYLES, makeCell, type RowCell } from './xlsx-styles';
export async function exportPlannerXlsx(project: PlannerProject) {
  const { subnets, splitHorizon } = project;
  if (subnets.length === 0) {
    alert("Please add at least one subnet to export.");
    return;
  }

  const XLSX = await import('xlsx-js-style');

  try {
    const wb = XLSX.utils.book_new();

    // 1. Summary Sheet Setup
    const summaryRows: RowCell[][] = [
      [makeCell("  ACE IoT SOLUTIONS", "brandHeader"), "", "", "", "", "", "", "", ""],
      [makeCell("  BACnet Subnet & BBMD Distribution Summary", "title"), "", "", "", "", "", "", "", ""],
      [makeCell(`  Generated: ${new Date().toLocaleDateString()} | BACnet Studio by ACE IoT (aceiotsolutions.com)`, "subtitle"), "", "", "", "", "", "", "", ""],
      [], // spacer
      [makeCell("Subnet Configuration List", "sectionHeader"), "", "", "", "", "", "", "", ""],
      [
        makeCell("Subnet Name", "tableHeader"),
        makeCell("VLAN ID", "tableHeader"),
        makeCell("BACnet UDP Port", "tableHeader"),
        makeCell("Network ID / CIDR", "tableHeader"),
        makeCell("Subnet Mask", "tableHeader"),
        makeCell("Default Gateway IP", "tableHeader"),
        makeCell("Usable IP Range", "tableHeader"),
        makeCell("BBMD IP Address", "tableHeader"),
        makeCell("BMS Server Placement & Role", "tableHeader")
      ]
    ];

    subnets.forEach((sub, offset) => {
      const ipNetwork = isIpNetwork(sub);
      const details = getSubnetDetails(sub.ip, sub.cidr);
      const rangeStr = details ? `${details.firstUsable} - ${details.lastUsable}` : 'N/A';
      const maskStr = details ? details.mask : 'N/A';
      const netCidr = ipNetwork ? `${sub.ip}/${sub.cidr}` : `BACnet Network ${sub.bacnetNetworkNumber || 'Not set'}`;
      const gatewayIp = getOffsetIp(sub.ip, sub.cidr, sub.gatewayOffset);
      const bbmdIp = sub.bbmdEnabled ? getOffsetIp(sub.ip, sub.cidr, sub.bbmdOffset) : "None";

      let bmsRole = "None";
      if (sub.networkType === 'bacnet-sc') {
        bmsRole = sub.scFailoverEnabled ? `Primary/failover hub cluster: ${sub.scPrimaryHubName || 'not set'} / ${sub.scFailoverHubName || 'not set'}` : `Primary hub: ${sub.scPrimaryHubName || 'not set'}`;
      } else if (!ipNetwork) {
        const upstream = subnets.find(item => item.id === sub.upstreamIpSubnetId);
        bmsRole = `Routed by ${sub.routerName || 'Not set'} (${sub.routerIp || 'address not set'}) via ${upstream?.name || 'upstream not set'}`;
      }
      else if (sub.bmsPlaced) {
        if (sub.bmsRole === 'bbmd') bmsRole = `Local BBMD at ${getOffsetIp(sub.ip, sub.cidr, getBmsHostOffset(sub))}`;
        else if (sub.bmsRole === 'fdr') {
          const targetSub = subnets.find(s => s.id === sub.fdrTargetSubnetId);
          bmsRole = `FDR (Registered to BBMD on ${targetSub ? targetSub.name : 'Unknown'})`;
        } else bmsRole = "Local Subnet Only";
      }
      if (ipNetwork && sub.scEnabled) bmsRole = `${bmsRole === 'None' ? '' : `${bmsRole}; `}SC ${sub.scFailoverEnabled ? 'HA hub pair' : 'hub'}: ${sub.scPrimaryHubName || 'not set'}`;

      const rowStyle = (offset % 2 === 0) ? "dataCell" : "dataCellAlt";

      summaryRows.push([
        makeCell(sub.name, rowStyle),
        makeCell(ipNetwork ? (sub.vlan || 'None') : (sub.networkType === 'mstp' ? 'MS/TP' : sub.networkType === 'arcnet' ? 'ARCNET' : 'BACnet/SC'), rowStyle),
        makeCell(ipNetwork ? (sub.port || 47808) : (sub.networkType === 'mstp' ? `${sub.mstpBaudRate || 38400} baud` : sub.networkType === 'arcnet' ? `${sub.arcnetDataRate || 2500} kbps` : 'TLS WebSocket'), rowStyle),
        makeCell(netCidr, rowStyle),
        makeCell(ipNetwork ? maskStr : 'N/A', rowStyle),
        makeCell(ipNetwork ? gatewayIp : 'N/A', rowStyle),
        makeCell(ipNetwork ? rangeStr : (sub.networkType === 'mstp' ? `MAC 0–${sub.mstpMaxMaster ?? 127}` : sub.networkType === 'arcnet' ? 'Node 0–255' : `${sub.plannedDevices || 0} SC nodes`), rowStyle),
        makeCell(ipNetwork ? bbmdIp : 'N/A', rowStyle),
        makeCell(bmsRole, rowStyle)
      ]);
    });

    summaryRows.push([]);
    summaryRows.push([]);

    // BDT schedule segment
    const bdtSectionHeaderRow = 8 + subnets.length;

    summaryRows.push([makeCell("Global Broadcast Distribution Table (BDT) Schedule", "sectionHeader"), "", "", "", "", "", "", "", ""]);
    summaryRows.push([
      makeCell("BBMD IP Address", "tableHeader"),
      makeCell("Subnet Mask", "tableHeader"),
      makeCell("BACnet UDP Port", "tableHeader"),
      makeCell("Subnet Name Reference", "tableHeader"),
      "", "", "", "", ""
    ]);

    const bbmds = subnets.filter(s => isIpNetwork(s) && s.bbmdEnabled).map(s => {
      const details = getSubnetDetails(s.ip, s.cidr);
      return {
        id: s.id,
        name: s.name,
        ip: getOffsetIp(s.ip, s.cidr, s.bbmdOffset),
        mask: details ? details.mask : 'N/A',
        port: s.port || 47808
      };
    });

    if (bbmds.length === 0) {
      summaryRows.push([
        makeCell("No BBMD routers configured in this network plan. Broadcasts will not cross subnets.", "dataCell"),
        "", "", "", "", "", "", "", ""
      ]);
    } else {
      bbmds.forEach((bbmd, idx) => {
        const rowStyle = (idx % 2 === 0) ? "dataCell" : "dataCellAlt";
        summaryRows.push([
          makeCell(bbmd.ip, rowStyle),
          makeCell(bbmd.mask, rowStyle),
          makeCell(bbmd.port, rowStyle),
          makeCell(bbmd.name, rowStyle),
          "", "", "", "", ""
        ]);
      });
    }

    summaryRows.push([]);
    summaryRows.push([]);

    // Brand CTA block calculation
    const bdtCount = Math.max(bbmds.length, 1);
    const brandHeaderRow = bdtSectionHeaderRow + 2 + bdtCount + 2;
    const brandBodyRow = brandHeaderRow + 1;

    summaryRows.push([
      makeCell("ACE IoT Solutions — OT Network Management & Security Services", "brandCardHeader"),
      "", "", "", "", "", "", "", ""
    ]);

    summaryRows.push([
      makeCell(
        "Need advanced assistance designing, commissioning, or securing your building network?\n" +
        "ACE IoT Solutions offers hardware-agnostic software and services to keep your building systems resilient:\n\n" +
        "• Sentinel: Our secure BACnet connectivity software. Enables vendor-neutral cloud integrations, secure remote engineering connections, and strict port security.\n" +
        "• Ground Control: Your outsourced OT network management squad. We provide system design validation, remote commissioning checkouts, cybersecurity threat detection, and continuous diagnostics.\n\n" +
        "Get in touch with our team: visit https://aceiotsolutions.com or email us at info@aceiotsolutions.com",
        "brandCardBody"
      ),
      "", "", "", "", "", "", "", ""
    ]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

    // Widths
    wsSummary['!cols'] = [
      { wch: 25 }, // Subnet Name
      { wch: 10 }, // VLAN ID
      { wch: 15 }, // BACnet UDP Port
      { wch: 20 }, // Network ID / CIDR
      { wch: 18 }, // Subnet Mask
      { wch: 18 }, // Default Gateway IP
      { wch: 28 }, // Usable IP Range
      { wch: 18 }, // BBMD IP Address
      { wch: 38 }  // BMS Placement & Role
    ];

    // Merges
    const summaryMerges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Brand Header
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Title
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // Subtitle
      { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } }, // Section 1 Header
      { s: { r: bdtSectionHeaderRow, c: 0 }, e: { r: bdtSectionHeaderRow, c: 8 } }, // Section 2 Header
      { s: { r: brandHeaderRow, c: 0 }, e: { r: brandHeaderRow, c: 8 } }, // Brand Header
      { s: { r: brandBodyRow, c: 0 }, e: { r: brandBodyRow, c: 8 } }  // Brand Body
    ];

    if (bbmds.length === 0) {
      summaryMerges.push({ s: { r: bdtSectionHeaderRow + 2, c: 0 }, e: { r: bdtSectionHeaderRow + 2, c: 8 } });
    }

    wsSummary['!merges'] = summaryMerges;

    // Row Heights
    const summaryRowHeights: { hpt: number }[] = [];
    for (let r = 0; r <= brandBodyRow; r++) {
      summaryRowHeights.push({ hpt: 20 });
    }
    summaryRowHeights[0] = { hpt: 22 };
    summaryRowHeights[1] = { hpt: 30 };
    summaryRowHeights[2] = { hpt: 20 };
    summaryRowHeights[3] = { hpt: 12 };
    summaryRowHeights[4] = { hpt: 25 };
    summaryRowHeights[bdtSectionHeaderRow] = { hpt: 25 };
    summaryRowHeights[brandHeaderRow] = { hpt: 25 };
    summaryRowHeights[brandBodyRow] = { hpt: 130 };

    wsSummary['!rows'] = summaryRowHeights;

    XLSX.utils.book_append_sheet(wb, wsSummary, "Network Summary");

    // 2. Subnet Sheets
    subnets.forEach(sub => {
      const ipNetwork = isIpNetwork(sub);
      const details = getSubnetDetails(sub.ip, sub.cidr);
      const subnetRows: RowCell[][] = [];
      const gatewayIp = getOffsetIp(sub.ip, sub.cidr, sub.gatewayOffset);
      const bbmdIp = sub.bbmdEnabled ? getOffsetIp(sub.ip, sub.cidr, sub.bbmdOffset) : "None";
      const bmsIp = sub.bmsPlaced ? getOffsetIp(sub.ip, sub.cidr, getBmsHostOffset(sub)) : "None";

      subnetRows.push([makeCell("  ACE IoT SOLUTIONS", "brandHeader"), "", "", "", "", "", "", ""]);
      subnetRows.push([makeCell(`  Network Device Planning Log: ${sub.name}`, "title"), "", "", "", "", "", "", ""]);
      subnetRows.push([makeCell(ipNetwork ? `  Usable IP allocations and host device bindings for segment ${sub.ip}/${sub.cidr}` : `  ${sub.networkType === 'mstp' ? 'BACnet MS/TP' : sub.networkType === 'arcnet' ? 'BACnet ARCNET' : 'BACnet/SC'} network · BACnet network ${sub.bacnetNetworkNumber || 'not set'}`, "subtitle"), "", "", "", "", "", "", ""]);
      subnetRows.push([]); // spacer
      subnetRows.push([
        makeCell("Subnet Configuration Details", "sectionHeader"), "", "",
        makeCell(sub.bbmdEnabled ? "BBMD Broadcast Distribution Table (BDT)" : "BBMD Routing Disabled", "sectionHeader"), "", "", "", ""
      ]);

      const properties = ipNetwork ? [
        ["Network IP / CIDR", `${sub.ip}/${sub.cidr}`],
        ["Subnet Mask", details ? details.mask : 'N/A'],
        ["VLAN ID", sub.vlan || 'None'],
        ["BACnet UDP Port", sub.port || 47808],
        ["Default Gateway IP", gatewayIp],
        ["BBMD IP Address", bbmdIp],
        ["BACnet/SC Infrastructure", sub.scEnabled ? `${sub.scPrimaryHubName || 'Not set'} · ${sub.scPrimaryHubIp || 'IP not set'} · ${sub.scPrimaryHubUri || 'URI not set'}` : 'Not configured'],
        ["BACnet/SC Failover", sub.scEnabled && sub.scFailoverEnabled ? `${sub.scFailoverHubIp || 'IP not set'} · ${sub.scFailoverHubUri || 'URI not set'}` : 'Not configured']
      ] : sub.networkType === 'bacnet-sc' ? [
        ["Datalink Type", "BACnet/SC"], ["BACnet Network Number", sub.bacnetNetworkNumber || 'Not set'],
        ["Primary Hub", `${sub.scPrimaryHubName || 'Not set'} · ${sub.scPrimaryHubIp || 'IP not set'} · ${sub.scPrimaryHubUri || 'URI not set'}`],
        ["Failover Hub", sub.scFailoverEnabled ? `${sub.scFailoverHubName || 'Not set'} · ${sub.scFailoverHubIp || 'IP not set'} · ${sub.scFailoverHubUri || 'URI not set'}` : 'Not configured'],
        ["IP Underlays", (sub.scUnderlaySubnetIds || []).map(id => subnets.find(item => item.id === id)?.name || id).join(', ') || 'Not set'],
        ["Planned Nodes", sub.plannedDevices || 0]
      ] : [
        ["Datalink Type", sub.networkType === 'mstp' ? 'BACnet MS/TP' : 'BACnet ARCNET'],
        ["BACnet Network Number", sub.bacnetNetworkNumber || 'Not set'],
        ["Upstream Routed Network", subnets.find(item => item.id === sub.upstreamIpSubnetId)?.name || 'Not set'],
        ["Routing Device", `${sub.routerName || 'Not set'} · ${sub.routerIp || 'address not set'}`],
        [sub.networkType === 'mstp' ? "Baud / Max Master" : "Data Rate", sub.networkType === 'mstp' ? `${sub.mstpBaudRate || 38400} baud · Max Master ${sub.mstpMaxMaster ?? 127}` : `${sub.arcnetDataRate || 2500} kbps`],
        ["Address Plan", `${sub.networkType === 'mstp' ? `MAC 0–${sub.mstpMaxMaster ?? 127}` : 'Node 0–255'} · ${sub.plannedDevices || 0} planned`]
      ];

      const allowedTargets = sub.routeTargets || [];
      const otherBbmds = bbmds.filter(b => b.id !== sub.id && b.port === (sub.port || 47808) && (!splitHorizon || allowedTargets.includes(b.id)));

      for (let i = 0; i < properties.length; i++) {
        const row = [
          makeCell(properties[i][0], "propLabel"),
          makeCell(properties[i][1], "propValue"),
          makeCell("", "dataCell") // Spacer
        ];

        if (sub.bbmdEnabled) {
          if (i === 0) {
            row.push(makeCell("BBMD IP Address", "tableHeader"));
            row.push(makeCell("Subnet Mask", "tableHeader"));
            row.push(makeCell("Subnet Name Reference", "tableHeader"));
          } else {
            const bdtEntry = otherBbmds[i - 1];
            row.push(makeCell(bdtEntry ? bdtEntry.ip : "", "dataCell"));
            row.push(makeCell(bdtEntry ? bdtEntry.mask : "", "dataCell"));
            row.push(makeCell(bdtEntry ? bdtEntry.name : "", "dataCell"));
          }
        } else {
          if (i === 0) {
            row.push(makeCell("This subnet operates locally. Broadcasts do not traverse routers.", "dataCell"));
            row.push(makeCell("", "dataCell"));
            row.push(makeCell("", "dataCell"));
          } else {
            row.push(makeCell("", "dataCell"));
            row.push(makeCell("", "dataCell"));
            row.push(makeCell("", "dataCell"));
          }
        }
        subnetRows.push(row);
      }

      if (sub.bbmdEnabled && otherBbmds.length > 5) {
        for (let i = 5; i < otherBbmds.length; i++) {
          subnetRows.push([
            makeCell("", "dataCell"),
            makeCell("", "dataCell"),
            makeCell("", "dataCell"),
            makeCell(otherBbmds[i].ip, "dataCell"),
            makeCell(otherBbmds[i].mask, "dataCell"),
            makeCell(otherBbmds[i].name, "dataCell")
          ]);
        }
      }

      subnetRows.push([]);
      subnetRows.push([]);

      // Device List Table Header
      subnetRows.push([
        makeCell(ipNetwork ? "Planned IP Address" : (sub.networkType === 'mstp' ? "MS/TP MAC" : sub.networkType === 'arcnet' ? "ARCNET Node" : "SC Node IP"), "tableHeader"),
        makeCell(ipNetwork ? "IP Assignment / Reservation" : "Address Assignment", "tableHeader"),
        makeCell("BACnet Device ID", "tableHeader"),
        makeCell("Device Name", "tableHeader"),
        makeCell("Vendor", "tableHeader"),
        makeCell("Device Type", "tableHeader"),
        makeCell("Object Count", "tableHeader"),
        makeCell("Location / Description", "tableHeader")
      ]);

      if (ipNetwork && details) {
        const plannedIps = sub.plannedDevices || details.numHosts;
        const limit = details.numHosts <= 1024 ? details.numHosts : Math.min(details.numHosts, Math.max(plannedIps, 100));
        const startLong = details.firstUsableLong;

        if (startLong !== null) {
          for (let offset = 0; offset < limit; offset++) {
            const currentLong = (startLong + offset) >>> 0;
            const currentIp = longToIp(currentLong);

            let usage = "Available";
            let cellStyle: keyof typeof STYLES = (offset % 2 === 0) ? "dataCell" : "dataCellAlt";

            if (sub.bmsPlaced && sub.bmsRole === 'bbmd' && currentIp === bbmdIp) {
              usage = "BMS Server / BBMD Router Node";
              cellStyle = "bmsReservation";
            } else if (currentIp === gatewayIp) {
              usage = "Default Gateway";
              cellStyle = "systemReservation";
            } else if (currentIp === bbmdIp) {
              usage = "BBMD Router Node";
              cellStyle = "systemReservation";
            } else if (sub.bmsPlaced && currentIp === bmsIp) {
              usage = `BMS Server (${sub.bmsRole.toUpperCase()})`;
              cellStyle = "bmsReservation";
            }

            subnetRows.push([
              makeCell(currentIp, cellStyle),
              makeCell(usage, cellStyle),
              makeCell("", cellStyle),
              makeCell("", cellStyle),
              makeCell("", cellStyle),
              makeCell("", cellStyle),
              makeCell("", cellStyle),
              makeCell("", cellStyle)
            ]);
          }
        }
      }
      if (!ipNetwork && sub.networkType !== 'bacnet-sc') {
        const limit = Math.min(sub.plannedDevices || 0, sub.networkType === 'mstp' ? (sub.mstpMaxMaster ?? 127) + 1 : 256);
        for (let address = 0; address < limit; address++) {
          const cellStyle = address % 2 === 0 ? "dataCell" : "dataCellAlt";
          subnetRows.push([makeCell(address, cellStyle), makeCell("Available", cellStyle), makeCell("", cellStyle), makeCell("", cellStyle), makeCell("", cellStyle), makeCell("", cellStyle), makeCell("", cellStyle), makeCell("", cellStyle)]);
        }
      }
      if (sub.networkType === 'bacnet-sc') {
        for (let index = 0; index < (sub.plannedDevices || 0); index++) {
          const cellStyle = index % 2 === 0 ? "dataCell" : "dataCellAlt";
          subnetRows.push([makeCell("", cellStyle), makeCell(`SC Node ${index + 1}`, cellStyle), makeCell("", cellStyle), makeCell("", cellStyle), makeCell("", cellStyle), makeCell("", cellStyle), makeCell("", cellStyle), makeCell("Assign primary/failover hub and verify L3/TLS path", cellStyle)]);
        }
      }

      const wsSubnet = XLSX.utils.aoa_to_sheet(subnetRows);

      // Column widths
      wsSubnet['!cols'] = [
        { wch: 18 }, // IP
        { wch: 24 }, // Reservation
        { wch: 16 }, // Device ID
        { wch: 22 }, // Name
        { wch: 18 }, // Vendor
        { wch: 18 }, // Type
        { wch: 14 }, // Object Count
        { wch: 28 }  // Location
      ];

      // Merges
      const subnetMerges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Brand Header
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Title
        { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, // Subtitle
        { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } }, // Info Section Header
        { s: { r: 4, c: 3 }, e: { r: 4, c: 5 } }  // BDT Section Header
      ];

      if (!sub.bbmdEnabled) {
        subnetMerges.push({ s: { r: 5, c: 3 }, e: { r: 5, c: 5 } });
        subnetMerges.push({ s: { r: 6, c: 3 }, e: { r: 6, c: 5 } });
        subnetMerges.push({ s: { r: 7, c: 3 }, e: { r: 7, c: 5 } });
        subnetMerges.push({ s: { r: 8, c: 3 }, e: { r: 8, c: 5 } });
        subnetMerges.push({ s: { r: 9, c: 3 }, e: { r: 9, c: 5 } });
        subnetMerges.push({ s: { r: 10, c: 3 }, e: { r: 10, c: 5 } });
      }

      wsSubnet['!merges'] = subnetMerges;

      // Row Heights
      const subnetRowHeights: { hpt: number }[] = [];
      const dataHeaderRow = 4 + 6 + (sub.bbmdEnabled && otherBbmds.length > 5 ? otherBbmds.length - 5 : 0) + 3;
      for (let r = 0; r <= dataHeaderRow; r++) {
        subnetRowHeights.push({ hpt: 20 });
      }
      subnetRowHeights[0] = { hpt: 22 };
      subnetRowHeights[1] = { hpt: 30 };
      subnetRowHeights[2] = { hpt: 20 };
      subnetRowHeights[3] = { hpt: 12 };
      subnetRowHeights[4] = { hpt: 25 };
      subnetRowHeights[dataHeaderRow] = { hpt: 25 };

      wsSubnet['!rows'] = subnetRowHeights;

      const sanitizedName = sub.name.replace(/[\\\?\*:\/\[\]]/g, "").substring(0, 30);
      XLSX.utils.book_append_sheet(wb, wsSubnet, sanitizedName);
    });

    if (subnets.some(subnet => subnet.physical && Object.values(subnet.physical).some(value => value !== undefined && value !== '' && value !== 0))) {
      const physicalRows = [
        ['Network', 'Closet / IDF', 'Switches', 'Ports / Switch', 'Port Budget', 'PoE Devices', 'MS/TP Segments', 'ARC156 Segments', 'Length / Segment (m)', 'Cable'],
        ...subnets.map(subnet => [subnet.name, subnet.physical?.closetName ?? '', subnet.physical?.switchCount ?? '', subnet.physical?.portsPerSwitch ?? '', (subnet.physical?.switchCount ?? 0) * (subnet.physical?.portsPerSwitch ?? 0), subnet.physical?.poeDevices ?? '', subnet.physical?.mstpSegments ?? '', subnet.physical?.arcnetSegments ?? '', subnet.networkType === 'arcnet' ? subnet.physical?.arcnetSegmentLengthMeters ?? '' : subnet.physical?.mstpSegmentLengthMeters ?? '', subnet.physical?.cable ?? ''])
      ];
      const physicalSheet = XLSX.utils.aoa_to_sheet(physicalRows);
      physicalSheet['!cols'] = physicalRows[0].map((_, column) => ({ wch: Math.max(14, ...physicalRows.map(row => String(row[column] ?? '').length + 2)) }));
      XLSX.utils.book_append_sheet(wb, physicalSheet, 'Physical Budget');
    }

    XLSX.writeFile(wb, `BACnet_Network_Plan_${new Date().toISOString().split('T')[0]}.xlsx`);

  } catch (err) {
    console.error(err);
    alert("An error occurred while generating the spreadsheet.");
  }
}
