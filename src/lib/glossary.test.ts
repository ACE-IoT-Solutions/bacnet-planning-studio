import { describe, expect, it } from 'vitest';
import { glossaryEntries, glossaryEntryById } from './glossary';

describe('BACnet glossary', () => {
  it('uses unique, URL-safe entry identifiers', () => {
    const ids = glossaryEntries.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it('only links to glossary entries that exist', () => {
    const missingRelatedTerms = glossaryEntries.flatMap(entry =>
      (entry.related ?? []).filter(relatedId => !glossaryEntryById.has(relatedId))
    );
    expect(missingRelatedTerms).toEqual([]);
  });

  it('includes the core concepts and network terms used by the application', () => {
    [
      'bacnet',
      'object',
      'property',
      'service',
      'interoperability',
      'bacnet-ip',
      'bacnet-sc',
      'mstp',
      'differential-voltage',
      'common-mode-voltage',
      'receiver-threshold',
      'loaded-driver-test',
      'driver-enable',
      'half-duplex',
      'token-passing',
      'mstp-station-variables',
      'max-info-frames',
      'max-master',
      'poll-for-master',
      'reply-postponed',
      'npoll',
      'nretry-token',
      'tno-token',
      'tslot',
      'tusage-delay',
      'tusage-timeout',
      'treply-delay',
      'treply-timeout',
      'tturnaround',
      'bit-time',
      'arc156-reconfiguration',
      'rep485',
      'ipv4-fragmentation',
      'ttl',
      'mtu',
      'udp-checksum',
      'icmp',
      'directed-broadcast',
      'ethernet-frame',
      'ethertype',
      'ethernet-ii',
      'vlan-tag',
      'llc-sap',
      'arp',
      'tframe-abort',
      'tframe-gap',
      'bbmd',
      'subnet'
    ].forEach(id => expect(glossaryEntryById.has(id)).toBe(true));
  });
});
