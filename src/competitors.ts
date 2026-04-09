// ─── Competitor Modeling System ───────────────────────────────────────────────
// Simulates 19 AI competitors using the same physics engine for realistic gaps.

import type { Competitor } from './types';
import {
  TIRE_MODELS, FUEL_LOAD_FULL, FUEL_PER_LAP, BASE_LAP_TIME,
  computeTireWear,
} from './physics';
import { PIT_STOP_TIME_LOSS } from './strategy';

// ─── Competitor Names ────────────────────────────────────────────────────────
export const COMPETITOR_NAMES = [
  'HAM', 'VER', 'LEC', 'NOR', 'PIA', 'SAI', 'RUS', 'ALO', 'STR', 'GAS',
  'OCO', 'TSU', 'RIC', 'HUL', 'MAG', 'ALB', 'SAR', 'BOT', 'ZHO',
];

/**
 * Initialize 19 AI competitors with realistic varied strategies.
 */
export function initializeCompetitors(totalLaps: number): Competitor[] {
  const competitors: Competitor[] = [];

  for (let i = 0; i < 19; i++) {
    const strategyType = i % 3;
    let compound: string;
    let pitSchedule: number[];
    let pitCompounds: string[];

    if (strategyType === 0) {
      compound = 'soft';
      const pitLap = 12 + Math.floor(Math.random() * 6);
      pitSchedule = [pitLap];
      pitCompounds = ['medium'];
    } else if (strategyType === 1) {
      compound = 'medium';
      const pitLap = 20 + Math.floor(Math.random() * 8);
      pitSchedule = [pitLap];
      pitCompounds = ['hard'];
    } else {
      compound = 'soft';
      const pit1 = 10 + Math.floor(Math.random() * 4);
      const pit2 = 30 + Math.floor(Math.random() * 5);
      pitSchedule = [pit1, pit2];
      pitCompounds = ['medium', 'soft'];
    }

    const skillOffset = i < 6
      ? Math.random() * 0.5
      : i < 12
        ? 0.5 + Math.random() * 0.7
        : 1.0 + Math.random() * 1.0;

    competitors.push({
      name: COMPETITOR_NAMES[i] || `P${i + 1}`,
      position: i + 1,
      startPosition: i + 1,
      compound,
      tireAge: 0,
      tireWear: 100,
      fuelRemaining: FUEL_LOAD_FULL,
      cumulativeTime: 0,
      lastLapTime: 0,
      pitStops: 0,
      pitSchedule,
      pitCompounds,
      skillOffset,
    });
  }

  return competitors;
}

/**
 * Simulate one lap for a competitor using the same physics engine.
 */
export function simulateCompetitorLap(
  comp: Competitor,
  currentLap: number,
  trackTemp: number,
  abrasionCoeff: number,
  gripFactor: number = 1.0,
): Competitor {
  const updated = { ...comp };

  const pitIndex = updated.pitSchedule.indexOf(currentLap);
  if (pitIndex !== -1 && pitIndex < updated.pitCompounds.length) {
    updated.cumulativeTime += PIT_STOP_TIME_LOSS;
    updated.compound = updated.pitCompounds[pitIndex];
    updated.tireWear = 100;
    updated.tireAge = 0;
    updated.pitStops++;
  }

  updated.tireWear = computeTireWear(
    updated.tireWear, updated.tireAge, updated.compound,
    trackTemp, abrasionCoeff, gripFactor,
  );
  updated.fuelRemaining = Math.max(0, updated.fuelRemaining - FUEL_PER_LAP);

  const model = TIRE_MODELS[updated.compound] ?? TIRE_MODELS.medium;
  const wearLost = 100 - updated.tireWear;
  const tirePenalty = wearLost * model.lapTimePenalty;
  const fuelEffect = -((FUEL_LOAD_FULL - updated.fuelRemaining) / FUEL_LOAD_FULL) * 1.4;
  const gripPenalty = (1.0 - gripFactor) * 8.0;
  const wrongTirePenalty = gripFactor < 0.85 && updated.compound !== 'inter' && updated.compound !== 'wet'
    ? (1.0 - gripFactor) * 12.0
    : 0;
  const driverNoise = (Math.random() - 0.5) * 0.4;
  const lapTime = BASE_LAP_TIME + model.baseOffset + tirePenalty + fuelEffect
    + gripPenalty + wrongTirePenalty + updated.skillOffset + driverNoise;

  updated.lastLapTime = parseFloat(lapTime.toFixed(3));
  updated.cumulativeTime += lapTime;
  updated.tireAge++;

  return updated;
}

/**
 * Given the player's cumulative time and competitors' cumulative times,
 * compute the player's position, gapAhead, and gapBehind.
 */
export function computePositionFromCompetitors(
  playerCumulativeTime: number,
  competitors: Competitor[],
): { position: number; gapAhead: number; gapBehind: number } {
  const allTimes = competitors.map(c => ({ name: c.name, time: c.cumulativeTime, isPlayer: false }));
  allTimes.push({ name: 'PLAYER', time: playerCumulativeTime, isPlayer: true });
  allTimes.sort((a, b) => a.time - b.time);

  const playerIdx = allTimes.findIndex(t => t.isPlayer);
  const position = playerIdx + 1;

  const gapAhead = playerIdx > 0
    ? parseFloat((playerCumulativeTime - allTimes[playerIdx - 1].time).toFixed(1))
    : 0;
  const gapBehind = playerIdx < allTimes.length - 1
    ? parseFloat((allTimes[playerIdx + 1].time - playerCumulativeTime).toFixed(1))
    : 99.9;

  return {
    position: Math.max(1, Math.min(20, position)),
    gapAhead: Math.max(0.1, gapAhead),
    gapBehind: Math.max(0.1, gapBehind),
  };
}
