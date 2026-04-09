// ─── Strategy Engine ─────────────────────────────────────────────────────────
// Pit stop strategy optimization, recommendations, what-if simulation,
// lap data generation, radio messages, and format utilities.

import type {
  RaceState, StrategyResult, StrategyGoal, AIRecommendation,
  RadioMessage, LapData, WhatIfLapPoint, WhatIfResult,
} from './types';
import type { StrategyAdjustment } from './raceMemory';
import {
  TIRE_MODELS, BASE_LAP_TIME, FUEL_LOAD_FULL, FUEL_PER_LAP,
  computeTireWear, computeLapTime, getTrackAbrasion,
} from './physics';

// ─── Constants ───────────────────────────────────────────────────────────────
export const PIT_STOP_TIME_LOSS = 22.0; // seconds lost per pit stop

// ─── Format Utilities ────────────────────────────────────────────────────────
export function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

// ─── Lap Data Generator ──────────────────────────────────────────────────────
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

// ─── Radio Message Templates ─────────────────────────────────────────────────
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

// ─── Deterministic Lap Time Predictors ───────────────────────────────────────
/**
 * Deterministic lap-time estimator (no random noise) for strategy comparison.
 */
function predictLapTime(
  tireWear: number,
  compound: string,
  fuelRemaining: number,
  gripFactor: number = 1.0,
): number {
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
  return BASE_LAP_TIME + model.baseOffset + tirePenalty + fuelEffect + gripPenalty + wrongTirePenalty;
}

function predictLapTimeWithTrack(
  tireWear: number,
  compound: string,
  fuelRemaining: number,
  trackTemp: number,
  _abrasionCoeff: number,
  gripFactor: number = 1.0,
): number {
  const heatPenalty = Math.max(0, (trackTemp - 45) * 0.008);
  return predictLapTime(tireWear, compound, fuelRemaining, gripFactor) + heatPenalty;
}

// ─── Stint Simulation ────────────────────────────────────────────────────────
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
  pitAtLap: number,
  newCompound: string,
  trackTemp: number = 40,
  abrasionCoeff: number = 1.0,
  gripFactor: number = 1.0,
): { totalTime: number; lapTimes: number[] } {
  let wear = currentWear;
  let tireAge = currentTireAge;
  let compound = currentCompound;
  let fuel = fuelAtStart;
  let totalTime = 0;
  const lapTimes: number[] = [];

  for (let lap = startLap; lap <= totalLaps; lap++) {
    if (pitAtLap > 0 && lap === pitAtLap) {
      totalTime += PIT_STOP_TIME_LOSS;
      wear = 100;
      tireAge = 0;
      compound = newCompound;
    }

    wear = computeTireWear(wear, tireAge, compound, trackTemp, abrasionCoeff, gripFactor);
    fuel = Math.max(0, fuel - FUEL_PER_LAP);

    const lt = predictLapTimeWithTrack(wear, compound, fuel, trackTemp, abrasionCoeff, gripFactor);
    lapTimes.push(parseFloat(lt.toFixed(3)));
    totalTime += lt;
    tireAge++;
  }

  return { totalTime: parseFloat(totalTime.toFixed(3)), lapTimes };
}

// ─── What-If Comparison ──────────────────────────────────────────────────────
/**
 * Compare current trajectory (no pit) against a what-if scenario.
 */
export function simulateWhatIf(
  state: RaceState,
  whatIfPitLap: number,
  whatIfCompound: string,
  gripFactor: number = 1.0,
): WhatIfResult {
  const startLap = state.currentLap + 1;
  if (startLap > state.totalLaps) {
    return { currentTotal: 0, whatIfTotal: 0, delta: 0, whatIfFaster: false, laps: [] };
  }

  const abrasion = getTrackAbrasion(state.trackName);

  const current = simulateStint(
    startLap, state.totalLaps,
    state.tireWear, state.tireAge, state.currentTire,
    state.fuelRemaining,
    0, state.currentTire,
    state.trackTemp, abrasion, gripFactor,
  );

  const whatIf = simulateStint(
    startLap, state.totalLaps,
    state.tireWear, state.tireAge, state.currentTire,
    state.fuelRemaining,
    whatIfPitLap, whatIfCompound,
    state.trackTemp, abrasion, gripFactor,
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

// ─── Pit Stop Strategy Engine ────────────────────────────────────────────────
/**
 * Run the strategy engine: compare "pit now" vs "pit in N laps" for all compounds.
 */
export function simulatePitStrategies(
  state: RaceState,
  gripFactor: number = 1.0,
  adjustment?: StrategyAdjustment,
): StrategyResult[] {
  const results: StrategyResult[] = [];
  const remainingLaps = state.totalLaps - state.currentLap;

  if (remainingLaps <= 2) return [];

  const startLap = state.currentLap + 1;
  const compounds: string[] = gripFactor < 0.75
    ? ['inter', 'wet']
    : gripFactor < 0.9
      ? ['soft', 'medium', 'hard', 'inter']
      : ['soft', 'medium', 'hard'];
  const abrasion = getTrackAbrasion(state.trackName);

  const lastPitLap = Math.min(state.totalLaps - 3, state.currentLap + 15);

  // Strategy 0: NO PIT
  const noPit = simulateStint(
    startLap, state.totalLaps,
    state.tireWear, state.tireAge, state.currentTire,
    state.fuelRemaining,
    0, state.currentTire,
    state.trackTemp, abrasion, gripFactor,
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

  // Strategy variants
  for (const newCompound of compounds) {
    if (newCompound === state.currentTire && state.tireWear > 60) continue;

    for (let pitLap = startLap; pitLap <= lastPitLap; pitLap += 2) {
      const result = simulateStint(
        startLap, state.totalLaps,
        state.tireWear, state.tireAge, state.currentTire,
        state.fuelRemaining,
        pitLap, newCompound,
        state.trackTemp, abrasion, gripFactor,
      );

      let adjustedTime = result.totalTime;

      if (adjustment && adjustment.experienceLevel !== 'none') {
        if (adjustment.preferredCompound && newCompound === adjustment.preferredCompound) {
          adjustedTime -= 0.8;
        }
        if (adjustment.suggestedPitLap) {
          const pitDelta = Math.abs(pitLap - adjustment.suggestedPitLap);
          if (pitDelta <= 2) adjustedTime -= 0.5;
        }
      }

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
        totalTime: adjustedTime,
        delta: 0,
        isBest: false,
        lapTimes: result.lapTimes,
      });
    }
  }

  results.sort((a, b) => a.totalTime - b.totalTime);
  const bestTime = results[0].totalTime;
  for (const r of results) {
    r.delta = parseFloat((r.totalTime - bestTime).toFixed(3));
    r.isBest = r.totalTime === bestTime;
  }

  return results;
}

// ─── Recommendation Generator ────────────────────────────────────────────────
export function generateRecommendations(
  state: RaceState,
  strategies: StrategyResult[] = [],
  goal: StrategyGoal = 'minimize-time',
): AIRecommendation[] {
  const recs: AIRecommendation[] = [];
  const remainingLaps = state.totalLaps - state.currentLap;

  const goalMod = {
    'maximize-position': { pitBias: 10, riskTolerance: 0.7, aggressiveness: 1.3 },
    'minimize-time':     { pitBias: 0,  riskTolerance: 1.0, aggressiveness: 1.0 },
    'low-risk':          { pitBias: -8, riskTolerance: 1.4, aggressiveness: 0.6 },
  }[goal];

  // ── Primary call: BOX BOX vs STAY OUT ──
  if (strategies.length > 0 && remainingLaps > 3) {
    const best = strategies[0];
    const stayOut = strategies.find(s => s.pitLap === 0);

    if (best.pitLap > 0) {
      const timeSaved = stayOut ? stayOut.totalTime - best.totalTime : 0;
      const pitOffset = best.pitLap - state.currentLap;
      const isImmediate = pitOffset <= 1;

      const wearFactor = Math.min(30, (100 - state.tireWear) * 0.4);
      const timeFactor = Math.min(40, timeSaved * 3);
      let confidence = Math.min(98, Math.round(30 + wearFactor + timeFactor + goalMod.pitBias));

      if (goal === 'maximize-position' && state.gapAhead < 2.0) {
        confidence = Math.min(98, confidence + 8);
      }
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

  // ─── Fallback ─────────────────────────────────────────────────────────────
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
