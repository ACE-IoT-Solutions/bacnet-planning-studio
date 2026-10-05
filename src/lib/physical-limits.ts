import type { MstpCable, PhysicalMedia, PoeClass } from './physical';

// ANSI/TIA-568.2-D balanced twisted-pair channel length; TIA standards catalog:
// https://tiaonline.org/standard/ansi-tia-568-2-d-balanced-twisted-pair-telecommunications-cabling-and-components-standard/
export const MEDIA_REACH_METERS: Partial<Record<PhysicalMedia, Record<number, number>>> = {
  // ANSI/TIA-568.2-D: 100 m channel.
  'copper-utp': { 10: 100, 100: 100, 1000: 100, 10000: 100 },
  // ANSI/TIA-568.2-D: 100 m channel.
  'copper-stp': { 10: 100, 100: 100, 1000: 100, 10000: 100 },
  // IEEE 802.3 1000BASE-SX / 10GBASE-SR reach, using conservative OM3 values.
  'fiber-mm': { 1000: 550, 10000: 300 },
  // IEEE 802.3 1000BASE-LX / 10GBASE-LR reach.
  'fiber-sm': { 1000: 5000, 10000: 10000 }
};

// IEEE 802.3 Clause 33 PSE/PD class envelopes; diagnostics use delivered PD power.
// https://standards.ieee.org/ieee/802.3/10422/
export const POE_CLASS_WATTS: Record<PoeClass, number> = { none: 0, af: 12.95, at: 25.5, 'bt-type3': 51, 'bt-type4': 71 };
export const POE_CLASS_RANK: Record<PoeClass, number> = { none: 0, af: 1, at: 2, 'bt-type3': 3, 'bt-type4': 4 };

// ANSI/ASHRAE 135-2016 Addendum bm, Clause 9.2.2: 32 EIA-485 unit loads per segment.
// https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/135_2016_bm_20180618.pdf
export const MSTP_MAX_UNIT_LOADS = 32;

// Carrier RTU Open v5 Integration Guide, Communications Wiring, specifies dedicated
// 22 AWG shielded twisted pair, 610 m (2000 ft), 32 nodes, and daisy-chain wiring:
// https://www.shareddocs.com/hvac/docs/1000/Public/04/11-808-697-01.pdf
export const ARC156_BAUD = 156250;
export const ARC156_MAX_LENGTH_METERS = 610;
export const ARC156_MAX_NODES = 32;

// ANSI/ASHRAE Standard 135, Clause 9.2.2 specifies a 1200 m maximum MS/TP segment.
// Cable gauge and baud-rate derating is not imposed without product-specific guidance.
export const MSTP_LENGTH_METERS: Record<MstpCable, Record<number, number>> = {
  // ASHRAE 135 Clause 9.2.2; verify the selected 18 AWG cable's capacitance and impedance with its manufacturer.
  'stp-18awg': { 9600: 1200, 19200: 1200, 38400: 1200, 57600: 1200, 76800: 1200, 115200: 1200 },
  // ASHRAE 135 Clause 9.2.2; verify the selected 22 AWG cable's capacitance and impedance with its manufacturer.
  'stp-22awg': { 9600: 1200, 19200: 1200, 38400: 1200, 57600: 1200, 76800: 1200, 115200: 1200 },
  // ASHRAE 135 Clause 9.2.2; verify the selected 24 AWG cable's capacitance and impedance with its manufacturer.
  'stp-24awg': { 9600: 1200, 19200: 1200, 38400: 1200, 57600: 1200, 76800: 1200, 115200: 1200 },
  // ASHRAE 135 Clause 9.2.2; unknown cable still requires installer/manufacturer verification.
  other: { 9600: 1200, 19200: 1200, 38400: 1200, 57600: 1200, 76800: 1200, 115200: 1200 }
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
