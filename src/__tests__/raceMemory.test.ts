// ─── Race Memory Tests ──────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadRaceHistory,
  saveRaceResult,
  clearRaceHistory,
  getTrackLearning,
  getStrategyAdjustment,
  createRaceMemoryEntry,
  type RaceMemoryEntry,
} from '../raceMemory';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

function createTestEntry(overrides: Partial<RaceMemoryEntry> = {}): RaceMemoryEntry {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    trackName: 'Circuit de Monaco',
    driverName: 'VER',
    finalPosition: 3,
    startPosition: 5,
    positionsGained: 2,
    totalLaps: 50,
    totalPitStops: 1,
    tireCompoundsUsed: ['medium', 'hard'],
    pitStopLaps: [22],
    avgTireWearAtPit: 35,
    fastestLap: 74.5,
    avgLapTime: 76.2,
    consistency: 0.8,
    weatherConditions: 'sunny',
    rainEncountered: false,
    aiRecommendationsFollowed: 5,
    aiRecommendationsIgnored: 1,
    autoStrategyUsed: false,
    strategyGrade: 'A',
    ...overrides,
  };
}

describe('Race Memory', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('loadRaceHistory / saveRaceResult', () => {
    it('returns empty array with no history', () => {
      const history = loadRaceHistory();
      expect(history).toHaveLength(0);
    });

    it('saves and loads a race result', () => {
      const entry = createTestEntry();
      saveRaceResult(entry);
      const history = loadRaceHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(entry.id);
    });

    it('newest race is first (unshift behavior)', () => {
      const first = createTestEntry({ id: 'first' });
      saveRaceResult(first);
      const second = createTestEntry({ id: 'second' });
      saveRaceResult(second);
      const history = loadRaceHistory();
      expect(history[0].id).toBe('second');
      expect(history[1].id).toBe('first');
    });
  });

  describe('clearRaceHistory', () => {
    it('removes all history', () => {
      saveRaceResult(createTestEntry());
      clearRaceHistory();
      expect(loadRaceHistory()).toHaveLength(0);
    });
  });

  describe('getTrackLearning', () => {
    it('returns null for tracks with no history', () => {
      const learning = getTrackLearning('Unknown Track');
      expect(learning).toBeNull();
    });

    it('returns learning data after saving races for a track', () => {
      saveRaceResult(createTestEntry({ trackName: 'Silverstone' }));
      saveRaceResult(createTestEntry({ trackName: 'Silverstone' }));
      const learning = getTrackLearning('Silverstone');
      expect(learning).not.toBeNull();
      expect(learning!.racesCompleted).toBe(2);
      expect(learning!.trackName).toBe('Silverstone');
    });
  });

  describe('getStrategyAdjustment', () => {
    it('returns none experience level with no history', () => {
      const adj = getStrategyAdjustment('Circuit de Monaco');
      expect(adj.experienceLevel).toBe('none');
      expect(adj.confidenceBoost).toBe(0);
    });

    it('upgrades experience after multiple races', () => {
      for (let i = 0; i < 5; i++) {
        saveRaceResult(createTestEntry({ trackName: 'Monza' }));
      }
      const adj = getStrategyAdjustment('Monza');
      expect(adj.experienceLevel).not.toBe('none');
      expect(adj.confidenceBoost).toBeGreaterThan(0);
    });

    it('confidence boost increases with more races', () => {
      for (let i = 0; i < 2; i++) {
        saveRaceResult(createTestEntry({ trackName: 'Bahrain' }));
      }
      const adj2 = getStrategyAdjustment('Bahrain');
      
      for (let i = 0; i < 8; i++) {
        saveRaceResult(createTestEntry({ trackName: 'Bahrain' }));
      }
      const adj10 = getStrategyAdjustment('Bahrain');
      
      expect(adj10.confidenceBoost).toBeGreaterThanOrEqual(adj2.confidenceBoost);
    });

    it('provides track insight text', () => {
      saveRaceResult(createTestEntry({ trackName: 'Spa-Francorchamps' }));
      const adj = getStrategyAdjustment('Spa-Francorchamps');
      expect(typeof adj.trackInsight).toBe('string');
      expect(adj.trackInsight.length).toBeGreaterThan(0);
    });
  });

  describe('createRaceMemoryEntry', () => {
    it('creates a valid entry from params', () => {
      const entry = createRaceMemoryEntry({
        trackName: 'Monza',
        driverName: 'LEC',
        finalPosition: 1,
        startPosition: 3,
        totalLaps: 53,
        totalPitStops: 1,
        tireCompoundsUsed: ['medium', 'hard'],
        pitStopLaps: [15],
        avgTireWearAtPit: 32,
        fastestLap: 82.4,
        avgLapTime: 83.5,
        consistency: 0.6,
        weather: 'sunny',
        rainEncountered: false,
        aiRecsFollowed: 8,
        aiRecsIgnored: 0,
        autoStrategyUsed: true,
        strategyGrade: 'S',
      });
      expect(entry.trackName).toBe('Monza');
      expect(entry.positionsGained).toBe(2); // started P3, finished P1
      expect(entry.strategyGrade).toBe('S');
      expect(entry.id).toBeTruthy();
    });
  });
});
