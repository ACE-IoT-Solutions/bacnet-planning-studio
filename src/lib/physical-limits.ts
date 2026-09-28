import type { MstpCable, PhysicalMedia, PoeClass } from './physical';

// Conservative channel reach based on TIA-568 structured-cabling limits.
export const MEDIA_REACH_METERS: Partial<Record<PhysicalMedia, Record<number, number>>> = {
  'copper-utp': { 10: 100, 100: 100, 1000: 100, 10000: 100 },
  'copper-stp': { 10: 100, 100: 100, 1000: 100, 10000: 100 },
  'fiber-mm': { 1000: 550, 10000: 300 },
  'fiber-sm': { 1000: 5000, 10000: 10000 }
};

// IEEE 802.3 PSE/PD class envelopes; diagnostics use the conservative delivered power.
export const POE_CLASS_WATTS: Record<PoeClass, number> = { none: 0, af: 12.95, at: 25.5, 'bt-type3': 51, 'bt-type4': 71 };
export const POE_CLASS_RANK: Record<PoeClass, number> = { none: 0, af: 1, at: 2, 'bt-type3': 3, 'bt-type4': 4 };

// ASHRAE 135 MS/TP traditionally limits one EIA-485 segment to 32 unit loads.
export const MSTP_MAX_UNIT_LOADS = 32;

// Automated Logic/Carrier ARC156 installation guides specify 156 kbps, 610 m (2000 ft),
// 32 nodes per EIA-485 segment, daisy-chain wiring, and termination at both ends.
export const ARC156_BAUD = 156250;
export const ARC156_MAX_LENGTH_METERS = 610;
export const ARC156_MAX_NODES = 32;

// Conservative EIA-485 segment budgets. Installations must also follow vendor guidance.
export const MSTP_LENGTH_METERS: Record<MstpCable, Record<number, number>> = {
  'stp-18awg': { 9600: 1200, 19200: 1200, 38400: 1200, 57600: 1000, 76800: 800, 115200: 500 },
  'stp-22awg': { 9600: 1200, 19200: 1200, 38400: 1000, 57600: 800, 76800: 600, 115200: 400 },
  'stp-24awg': { 9600: 1000, 19200: 1000, 38400: 800, 57600: 600, 76800: 450, 115200: 300 },
  other: { 9600: 600, 19200: 600, 38400: 500, 57600: 400, 76800: 300, 115200: 200 }
};

export function mediaReach(media: PhysicalMedia, speedMbps = 1000): number | undefined {
  const table = MEDIA_REACH_METERS[media];
  if (!table) return undefined;
  const speeds = Object.keys(table).map(Number).sort((a, b) => a - b);
  const selected = speeds.find(speed => speed >= speedMbps) ?? speeds.at(-1);
  return selected === undefined ? undefined : table[selected];
}

export function mstpLengthLimit(cable: MstpCable, baud: number): number {
  const table = MSTP_LENGTH_METERS[cable];
  const rates = Object.keys(table).map(Number).sort((a, b) => a - b);
  const selected = rates.find(rate => rate >= baud) ?? rates.at(-1)!;
  return table[selected];
}
