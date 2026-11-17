import { describe, expect, it } from 'vitest';
import { calculateMstpElectrical, calculateMstpTiming, generateMstpMacAddresses, calculateMstpLine } from './mstp-simulator';

describe('MS/TP cable equivalent', () => {
  it('uses the 150 m cable defaults and the near/far resistor divider', () => {
    const line = calculateMstpLine({ sourceDifferential: 3, unitLoads: 16, terminations: 2 });
    expect(line.loopOhms).toBeCloseTo(23.61);
    expect(line.delaySeconds * 1e6).toBeCloseTo(.7875);
    const farOhms = 1 / (1 / 120 + 16 / 24000);
    // Driver || near termination = 30 ohms; open-circuit equivalent = 2.25 V.
    expect(line.plateauVolts).toBeCloseTo(2.25 * farOhms / (30 + 23.61 + farOhms));
    const echoSum = line.equivalentSource * line.arrivalGain / (1 - line.gammaSource * line.gammaLoad);
    expect(echoSum).toBeCloseTo(line.plateauVolts);
  });

  it('responds monotonically to load and length, and preserves source polarity', () => {
    const input = { sourceDifferential: 3, unitLoads: 16, terminations: 2 };
    const baseline = calculateMstpLine(input).plateauVolts;
    expect(calculateMstpLine({ ...input, unitLoads: 32 }).plateauVolts).toBeLessThan(baseline);
    expect(calculateMstpLine({ ...input, lengthMeters: 300 }).plateauVolts).toBeLessThan(baseline);
    expect(calculateMstpLine({ ...input, driverOhms: 80 }).plateauVolts).toBeLessThan(baseline);
    expect(calculateMstpLine({ ...input, sourceDifferential: -3 }).plateauVolts).toBeCloseTo(-baseline);
    expect(calculateMstpLine({ ...input, sourceDifferential: 0 }).plateauVolts).toBe(0);
  });

  it('matches a terminated zero-length divider and an unloaded open circuit', () => {
    expect(calculateMstpLine({ sourceDifferential: 3, unitLoads: 0, terminations: 2, lengthMeters: 0 }).plateauVolts).toBeCloseTo(1.8);
    const open = calculateMstpLine({ sourceDifferential: 3, unitLoads: 0, terminations: 0 });
    expect(open.plateauVolts).toBe(3);
    expect(open.gammaLoad).toBe(1);
  });
});

describe('MS/TP electrical simulator', () => {
  it('combines fractional unit loads and parallel termination', () => {
    const result = calculateMstpElectrical({
      fullLoads: 8,
      halfLoads: 16,
      quarterLoads: 32,
      eighthLoads: 16,
      terminations: 2,
      nonInvertingVolts: 2.35,
      invertingVolts: 2.05,
      loadedDriverVolts: 2
    });
    expect(result.deviceCount).toBe(72);
    expect(result.unitLoads).toBe(26);
    expect(result.remainingUnitLoads).toBe(6);
    expect(result.terminationOhms).toBe(60);
    expect(result.receiverState).toBe('high');
    expect(result.commonModeVolts).toBeCloseTo(2.2);
    expect(result.loadedDriverValid).toBe(true);
  });

  it('distinguishes undefined differential input from invalid common mode', () => {
    const undefinedResult = calculateMstpElectrical({
      fullLoads: 0, halfLoads: 0, quarterLoads: 0, eighthLoads: 0, terminations: 0,
      nonInvertingVolts: 1.1, invertingVolts: 1, loadedDriverVolts: 1.2
    });
    expect(undefinedResult.receiverState).toBe('undefined');
    expect(undefinedResult.loadedDriverValid).toBe(false);

    const commonModeResult = calculateMstpElectrical({
      fullLoads: 0, halfLoads: 0, quarterLoads: 0, eighthLoads: 0, terminations: 0,
      nonInvertingVolts: 13, invertingVolts: 12.7, loadedDriverVolts: 2
    });
    expect(commonModeResult.receiverState).toBe('outside-common-mode');
  });
});

describe('MS/TP token timing playground', () => {
  it('generates manager addresses with the requested empty MAC gap', () => {
    expect(generateMstpMacAddresses(5, 2)).toEqual([0, 3, 6, 9, 12]);
    expect(generateMstpMacAddresses(4, 63)).toEqual([0, 64]);
  });

  it('separates normal rotation from amortized empty-address polling', () => {
    const compact = calculateMstpTiming({
      managerCount: 4,
      macGap: 0,
      maxManager: 3,
      baudRate: 38400,
      maxInfoFrames: 1,
      payloadBytes: 100,
      tokenUseDelayMs: 2,
      usageTimeoutMs: 20,
      pollInterval: 50
    });
    const sparse = calculateMstpTiming({
      managerCount: 4,
      macGap: 3,
      maxManager: 15,
      baudRate: 38400,
      maxInfoFrames: 1,
      payloadBytes: 100,
      tokenUseDelayMs: 2,
      usageTimeoutMs: 20,
      pollInterval: 50
    });
    expect(sparse.normalRotationMs).toBeCloseTo(compact.normalRotationMs);
    expect(compact.emptyAddresses).toBe(0);
    expect(sparse.emptyAddresses).toBe(12);
    expect(compact.pollEventsPerRotation).toBe(0);
    expect(sparse.pollEventsPerRotation).toBeCloseTo(12 / 53);
    expect(sparse.estimatedRotationMs).toBeGreaterThan(compact.estimatedRotationMs);
    expect(compact.deviceLatencyMs.min).toBe(0);
    expect(compact.deviceLatencyMs.median).toBeCloseTo(compact.normalRotationMs / 2);
    expect(compact.deviceLatencyMs.max).toBeCloseTo(compact.normalRotationMs);
    expect(sparse.deviceLatencyMs.median).toBeCloseTo(sparse.estimatedRotationMs / 2);
    expect(sparse.deviceLatencyMs.max).toBeCloseTo(sparse.normalRotationMs + 4 * (sparse.tokenFrameMs + 20));
    expect(sparse.deviceLatencyMs.max).toBeGreaterThan(sparse.estimatedRotationMs);
    expect(sparse.payloadThroughputBps).toBeLessThan(compact.payloadThroughputBps);
    expect(sparse.largestGapScanRotations).toBe(53);
  });

  it('flags a Max_Manager below the highest generated address', () => {
    const result = calculateMstpTiming({
      managerCount: 8, macGap: 2, maxManager: 10, baudRate: 76800,
      maxInfoFrames: 2, payloadBytes: 200, tokenUseDelayMs: 2, usageTimeoutMs: 20, pollInterval: 50
    });
    expect(result.addresses.at(-1)).toBe(21);
    expect(result.configurationValid).toBe(false);
  });
});
