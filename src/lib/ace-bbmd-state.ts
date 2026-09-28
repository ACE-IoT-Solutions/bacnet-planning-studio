import { createDevice, createSubnet, type DiagramProject } from './network-diagram';
import { createEmptyPhysicalLayer } from './physical';
import { ipToLong, longToIp } from './subnet';

export interface AceBbmdEndpoint {
  ip: string;
  port: number;
}

export interface AceBbmdStateEntry extends AceBbmdEndpoint {
  mask: string;
}

export interface AceBbmdStateRecord extends AceBbmdEndpoint {
  bdt: AceBbmdStateEntry[];
}

export interface AceBbmdStateImport {
  records: AceBbmdStateRecord[];
  ignoredRecords: number;
  unresolvedBdtEntries: number;
  reciprocalBdtPairs: number;
  oneWayBdtEntries: number;
}

interface StateRecordValue {
  address?: unknown;
  bdt?: unknown;
}

const parseEndpoint = (value: unknown): AceBbmdEndpoint | null => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/);
  if (!match || ipToLong(match[1]) === null) return null;
  const port = Number(match[2]);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? { ip: match[1], port } : null;
};

export function parseAceBbmdState(value: unknown): AceBbmdStateImport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('State store must be a JSON object.');
  const bbmds = (value as { bbmds?: unknown }).bbmds;
  if (!bbmds || typeof bbmds !== 'object' || Array.isArray(bbmds)) throw new Error('State store does not contain a BBMD record map.');

  const records: AceBbmdStateRecord[] = [];
  let ignoredRecords = 0;
  for (const [key, rawValue] of Object.entries(bbmds)) {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
      ignoredRecords += 1;
      continue;
    }
    const recordValue = rawValue as StateRecordValue;
    const endpoint = parseEndpoint(recordValue.address) ?? parseEndpoint(key);
    if (!endpoint) {
      ignoredRecords += 1;
      continue;
    }
    const bdt = Array.isArray(recordValue.bdt) ? recordValue.bdt.flatMap(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
      const target = parseEndpoint((entry as { address?: unknown }).address);
      const mask = (entry as { mask?: unknown }).mask;
      return target && typeof mask === 'string' ? [{ ...target, mask }] : [];
    }) : [];
    records.push({ ...endpoint, bdt });
  }

  const uniqueRecords = [...new Map(records.map(record => [`${record.ip}:${record.port}`, record])).values()];
  const endpoints = new Set(uniqueRecords.map(record => `${record.ip}:${record.port}`));
  let unresolvedBdtEntries = 0;
  let reciprocalBdtPairs = 0;
  let oneWayBdtEntries = 0;
  const countedPairs = new Set<string>();
  for (const record of uniqueRecords) {
    const source = `${record.ip}:${record.port}`;
    for (const entry of record.bdt) {
      const target = `${entry.ip}:${entry.port}`;
      if (!endpoints.has(target)) {
        unresolvedBdtEntries += 1;
        continue;
      }
      const peer = uniqueRecords.find(candidate => `${candidate.ip}:${candidate.port}` === target);
      const reciprocal = peer?.bdt.some(candidate => `${candidate.ip}:${candidate.port}` === source) ?? false;
      if (!reciprocal) oneWayBdtEntries += 1;
      else {
        const pair = [source, target].sort().join('|');
        if (!countedPairs.has(pair)) {
          countedPairs.add(pair);
          reciprocalBdtPairs += 1;
        }
      }
    }
  }
  return { records: uniqueRecords, ignoredRecords, unresolvedBdtEntries, reciprocalBdtPairs, oneWayBdtEntries };
}

const slash24Network = (ip: string) => {
  const value = ipToLong(ip);
  return value === null ? '' : longToIp(value & 0xffffff00);
};

export function createDiagramProjectFromAceBbmdState(parsed: AceBbmdStateImport): DiagramProject {
  const subnetByNetwork = new Map<string, ReturnType<typeof createSubnet>>();
  const deviceByEndpoint = new Map<string, ReturnType<typeof createDevice>>();

  for (const record of parsed.records) {
    const network = slash24Network(record.ip);
    const subnetKey = `${network}/24`;
    let subnet = subnetByNetwork.get(subnetKey);
    if (!subnet) {
      subnet = createSubnet(subnetByNetwork.size + 1);
      subnet.name = `Imported BBMD Network ${subnetByNetwork.size + 1}`;
      subnet.address = network;
      subnet.cidr = 24;
      subnet.vlan = '';
      subnet.udpPort = record.port;
      subnet.bacnetNetworkNumber = '';
      subnet.devices = [];
      subnetByNetwork.set(subnetKey, subnet);
    } else if (subnet.udpPort !== record.port) {
      subnet.udpPort = '';
    }
    const device = createDevice(subnet.devices.length + 1, subnet.id);
    device.name = `Imported BBMD ${deviceByEndpoint.size + 1}`;
    device.kind = 'controller';
    device.bbmdEnabled = true;
    device.notes = 'Imported from ACE BBMD Manager state store · verify inferred /24 subnet';
    device.nics[0].name = 'BACnet/IP interface';
    device.nics[0].addresses[0].ip = record.ip;
    subnet.devices.push(device);
    deviceByEndpoint.set(`${record.ip}:${record.port}`, device);
  }

  for (const record of parsed.records) {
    const source = deviceByEndpoint.get(`${record.ip}:${record.port}`);
    if (!source) continue;
    source.bdtPeerDeviceIds = record.bdt.flatMap(entry => {
      const target = deviceByEndpoint.get(`${entry.ip}:${entry.port}`);
      return target && target.id !== source.id ? [target.id] : [];
    });
  }

  return {
    version: 2,
    title: 'Imported ACE BBMD Topology',
    notes: `Imported from ACE BBMD Manager state store. All ${subnetByNetwork.size} inferred networks default to /24; review and correct subnet definitions where needed.`,
    subnets: [...subnetByNetwork.values()],
    infrastructure: [],
    paths: [],
    viewMode: 'networks',
    physical: createEmptyPhysicalLayer()
  };
}
