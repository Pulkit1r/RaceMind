// ─── OpenF1 Live Telemetry API ────────────────────────────────────────────────
// Integrates with the OpenF1 API for "Live Race Weekend" mode.
// https://openf1.org — free, no authentication required.
// Falls back gracefully when no live session is available.

const OPENF1_BASE = 'https://api.openf1.org/v1';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LiveSession {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  circuit_key: number;
  circuit_short_name: string;
  country_name: string;
  year: number;
}

export interface LiveDriver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  session_key: number;
}

export interface LiveLap {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  st_speed: number | null; // speed trap
  date_start: string;
}

export interface LivePitStop {
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
  date: string;
  session_key: number;
}

export interface LiveStint {
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
  tyre_age_at_start: number;
  session_key: number;
}

export interface LiveTelemetryState {
  session: LiveSession | null;
  drivers: LiveDriver[];
  focusedDriver: LiveDriver | null;
  laps: LiveLap[];
  pitStops: LivePitStop[];
  stints: LiveStint[];
  isLive: boolean;
  lastUpdate: string;
  error: string | null;
}

export function emptyTelemetryState(): LiveTelemetryState {
  return {
    session: null,
    drivers: [],
    focusedDriver: null,
    laps: [],
    pitStops: [],
    stints: [],
    isLive: false,
    lastUpdate: '',
    error: null,
  };
}

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Fetch the current (or most recent) session.
 */
export async function fetchCurrentSession(): Promise<LiveSession | null> {
  try {
    const url = `${OPENF1_BASE}/sessions?session_type=Race&year=${new Date().getFullYear()}&order=date_start&order_direction=desc&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data: LiveSession[] = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (err) {
    console.warn('[OpenF1] Failed to fetch session:', err);
    return null;
  }
}

/**
 * Fetch drivers for a given session.
 */
export async function fetchLiveDrivers(sessionKey: number): Promise<LiveDriver[]> {
  try {
    const url = `${OPENF1_BASE}/drivers?session_key=${sessionKey}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.warn('[OpenF1] Failed to fetch drivers:', err);
    return [];
  }
}

/**
 * Fetch lap data for a specific driver in a session.
 */
export async function fetchLiveLaps(
  sessionKey: number,
  driverNumber?: number,
): Promise<LiveLap[]> {
  try {
    let url = `${OPENF1_BASE}/laps?session_key=${sessionKey}`;
    if (driverNumber) url += `&driver_number=${driverNumber}`;
    url += '&order=lap_number&limit=100';
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.warn('[OpenF1] Failed to fetch laps:', err);
    return [];
  }
}

/**
 * Fetch pit stop data for a session.
 */
export async function fetchLivePitStops(sessionKey: number): Promise<LivePitStop[]> {
  try {
    const url = `${OPENF1_BASE}/pit?session_key=${sessionKey}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.warn('[OpenF1] Failed to fetch pit stops:', err);
    return [];
  }
}

/**
 * Fetch tire stint data for a session.
 */
export async function fetchLiveStints(sessionKey: number): Promise<LiveStint[]> {
  try {
    const url = `${OPENF1_BASE}/stints?session_key=${sessionKey}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.warn('[OpenF1] Failed to fetch stints:', err);
    return [];
  }
}

/**
 * Check if a session is currently live.
 */
export function isSessionLive(session: LiveSession): boolean {
  const now = new Date();
  const start = new Date(session.date_start);
  const end = new Date(session.date_end);
  return now >= start && now <= end;
}

/**
 * Fetch complete live telemetry state for a session.
 */
export async function fetchLiveTelemetry(
  sessionKey: number,
  driverNumber?: number,
): Promise<LiveTelemetryState> {
  try {
    const [session, drivers, laps, pitStops, stints] = await Promise.all([
      fetchCurrentSession(),
      fetchLiveDrivers(sessionKey),
      fetchLiveLaps(sessionKey, driverNumber),
      fetchLivePitStops(sessionKey),
      fetchLiveStints(sessionKey),
    ]);

    const focusedDriver = driverNumber
      ? drivers.find(d => d.driver_number === driverNumber) ?? null
      : drivers[0] ?? null;

    return {
      session,
      drivers,
      focusedDriver,
      laps,
      pitStops,
      stints,
      isLive: session ? isSessionLive(session) : false,
      lastUpdate: new Date().toISOString(),
      error: null,
    };
  } catch (err) {
    console.warn('[OpenF1] Failed to fetch live telemetry:', err);
    return {
      ...emptyTelemetryState(),
      error: err instanceof Error ? err.message : 'Failed to fetch live data',
    };
  }
}

/**
 * Get next race session info for display.
 */
export async function fetchNextRace(): Promise<{ name: string; date: string } | null> {
  try {
    const url = `${OPENF1_BASE}/sessions?session_type=Race&year=${new Date().getFullYear()}&date_start>=${new Date().toISOString()}&order=date_start&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data: LiveSession[] = await response.json();
    if (data.length === 0) return null;
    return {
      name: `${data[0].country_name} GP`,
      date: new Date(data[0].date_start).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  } catch {
    return null;
  }
}
