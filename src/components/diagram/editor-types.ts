import type { DiagramDevice, DiagramDeviceAddress, DiagramNic, DiagramSubnet } from '../../lib/network-diagram';

export interface DeviceSubnetEntry { device: DiagramDevice; subnet: DiagramSubnet }
export interface RoutingDevice { id: string; name: string; ip: string }
export interface ScHubOption { id: string; name: string; label: string }
export interface SubnetEditorActions {
  removeSubnet(id: string): void;
  subnetIsValid(subnet: DiagramSubnet): boolean;
  upstreamNetworkOptions(subnet: DiagramSubnet): DiagramSubnet[];
  subnetCidr(subnet: DiagramSubnet): string;
  routingDevicesFor(subnet: DiagramSubnet): RoutingDevice[];
  addDevice(subnet: DiagramSubnet): void;
  addressCount(device: DiagramDevice): number;
  movableSubnets(subnet: DiagramSubnet): DiagramSubnet[];
  openMoveDeviceDialog(device: DiagramDevice, subnet: DiagramSubnet): void;
  setDeviceBbmd(device: DiagramDevice, enabled: boolean): void;
  otherBbmdDevices(device: DiagramDevice, subnetId: string): DeviceSubnetEntry[];
  isBdtPeer(device: DiagramDevice, peerId: string): boolean;
  toggleBdtPeer(device: DiagramDevice, peerId: string): void;
  foreignBbmdOptions(device: DiagramDevice, subnetId: string): DeviceSubnetEntry[];
  addDeviceNic(device: DiagramDevice, subnetId: string): void;
  addNicAddress(nic: DiagramNic, subnetId: string): void;
  removeDeviceNic(device: DiagramDevice, nicId: string): void;
  scHubsForNic(nic: DiagramNic): ScHubOption[];
  compatibleAddressNetworks(subnet: DiagramSubnet): DiagramSubnet[];
  addressFieldLabel(address: DiagramDeviceAddress): string;
  addressEntryClass(address: DiagramDeviceAddress): Record<string, boolean>;
  removeNicAddress(nic: DiagramNic, addressId: string): void;
  removeDevice(subnet: DiagramSubnet, deviceId: string): void;
  handleDiagramNetworkTypeChange(subnet: DiagramSubnet): void;
}
