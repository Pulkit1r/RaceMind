// ─── Race Memory System ──────────────────────────────────────────────────
// Stores past race results in localStorage and uses them to improve future
// strategy recommendations and confidence scoring.

const STORAGE_KEY = 'racemind_race_memory';
const MAX_STORED_RACES = 50;

// ─── Types ───────────────────────────────────────────────────────────────

export interface PitStopRecord {
  lap: number;
  compoundBefore: string;
  compoundAfter: string;
  tireWearAtPit: number;
}

export interface RaceMemoryEntry {
  id: string;
  timestamp: string;
  trackName: string;
  driverName: string;

  // Race outcome
  finalPosition: number;
  startPosition: number;
  positionsGained: number;
  totalLaps: number;

  // Strategy used
  totalPitStops: number;
  tireCompoundsUsed: string[];
  pitStopLaps: number[];

  // Tire performance
  avgTireWearAtPit: number;     // average tire wear % when pitting
  fastestLap: number;           // seconds
  avgLapTime: number;           // seconds
  consistency: number;          // std dev of lap times (lower = better)

  // Weather
  weatherConditions: string;
  rainEncountered: boolean;

  // AI metrics
  aiRecommendationsFollowed: number;
  aiRecommendationsIgnored: number;
  autoStrategyUsed: boolean;
  strategyGrade: string;        // S, A, B, C, D
}

export interface TrackLearning {
  trackName: string;
  racesCompleted: number;
  avgFinishPosition: number;
  bestFinishPosition: number;
  avgPitStops: number;
  optimalPitWindow: number;       // average lap of first pit
  bestCompoundSequence: string[]; // most successful compound order
  avgTireLifeSoft: number;        // avg laps before pitting on softs
  avgTireLifeMedium: number;
  avgTireLifeHard: number;
  winRate: number;                // % of races finishing P1-P3
  confidenceBoost: number;        // 0-15 extra confidence points earned
}

// ─── Storage Operations ──────────────────────────────────────────────────

export function loadRaceHistory(): RaceMemoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RaceMemoryEntry[];
  } catch {
    return [];
  }
}

export function saveRaceResult(entry: RaceMemoryEntry): void {
  const history = loadRaceHistory();
  history.unshift(entry); // newest first
  // Cap storage at MAX_STORED_RACES
  if (history.length > MAX_STORED_RACES) {
    history.length = MAX_STORED_RACES;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearRaceHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getRaceCount(): number {
  return loadRaceHistory().length;
}

// ─── Track Learning Engine ───────────────────────────────────────────────
// Aggregates past races on the same track to learn optimal strategies.

export function getTrackLearning(trackName: string): TrackLearning | null {
  const history = loadRaceHistory().filter(r => r.trackName === trackName);
  if (history.length === 0) return null;

  const n = history.length;

  // Basic stats
  const avgFinish = history.reduce((s, r) => s + r.finalPosition, 0) / n;
  const bestFinish = Math.min(...history.map(r => r.finalPosition));
  const avgPits = history.reduce((s, r) => s + r.totalPitStops, 0) / n;

  // Optimal pit window: average lap of first pit stop
  const firstPitLaps = history
    .filter(r => r.pitStopLaps.length > 0)
    .map(r => r.pitStopLaps[0]);
  const optimalPitWindow = firstPitLaps.length > 0
    ? Math.round(firstPitLaps.reduce((s, l) => s + l, 0) / firstPitLaps.length)
    : 0;

  // Best compound sequence: most common tire order in top-3 finishes
  const podiumRaces = history.filter(r => r.finalPosition <= 3);
  const bestCompoundSequence = podiumRaces.length > 0
    ? podiumRaces[0].tireCompoundsUsed
    : history[0].tireCompoundsUsed;

  // Average tire life per compound
  const softLifes: number[] = [];
  const mediumLifes: number[] = [];
  const hardLifes: number[] = [];

  history.forEach(race => {
    if (race.avgTireWearAtPit > 0) {
      // Estimate laps per stint based on tire wear at pit
      const estimatedLaps = Math.round(race.totalLaps / Math.max(1, race.totalPitStops + 1));
      race.tireCompoundsUsed.forEach(comp => {
        if (comp === 'soft') softLifes.push(estimatedLaps);
        else if (comp === 'medium') mediumLifes.push(estimatedLaps);
        else if (comp === 'hard') hardLifes.push(estimatedLaps);
      });
    }
  });

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  // Win rate (P1-P3)
  const winRate = (podiumRaces.length / n) * 100;

  // Confidence boost: earned through experience on this track
  // More races + better results = higher boost (max 15 points)
  const experienceBoost = Math.min(5, n * 1.5);                      // up to 5 for experience
  const performanceBoost = Math.min(5, (20 - avgFinish) * 0.5);      // up to 5 for good avg finish
  const consistencyBoost = Math.min(5, winRate * 0.1);               // up to 5 for podium rate
  const confidenceBoost = Math.round(Math.max(0, experienceBoost + performanceBoost + consistencyBoost));

  return {
    trackName,
    racesCompleted: n,
    avgFinishPosition: parseFloat(avgFinish.toFixed(1)),
    bestFinishPosition: bestFinish,
    avgPitStops: parseFloat(avgPits.toFixed(1)),
    optimalPitWindow,
    bestCompoundSequence,
    avgTireLifeSoft: Math.round(avg(softLifes)),
    avgTireLifeMedium: Math.round(avg(mediumLifes)),
    avgTireLifeHard: Math.round(avg(hardLifes)),
    winRate: parseFloat(winRate.toFixed(0)),
    confidenceBoost: Math.min(15, confidenceBoost),
  };
}

// ─── Strategy Adjustment ─────────────────────────────────────────────────
// Returns adjustments to apply to the strategy engine based on past data.

export interface StrategyAdjustment {
  confidenceBoost: number;          // extra points to add to confidence (0-15)
  suggestedPitLap: number | null;   // learned optimal pit window
  preferredCompound: string | null; // compound that worked best here
  experienceLevel: 'none' | 'novice' | 'experienced' | 'expert';
  trackInsight: string;             // human-readable insight
}

export function getStrategyAdjustment(trackName: string): StrategyAdjustment {
  const learning = getTrackLearning(trackName);

  if (!learning) {
    return {
      confidenceBoost: 0,
      suggestedPitLap: null,
      preferredCompound: null,
      experienceLevel: 'none',
      trackInsight: 'No previous race data for this track. AI using baseline models.',
    };
  }

  const { racesCompleted, confidenceBoost, optimalPitWindow, bestCompoundSequence, avgFinishPosition, bestFinishPosition, winRate } = learning;

  const experienceLevel: StrategyAdjustment['experienceLevel'] =
    racesCompleted >= 10 ? 'expert' :
    racesCompleted >= 5 ? 'experienced' :
    racesCompleted >= 1 ? 'novice' : 'none';

  // Determine preferred compound from best results
  const preferredCompound = bestCompoundSequence.length > 1
    ? bestCompoundSequence[1] // second stint compound (after first pit)
    : bestCompoundSequence[0] || null;

  // Generate human-readable insight
  const insights: string[] = [];
  if (racesCompleted >= 3) {
    insights.push(`${racesCompleted} races learned.`);
  }
  if (optimalPitWindow > 0) {
    insights.push(`Optimal pit window: lap ${optimalPitWindow}.`);
  }
  if (preferredCompound) {
    insights.push(`Best compound: ${preferredCompound.toUpperCase()}.`);
  }
  if (winRate > 0) {
    insights.push(`Podium rate: ${winRate}%.`);
  }
  if (bestFinishPosition <= 3) {
    insights.push(`Best: P${bestFinishPosition}.`);
  }

  const trackInsight = insights.length > 0
    ? `📊 Track Memory: ${insights.join(' ')}`
    : `Learning this track. Avg finish: P${avgFinishPosition}.`;

  return {
    confidenceBoost,
    suggestedPitLap: optimalPitWindow > 0 ? optimalPitWindow : null,
    preferredCompound,
    experienceLevel,
    trackInsight,
  };
}

// ─── Create Race Memory Entry ────────────────────────────────────────────
// Convenience function to build a RaceMemoryEntry from race state.

export function createRaceMemoryEntry(params: {
  trackName: string;
  driverName: string;
  finalPosition: number;
  startPosition: number;
  totalLaps: number;
  totalPitStops: number;
  tireCompoundsUsed: string[];
  pitStopLaps: number[];
  avgTireWearAtPit: number;
  fastestLap: number;
  avgLapTime: number;
  consistency: number;
  weather: string;
  rainEncountered: boolean;
  aiRecsFollowed: number;
  aiRecsIgnored: number;
  autoStrategyUsed: boolean;
  strategyGrade: string;
}): RaceMemoryEntry {
  return {
    id: `race-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    trackName: params.trackName,
    driverName: params.driverName,
    finalPosition: params.finalPosition,
    startPosition: params.startPosition,
    positionsGained: params.startPosition - params.finalPosition,
    totalLaps: params.totalLaps,
    totalPitStops: params.totalPitStops,
    tireCompoundsUsed: params.tireCompoundsUsed,
    pitStopLaps: params.pitStopLaps,
    avgTireWearAtPit: params.avgTireWearAtPit,
    fastestLap: params.fastestLap,
    avgLapTime: params.avgLapTime,
    consistency: params.consistency,
    weatherConditions: params.weather,
    rainEncountered: params.rainEncountered,
    aiRecommendationsFollowed: params.aiRecsFollowed,
    aiRecommendationsIgnored: params.aiRecsIgnored,
    autoStrategyUsed: params.autoStrategyUsed,
    strategyGrade: params.strategyGrade,
  };
}

// ─── Ergast Historical Seeding ───────────────────────────────────────────
// Seeds race memory with real F1 historical data from the Ergast API.

import { fetchHistoricalRaces, type HistoricalRaceData } from './ergastApi';

/**
 * Infer tire compound from stint length heuristic.
 * Short stints (< 15 laps) → soft
 * Medium stints (15-25 laps) → medium
 * Long stints (> 25 laps) → hard
 */
function inferCompoundFromStintLength(stintLaps: number): string {
  if (stintLaps < 15) return 'soft';
  if (stintLaps <= 25) return 'medium';
  return 'hard';
}

/**
 * Convert historical Ergast race data into a RaceMemoryEntry.
 */
function historicalToMemoryEntry(race: HistoricalRaceData): RaceMemoryEntry {
  const winner = race.topResults[0];
  
  // Derive pit stop laps from the winner's pit stops
  const winnerPits = race.pitStops
    .filter(ps => ps.driverId === race.winner.toLowerCase() || ps.driverId.includes(race.winner.toLowerCase()))
    .sort((a, b) => a.lap - b.lap);
  
  // If no pit data for winner, use aggregated first 3 pit stops
  const pitLaps = winnerPits.length > 0
    ? winnerPits.map(ps => ps.lap)
    : race.pitStops.slice(0, 3).map(ps => ps.lap);
  
  // Infer compounds from stint lengths
  const stintBoundaries = [0, ...pitLaps, race.totalLaps];
  const compounds: string[] = [];
  for (let i = 0; i < stintBoundaries.length - 1; i++) {
    const stintLength = stintBoundaries[i + 1] - stintBoundaries[i];
    compounds.push(inferCompoundFromStintLength(stintLength));
  }

  return {
    id: `ergast-${race.circuitId}-${race.year}-${Date.now()}`,
    timestamp: new Date(race.year, 0, 1).toISOString(),
    trackName: race.trackName,
    driverName: race.winner,

    finalPosition: winner?.position ?? 1,
    startPosition: winner ? winner.position + winner.positionsGained : 1,
    positionsGained: winner?.positionsGained ?? 0,
    totalLaps: race.totalLaps,

    totalPitStops: pitLaps.length,
    tireCompoundsUsed: compounds,
    pitStopLaps: pitLaps,

    avgTireWearAtPit: 35, // estimated
    fastestLap: race.fastestLapTime ?? 75,
    avgLapTime: race.fastestLapTime ? race.fastestLapTime + 2.5 : 78,
    consistency: 0.8,

    weatherConditions: 'sunny',
    rainEncountered: false,

    aiRecommendationsFollowed: 0,
    aiRecommendationsIgnored: 0,
    autoStrategyUsed: false,
    strategyGrade: 'A',
  };
}

/**
 * Check if a track has already been seeded from Ergast.
 */
export function isTrackSeeded(trackName: string): boolean {
  try {
    return localStorage.getItem(`ergast_seeded_${trackName}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Get the number of Ergast-seeded races for a track.
 */
export function getErgastSeededCount(trackName: string): number {
  const history = loadRaceHistory();
  return history.filter(r => r.trackName === trackName && r.id.startsWith('ergast-')).length;
}

/**
 * Seed race memory with historical Ergast data for a given track.
 * Fetches 2022-2024 races and merges into existing memory without overwriting.
 */
export async function seedFromErgast(trackName: string): Promise<number> {
  if (isTrackSeeded(trackName)) {
    console.log(`[RaceMemory] Track ${trackName} already seeded from Ergast.`);
    return getErgastSeededCount(trackName);
  }

  try {
    console.log(`[RaceMemory] Seeding ${trackName} from Ergast API...`);
    const races = await fetchHistoricalRaces(trackName, [2022, 2023, 2024]);
    
    if (races.length === 0) {
      console.warn(`[RaceMemory] No Ergast data available for ${trackName}`);
      return 0;
    }

    const entries = races.map(historicalToMemoryEntry);
    const history = loadRaceHistory();
    
    // Merge: add Ergast entries that don't already exist
    for (const entry of entries) {
      const exists = history.some(h =>
        h.id.startsWith('ergast-') &&
        h.trackName === entry.trackName &&
        new Date(h.timestamp).getFullYear() === new Date(entry.timestamp).getFullYear()
      );
      if (!exists) {
        history.push(entry);
      }
    }
    
    // Cap and save
    if (history.length > MAX_STORED_RACES) {
      history.length = MAX_STORED_RACES;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    localStorage.setItem(`ergast_seeded_${trackName}`, 'true');

    console.log(`[RaceMemory] Seeded ${entries.length} historical races for ${trackName}`);
    return entries.length;
  } catch (err) {
    console.warn(`[RaceMemory] Failed to seed from Ergast:`, err);
    return 0;
  }
}
