export const EIA485_UNIT_LOAD_BUDGET = 32;
export const EIA485_RECEIVER_THRESHOLD_VOLTS = 0.2;
export const EIA485_COMMON_MODE_MIN_VOLTS = -7;
export const EIA485_COMMON_MODE_MAX_VOLTS = 12;
export const EIA485_DRIVER_MIN_VOLTS = 1.5;
export const EIA485_DRIVER_MAX_VOLTS = 5;

export interface MstpElectricalInput {
  fullLoads: number;
  halfLoads: number;
  quarterLoads: number;
  eighthLoads: number;
  terminations: number;
  nonInvertingVolts: number;
  invertingVolts: number;
  loadedDriverVolts: number;
}

export type ReceiverState = 'high' | 'low' | 'undefined' | 'outside-common-mode';

export interface MstpElectricalResult {
  deviceCount: number;
  unitLoads: number;
  remainingUnitLoads: number;
  loadUtilizationPercent: number;
  terminationOhms: number | null;
  differentialVolts: number;
  commonModeVolts: number;
  commonModeValid: boolean;
  receiverState: ReceiverState;
  loadedDriverValid: boolean;
}

function nonNegative(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

export interface MstpLineInput {
  sourceDifferential: number;
  unitLoads: number;
  terminations: number;
  lengthMeters?: number;
  driverOhms?: number;
  conductorOhmsPerKm?: number;
  impedanceOhms?: number;
  delayNsPerMeter?: number;
  riseTimeUs?: number;
}

/** Differential teaching equivalent: driver at near end, receiver loading
 * concentrated at far end. A UL is approximated as 12k per pin to the common
 * reference, hence 24k differential. Cable DC loss is lumped into source
 * resistance for the traveling-wave approximation. Common mode is held fixed.
 * Defaults: Belden 9841 nominal cable data; driver 40 ohms/1 us are assumptions.
 */
export function calculateMstpLine(input: MstpLineInput) {
  const source = Number.isFinite(input.sourceDifferential) ? input.sourceDifferential : 0;
  const length = Math.min(5000, nonNegative(input.lengthMeters ?? 150));
  const driver = Math.max(1, nonNegative(input.driverOhms ?? 40));
  const z0 = Math.max(1, nonNegative(input.impedanceOhms ?? 120));
  const count = Math.min(4, Math.round(nonNegative(input.terminations)));
  const loopOhms = 2 * length * nonNegative(input.conductorOhmsPerKm ?? 78.7) / 1000;
  const nearConductance = count >= 2 ? 1 / 120 : 0;
  const farConductance = Math.max(0, count - (count >= 2 ? 1 : 0)) / 120 + nonNegative(input.unitLoads) / 24000;
  const sourceOhms = 1 / (1 / driver + nearConductance) + loopOhms;
  const equivalentSource = source / (1 + driver * nearConductance);
  const gammaLoad = (1 - z0 * farConductance) / (1 + z0 * farConductance);
  const gammaSource = (sourceOhms - z0) / (sourceOhms + z0);
  const arrivalGain = z0 / (sourceOhms + z0) * (1 + gammaLoad);
  return {
    loopOhms, sourceOhms, equivalentSource, gammaLoad, gammaSource, arrivalGain,
    plateauVolts: equivalentSource / (1 + sourceOhms * farConductance),
    delaySeconds: length * nonNegative(input.delayNsPerMeter ?? 5.25) * 1e-9,
    riseSeconds: Math.max(.01, nonNegative(input.riseTimeUs ?? 1)) * 1e-6
  };
}

export function calculateMstpElectrical(input: MstpElectricalInput): MstpElectricalResult {
  const fullLoads = nonNegative(input.fullLoads);
  const halfLoads = nonNegative(input.halfLoads);
  const quarterLoads = nonNegative(input.quarterLoads);
  const eighthLoads = nonNegative(input.eighthLoads);
  const unitLoads = fullLoads + halfLoads / 2 + quarterLoads / 4 + eighthLoads / 8;
  const terminationCount = Math.max(0, Math.round(input.terminations));
  const differentialVolts = input.nonInvertingVolts - input.invertingVolts;
  const commonModeVolts = (input.nonInvertingVolts + input.invertingVolts) / 2;
  const commonModeValid = commonModeVolts >= EIA485_COMMON_MODE_MIN_VOLTS
    && commonModeVolts <= EIA485_COMMON_MODE_MAX_VOLTS;

  let receiverState: ReceiverState = 'undefined';
  if (!commonModeValid) receiverState = 'outside-common-mode';
  else if (differentialVolts >= EIA485_RECEIVER_THRESHOLD_VOLTS) receiverState = 'high';
  else if (differentialVolts <= -EIA485_RECEIVER_THRESHOLD_VOLTS) receiverState = 'low';

  return {
    deviceCount: fullLoads + halfLoads + quarterLoads + eighthLoads,
    unitLoads,
    remainingUnitLoads: EIA485_UNIT_LOAD_BUDGET - unitLoads,
    loadUtilizationPercent: (unitLoads / EIA485_UNIT_LOAD_BUDGET) * 100,
    terminationOhms: terminationCount ? 120 / terminationCount : null,
    differentialVolts,
    commonModeVolts,
    commonModeValid,
    receiverState,
    loadedDriverValid: input.loadedDriverVolts >= EIA485_DRIVER_MIN_VOLTS
      && input.loadedDriverVolts <= EIA485_DRIVER_MAX_VOLTS
  };
}

export interface MstpTimingInput {
  managerCount: number;
  macGap: number;
  maxManager: number;
  baudRate: number;
  maxInfoFrames: number;
  payloadBytes: number;
  tokenUseDelayMs: number;
  usageTimeoutMs: number;
  pollInterval: number;
}

export interface MstpMacGap {
  from: number;
  to: number;
  unused: number;
}

export interface MstpTimingResult {
  addresses: number[];
  gaps: MstpMacGap[];
  requestedManagerCount: number;
  managerCount: number;
  wasClipped: boolean;
  configurationValid: boolean;
  emptyAddresses: number;
  largestGap: number;
  dataFrameMs: number;
  tokenFrameMs: number;
  turnaroundMs: number;
  normalRotationMs: number;
  pollEventsPerRotation: number;
  maintenanceBudgetMs: number;
  estimatedRotationMs: number;
  deviceLatencyMs: { min: number; median: number; max: number };
  largestGapScanRotations: number;
  largestGapScanMs: number;
  payloadBitsPerRotation: number;
  payloadThroughputBps: number;
  wireEfficiencyPercent: number;
}

function integerInRange(value: number, minimum: number, maximum: number): number {
  const finite = Number.isFinite(value) ? Math.round(value) : minimum;
  return Math.min(maximum, Math.max(minimum, finite));
}

export function generateMstpMacAddresses(managerCount: number, macGap: number): number[] {
  const count = integerInRange(managerCount, 1, 128);
  const gap = integerInRange(macGap, 0, 127);
  const step = gap + 1;
  const addresses: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const address = index * step;
    if (address > 127) break;
    addresses.push(address);
  }
  return addresses;
}

export function calculateMstpTiming(input: MstpTimingInput): MstpTimingResult {
  const requestedManagerCount = integerInRange(input.managerCount, 1, 128);
  const addresses = generateMstpMacAddresses(requestedManagerCount, input.macGap);
  const managerCount = addresses.length;
  const maxManager = integerInRange(input.maxManager, 0, 127);
  const lastAddress = addresses.at(-1) ?? 0;
  const configurationValid = maxManager >= lastAddress;
  const effectiveMaxManager = Math.max(maxManager, lastAddress);
  const gaps = addresses.map((address, index) => {
    const next = addresses[(index + 1) % addresses.length];
    const unused = index === addresses.length - 1
      ? effectiveMaxManager - address + next
      : next - address - 1;
    return { from: address, to: next, unused: Math.max(0, unused) };
  });
  const emptyAddresses = effectiveMaxManager + 1 - managerCount;
  const baudRate = Math.max(1, input.baudRate);
  const maxInfoFrames = integerInRange(input.maxInfoFrames, 1, 255);
  const payloadBytes = integerInRange(input.payloadBytes, 1, 501);
  const tokenUseDelayMs = nonNegative(input.tokenUseDelayMs);
  const usageTimeoutMs = nonNegative(input.usageTimeoutMs);
  const pollInterval = Math.max(1, Math.round(input.pollInterval));
  const millisecondsPerBit = 1000 / baudRate;
  const dataFrameMs = (payloadBytes + 10) * 10 * millisecondsPerBit;
  const tokenFrameMs = 8 * 10 * millisecondsPerBit;
  const turnaroundMs = 40 * millisecondsPerBit;
  const managerTrafficMs = maxInfoFrames * (dataFrameMs + turnaroundMs);
  const normalRotationMs = managerCount * (managerTrafficMs + tokenFrameMs + tokenUseDelayMs);
  const unansweredPollMs = tokenFrameMs + usageTimeoutMs;
  // After Npoll token uses, each manager begins a maintenance scan. It advances
  // its Poll Station on each subsequent token possession until the scan reaches
  // the known successor, then resets TokenCount. A cycle across a gap of g
  // addresses therefore occupies roughly Npoll + g rotations and sends g PFMs.
  const pollEventsPerRotation = gaps.reduce(
    (events, gap) => events + (gap.unused > 0 ? gap.unused / (pollInterval + gap.unused) : 0),
    0
  );
  const maintenanceBudgetMs = pollEventsPerRotation * unansweredPollMs;
  const estimatedRotationMs = normalRotationMs + maintenanceBudgetMs;
  // Ready-request access wait. Uniform arrival gives an approximate median
  // of half the amortized rotation. The maximum budgets one unanswered PFM
  // for every manager with a gap, all occurring on the same rotation.
  const deviceLatencyMs = {
    min: 0,
    median: estimatedRotationMs / 2,
    max: normalRotationMs + gaps.filter(gap => gap.unused > 0).length * unansweredPollMs
  };
  const largestGap = Math.max(0, ...gaps.map(gap => gap.unused));
  const largestGapScanRotations = largestGap > 0 ? pollInterval + largestGap : 0;
  const largestGapScanMs = largestGapScanRotations * estimatedRotationMs;
  const payloadBitsPerRotation = managerCount * maxInfoFrames * payloadBytes * 8;
  const payloadThroughputBps = estimatedRotationMs > 0
    ? payloadBitsPerRotation / (estimatedRotationMs / 1000)
    : 0;

  return {
    addresses,
    gaps,
    requestedManagerCount,
    managerCount,
    wasClipped: managerCount !== requestedManagerCount,
    configurationValid,
    emptyAddresses,
    largestGap,
    dataFrameMs,
    tokenFrameMs,
    turnaroundMs,
    normalRotationMs,
    pollEventsPerRotation,
    maintenanceBudgetMs,
    estimatedRotationMs,
    deviceLatencyMs,
    largestGapScanRotations,
    largestGapScanMs,
    payloadBitsPerRotation,
    payloadThroughputBps,
    wireEfficiencyPercent: (payloadThroughputBps / baudRate) * 100
  };
}
