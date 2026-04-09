// ─── Shared TypeScript Interfaces & Types ────────────────────────────────────
// Central type definitions for RaceMind — imported by physics, strategy,
// competitors, and all UI components.

import type { StrategyAdjustment } from './raceMemory';

// ─── Tire Model ──────────────────────────────────────────────────────────────
export interface TireModel {
  baseOffset: number;
  wearPerLap: number;
  wearAccel: number;
  lapTimePenalty: number;
}

// ─── Lap Data ────────────────────────────────────────────────────────────────
export interface LapData {
  lap: number;
  time: number;      // seconds
  tireWear: number;  // percentage remaining
  fuelLoad: number;  // kg
  sector1: number;
  sector2: number;
  sector3: number;
  position: number;
  gap: number;       // gap to leader in seconds
}

// ─── Radio Messages ──────────────────────────────────────────────────────────
export interface RadioMessage {
  id: string;
  time: string;
  from: 'engineer' | 'driver' | 'ai';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ─── AI Recommendations ─────────────────────────────────────────────────────
export interface AIRecommendation {
  id: string;
  type: 'pit' | 'tire' | 'pace' | 'fuel' | 'weather' | 'overtake';
  title: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  confidence: number;  // 0-100
  timestamp: string;
  urgent: boolean;
}

// ─── Strategy ────────────────────────────────────────────────────────────────
export type StrategyGoal = 'maximize-position' | 'minimize-time' | 'low-risk';

export interface StrategyResult {
  id: string;
  label: string;
  pitLap: number;
  tiresBefore: string;       // compound used before pit
  tiresAfter: string;        // compound used after pit
  totalTime: number;         // total remaining race time (seconds)
  delta: number;             // difference vs best strategy (seconds)
  isBest: boolean;
  lapTimes: number[];        // predicted lap times for remaining laps
}

// ─── What-If ─────────────────────────────────────────────────────────────────
export interface WhatIfLapPoint {
  lap: number;
  current: number;   // lap time for current strategy (stay out)
  whatIf: number;     // lap time for what-if scenario
}

export interface WhatIfResult {
  currentTotal: number;
  whatIfTotal: number;
  delta: number;            // positive = what-if is faster
  whatIfFaster: boolean;
  laps: WhatIfLapPoint[];
}

// ─── Race State ──────────────────────────────────────────────────────────────
export interface RaceState {
  driverName: string;
  teamName: string;
  trackName: string;
  currentLap: number;
  totalLaps: number;
  position: number;
  totalDrivers: number;
  currentTire: 'soft' | 'medium' | 'hard' | 'inter' | 'wet';
  tireAge: number;
  tireWear: number;
  fuelRemaining: number;
  weather: 'sunny' | 'cloudy' | 'light-rain' | 'heavy-rain';
  trackTemp: number;
  airTemp: number;
  rainChance: number;
  drs: boolean;
  ersDeployment: number;
  raceStatus: 'pre-race' | 'racing' | 'safety-car' | 'vsc' | 'red-flag' | 'finished';
  gapAhead: number;
  gapBehind: number;
  pitStops: number;
  lastPitLap: number;
  fastestLap: number;
  personalBest: number;
}

// ─── Competitor ──────────────────────────────────────────────────────────────
export interface Competitor {
  name: string;
  position: number;
  startPosition: number;
  compound: string;
  tireAge: number;
  tireWear: number;
  fuelRemaining: number;
  cumulativeTime: number;  // total race time so far
  lastLapTime: number;
  pitStops: number;
  pitSchedule: number[];   // pre-planned pit laps
  pitCompounds: string[];  // compounds to use after each pit
  skillOffset: number;     // driver skill variance in seconds (lower = faster)
}

// Re-export StrategyAdjustment for convenience
export type { StrategyAdjustment };
