import type { DiagramDiagnostic } from './network-diagram';

export interface DiagramDiagnosticGroup {
  key: string;
  title: string;
  description: string;
  level: DiagramDiagnostic['level'];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  items: DiagramDiagnostic[];
}

const DIAGNOSTIC_CLASSES = [
  { key: 'physical-cabling', title: 'Physical cabling', description: 'Cable media, reach, endpoint use, and Layer 2 continuity.', codes: ['PHY-LINK-', 'PHY-PORT-DOUBLE', 'PHY-L2-', 'PHY-NIC-'], pattern: /physical link|physical endpoint|modeled Layer 2|physical cable/i },
  { key: 'mstp-wiring', title: 'Serial bus wiring', description: 'MS\/TP and ARC156 node order, termination, bias, and segment budgets.', codes: ['MSTP-', 'ARCNET-'], pattern: /MS\/TP segment|ARC156|bias source|unit loads|mid-chain/i },
  { key: 'vlan-port', title: 'Switch port VLANs', description: 'Access and trunk port VLAN consistency.', codes: ['PHY-PORT-VLAN', 'PHY-TRUNK-VLAN'], pattern: /access VLAN|switch trunk/i },
  { key: 'power', title: 'PoE power', description: 'Port class and switch power budget.', codes: ['PHY-POE-'], pattern: /PoE|power budget/i },
  { key: 'fdr', title: 'Foreign Device Registration', description: 'Foreign-device eligibility and registration targets.', pattern: /foreign device|registration BBMD|\bFDR\b/i },
  { key: 'bdt', title: 'BBMD & BDT relationships', description: 'Broadcast distribution peers, reciprocity, ports, and subnet placement.', pattern: /BBMD|BDT relationship|BDT peer/i },
  { key: 'bacnet-sc', title: 'BACnet/SC connectivity', description: 'Hub assignments, federation, WebSocket endpoints, and L3/TLS reachability.', pattern: /BACnet\/SC|SC hub|wss:\/\/|L3\/TLS/i },
  { key: 'addressing', title: 'Addressing & subnet membership', description: 'Invalid, duplicate, missing, or out-of-prefix addresses.', pattern: /invalid (?:network|IP|MS\/TP|ARCNET|BACnet\/SC node)|Duplicate| is outside |not assigned to an available subnet|different datalink type/i },
  { key: 'datalink', title: 'BACnet datalinks & routing', description: 'Network numbers, UDP ports, datalink overlaps, and upstream routing.', pattern: /network number|UDP port|IP\/VLAN|upstream|must be routed|BACnet\/IP devices|distinct BACnet\/IP networks/i },
  { key: 'tests', title: 'Connectivity tests', description: 'Missing endpoints, invalid broadcasts, and test-path configuration.', pattern: /test path|endpoint|Who-Is|broadcast address|source subnet broadcast/i },
  { key: 'services', title: 'Device services', description: 'Device interfaces without an enabled BACnet service.', pattern: /neither BACnet\/IP nor BACnet\/SC/i }
] as const;

function diagnosticClass(diagnostic: DiagramDiagnostic) {
  return DIAGNOSTIC_CLASSES.find(candidate => ('codes' in candidate && diagnostic.code && candidate.codes.some(code => diagnostic.code!.startsWith(code))) || candidate.pattern.test(diagnostic.message)) ?? {
    key: 'other',
    title: 'Other configuration findings',
    description: 'Additional items that need review.'
  };
}

export function groupDiagramDiagnostics(diagnostics: DiagramDiagnostic[]): DiagramDiagnosticGroup[] {
  const groups = new Map<string, DiagramDiagnosticGroup>();
  diagnostics.forEach(diagnostic => {
    const diagnosticClassInfo = diagnosticClass(diagnostic);
    let group = groups.get(diagnosticClassInfo.key);
    if (!group) {
      group = {
        key: diagnosticClassInfo.key,
        title: diagnosticClassInfo.title,
        description: diagnosticClassInfo.description,
        level: diagnostic.level,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        items: []
      };
      groups.set(group.key, group);
    }
    group.items.push(diagnostic);
    if (diagnostic.level === 'error') {
      group.errorCount += 1;
      group.level = 'error';
    } else if (diagnostic.level === 'warning') {
      group.warningCount += 1;
    } else {
      group.infoCount += 1;
    }
  });
  return [...groups.values()].sort((first, second) => {
    if (first.level !== second.level) {
      const rank = { error: 0, warning: 1, info: 2 };
      return rank[first.level] - rank[second.level];
    }
    return second.items.length - first.items.length;
  });
}
