export interface GlossaryEntry {
  id: string;
  term: string;
  abbreviation?: string;
  category: 'BACnet fundamentals' | 'Messages & data' | 'BACnet networking' | 'IP networking' | 'System delivery';
  definition: string;
  aliases?: string[];
  related?: string[];
}

export const glossaryEntries: GlossaryEntry[] = [
  {
    id: 'bacnet',
    term: 'BACnet',
    category: 'BACnet fundamentals',
    definition: 'A vendor-independent data communication standard created for building automation and control systems. It defines how devices represent information, request actions, exchange status, and communicate across supported network technologies.',
    aliases: ['Building Automation and Control Network', 'ANSI/ASHRAE 135', 'ISO 16484-5'],
    related: ['interoperability', 'bacnet-device', 'object', 'service']
  },
  {
    id: 'bacs',
    term: 'Building automation and control system',
    abbreviation: 'BACS',
    category: 'BACnet fundamentals',
    definition: 'The connected controls that monitor and operate building functions such as HVAC, lighting, access control, energy management, elevators, and related safety or security integrations.',
    aliases: ['BAS', 'building automation system'],
    related: ['bacnet', 'interoperability']
  },
  {
    id: 'interoperability',
    term: 'Interoperability',
    category: 'BACnet fundamentals',
    definition: 'The ability of independently produced devices or systems to exchange information and perform defined functions together in a predictable way. A BACnet label alone does not guarantee that two products implement every capability a project needs.',
    related: ['bibb', 'device-profile', 'pics', 'btl']
  },
  {
    id: 'bacnet-device',
    term: 'BACnet device',
    category: 'BACnet fundamentals',
    definition: 'A logical collection of BACnet objects that acts as one participant on a BACnet internetwork. A physical controller can expose one or more logical BACnet devices.',
    aliases: ['device'],
    related: ['device-instance', 'object', 'internetwork']
  },
  {
    id: 'device-instance',
    term: 'Device instance',
    category: 'BACnet fundamentals',
    definition: 'The numeric instance portion of a BACnet Device object identifier. It must uniquely identify that BACnet device across the internetwork so clients can distinguish it from every other device.',
    aliases: ['device ID', 'device identifier'],
    related: ['bacnet-device', 'object-identifier']
  },
  {
    id: 'object',
    term: 'Object',
    category: 'Messages & data',
    definition: 'A standardized, network-visible model of part of a device’s function or data, such as an Analog Input, Binary Output, Schedule, Trend Log, or Device object.',
    aliases: ['BACnet object', 'object type'],
    related: ['property', 'object-identifier', 'service']
  },
  {
    id: 'property',
    term: 'Property',
    category: 'Messages & data',
    definition: 'A named attribute of a BACnet object. Examples include Present_Value, Object_Name, Units, and Status_Flags. Services can read properties and, where permitted, write them.',
    aliases: ['BACnet property'],
    related: ['object', 'readproperty', 'writeproperty']
  },
  {
    id: 'object-identifier',
    term: 'Object identifier',
    category: 'Messages & data',
    definition: 'The combination of an object type and instance number that uniquely identifies an object within its BACnet device.',
    aliases: ['Object_Identifier'],
    related: ['object', 'device-instance']
  },
  {
    id: 'service',
    term: 'Service',
    category: 'Messages & data',
    definition: 'A standardized BACnet request, response, or notification used to do work between devices—for example discovering devices, reading a value, writing a command, reporting an alarm, or synchronizing time.',
    aliases: ['BACnet service'],
    related: ['readproperty', 'writeproperty', 'who-is', 'i-am', 'cov']
  },
  {
    id: 'readproperty',
    term: 'ReadProperty',
    category: 'Messages & data',
    definition: 'A confirmed BACnet service used by a client to request the value of one property from one object in another BACnet device.',
    aliases: ['Read Property'],
    related: ['service', 'property', 'confirmed-service']
  },
  {
    id: 'writeproperty',
    term: 'WriteProperty',
    category: 'Messages & data',
    definition: 'A confirmed BACnet service used to request a change to a writable object property, often with a command priority.',
    aliases: ['Write Property'],
    related: ['service', 'property', 'priority-array']
  },
  {
    id: 'who-is',
    term: 'Who-Is',
    category: 'Messages & data',
    definition: 'An unconfirmed discovery service that asks BACnet devices—optionally within a device-instance range—to identify themselves.',
    related: ['i-am', 'broadcast', 'service']
  },
  {
    id: 'i-am',
    term: 'I-Am',
    category: 'Messages & data',
    definition: 'An unconfirmed service that advertises a BACnet device’s identifier, address binding information, maximum APDU size, segmentation support, and vendor identifier. It commonly answers Who-Is.',
    related: ['who-is', 'device-instance', 'apdu']
  },
  {
    id: 'cov',
    term: 'Change of Value',
    abbreviation: 'COV',
    category: 'Messages & data',
    definition: 'A subscription and notification mechanism that lets a device report qualifying value or status changes instead of requiring a client to poll continuously.',
    related: ['service', 'object', 'property']
  },
  {
    id: 'apdu',
    term: 'Application Protocol Data Unit',
    abbreviation: 'APDU',
    category: 'Messages & data',
    definition: 'The application-layer portion of a BACnet message. It carries service requests, acknowledgments, errors, rejects, aborts, or unconfirmed notifications.',
    related: ['npdu', 'service']
  },
  {
    id: 'npdu',
    term: 'Network Protocol Data Unit',
    abbreviation: 'NPDU',
    category: 'BACnet networking',
    definition: 'The BACnet network-layer message that carries routing information and, normally, an APDU between BACnet networks.',
    related: ['apdu', 'bacnet-router', 'network-number']
  },
  {
    id: 'datalink',
    term: 'Datalink',
    category: 'BACnet networking',
    definition: 'One local BACnet network technology or logical link on which devices communicate directly, such as BACnet/IP on a particular UDP port, BACnet/SC, MS/TP, or BACnet/Ethernet.',
    aliases: ['data link'],
    related: ['network-number', 'bacnet-ip', 'bacnet-sc', 'mstp']
  },
  {
    id: 'network-number',
    term: 'BACnet network number',
    category: 'BACnet networking',
    definition: 'A number from 1 through 65534 used to identify a BACnet network within an internetwork. Routers use it to forward NPDUs toward the destination network.',
    aliases: ['DNET', 'SNET'],
    related: ['internetwork', 'bacnet-router', 'npdu']
  },
  {
    id: 'internetwork',
    term: 'BACnet internetwork',
    category: 'BACnet networking',
    definition: 'Multiple BACnet networks joined by BACnet routers so devices on different datalinks can exchange routed BACnet messages.',
    related: ['network-number', 'bacnet-router', 'datalink']
  },
  {
    id: 'bacnet-router',
    term: 'BACnet router',
    category: 'BACnet networking',
    definition: 'A device that forwards BACnet NPDUs between different BACnet networks or datalinks. This is a BACnet network-layer role and is distinct from ordinary IP routing.',
    related: ['ip-router', 'network-number', 'npdu']
  },
  {
    id: 'bacnet-ip',
    term: 'BACnet/IP',
    abbreviation: 'B/IP',
    category: 'BACnet networking',
    definition: 'A BACnet datalink that carries BACnet messages through the BACnet Virtual Link Layer over UDP/IP. Its standard default UDP port is 47808, hexadecimal BAC0.',
    aliases: ['Annex J', 'BIP'],
    related: ['bvll', 'udp', 'bbmd', 'bacnet-sc']
  },
  {
    id: 'bvll',
    term: 'BACnet Virtual Link Layer',
    abbreviation: 'BVLL',
    category: 'BACnet networking',
    definition: 'The adaptation layer used by BACnet/IP to represent local unicast, broadcast, forwarded broadcast, foreign-device registration, and related management messages over UDP/IP.',
    related: ['bacnet-ip', 'bbmd', 'udp']
  },
  {
    id: 'bacnet-sc',
    term: 'BACnet Secure Connect',
    abbreviation: 'BACnet/SC',
    category: 'BACnet networking',
    definition: 'A BACnet datalink that uses secure WebSocket connections and TLS. Nodes normally communicate through SC hubs, avoiding the IP broadcast behavior used by classic BACnet/IP.',
    aliases: ['Secure Connect', 'SC'],
    related: ['tls', 'datalink', 'bacnet-ip']
  },
  {
    id: 'mstp',
    term: 'Master-Slave/Token-Passing',
    abbreviation: 'MS/TP',
    category: 'BACnet networking',
    definition: 'A BACnet datalink designed primarily for EIA-485 twisted-pair networks. Token passing coordinates which master node may transmit.',
    aliases: ['BACnet MS/TP'],
    related: ['datalink', 'mac-address', 'bacnet-router']
  },
  {
    id: 'arcnet',
    term: 'ARCNET',
    category: 'BACnet networking',
    definition: 'A token-passing network technology supported as a BACnet datalink. Automated Logic systems commonly use the 156.25 kbps ARC156 variant over shielded EIA-485 wiring.',
    aliases: ['BACnet ARCNET', 'ARC156', 'ALC ARCNET'],
    related: ['datalink', 'bacnet-router', 'arc156']
  },
  {
    id: 'bbmd',
    term: 'BACnet Broadcast Management Device',
    abbreviation: 'BBMD',
    category: 'BACnet networking',
    definition: 'A BACnet/IP function that distributes BACnet broadcasts between IP subnets participating in the same B/IP network, using a Broadcast Distribution Table and forwarded BVLL messages.',
    related: ['bdt', 'foreign-device', 'bacnet-ip', 'broadcast']
  },
  {
    id: 'bdt',
    term: 'Broadcast Distribution Table',
    abbreviation: 'BDT',
    category: 'BACnet networking',
    definition: 'A BBMD configuration table identifying peer broadcast-distribution destinations. Entries must match the intended BACnet/IP topology and UDP ports.',
    related: ['bbmd', 'fdt']
  },
  {
    id: 'fdt',
    term: 'Foreign Device Table',
    abbreviation: 'FDT',
    category: 'BACnet networking',
    definition: 'The live table a BBMD maintains for registered foreign devices, including their address and remaining registration lifetime.',
    related: ['foreign-device', 'bbmd', 'bdt']
  },
  {
    id: 'foreign-device',
    term: 'Foreign device',
    abbreviation: 'FD',
    category: 'BACnet networking',
    definition: 'A BACnet/IP device outside a BBMD’s local IP subnet that registers with the BBMD to receive distributed broadcasts for a limited time.',
    related: ['bbmd', 'fdt']
  },
  {
    id: 'subnet',
    term: 'IP subnet',
    category: 'IP networking',
    definition: 'A range of IP addresses sharing the same network prefix. A host uses its address and subnet mask to decide whether a destination is local or must be sent to a gateway.',
    aliases: ['IPv4 subnet'],
    related: ['cidr', 'broadcast', 'ip-router', 'vlan']
  },
  {
    id: 'cidr',
    term: 'CIDR prefix',
    abbreviation: 'CIDR',
    category: 'IP networking',
    definition: 'Slash notation for the number of leading network bits in an IP address, such as /24. For IPv4, /24 corresponds to the mask 255.255.255.0.',
    aliases: ['prefix length', 'subnet mask'],
    related: ['subnet']
  },
  {
    id: 'broadcast',
    term: 'Broadcast',
    category: 'IP networking',
    definition: 'A transmission intended for every participant in a defined local scope. Broadcast boundaries differ by datalink, and ordinary IP routers do not forward IPv4 subnet broadcasts by default.',
    related: ['unicast', 'bbmd', 'vlan', 'who-is']
  },
  {
    id: 'unicast',
    term: 'Unicast',
    category: 'IP networking',
    definition: 'A transmission addressed to one destination. Successful BACnet unicast requires a usable address and a complete return path in addition to successful discovery.',
    related: ['broadcast', 'readproperty']
  },
  {
    id: 'udp',
    term: 'User Datagram Protocol',
    abbreviation: 'UDP',
    category: 'IP networking',
    definition: 'A connectionless IP transport protocol. BACnet/IP uses UDP and distinguishes logical endpoints by IP address and UDP port.',
    related: ['bacnet-ip', 'port']
  },
  {
    id: 'port',
    term: 'UDP port',
    category: 'IP networking',
    definition: 'A 16-bit transport-layer number used to deliver a UDP datagram to the correct application socket. BACnet/IP defaults to 47808, but other ports can define separate B/IP datalinks.',
    related: ['udp', 'bacnet-ip', 'datalink']
  },
  {
    id: 'ip-router',
    term: 'IP router',
    category: 'IP networking',
    definition: 'A Layer 3 device that forwards IP packets between IP subnets according to its routing table. It does not automatically perform BACnet network-layer routing or forward subnet broadcasts.',
    related: ['bacnet-router', 'subnet', 'gateway']
  },
  {
    id: 'gateway',
    term: 'Default gateway',
    category: 'IP networking',
    definition: 'The IP router address a host uses when a destination is outside its local IP subnet and no more-specific route applies.',
    aliases: ['gateway'],
    related: ['ip-router', 'subnet']
  },
  {
    id: 'vlan',
    term: 'Virtual LAN',
    abbreviation: 'VLAN',
    category: 'IP networking',
    definition: 'A logical Ethernet broadcast domain. Devices on different VLANs need Layer 3 routing to exchange IP traffic even when they are connected to the same physical switches.',
    related: ['broadcast', 'subnet', 'mac-address']
  },
  {
    id: 'mac-address',
    term: 'MAC address',
    category: 'IP networking',
    definition: 'A datalink-layer address used for local frame delivery. Its form and valid range depend on the datalink; Ethernet and MS/TP MAC addresses are not the same kind of identifier.',
    related: ['vlan', 'mstp', 'datalink']
  },
  {
    id: 'tls',
    term: 'Transport Layer Security',
    abbreviation: 'TLS',
    category: 'IP networking',
    definition: 'The security protocol used by BACnet/SC to authenticate peers and protect WebSocket traffic in transit.',
    related: ['bacnet-sc']
  },
  {
    id: 'bibb',
    term: 'BACnet Interoperability Building Block',
    abbreviation: 'BIBB',
    category: 'System delivery',
    definition: 'A defined set of BACnet capabilities associated with one side of an interoperable function. BIBBs state whether a device initiates or executes the required services.',
    related: ['interoperability', 'device-profile', 'pics']
  },
  {
    id: 'device-profile',
    term: 'BACnet device profile',
    category: 'System delivery',
    definition: 'A standardized capability profile for a class of BACnet device, built from required BIBBs and supporting requirements. Profiles help describe expected behavior but do not replace a project sequence or points list.',
    related: ['bibb', 'pics', 'btl']
  },
  {
    id: 'pics',
    term: 'Protocol Implementation Conformance Statement',
    abbreviation: 'PICS',
    category: 'System delivery',
    definition: 'A product document declaring its supported BACnet capabilities, including objects, services, BIBBs, datalinks, segmentation, and character sets.',
    related: ['bibb', 'device-profile', 'btl']
  },
  {
    id: 'btl',
    term: 'BACnet Testing Laboratories',
    abbreviation: 'BTL',
    category: 'System delivery',
    definition: 'The BACnet product testing and certification program. A BTL listing or certificate records independently tested capabilities for a particular product and version.',
    related: ['interoperability', 'pics', 'device-profile']
  },
  {
    id: 'confirmed-service',
    term: 'Confirmed service',
    category: 'Messages & data',
    definition: 'A BACnet service for which the initiating device expects a response such as an acknowledgment or error. ReadProperty and WriteProperty are common examples.',
    related: ['service', 'readproperty', 'writeproperty']
  },
  {
    id: 'priority-array',
    term: 'Priority array',
    category: 'Messages & data',
    definition: 'The 16-level command structure used by commandable BACnet properties. The highest active priority determines the effective value; relinquishing a command clears that slot.',
    related: ['writeproperty', 'property']
  },
  {
    id: 'eia-485', term: 'EIA-485 / RS-485', category: 'BACnet networking', definition: 'A balanced differential serial electrical interface used by BACnet MS/TP and ALC ARC156. The bus normally uses shielded twisted pair in a daisy chain with controlled termination, bias, polarity, length, and unit load.', aliases: ['RS-485', 'EIA-485'], related: ['mstp', 'arcnet', 'termination', 'network-bias']
  },
  {
    id: 'termination', term: 'Bus termination', category: 'BACnet networking', definition: 'An impedance-matching network placed at both physical ends of an EIA-485 segment to reduce signal reflections. A terminator belongs at an end, not merely at the first or last logical address.', aliases: ['terminator'], related: ['eia-485', 'mstp-segment', 'repeater']
  },
  {
    id: 'network-bias', term: 'Network bias', category: 'BACnet networking', definition: 'A controlled idle-state voltage applied to an EIA-485 segment so receivers see a known state when no transmitter is active. Competing or missing bias sources can cause unreliable communication.', aliases: ['failsafe bias'], related: ['eia-485', 'termination']
  },
  {
    id: 'mstp-segment', term: 'MS/TP segment', category: 'BACnet networking', definition: 'One continuous EIA-485 bus between repeaters or routers, with an ordered set of nodes, two physical ends, a cable-length budget, and a unit-load limit.', related: ['mstp', 'eia-485', 'repeater']
  },
  {
    id: 'arc156', term: 'BACnet ARC156', category: 'BACnet networking', definition: 'Automated Logic and Carrier’s 156.25 kbps BACnet ARCNET implementation over shielded EIA-485 wiring. Product guides specify daisy-chain wiring and commonly limit one segment to 610 metres (2000 feet) or 32 nodes.', aliases: ['ARC156', 'ALC ARCNET'], related: ['arcnet', 'eia-485', 'repeater']
  },
  {
    id: 'repeater', term: 'Repeater', category: 'BACnet networking', definition: 'A physical-layer device that regenerates a signal and divides wiring into separate electrical segments. It does not perform BACnet network-layer routing.', related: ['eia-485', 'mstp-segment', 'bacnet-router']
  },
  {
    id: 'access-port', term: 'Access port', category: 'IP networking', definition: 'An Ethernet switch port that places ordinary untagged endpoint traffic into one configured VLAN.', related: ['vlan', 'trunk-port', '802-1q']
  },
  {
    id: 'trunk-port', term: 'Trunk port', category: 'IP networking', definition: 'An Ethernet switch link configured to carry multiple VLANs, normally by adding IEEE 802.1Q tags. Both ends must agree on allowed and native VLAN behavior.', related: ['vlan', 'access-port', 'native-vlan', '802-1q']
  },
  {
    id: 'native-vlan', term: 'Native VLAN', category: 'IP networking', definition: 'The VLAN associated with untagged frames on an 802.1Q trunk. A mismatch between trunk ends can silently place the same untagged traffic into different broadcast domains.', related: ['trunk-port', 'vlan', '802-1q']
  },
  {
    id: '802-1q', term: 'IEEE 802.1Q', category: 'IP networking', definition: 'The Ethernet standard that inserts VLAN identification into frames so one physical link can carry traffic for multiple logical broadcast domains.', aliases: ['dot1q', 'VLAN tagging'], related: ['vlan', 'trunk-port']
  },
  {
    id: 'poe', term: 'Power over Ethernet', abbreviation: 'PoE', category: 'IP networking', definition: 'IEEE 802.3 technology that supplies power and Ethernet data over structured copper cabling. Port class, device demand, and the switch’s aggregate power budget must all be compatible.', aliases: ['802.3af', '802.3at', '802.3bt', 'PoE+', 'PoE++'], related: ['access-port']
  },
  {
    id: 'patch-panel', term: 'Patch panel', category: 'System delivery', definition: 'A passive termination field that maps permanent building cabling to removable patch cords. Its front/rear port pairing is part of the end-to-end physical path.', related: ['mdf-idf', 'access-port']
  },
  {
    id: 'mdf-idf', term: 'MDF / IDF', category: 'System delivery', definition: 'Main and intermediate distribution frames: rooms or closets where network switches, patch panels, backbone fibers, and horizontal cabling are concentrated.', aliases: ['MDF', 'IDF', 'telecom closet'], related: ['patch-panel', 'sfp']
  },
  {
    id: 'sfp', term: 'Small Form-factor Pluggable', abbreviation: 'SFP', category: 'IP networking', definition: 'A removable transceiver module that gives a network port a particular optical or copper medium, connector, wavelength, and reach.', related: ['multimode-fiber', 'single-mode-fiber', 'media-converter']
  },
  {
    id: 'multimode-fiber', term: 'Multimode fiber', category: 'IP networking', definition: 'Optical fiber with a larger core that supports multiple light paths, commonly used for shorter building and campus links. Reach depends on fiber grade and Ethernet speed.', aliases: ['MMF', 'OM3', 'OM4'], related: ['single-mode-fiber', 'sfp']
  },
  {
    id: 'single-mode-fiber', term: 'Single-mode fiber', category: 'IP networking', definition: 'Optical fiber with a small core designed for one propagation mode, supporting longer links when paired with matching optics.', aliases: ['SMF', 'OS2'], related: ['multimode-fiber', 'sfp']
  },
  {
    id: 'media-converter', term: 'Media converter', category: 'IP networking', definition: 'A device that converts a physical signal between media, such as copper Ethernet and fiber, without necessarily performing IP or BACnet routing.', related: ['sfp', 'repeater']
  },
  {
    id: 'unit-load', term: 'Unit load', category: 'BACnet networking', definition: 'The standardized electrical loading a transceiver places on an EIA-485 bus. Modern fractional-unit-load devices may permit more physical transceivers, subject to the applicable device and installation guidance.', related: ['eia-485', 'mstp-segment']
  }
];

export const glossaryEntryById = new Map(glossaryEntries.map(entry => [entry.id, entry]));
