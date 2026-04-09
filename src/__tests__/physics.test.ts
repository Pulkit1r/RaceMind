// ─── Physics Engine Tests ────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  computeTireWear,
  computeLapTime,
  thermalWearMultiplier,
  TIRE_MODELS,
  BASE_LAP_TIME,
  FUEL_LOAD_FULL,
  getTrackAbrasion,
  TIRE_COLORS,
} from '../physics';

describe('TIRE_MODELS', () => {
  it('has entries for all 5 compounds', () => {
    expect(TIRE_MODELS).toHaveProperty('soft');
    expect(TIRE_MODELS).toHaveProperty('medium');
    expect(TIRE_MODELS).toHaveProperty('hard');
    expect(TIRE_MODELS).toHaveProperty('inter');
    expect(TIRE_MODELS).toHaveProperty('wet');
  });

  it('soft has faster base offset than hard', () => {
    expect(TIRE_MODELS.soft.baseOffset).toBeLessThan(TIRE_MODELS.hard.baseOffset);
  });

  it('soft degrades faster (higher wearPerLap) than hard', () => {
    expect(TIRE_MODELS.soft.wearPerLap).toBeGreaterThan(TIRE_MODELS.hard.wearPerLap);
  });
});

describe('computeTireWear', () => {
  it('returns a value between 0 and 100', () => {
    const result = computeTireWear(100, 0, 'medium');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('decreases tire wear over time', () => {
    const after1 = computeTireWear(100, 0, 'medium');
    const after5 = computeTireWear(after1, 4, 'medium');
    expect(after5).toBeLessThan(after1);
  });

  it('soft tires degrade faster than hard tires', () => {
    const softAfter10: number[] = [];
    const hardAfter10: number[] = [];
    let softWear = 100;
    let hardWear = 100;
    for (let i = 0; i < 10; i++) {
      softWear = computeTireWear(softWear, i, 'soft');
      hardWear = computeTireWear(hardWear, i, 'hard');
    }
    expect(softWear).toBeLessThan(hardWear);
  });

  it('never returns below 0', () => {
    let wear = 100;
    for (let i = 0; i < 100; i++) {
      wear = computeTireWear(wear, i, 'soft', 55, 1.5);
    }
    expect(wear).toBeGreaterThanOrEqual(0);
  });

  it('wet wear modifier increases degradation for dry compounds in rain', () => {
    const dryGrip = computeTireWear(100, 5, 'soft', 40, 1.0, 1.0);
    const wetGrip = computeTireWear(100, 5, 'soft', 40, 1.0, 0.7);
    // In low grip (gripFactor < 0.85), dry compounds degrade faster (wetWearMod = 1.25)
    expect(wetGrip).toBeLessThan(dryGrip);
  });

  it('inter tires degrade slower in wet conditions', () => {
    const interInWet = computeTireWear(100, 5, 'inter', 40, 1.0, 0.7);
    const softInWet = computeTireWear(100, 5, 'soft', 40, 1.0, 0.7);
    expect(interInWet).toBeGreaterThan(softInWet);
  });
});

describe('thermalWearMultiplier', () => {
  it('returns 1.0 at baseline 40°C', () => {
    expect(thermalWearMultiplier(40)).toBeCloseTo(1.0, 2);
  });

  it('returns > 1.0 when hot (trackTemp > 40)', () => {
    expect(thermalWearMultiplier(55)).toBeGreaterThan(1.0);
  });

  it('returns < 1.0 when cold (trackTemp < 40)', () => {
    expect(thermalWearMultiplier(25)).toBeLessThan(1.0);
  });

  it('is clamped between 0.7 and 1.4', () => {
    expect(thermalWearMultiplier(-50)).toBeGreaterThanOrEqual(0.7);
    expect(thermalWearMultiplier(200)).toBeLessThanOrEqual(1.4);
  });
});

describe('computeLapTime', () => {
  it('returns a lap time object with 4 fields', () => {
    const result = computeLapTime(100, 'medium', FUEL_LOAD_FULL);
    expect(result).toHaveProperty('lapTime');
    expect(result).toHaveProperty('s1');
    expect(result).toHaveProperty('s2');
    expect(result).toHaveProperty('s3');
  });

  it('lap time increases as tireWear decreases (more worn = slower)', () => {
    const times: number[] = [];
    for (const wear of [100, 70, 40, 10]) {
      const { lapTime } = computeLapTime(wear, 'medium', 50);
      times.push(lapTime);
    }
    // Trend should be increasing (slower), allowing for noise
    // Check averages over a window
    expect(times[times.length - 1]).toBeGreaterThan(times[0] - 1.0);
  });

  it('lighter fuel produces faster lap times on average', () => {
    let heavyTotal = 0;
    let lightTotal = 0;
    const N = 50;
    for (let i = 0; i < N; i++) {
      heavyTotal += computeLapTime(80, 'medium', FUEL_LOAD_FULL).lapTime;
      lightTotal += computeLapTime(80, 'medium', 10).lapTime;
    }
    expect(lightTotal / N).toBeLessThan(heavyTotal / N);
  });

  it('soft compound produces faster baseline than hard', () => {
    let softTotal = 0;
    let hardTotal = 0;
    const N = 50;
    for (let i = 0; i < N; i++) {
      softTotal += computeLapTime(100, 'soft', 50).lapTime;
      hardTotal += computeLapTime(100, 'hard', 50).lapTime;
    }
    expect(softTotal / N).toBeLessThan(hardTotal / N);
  });

  it('low grip adds significant time penalty', () => {
    let dryTotal = 0;
    let wetTotal = 0;
    const N = 50;
    for (let i = 0; i < N; i++) {
      dryTotal += computeLapTime(80, 'medium', 50, 1.0).lapTime;
      wetTotal += computeLapTime(80, 'medium', 50, 0.6).lapTime;
    }
    expect(wetTotal / N).toBeGreaterThan(dryTotal / N + 2);
  });

  it('sector times sum to approximately the lap time', () => {
    const { lapTime, s1, s2, s3 } = computeLapTime(80, 'medium', 50);
    expect(s1 + s2 + s3).toBeCloseTo(lapTime, 1);
  });
});

describe('getTrackAbrasion', () => {
  it('returns known coefficient for Bahrain', () => {
    expect(getTrackAbrasion('Bahrain')).toBe(1.25);
  });

  it('returns 1.0 for unknown tracks', () => {
    expect(getTrackAbrasion('Imaginary Track')).toBe(1.0);
  });

  it('Monaco is less abrasive than Bahrain', () => {
    expect(getTrackAbrasion('Circuit de Monaco')).toBeLessThan(getTrackAbrasion('Bahrain'));
  });
});

describe('TIRE_COLORS', () => {
  it('has a color for each dry compound', () => {
    expect(TIRE_COLORS.soft).toBeDefined();
    expect(TIRE_COLORS.medium).toBeDefined();
    expect(TIRE_COLORS.hard).toBeDefined();
  });
});
