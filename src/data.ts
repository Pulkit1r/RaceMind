// Simulated race data store + utilities

// ─── Tire Degradation Model ──────────────────────────────────────────────────
// Each compound has:
//   baseOffset   – initial lap time offset vs medium (negative = faster)
//   wearPerLap   – base tire-wear % lost per lap
//   wearAccel    – how much wearPerLap increases per lap (non-linear cliff)
//   lapTimePenalty – seconds added per 1% of wear lost
export interface TireModel {
  baseOffset: number;
  wearPerLap: number;
  wearAccel: number;
  lapTimePenalty: number;
}

export const TIRE_MODELS: Record<string, TireModel> = {
  soft:   { baseOffset: -0.30, wearPerLap: 3.0, wearAccel: 0.08, lapTimePenalty: 0.025 },
  medium: { baseOffset:  0.00, wearPerLap: 1.8, wearAccel: 0.04, lapTimePenalty: 0.018 },
  hard:   { baseOffset:  0.40, wearPerLap: 1.0, wearAccel: 0.015, lapTimePenalty: 0.012 },
  inter:  { baseOffset:  1.20, wearPerLap: 1.5, wearAccel: 0.03, lapTimePenalty: 0.016 },
  wet:    { baseOffset:  2.50, wearPerLap: 1.2, wearAccel: 0.02, lapTimePenalty: 0.014 },
};

// ─── Track Surface Abrasion Coefficients ─────────────────────────────────────
// Each track has a unique surface abrasion factor that multiplies tire wear.
// 1.0 = baseline, >1.0 = more abrasive (eats tires), <1.0 = smooth (preserves tires)
// Values derived from real F1 Pirelli compound selection data & track characteristics.
export const TRACK_ABRASION: Record<string, number> = {
  'Circuit de Monaco':  0.75,  // Smooth street circuit, low speed corners → gentle on tires
  'Silverstone':        1.10,  // High-speed corners, Copse/Maggots load tires heavily
  'Monza':              0.85,  // Low-downforce, long straights → low lateral tire load
  'Spa-Francorchamps':  1.05,  // Eau Rouge, high energy corners, mixed surface age
  'Suzuka':             1.15,  // Figure-8 layout, constant high-speed loading on both sides
  'Interlagos':         1.20,  // Rough, bumpy surface, anti-clockwise biases left tires
  'COTA':               1.10,  // Bumpy surface, multi-elevation changes
  'Yas Marina':         0.90,  // Smooth modern surface, low abrasion
  'Bahrain':            1.25,  // Most abrasive track on calendar — sand-blasted surface
  'Jeddah':             0.80,  // Street circuit, smooth asphalt, medium-speed
  'Melbourne':          0.95,  // Semi-street circuit, resurfaced, moderate abrasion
  'Barcelona':          1.15,  // High-speed final sector destroys rear tires, testing track
  'Singapore':          0.85,  // Street circuit, low speed, smooth surface
  'Zandvoort':          1.10,  // Banked corners add extra tire stress, compact layout
  'Hungaroring':        1.00,  // Twisty, low-speed — moderate wear, balanced
};

/**
 * Get track abrasion coefficient. Falls back to 1.0 for unknown tracks.
 */
export function getTrackAbrasion(trackName: string): number {
  return TRACK_ABRASION[trackName] ?? 1.0;
}

const BASE_LAP_TIME = 75.5; // seconds – baseline on fresh mediums with full fuel
const FUEL_LOAD_FULL = 70;  // kg at race start (50 laps)
const FUEL_PER_LAP = 1.4;   // kg consumed per lap

/**
 * Compute a thermal wear multiplier from track temperature.
 * Hotter track surface → faster rubber degradation.
 * Reference point: 40°C track temp = 1.0x (neutral).
 * Every 10°C above/below shifts wear by ±12%.
 */
function thermalWearMultiplier(trackTemp: number): number {
  // Normalise around 40°C reference
  const delta = (trackTemp - 40) / 10;
  return Math.max(0.7, Math.min(1.4, 1.0 + delta * 0.12));
}

/**
 * Compute tire wear remaining after one more lap on the current compound.
 * Degradation accelerates with tire age (quadratic cliff).
 * Now factors in track surface abrasion and track temperature.
 */
export function computeTireWear(
  currentWear: number,
  tireAge: number,
  compound: string,
  trackTemp: number = 40,
  abrasionCoeff: number = 1.0,
): number {
  const model = TIRE_MODELS[compound] ?? TIRE_MODELS.medium;
  // Base wear rate increases each lap: base + accel * age → simulates the "cliff"
  const baseWear = model.wearPerLap + model.wearAccel * tireAge;
  // Apply track-specific multipliers
  const thermalFactor = thermalWearMultiplier(trackTemp);
  const wearThisLap = baseWear * abrasionCoeff * thermalFactor;
  return Math.max(0, currentWear - wearThisLap);
}

/**
 * Compute lap time from current state.
 * Formula: base_time + compound_offset + tire_degradation_penalty + fuel_effect + noise
 */
export function computeLapTime(
  tireWear: number,
  compound: string,
  fuelRemaining: number,
): { lapTime: number; s1: number; s2: number; s3: number } {
  const model = TIRE_MODELS[compound] ?? TIRE_MODELS.medium;

  // Tire degradation penalty: more wear lost → slower
  const wearLost = 100 - tireWear;
  const tirePenalty = wearLost * model.lapTimePenalty;

  // Fuel effect: lighter car = faster (up to ~1.4s advantage when empty)
  const fuelEffect = -((FUEL_LOAD_FULL - fuelRemaining) / FUEL_LOAD_FULL) * 1.4;

  // Small random variation (driver inconsistency)
  const noise = (Math.random() - 0.5) * 0.6;

  const lapTime = BASE_LAP_TIME + model.baseOffset + tirePenalty + fuelEffect + noise;

  // Distribute across 3 sectors (32% / 38% / 30%)
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

export interface RadioMessage {
  id: string;
  time: string;
  from: 'engineer' | 'driver' | 'ai';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

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

export type StrategyGoal = 'maximize-position' | 'minimize-time' | 'low-risk';

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

export function generateLapData(lapCount: number, compound: string = 'medium'): LapData[] {
  const data: LapData[] = [];
  let tireWear = 100;
  let fuel = FUEL_LOAD_FULL;
  let position = 3;

  for (let i = 1; i <= lapCount; i++) {
    tireWear = computeTireWear(tireWear, i - 1, compound);
    fuel = Math.max(0, fuel - FUEL_PER_LAP);

    const { lapTime, s1, s2, s3 } = computeLapTime(tireWear, compound, fuel);

    if (Math.random() > 0.9) position = Math.max(1, Math.min(20, position + (Math.random() > 0.5 ? -1 : 1)));

    data.push({
      lap: i,
      time: lapTime,
      tireWear: parseFloat(tireWear.toFixed(1)),
      fuelLoad: parseFloat(fuel.toFixed(1)),
      sector1: s1,
      sector2: s2,
      sector3: s3,
      position,
      gap: parseFloat((Math.random() * 3).toFixed(1)),
    });
  }
  return data;
}

const radioTemplates: { from: RadioMessage['from']; messages: string[]; priority: RadioMessage['priority'] }[] = [
  { from: 'engineer', messages: [
    'BOX BOX BOX. Box this lap, confirm.',
    'Stay out, stay out. Tyres are fine. We go long.',
    'BOX NOW! BOX NOW! This is your in-lap.',
    'Gap behind is 2.3 seconds. You have the gap. Push.',
    'Push now, push now. Target 1:14.8. Everything on the line.',
    'Rain expected in 5 laps. Standby for inters.',
    'DRS is active. You are within one second. Attack zone.',
    'Fuel save mode. Lift and coast through turns 12 to 14.',
    'Safety Car deployed. Hold position. Stack the tyres.',
    'Great pace, mate. Personal best sector 2. Keep it up.',
    'Gap to P2 closing. 0.8 seconds. Defend the inside.',
    'We\'re looking at plan B. Standby for further instructions.',
    'Pit window opens next lap. Prepare for stop. Mediums ready.',
    'Head down. Solid laps. You\'re doing a mega job.',
    'Track limits warning turn 9. Keep it clean.',
  ], priority: 'medium' },
  { from: 'engineer', messages: [
    'BOX BOX BOX! Critical — tyres are gone. Box now!',
    'SAFETY CAR! SAFETY CAR! Free pit stop opportunity. BOX!',
    'Rain is here! BOX for intermediates immediately!',
  ], priority: 'critical' },
  { from: 'driver', messages: [
    'These tyres are DEAD. I have zero grip. I\'m sliding everywhere.',
    'Copy. Boxing, boxing. Let\'s go.',
    'I feel good, I can push more. Give me the gap.',
    'Front left is overheating. Massive vibrations. I can\'t hold this.',
    'Understood. Saving fuel. Lift and coast.',
    'Car feels INCREDIBLE. Let\'s go hunting. Come on!',
    'That was close! Contact in turn 4. Check the front wing.',
    'The guy behind is all over me. How far back?',
    'No power! I lost power for a second! Check the engine.',
    'Haha, get in there! Yes! What a move!',
    'I\'m struggling in sector 3. The rear is snapping.',
    'Copy, plan B. I\'m ready. Let\'s do this.',
    'The rain is getting heavier. It\'s properly wet now.',
  ], priority: 'low' },
  { from: 'ai', messages: [
    'Optimal pit window opens in 3 laps. Confidence: 92%. Box for hards.',
    'Tire degradation accelerating. Cliff in 4 laps. Recommend box within 5.',
    'Weather model update: 73% rain probability in 8 minutes. Pre-position inters.',
    'Gap analysis: overtake opportunity in 2 laps if maintaining current delta.',
    'Risk assessment: undercut viable. Success probability 78%. Window closing.',
    'Fuel model nominal. Can extend 3 additional laps before save mode.',
    'Competitor PIT: Hamilton boxing now. Overcut opportunity detected. Stay out.',
    'Degradation model: soft compound cliff at lap 18. Switch to mediums optimal.',
    'Strategy recalculated. Current plan saves 4.2s vs alternatives. Continue.',
    'DRS train detected ahead. Gap will compress. Prepare defensive strategy.',
  ], priority: 'high' },
];

export function generateRadioMessage(lap: number): RadioMessage {
  const template = radioTemplates[Math.floor(Math.random() * radioTemplates.length)];
  const message = template.messages[Math.floor(Math.random() * template.messages.length)];
  return {
    id: `radio-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    time: `LAP ${lap}`,
    from: template.from,
    message,
    priority: template.priority,
  };
}

export function generateRecommendations(
  state: RaceState,
  strategies: StrategyResult[] = [],
  goal: StrategyGoal = 'minimize-time',
): AIRecommendation[] {
  const recs: AIRecommendation[] = [];
  const remainingLaps = state.totalLaps - state.currentLap;

  // Goal-based modifiers
  const goalMod = {
    'maximize-position': { pitBias: 10, riskTolerance: 0.7, aggressiveness: 1.3 },
    'minimize-time':     { pitBias: 0,  riskTolerance: 1.0, aggressiveness: 1.0 },
    'low-risk':          { pitBias: -8, riskTolerance: 1.4, aggressiveness: 0.6 },
  }[goal];

  // ── Primary call: BOX BOX vs STAY OUT (from strategy engine) ──────────────
  if (strategies.length > 0 && remainingLaps > 3) {
    const best = strategies[0];
    const stayOut = strategies.find(s => s.pitLap === 0);
    const bestPit = strategies.find(s => s.pitLap > 0 && s.isBest);

    if (best.pitLap > 0) {
      // Strategy engine says PIT is faster
      const timeSaved = stayOut ? stayOut.totalTime - best.totalTime : 0;
      const pitOffset = best.pitLap - state.currentLap;
      const isImmediate = pitOffset <= 1;

      // Confidence: based on goal
      const wearFactor = Math.min(30, (100 - state.tireWear) * 0.4);
      const timeFactor = Math.min(40, timeSaved * 3);
      let confidence = Math.min(98, Math.round(30 + wearFactor + timeFactor + goalMod.pitBias));

      // Maximize-position: boost pit confidence if we might gain positions
      if (goal === 'maximize-position' && state.gapAhead < 2.0) {
        confidence = Math.min(98, confidence + 8);
      }
      // Low-risk: reduce pit confidence (prefer staying out unless critical)
      if (goal === 'low-risk' && state.tireWear > 35) {
        confidence = Math.max(30, confidence - 12);
      }

      const reasons: string[] = [];
      reasons.push(`Tire wear at ${state.tireWear.toFixed(0)}% on ${state.currentTire}s`);
      if (timeSaved > 0) reasons.push(`pit saves ${timeSaved.toFixed(1)}s vs staying out`);
      reasons.push(`switch → ${best.tiresAfter.toUpperCase()} compound`);
      if (!isImmediate) reasons.push(`optimal window: lap ${best.pitLap} (+${pitOffset} laps)`);
      if (goal === 'maximize-position') reasons.push('🎯 Goal: maximize position gains');
      if (goal === 'low-risk') reasons.push('🛡️ Goal: low-risk conservative approach');

      recs.push({
        id: 'rec-box-box',
        type: 'pit',
        title: isImmediate ? '🟥 BOX BOX BOX' : `🟨 BOX LAP ${best.pitLap}`,
        description: reasons.join('. ') + '.',
        risk: goal === 'low-risk'
          ? (state.tireWear < 15 ? 'high' : 'medium')
          : (state.tireWear < 20 ? 'high' : state.tireWear < 40 ? 'medium' : 'low'),
        confidence,
        timestamp: new Date().toISOString(),
        urgent: isImmediate && state.tireWear < (goal === 'low-risk' ? 40 : 30),
      });
    } else {
      // Strategy engine says STAY OUT is optimal
      const bestPitStrat = strategies.find(s => s.pitLap > 0);
      const timeCost = bestPitStrat ? bestPitStrat.totalTime - best.totalTime : 0;

      const reasons: string[] = [];
      reasons.push(`Tires still competitive at ${state.tireWear.toFixed(0)}%`);
      if (timeCost > 0) reasons.push(`pitting would cost +${timeCost.toFixed(1)}s`);
      reasons.push(`${remainingLaps} laps remaining on ${state.currentTire}s`);
      if (state.tireWear > 50) reasons.push('tire life sufficient to finish');
      if (goal === 'low-risk') reasons.push('🛡️ Conservative: holding position, no unnecessary risk');
      if (goal === 'maximize-position') reasons.push('🎯 Gap management: protecting current position');

      let confidence = Math.min(95, Math.round(
        50 + (state.tireWear * 0.3) + (timeCost > 5 ? 20 : timeCost * 4)
      ));
      // Low-risk: boost stay-out confidence
      if (goal === 'low-risk') confidence = Math.min(98, confidence + 10);

      recs.push({
        id: 'rec-stay-out',
        type: 'pace',
        title: '🟩 STAY OUT',
        description: reasons.join('. ') + '.',
        risk: goal === 'low-risk' ? 'low' : (state.tireWear < 30 ? 'high' : state.tireWear < 50 ? 'medium' : 'low'),
        confidence,
        timestamp: new Date().toISOString(),
        urgent: false,
      });
    }
  } else if (state.tireWear < 40 && remainingLaps > 3) {
    // Fallback BOX BOX when strategy engine hasn't run yet
    const confidence = Math.min(98, Math.round(95 - state.tireWear * 0.5));
    const nextTire = state.currentTire === 'soft' ? 'medium' : state.currentTire === 'medium' ? 'hard' : 'medium';
    recs.push({
      id: 'rec-pit-tire',
      type: 'pit',
      title: '🟥 BOX BOX BOX',
      description: `Tire wear critical at ${state.tireWear.toFixed(0)}%. Recommend pit for ${nextTire}s. Degradation accelerating — grip loss imminent.`,
      risk: state.tireWear < 20 ? 'high' : 'medium',
      confidence,
      timestamp: new Date().toISOString(),
      urgent: state.tireWear < 25,
    });
  }

  // ─── Weather alert ────────────────────────────────────────────────────────
  if (state.rainChance > 50) {
    const confidence = Math.round(state.rainChance * 0.95);
    const reasons: string[] = [];
    reasons.push(`Rain probability: ${state.rainChance}%`);
    reasons.push(`Track temp: ${state.trackTemp.toFixed(0)}°C`);
    if (state.rainChance > 75) {
      reasons.push('consider preemptive switch to intermediates');
    } else {
      reasons.push('monitoring conditions — standby for inters');
    }

    recs.push({
      id: 'rec-weather',
      type: 'weather',
      title: state.rainChance > 75 ? '🌧️ RAIN IMMINENT' : '☁️ WEATHER WATCH',
      description: reasons.join('. ') + '.',
      risk: state.rainChance > 70 ? 'high' : 'medium',
      confidence,
      timestamp: new Date().toISOString(),
      urgent: state.rainChance > 80,
    });
  }

  // ─── Overtake window ──────────────────────────────────────────────────────
  if (state.gapAhead < 1.0 && state.drs) {
    let overtakeConfidence = Math.round(60 + (1.0 - state.gapAhead) * 30);
    if (goal === 'maximize-position') overtakeConfidence = Math.min(98, overtakeConfidence + 12);
    if (goal === 'low-risk') overtakeConfidence = Math.max(40, overtakeConfidence - 15);

    recs.push({
      id: 'rec-overtake',
      type: 'overtake',
      title: goal === 'maximize-position' ? '⚡ ATTACK NOW' : '⚡ OVERTAKE WINDOW',
      description: `Gap to P${state.position - 1}: ${state.gapAhead.toFixed(1)}s with DRS active. ${goal === 'maximize-position' ? 'Deploy full ERS — ATTACK MODE!' : goal === 'low-risk' ? 'Opportunity available but assess risk before committing.' : 'Attack recommended through sector 1. Undercut momentum available.'}`,
      risk: goal === 'low-risk' ? 'high' : 'medium',
      confidence: overtakeConfidence,
      timestamp: new Date().toISOString(),
      urgent: goal === 'maximize-position',
    });
  }

  // ─── Fuel management ──────────────────────────────────────────────────────
  if (state.fuelRemaining < 25) {
    const lapsOfFuel = state.fuelRemaining / FUEL_PER_LAP;
    recs.push({
      id: 'rec-fuel',
      type: 'fuel',
      title: '⛽ FUEL MANAGEMENT',
      description: `${state.fuelRemaining.toFixed(1)}kg remaining (~${lapsOfFuel.toFixed(0)} laps). Engage lift-and-coast through turns 12–14. Target: save 0.3kg/lap.`,
      risk: state.fuelRemaining < 12 ? 'high' : 'low',
      confidence: 88,
      timestamp: new Date().toISOString(),
      urgent: state.fuelRemaining < 12,
    });
  }

  // ─── Fallback: no other recommendations ───────────────────────────────────
  if (recs.length === 0) {
    recs.push({
      id: 'rec-hold',
      type: 'pace',
      title: '🟩 HOLD POSITION',
      description: `Strategy nominal. Pace competitive at P${state.position}. Gap ahead: ${state.gapAhead.toFixed(1)}s, behind: ${state.gapBehind.toFixed(1)}s. Maintain current delta.`,
      risk: 'low',
      confidence: 85,
      timestamp: new Date().toISOString(),
      urgent: false,
    });
  }

  return recs;
}

export function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

// ─── Pit Stop Strategy Engine ────────────────────────────────────────────────

const PIT_STOP_TIME_LOSS = 22.0; // seconds lost per pit stop (pit lane + stationary)

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

/**
 * Deterministic lap-time estimator (no random noise) for strategy comparison.
 * Same formula as computeLapTime but without noise – ensures fair comparison.
 */
function predictLapTime(
  tireWear: number,
  compound: string,
  fuelRemaining: number,
): number {
  const model = TIRE_MODELS[compound] ?? TIRE_MODELS.medium;
  const wearLost = 100 - tireWear;
  const tirePenalty = wearLost * model.lapTimePenalty;
  const fuelEffect = -((FUEL_LOAD_FULL - fuelRemaining) / FUEL_LOAD_FULL) * 1.4;
  return BASE_LAP_TIME + model.baseOffset + tirePenalty + fuelEffect;
}

// Overload that accepts track conditions for strategy engine
function predictLapTimeWithTrack(
  tireWear: number,
  compound: string,
  fuelRemaining: number,
  trackTemp: number,
  abrasionCoeff: number,
): number {
  // Track conditions already factored into tire wear calc,
  // but hot tracks also reduce aero efficiency slightly
  const heatPenalty = Math.max(0, (trackTemp - 45) * 0.008); // ~0.04s penalty per 5°C above 45
  return predictLapTime(tireWear, compound, fuelRemaining) + heatPenalty;
}

/**
 * Simulate remaining laps for a single-stop strategy with a given pit window.
 */
export function simulateStint(
  startLap: number,
  totalLaps: number,
  currentWear: number,
  currentTireAge: number,
  currentCompound: string,
  fuelAtStart: number,
  pitAtLap: number,          // 0 = no pit (stay out)
  newCompound: string,
  trackTemp: number = 40,
  abrasionCoeff: number = 1.0,
): { totalTime: number; lapTimes: number[] } {
  let wear = currentWear;
  let tireAge = currentTireAge;
  let compound = currentCompound;
  let fuel = fuelAtStart;
  let totalTime = 0;
  const lapTimes: number[] = [];

  for (let lap = startLap; lap <= totalLaps; lap++) {
    // Pit stop on this lap?
    if (pitAtLap > 0 && lap === pitAtLap) {
      totalTime += PIT_STOP_TIME_LOSS;
      wear = 100;
      tireAge = 0;
      compound = newCompound;
    }

    // Degrade tires (track-aware)
    wear = computeTireWear(wear, tireAge, compound, trackTemp, abrasionCoeff);
    fuel = Math.max(0, fuel - FUEL_PER_LAP);

    const lt = predictLapTimeWithTrack(wear, compound, fuel, trackTemp, abrasionCoeff);
    lapTimes.push(parseFloat(lt.toFixed(3)));
    totalTime += lt;
    tireAge++;
  }

  return { totalTime: parseFloat(totalTime.toFixed(3)), lapTimes };
}

// ─── What-If Comparison ──────────────────────────────────────────────────────

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

/**
 * Compare current trajectory (no pit) against a what-if scenario (pit at given lap on given compound).
 * Returns per-lap comparison data for charting.
 */
export function simulateWhatIf(
  state: RaceState,
  whatIfPitLap: number,
  whatIfCompound: string,
): WhatIfResult {
  const startLap = state.currentLap + 1;
  if (startLap > state.totalLaps) {
    return { currentTotal: 0, whatIfTotal: 0, delta: 0, whatIfFaster: false, laps: [] };
  }

  const abrasion = getTrackAbrasion(state.trackName);

  // Current trajectory: stay out on current tires
  const current = simulateStint(
    startLap, state.totalLaps,
    state.tireWear, state.tireAge, state.currentTire,
    state.fuelRemaining,
    0, state.currentTire,
    state.trackTemp, abrasion,
  );

  // What-if: pit at given lap on given compound
  const whatIf = simulateStint(
    startLap, state.totalLaps,
    state.tireWear, state.tireAge, state.currentTire,
    state.fuelRemaining,
    whatIfPitLap, whatIfCompound,
    state.trackTemp, abrasion,
  );

  const laps: WhatIfLapPoint[] = [];
  for (let i = 0; i < current.lapTimes.length; i++) {
    laps.push({
      lap: startLap + i,
      current: current.lapTimes[i],
      whatIf: whatIf.lapTimes[i],
    });
  }

  const delta = current.totalTime - whatIf.totalTime;

  return {
    currentTotal: current.totalTime,
    whatIfTotal: whatIf.totalTime,
    delta: parseFloat(delta.toFixed(3)),
    whatIfFaster: delta > 0,
    laps,
  };
}

/**
 * Run the strategy engine: compare "pit now" vs "pit in N laps" for all compounds.
 * Returns sorted results with the best strategy first.
 */
export function simulatePitStrategies(state: RaceState): StrategyResult[] {
  const results: StrategyResult[] = [];
  const remainingLaps = state.totalLaps - state.currentLap;

  if (remainingLaps <= 2) return []; // Too few laps to matter

  const startLap = state.currentLap + 1;
  const compounds: string[] = ['soft', 'medium', 'hard'];
  const abrasion = getTrackAbrasion(state.trackName);

  // Determine the latest lap we'd consider pitting (don't pit in the last 3 laps)
  const lastPitLap = Math.min(state.totalLaps - 3, state.currentLap + 15);

  // Strategy 0: NO PIT — stay out on current tires
  const noPit = simulateStint(
    startLap, state.totalLaps,
    state.tireWear, state.tireAge, state.currentTire,
    state.fuelRemaining,
    0, state.currentTire,
    state.trackTemp, abrasion,
  );
  results.push({
    id: 'strat-no-pit',
    label: `STAY OUT — ${state.currentTire.toUpperCase()}`,
    pitLap: 0,
    tiresBefore: state.currentTire,
    tiresAfter: state.currentTire,
    totalTime: noPit.totalTime,
    delta: 0,
    isBest: false,
    lapTimes: noPit.lapTimes,
  });

  // Strategy variants: pit at lap N on compound C
  for (const newCompound of compounds) {
    // Don't switch to the same compound unless it's worn
    if (newCompound === state.currentTire && state.tireWear > 60) continue;

    // Sweep pit windows: now (next lap), +2, +4, +6 ... up to lastPitLap
    for (let pitLap = startLap; pitLap <= lastPitLap; pitLap += 2) {
      const result = simulateStint(
        startLap, state.totalLaps,
        state.tireWear, state.tireAge, state.currentTire,
        state.fuelRemaining,
        pitLap, newCompound,
        state.trackTemp, abrasion,
      );

      const offset = pitLap - state.currentLap;
      const label = offset <= 1
        ? `PIT NOW → ${newCompound.toUpperCase()}`
        : `PIT +${offset} LAPS → ${newCompound.toUpperCase()}`;

      results.push({
        id: `strat-L${pitLap}-${newCompound}`,
        label,
        pitLap,
        tiresBefore: state.currentTire,
        tiresAfter: newCompound,
        totalTime: result.totalTime,
        delta: 0,
        isBest: false,
        lapTimes: result.lapTimes,
      });
    }
  }

  // Sort by total time and compute deltas
  results.sort((a, b) => a.totalTime - b.totalTime);
  const bestTime = results[0].totalTime;
  for (const r of results) {
    r.delta = parseFloat((r.totalTime - bestTime).toFixed(3));
    r.isBest = r.totalTime === bestTime;
  }

  return results;
}

export const TIRE_COLORS: Record<string, string> = {
  soft: '#ff3366',
  medium: '#fbbf24',
  hard: '#e2e8f0',
  inter: '#00ff88',
  wet: '#00d4ff',
};

