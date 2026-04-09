// ─── Ergast API Integration ──────────────────────────────────────────────────
// Fetches historical F1 race data (pit stops, results) from the Ergast API
// to seed the race memory with real-world data.

// ─── Track → Ergast Circuit ID Mapping ───────────────────────────────────────
export const TRACK_TO_CIRCUIT_ID: Record<string, string> = {
  'Circuit de Monaco': 'monaco',
  'Silverstone': 'silverstone',
  'Monza': 'monza',
  'Spa-Francorchamps': 'spa',
  'Suzuka': 'suzuka',
  'Interlagos': 'interlagos',
  'COTA': 'americas',
  'Yas Marina': 'yas_marina',
  'Bahrain': 'bahrain',
  'Jeddah': 'jeddah',
  'Melbourne': 'albert_park',
  'Barcelona': 'catalunya',
  'Singapore': 'marina_bay',
  'Zandvoort': 'zandvoort',
  'Hungaroring': 'hungaroring',
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface ErgastPitStop {
  driverId: string;
  lap: string;
  stop: string;
  time: string;
  duration: string;
}

interface ErgastResult {
  Driver: { driverId: string; familyName: string; code: string };
  Constructor: { name: string };
  position: string;
  grid: string;
  laps: string;
  status: string;
  FastestLap?: { Time?: { time: string }; lap: string };
}

interface ErgastRaceTable {
  Races: Array<{
    season: string;
    round: string;
    raceName: string;
    Circuit: { circuitId: string };
    PitStops?: ErgastPitStop[];
    Results?: ErgastResult[];
  }>;
}

export interface HistoricalRaceData {
  year: number;
  trackName: string;
  circuitId: string;
  winner: string;
  winnerTeam: string;
  pitStops: { driverId: string; lap: number; stop: number; duration: number }[];
  topResults: { driver: string; team: string; position: number; positionsGained: number; laps: number }[];
  fastestLapTime: number | null;
  totalLaps: number;
}

// ─── Local Cache ─────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(track: string, year: number): string {
  return `ergast_cache_${track}_${year}`;
}

function getFromCache(track: string, year: number): HistoricalRaceData | null {
  try {
    const raw = localStorage.getItem(getCacheKey(track, year));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { data: HistoricalRaceData; timestamp: number };
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(track, year));
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function saveToCache(track: string, year: number, data: HistoricalRaceData): void {
  try {
    localStorage.setItem(getCacheKey(track, year), JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage full or unavailable
  }
}

// ─── API Fetch Functions ─────────────────────────────────────────────────────
const ERGAST_BASE = 'https://ergast.com/api/f1';

/**
 * Fetch pit stop data from Ergast for a specific race.
 */
export async function fetchHistoricalPitStops(
  circuitId: string,
  year: number,
): Promise<ErgastPitStop[]> {
  try {
    const url = `${ERGAST_BASE}/${year}/circuits/${circuitId}/pitstops.json?limit=100`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const races = (data?.MRData?.RaceTable as ErgastRaceTable)?.Races ?? [];
    if (races.length === 0) return [];
    return races[0].PitStops ?? [];
  } catch (err) {
    console.warn(`[Ergast] Failed to fetch pit stops for ${circuitId}/${year}:`, err);
    return [];
  }
}

/**
 * Fetch race results from Ergast for a specific race.
 */
export async function fetchRaceResults(
  circuitId: string,
  year: number,
): Promise<ErgastResult[]> {
  try {
    const url = `${ERGAST_BASE}/${year}/circuits/${circuitId}/results.json?limit=20`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const races = (data?.MRData?.RaceTable as ErgastRaceTable)?.Races ?? [];
    if (races.length === 0) return [];
    return races[0].Results ?? [];
  } catch (err) {
    console.warn(`[Ergast] Failed to fetch results for ${circuitId}/${year}:`, err);
    return [];
  }
}

/**
 * Parse a lap time string like "1:34.567" into seconds.
 */
function parseLapTime(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr) || null;
}

/**
 * Fetch and combine all historical race data for a track in a given year.
 */
export async function fetchHistoricalRace(
  trackName: string,
  year: number,
): Promise<HistoricalRaceData | null> {
  const circuitId = TRACK_TO_CIRCUIT_ID[trackName];
  if (!circuitId) {
    console.warn(`[Ergast] Unknown track: ${trackName}`);
    return null;
  }

  // Check cache first
  const cached = getFromCache(trackName, year);
  if (cached) {
    console.log(`[Ergast] Cache hit for ${trackName} ${year}`);
    return cached;
  }

  // Fetch both in parallel
  const [pitStops, results] = await Promise.all([
    fetchHistoricalPitStops(circuitId, year),
    fetchRaceResults(circuitId, year),
  ]);

  if (results.length === 0) {
    return null; // No race data available
  }

  const winner = results[0];
  const fastestLap = results
    .map(r => r.FastestLap?.Time?.time ? parseLapTime(r.FastestLap.Time.time) : null)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b)[0] ?? null;

  const raceData: HistoricalRaceData = {
    year,
    trackName,
    circuitId,
    winner: winner.Driver.code || winner.Driver.familyName,
    winnerTeam: winner.Constructor.name,
    pitStops: pitStops.map(ps => ({
      driverId: ps.driverId,
      lap: parseInt(ps.lap, 10),
      stop: parseInt(ps.stop, 10),
      duration: parseFloat(ps.duration) || 25,
    })),
    topResults: results.slice(0, 10).map(r => ({
      driver: r.Driver.code || r.Driver.familyName,
      team: r.Constructor.name,
      position: parseInt(r.position, 10),
      positionsGained: parseInt(r.grid, 10) - parseInt(r.position, 10),
      laps: parseInt(r.laps, 10),
    })),
    fastestLapTime: fastestLap,
    totalLaps: parseInt(results[0].laps, 10) || 50,
  };

  // Save to cache
  saveToCache(trackName, year, raceData);
  console.log(`[Ergast] Fetched ${trackName} ${year}: ${pitStops.length} pit stops, ${results.length} results`);

  return raceData;
}

/**
 * Fetch historical data for a track across multiple years.
 * Returns all successfully fetched races.
 */
export async function fetchHistoricalRaces(
  trackName: string,
  years: number[] = [2022, 2023, 2024],
): Promise<HistoricalRaceData[]> {
  const results = await Promise.allSettled(
    years.map(year => fetchHistoricalRace(trackName, year)),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<HistoricalRaceData | null> =>
      r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value!);
}
