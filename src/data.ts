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

const BASE_LAP_TIME = 75.5; // seconds – baseline on fresh mediums with full fuel
const FUEL_LOAD_FULL = 70;  // kg at race start (50 laps)
const FUEL_PER_LAP = 1.4;   // kg consumed per lap

/**
 * Compute tire wear remaining after one more lap on the current compound.
 * Degradation accelerates with tire age (quadratic cliff).
 */
export function computeTireWear(
  currentWear: number,
  tireAge: number,
  compound: string,
): number {
  const model = TIRE_MODELS[compound] ?? TIRE_MODELS.medium;
  // Wear rate increases each lap: base + accel * age  →  simulates the "cliff"
  const wearThisLap = model.wearPerLap + model.wearAccel * tireAge;
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
    'Box this lap, box this lap. Switching to hards.',
    'Okay, gap behind is 2.3 seconds. You have the gap.',
    'Push now, push now. Target 1:14.8.',
    'Rain expected in 5 laps. Standby for inters.',
    'DRS enabled. You are within one second.',
    'Fuel save mode. Lift and coast through turns 12 to 14.',
    'Safety Car deployed. Hold position.',
    'Great pace. Personal best sector 2.',
    'Gap to P2 is closing. 0.8 seconds and closing.',
  ], priority: 'medium' },
  { from: 'driver', messages: [
    'These tyres are gone. I have no grip.',
    'Copy. Boxing, boxing.',
    'I feel good, I can push more.',
    'Front left is overheating. Vibrations.',
    'Understood. Saving fuel.',
    'Car feels great. Let\'s go hunting.',
    'That was close! Contact in turn 4.',
  ], priority: 'low' },
  { from: 'ai', messages: [
    'Optimal pit window opens in 3 laps. Confidence: 92%.',
    'Tire degradation accelerating. Recommend box within 5 laps.',
    'Weather model update: 73% rain probability in 8 minutes.',
    'Gap analysis: overtake opportunity in 2 laps if maintaining pace.',
    'Risk assessment: undercut viable. Success probability 78%.',
    'Fuel model nominal. Can extend 3 additional laps.',
    'Competitor PIT: Hamilton boxing now. Overcut opportunity detected.',
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

export function generateRecommendations(state: RaceState): AIRecommendation[] {
  const recs: AIRecommendation[] = [];

  if (state.tireWear < 40) {
    recs.push({
      id: 'rec-pit-tire',
      type: 'pit',
      title: 'BOX BOX BOX',
      description: `Tire wear critical at ${state.tireWear.toFixed(0)}%. Optimal window closing. Recommend immediate pit stop for ${state.currentTire === 'medium' ? 'hard' : 'medium'} compound.`,
      risk: state.tireWear < 20 ? 'high' : 'medium',
      confidence: Math.min(98, 95 - state.tireWear * 0.5),
      timestamp: new Date().toISOString(),
      urgent: state.tireWear < 25,
    });
  }

  if (state.rainChance > 50) {
    recs.push({
      id: 'rec-weather',
      type: 'weather',
      title: 'WEATHER ALERT',
      description: `Rain probability ${state.rainChance}%. Consider intermediate tires. Track temperature dropping.`,
      risk: state.rainChance > 70 ? 'high' : 'medium',
      confidence: state.rainChance,
      timestamp: new Date().toISOString(),
      urgent: state.rainChance > 80,
    });
  }

  if (state.gapAhead < 1.0 && state.drs) {
    recs.push({
      id: 'rec-overtake',
      type: 'overtake',
      title: 'OVERTAKE WINDOW',
      description: `Gap to car ahead: ${state.gapAhead.toFixed(1)}s. DRS available. Attack in sector 1 recommended.`,
      risk: 'medium',
      confidence: 72,
      timestamp: new Date().toISOString(),
      urgent: false,
    });
  }

  if (state.fuelRemaining < 30) {
    recs.push({
      id: 'rec-fuel',
      type: 'fuel',
      title: 'FUEL MANAGEMENT',
      description: `Fuel remaining: ${state.fuelRemaining.toFixed(1)}kg. Engage fuel save mode. Lift and coast recommended.`,
      risk: state.fuelRemaining < 15 ? 'high' : 'low',
      confidence: 88,
      timestamp: new Date().toISOString(),
      urgent: state.fuelRemaining < 15,
    });
  }

  // Always have at least one recommendation
  if (recs.length === 0) {
    recs.push({
      id: 'rec-strategy',
      type: 'pace',
      title: 'HOLD POSITION',
      description: `Strategy nominal. Current pace is competitive. Maintain delta to car ahead at ${state.gapAhead.toFixed(1)}s.`,
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

/**
 * Simulate remaining laps for a single-stop strategy with a given pit window.
 */
function simulateStint(
  startLap: number,
  totalLaps: number,
  currentWear: number,
  currentTireAge: number,
  currentCompound: string,
  fuelAtStart: number,
  pitAtLap: number,          // 0 = no pit (stay out)
  newCompound: string,
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

    // Degrade tires
    wear = computeTireWear(wear, tireAge, compound);
    fuel = Math.max(0, fuel - FUEL_PER_LAP);

    const lt = predictLapTime(wear, compound, fuel);
    lapTimes.push(parseFloat(lt.toFixed(3)));
    totalTime += lt;
    tireAge++;
  }

  return { totalTime: parseFloat(totalTime.toFixed(3)), lapTimes };
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

  // Determine the latest lap we'd consider pitting (don't pit in the last 3 laps)
  const lastPitLap = Math.min(state.totalLaps - 3, state.currentLap + 15);

  // Strategy 0: NO PIT — stay out on current tires
  const noPit = simulateStint(
    startLap, state.totalLaps,
    state.tireWear, state.tireAge, state.currentTire,
    state.fuelRemaining,
    0, state.currentTire,
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

