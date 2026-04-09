// ─── Physics Engine ──────────────────────────────────────────────────────────
// Tire degradation model, lap time computation, track abrasion, thermal effects.
// This is the core physics layer — no strategy logic here.

import type { TireModel, RaceState } from './types';

// ─── Tire Degradation Model ──────────────────────────────────────────────────
// Each compound has:
//   baseOffset   – initial lap time offset vs medium (negative = faster)
//   wearPerLap   – base tire-wear % lost per lap
//   wearAccel    – how much wearPerLap increases per lap (non-linear cliff)
//   lapTimePenalty – seconds added per 1% of wear lost

export const TIRE_MODELS: Record<string, TireModel> = {
  soft:   { baseOffset: -0.30, wearPerLap: 3.0, wearAccel: 0.08, lapTimePenalty: 0.025 },
  medium: { baseOffset:  0.00, wearPerLap: 1.8, wearAccel: 0.04, lapTimePenalty: 0.018 },
  hard:   { baseOffset:  0.40, wearPerLap: 1.0, wearAccel: 0.015, lapTimePenalty: 0.012 },
  inter:  { baseOffset:  1.20, wearPerLap: 1.5, wearAccel: 0.03, lapTimePenalty: 0.016 },
  wet:    { baseOffset:  2.50, wearPerLap: 1.2, wearAccel: 0.02, lapTimePenalty: 0.014 },
};

// ─── Fitted Coefficients Loader ──────────────────────────────────────────────
// On app init, we fetch fitted coefficients from real F1 data and override
// the hardcoded TIRE_MODELS values. Falls back to hardcoded if fetch fails.

let _fittedModelActive = false;

export function isFittedModelActive(): boolean {
  return _fittedModelActive;
}

interface FittedCoefficients {
  [compound: string]: {
    baseOffset: number;
    wearPerLap: number;
    wearAccel: number;
    lapTimePenalty: number;
  };
}

export async function loadFittedCoefficients(): Promise<void> {
  try {
    const response = await fetch('/data/fittedCoefficients.json');
    if (!response.ok) {
      console.warn('[Physics] Could not load fitted coefficients, using hardcoded values.');
      return;
    }
    const data: FittedCoefficients = await response.json();
    for (const [compound, coeffs] of Object.entries(data)) {
      if (TIRE_MODELS[compound]) {
        TIRE_MODELS[compound].baseOffset = coeffs.baseOffset;
        TIRE_MODELS[compound].wearPerLap = coeffs.wearPerLap;
        TIRE_MODELS[compound].wearAccel = coeffs.wearAccel;
        TIRE_MODELS[compound].lapTimePenalty = coeffs.lapTimePenalty;
      }
    }
    _fittedModelActive = true;
    console.log('[Physics] Fitted coefficients loaded from real F1 data.');
  } catch (err) {
    console.warn('[Physics] Failed to load fitted coefficients:', err);
  }
}

// Auto-load on module init
loadFittedCoefficients();

// ─── Track Surface Abrasion Coefficients ─────────────────────────────────────
export const TRACK_ABRASION: Record<string, number> = {
  'Circuit de Monaco':  0.75,
  'Silverstone':        1.10,
  'Monza':              0.85,
  'Spa-Francorchamps':  1.05,
  'Suzuka':             1.15,
  'Interlagos':         1.20,
  'COTA':               1.10,
  'Yas Marina':         0.90,
  'Bahrain':            1.25,
  'Jeddah':             0.80,
  'Melbourne':          0.95,
  'Barcelona':          1.15,
  'Singapore':          0.85,
  'Zandvoort':          1.10,
  'Hungaroring':        1.00,
};

/**
 * Get track abrasion coefficient. Falls back to 1.0 for unknown tracks.
 */
export function getTrackAbrasion(trackName: string): number {
  return TRACK_ABRASION[trackName] ?? 1.0;
}

// ─── Constants ───────────────────────────────────────────────────────────────
export const BASE_LAP_TIME = 75.5; // seconds – baseline on fresh mediums with full fuel
export const FUEL_LOAD_FULL = 70;  // kg at race start (50 laps)
export const FUEL_PER_LAP = 1.4;   // kg consumed per lap

// ─── Thermal Wear Multiplier ─────────────────────────────────────────────────
/**
 * Compute a thermal wear multiplier from track temperature.
 * Hotter track surface → faster rubber degradation.
 * Reference point: 40°C track temp = 1.0x (neutral).
 * Every 10°C above/below shifts wear by ±12%.
 */
export function thermalWearMultiplier(trackTemp: number): number {
  const delta = (trackTemp - 40) / 10;
  return Math.max(0.7, Math.min(1.4, 1.0 + delta * 0.12));
}

// ─── Tire Wear Computation ───────────────────────────────────────────────────
/**
 * Compute tire wear remaining after one more lap on the current compound.
 * Degradation accelerates with tire age (quadratic cliff).
 * Factors in track surface abrasion, track temperature, and grip conditions.
 */
export function computeTireWear(
  currentWear: number,
  tireAge: number,
  compound: string,
  trackTemp: number = 40,
  abrasionCoeff: number = 1.0,
  gripFactor: number = 1.0,
): number {
  const model = TIRE_MODELS[compound] ?? TIRE_MODELS.medium;
  const baseWear = model.wearPerLap + model.wearAccel * tireAge;
  const thermalFactor = thermalWearMultiplier(trackTemp);
  const wetWearMod = gripFactor < 0.85
    ? (compound === 'inter' || compound === 'wet' ? 0.8 : 1.25)
    : 1.0;
  const wearThisLap = baseWear * abrasionCoeff * thermalFactor * wetWearMod;
  return Math.max(0, currentWear - wearThisLap);
}

// ─── Lap Time Computation ────────────────────────────────────────────────────
/**
 * Compute lap time from current state.
 * Formula: base_time + compound_offset + tire_degradation_penalty + fuel_effect + grip_penalty + noise
 */
export function computeLapTime(
  tireWear: number,
  compound: string,
  fuelRemaining: number,
  gripFactor: number = 1.0,
): { lapTime: number; s1: number; s2: number; s3: number } {
  const model = TIRE_MODELS[compound] ?? TIRE_MODELS.medium;

  const wearLost = 100 - tireWear;
  const tirePenalty = wearLost * model.lapTimePenalty;
  const fuelEffect = -((FUEL_LOAD_FULL - fuelRemaining) / FUEL_LOAD_FULL) * 1.4;
  const gripPenalty = (1.0 - gripFactor) * 8.0;
  const wrongTirePenalty = gripFactor < 0.85 && compound !== 'inter' && compound !== 'wet'
    ? (1.0 - gripFactor) * 12.0
    : gripFactor < 0.85 && compound === 'wet' && gripFactor > 0.7
      ? 1.5
      : 0;

  const noise = (Math.random() - 0.5) * 0.6;
  const lapTime = BASE_LAP_TIME + model.baseOffset + tirePenalty + fuelEffect + gripPenalty + wrongTirePenalty + noise;

  const s1 = lapTime * 0.32 + (Math.random() - 0.5) * 0.15;
  const s2 = lapTime * 0.38 + (Math.random() - 0.5) * 0.15;
  const s3 = lapTime - s1 - s2;

  return {
    lapTime: parseFloat(lapTime.toFixed(3)),
    s1: parseFloat(s1.toFixed(3)),
    s2: parseFloat(s2.toFixed(3)),
    s3: parseFloat(s3.toFixed(3)),
  };
}

// ─── Tire Colors ─────────────────────────────────────────────────────────────
export const TIRE_COLORS: Record<string, string> = {
  soft: '#ff3366',
  medium: '#fbbf24',
  hard: '#e2e8f0',
  inter: '#00ff88',
  wet: '#00d4ff',
};

// ─── Initial Race State ──────────────────────────────────────────────────────
export const initialRaceState: RaceState = {
  driverName: 'VER',
  teamName: 'RaceMind Racing',
  trackName: 'Circuit de Monaco',
  currentLap: 0,
  totalLaps: 50,
  position: 3,
  totalDrivers: 20,
  currentTire: 'medium',
  tireAge: 0,
  tireWear: 100,
  fuelRemaining: FUEL_LOAD_FULL,
  weather: 'cloudy',
  trackTemp: 42,
  airTemp: 24,
  rainChance: 35,
  drs: false,
  ersDeployment: 85,
  raceStatus: 'pre-race',
  gapAhead: 1.2,
  gapBehind: 0.8,
  pitStops: 0,
  lastPitLap: 0,
  fastestLap: 74.832,
  personalBest: 75.102,
};
