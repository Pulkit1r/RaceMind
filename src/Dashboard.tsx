import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import TopBar from './components/TopBar';
import ControlPanel from './components/ControlPanel';
import CenterPanel from './components/CenterPanel';
import AIPanel from './components/AIPanel';
import RadioPanel from './components/RadioPanel';
import WhatIfModal from './components/WhatIfModal';
import RaceResultModal from './components/RaceResultModal';
import { fireAlert, unlockAudio, setMuted, getMuted, setVoiceEnabled } from './audioAlerts';
import {
  fetchTrackWeather,
  getAvailableTracks,
  setWeatherApiKey,
  getWeatherApiKey,
  hasWeatherApiKey,
  type WeatherData,
} from './weatherApi';
import {
  initialRaceState,
  generateRadioMessage,
  generateRecommendations,
  simulatePitStrategies,
  computeTireWear,
  computeLapTime,
  getTrackAbrasion,
  initializeCompetitors,
  simulateCompetitorLap,
  computePositionFromCompetitors,
  type RaceState,
  type LapData,
  type RadioMessage,
  type AIRecommendation,
  type StrategyResult,
  type StrategyGoal,
  type Competitor,
} from './data';
import {
  saveRaceResult,
  createRaceMemoryEntry,
  getStrategyAdjustment,
  getRaceCount,
  loadRaceHistory,
  type StrategyAdjustment,
} from './raceMemory';

export default function Dashboard() {
  const [raceState, setRaceState] = useState<RaceState>({ ...initialRaceState });
  const [lapData, setLapData] = useState<LapData[]>([]);
  const [radioMessages, setRadioMessages] = useState<RadioMessage[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [strategies, setStrategies] = useState<StrategyResult[]>([]);
  const [isRacing, setIsRacing] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoStrategy, setAutoStrategy] = useState(false);
  const [strategyGoal, setStrategyGoal] = useState<StrategyGoal>('minimize-time');
  const autoStratCooldownRef = useRef(0); // prevents rapid auto-pits
  const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getWeatherApiKey());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const weatherIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTireWearRef = useRef(100);
  const prevRainRef = useRef(0);
  const autoStrategyRef = useRef(false);
  const pitStopLapsRef = useRef<number[]>([]);
  const compoundsUsedRef = useRef<string[]>(['medium']);
  const tireWearAtPitsRef = useRef<number[]>([]);
  const lapDataRef = useRef<LapData[]>([]);
  const [trackAdjustment, setTrackAdjustment] = useState<StrategyAdjustment>(
    getStrategyAdjustment(initialRaceState.trackName)
  );
  const competitorsRef = useRef<Competitor[]>([]);
  const playerCumulativeTimeRef = useRef(0);

  // Compute grip factor from current weather conditions
  function getGripFactor(state: RaceState): number {
    let grip = 1.0;
    if (state.airTemp < 15) grip -= 0.08;
    else if (state.airTemp < 20) grip -= 0.04;
    else if (state.airTemp > 40) grip -= 0.03;
    if (state.rainChance > 80) grip -= 0.35;
    else if (state.rainChance > 60) grip -= 0.20;
    else if (state.rainChance > 40) grip -= 0.05;
    return Math.max(0.45, Math.min(1.0, grip));
  }

  // Keep ref in sync with state for use inside setRaceState callback
  useEffect(() => {
    autoStrategyRef.current = autoStrategy;
  }, [autoStrategy]);

  const strategyGoalRef = useRef<StrategyGoal>('minimize-time');
  useEffect(() => {
    strategyGoalRef.current = strategyGoal;
  }, [strategyGoal]);

  // ─── Weather fetching ─────────────────────────────────────────────────────
  const fetchWeather = useCallback(async (trackName: string) => {
    setWeatherLoading(true);
    try {
      const data = await fetchTrackWeather(trackName);
      if (data) {
        setLiveWeather(data);
        // Apply live weather to race state
        setRaceState(prev => ({
          ...prev,
          airTemp: data.airTemp,
          trackTemp: data.trackTemp,
          rainChance: data.rainChance,
          weather: data.condition,
        }));
      }
    } catch (err) {
      console.error('[Dashboard] Weather fetch error:', err);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // Fetch weather on mount and when track changes
  useEffect(() => {
    fetchWeather(raceState.trackName);
  }, [raceState.trackName, fetchWeather]);

  // Refresh weather every 60s during a race
  useEffect(() => {
    if (isRacing) {
      weatherIntervalRef.current = setInterval(() => {
        fetchWeather(raceState.trackName);
      }, 60000);
    } else {
      if (weatherIntervalRef.current) clearInterval(weatherIntervalRef.current);
    }
    return () => {
      if (weatherIntervalRef.current) clearInterval(weatherIntervalRef.current);
    };
  }, [isRacing, raceState.trackName, fetchWeather]);

  // ─── Track change handler ─────────────────────────────────────────────────
  const handleTrackChange = useCallback((trackName: string) => {
    setRaceState(prev => ({ ...prev, trackName }));
  }, []);

  // ─── API Key handler ──────────────────────────────────────────────────────
  const handleApiKeySubmit = useCallback((key: string) => {
    setWeatherApiKey(key);
    setApiKeyInput(key);
    fetchWeather(raceState.trackName);
  }, [raceState.trackName, fetchWeather]);

  // ─── Simulation tick ───────────────────────────────────────────────────────
  const simulateLap = useCallback(() => {
    setRaceState((prev) => {
      if (prev.currentLap >= prev.totalLaps) {
        setIsRacing(false);
        if (intervalRef.current) clearInterval(intervalRef.current);

        // ── Save race to memory ──
        const history = loadRaceHistory();
        const ldRef = lapDataRef.current;
        const avgLap = ldRef.length > 0
          ? ldRef.reduce((s: number, l: LapData) => s + l.time, 0) / ldRef.length
          : 0;
        const lapTimes = ldRef.map((l: LapData) => l.time);
        const mean = avgLap;
        const variance = lapTimes.length > 1
          ? lapTimes.reduce((s: number, t: number) => s + (t - mean) ** 2, 0) / lapTimes.length
          : 0;
        const consistency = Math.sqrt(variance);

        const grade = prev.position <= 1 ? 'S'
          : prev.position <= 3 ? 'A'
          : prev.position <= 6 ? 'B'
          : prev.position <= 10 ? 'C' : 'D';

        const entry = createRaceMemoryEntry({
          trackName: prev.trackName,
          driverName: prev.driverName,
          finalPosition: prev.position,
          startPosition: 3, // default starting position
          totalLaps: prev.totalLaps,
          totalPitStops: prev.pitStops,
          tireCompoundsUsed: [...compoundsUsedRef.current],
          pitStopLaps: [...pitStopLapsRef.current],
          avgTireWearAtPit: tireWearAtPitsRef.current.length > 0
            ? tireWearAtPitsRef.current.reduce((s, w) => s + w, 0) / tireWearAtPitsRef.current.length
            : 0,
          fastestLap: prev.fastestLap,
          avgLapTime: avgLap,
          consistency,
          weather: prev.weather,
          rainEncountered: prev.weather.includes('rain'),
          aiRecsFollowed: prev.pitStops,
          aiRecsIgnored: 0,
          autoStrategyUsed: autoStrategyRef.current,
          strategyGrade: grade,
        });
        saveRaceResult(entry);

        // Update track adjustment for next race
        setTrackAdjustment(getStrategyAdjustment(prev.trackName));

        // Show result screen after a short delay for dramatic effect
        setTimeout(() => setShowResult(true), 500);
        return { ...prev, raceStatus: 'finished' };
      }

      const newLap = prev.currentLap + 1;

      // ── Compute grip factor from weather ──
      const gripFactor = getGripFactor(prev);
      const abrasion = getTrackAbrasion(prev.trackName);

      // ── Tire degradation (compound + track + temperature + grip aware) ──
      const newTireWear = computeTireWear(prev.tireWear, prev.tireAge, prev.currentTire, prev.trackTemp, abrasion, gripFactor);

      // ── Fuel consumption ──
      const fuel = Math.max(0, prev.fuelRemaining - 1.4);

      // ── Lap time from physics model (now grip-aware) ──
      const { lapTime, s1, s2, s3 } = computeLapTime(
        newTireWear,
        prev.currentTire,
        fuel,
        gripFactor,
      );

      // ── Update player cumulative time ──
      playerCumulativeTimeRef.current += lapTime;

      // ── Simulate all 19 competitors using same physics ──
      const updatedCompetitors = competitorsRef.current.map(comp =>
        simulateCompetitorLap(comp, newLap, prev.trackTemp, abrasion, gripFactor)
      );
      competitorsRef.current = updatedCompetitors;

      // ── Compute real position and gaps from competitor times ──
      const { position: newPos, gapAhead, gapBehind } = computePositionFromCompetitors(
        playerCumulativeTimeRef.current,
        updatedCompetitors,
      );

      // ── DRS: available when gap to car ahead < 1.0s ──
      const drsActive = gapAhead < 1.0 && gapAhead > 0;

      const newLapData: LapData = {
        lap: newLap,
        time: lapTime,
        tireWear: parseFloat(newTireWear.toFixed(1)),
        fuelLoad: parseFloat(fuel.toFixed(1)),
        sector1: s1,
        sector2: s2,
        sector3: s3,
        position: newPos,
        gap: gapAhead,
      };
      setLapData((prevData) => {
        const updated = [...prevData, newLapData];
        lapDataRef.current = updated;
        return updated;
      });

      // ── Radio messages ──
      if (Math.random() > 0.5) {
        const msg = generateRadioMessage(newLap);
        setRadioMessages((prevMsgs) => [...prevMsgs.slice(-19), msg]);
      }

      // ── Natural weather drift ──
      let rainChance = prev.rainChance + (Math.random() - 0.48) * 4;
      rainChance = Math.max(0, Math.min(100, rainChance));

      let newState: RaceState = {
        ...prev,
        currentLap: newLap,
        position: newPos,
        tireAge: prev.tireAge + 1,
        tireWear: newTireWear,
        fuelRemaining: fuel,
        rainChance: parseFloat(rainChance.toFixed(0)),
        trackTemp: prev.trackTemp + (Math.random() - 0.5) * 0.5,
        drs: drsActive,
        ersDeployment: Math.max(0, Math.min(100, prev.ersDeployment + (Math.random() - 0.4) * 10)),
        gapAhead,
        gapBehind,
        fastestLap: Math.min(prev.fastestLap, lapTime),
        personalBest: Math.min(prev.personalBest, lapTime),
        raceStatus: 'racing',
        weather: rainChance > 90 ? 'heavy-rain' : rainChance > 60 ? 'light-rain' : rainChance > 35 ? 'cloudy' : 'sunny',
      };

      // ── Run strategy engine (now with grip + learning feedback) ──
      const strats = simulatePitStrategies(newState, gripFactor, trackAdjustment);
      setStrategies(strats);
      const recs = generateRecommendations(newState, strats, strategyGoalRef.current);

      // Apply confidence boost from track learning memory
      const boost = trackAdjustment.confidenceBoost;
      if (boost > 0) {
        recs.forEach((r: AIRecommendation) => {
          r.confidence = Math.min(98, r.confidence + boost);
        });
      }
      setRecommendations(recs);

      // ── AUTO STRATEGY MODE ──
      // If auto mode is on and a BOX recommendation has confidence > 85%, auto-execute pit
      if (autoStratCooldownRef.current > 0) {
        autoStratCooldownRef.current--;
      }
      const autoRec = recs.find(r => r.title.includes('BOX') && r.confidence > 85);
      if (autoRec && autoStratCooldownRef.current <= 0) {
        // Check autoStrategy via ref to get latest value inside setRaceState callback
        const isAutoMode = autoStrategyRef.current;
        if (isAutoMode) {
          autoStratCooldownRef.current = 8; // cooldown: no auto-pit for 8 laps
          const autoPitCompound = autoRec.title.includes('SOFT') ? 'soft'
            : autoRec.title.includes('HARD') ? 'hard' : 'medium';
          newState = {
            ...newState,
            currentTire: autoPitCompound as RaceState['currentTire'],
            tireAge: 0,
            tireWear: 100,
            pitStops: newState.pitStops + 1,
            lastPitLap: newLap,
          };

          const autoMsg: RadioMessage = {
            id: `auto-pit-${Date.now()}`,
            time: `LAP ${newLap}`,
            from: 'ai',
            message: `🤖 AI AUTO-PIT: Confidence ${autoRec.confidence}%. Switching to ${autoPitCompound.toUpperCase()} compound. AI executed pit stop.`,
            priority: 'critical',
          };
          setRadioMessages((msgs) => [...msgs.slice(-19), autoMsg]);
          fireAlert({ level: 'critical', message: `AI executed pit stop. Switching to ${autoPitCompound} compound. Confidence ${autoRec.confidence} percent.` });
        }
      }

      // ── Audio alerts based on state changes ──
      // Critical tire wear threshold
      if (newTireWear < 20 && prevTireWearRef.current >= 20) {
        fireAlert({ level: 'critical', message: 'Warning. Tyre wear critical. Box this lap.' });
      } else if (newTireWear < 35 && prevTireWearRef.current >= 35) {
        fireAlert({ level: 'warning', message: 'Tyres degrading. Consider pit stop.' });
      }
      prevTireWearRef.current = newTireWear;

      // Rain threshold audio
      if (rainChance > 90 && prev.rainChance <= 90) {
        fireAlert({ level: 'critical', message: 'Heavy rain incoming. Box for wet tyres immediately.' });
      } else if (rainChance > 60 && prev.rainChance <= 60) {
        fireAlert({ level: 'warning', message: 'Rain probability rising. Consider intermediates.' });
      }

      // Urgent recommendation audio
      const urgentRec = recs.find(r => r.urgent);
      if (urgentRec && urgentRec.title.includes('BOX')) {
        fireAlert({ level: 'critical', message: 'Box box box. Box this lap.' });
      }

      // Fuel critical
      if (fuel < 10 && prev.fuelRemaining >= 10) {
        fireAlert({ level: 'warning', message: 'Fuel critical. Engage maximum fuel save mode.' });
      }

      return newState;
    });
  }, []);

  // ─── Button handlers ───────────────────────────────────────────────────────
  const handleStartRace = useCallback(() => {
    unlockAudio(); // Unlock AudioContext on user gesture
    setIsRacing(true);
    setRaceState((prev) => ({ ...prev, raceStatus: 'racing', currentLap: 0 }));
    setLapData([]);
    lapDataRef.current = [];
    setRadioMessages([]);
    setRecommendations([]);
    setStrategies([]);
    prevTireWearRef.current = 100;
    prevRainRef.current = 0;
    pitStopLapsRef.current = [];
    compoundsUsedRef.current = [initialRaceState.currentTire];
    tireWearAtPitsRef.current = [];
    autoStratCooldownRef.current = 0;
    playerCumulativeTimeRef.current = 0;

    // Initialize 19 AI competitors with varied strategies
    competitorsRef.current = initializeCompetitors(initialRaceState.totalLaps);

    // Load track memory for this race
    setTrackAdjustment(getStrategyAdjustment(raceState.trackName));

    fireAlert({ level: 'race-start' });

    const startMsg: RadioMessage = {
      id: 'start-msg',
      time: 'LAP 0',
      from: 'engineer',
      message: 'Lights out and away we go! Push hard, we are looking good.',
      priority: 'high',
    };
    setRadioMessages([startMsg]);
    intervalRef.current = setInterval(simulateLap, 1800);
  }, [simulateLap]);

  const handleStopRace = useCallback(() => {
    setIsRacing(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRaceState((prev) => ({ ...prev, raceStatus: 'finished' }));
  }, []);

  const handleReset = useCallback(() => {
    setIsRacing(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // Reset all state to initial values
    setRaceState({ ...initialRaceState });
    setLapData([]);
    lapDataRef.current = [];
    setRadioMessages([]);
    setRecommendations([]);
    setStrategies([]);
    prevTireWearRef.current = 100;
    prevRainRef.current = 0;
    pitStopLapsRef.current = [];
    compoundsUsedRef.current = [initialRaceState.currentTire];
    tireWearAtPitsRef.current = [];
    autoStratCooldownRef.current = 0;
    playerCumulativeTimeRef.current = 0;
    competitorsRef.current = [];
    setLiveWeather(null);
  }, []);

  const handlePitNow = useCallback(() => {
    unlockAudio();
    fireAlert({ level: 'critical', message: 'Box box box. Come in this lap.' });
    setRaceState((prev) => {
      const nextTire = prev.currentTire === 'soft' ? 'medium' : prev.currentTire === 'medium' ? 'hard' : 'medium';
      const pitMsg: RadioMessage = {
        id: `pit-${Date.now()}`,
        time: `LAP ${prev.currentLap}`,
        from: 'engineer',
        message: `BOX BOX BOX! Switching to ${nextTire} compound. Come in this lap.`,
        priority: 'critical',
      };
      setRadioMessages((msgs) => [...msgs.slice(-19), pitMsg]);

      // Track pit stop for memory system
      pitStopLapsRef.current.push(prev.currentLap);
      compoundsUsedRef.current.push(nextTire);
      tireWearAtPitsRef.current.push(prev.tireWear);

      const newState = {
        ...prev,
        currentTire: nextTire as RaceState['currentTire'],
        tireAge: 0,
        tireWear: 100,
        pitStops: prev.pitStops + 1,
        lastPitLap: prev.currentLap,
      };
      const gf = getGripFactor(newState);
      const strats = simulatePitStrategies(newState, gf, trackAdjustment);
      setStrategies(strats);
      setRecommendations(generateRecommendations(newState, strats, strategyGoalRef.current));
      return newState;
    });
  }, []);

  const handleChangeTire = useCallback((tire: RaceState['currentTire']) => {
    setRaceState((prev) => {
      const tireMsg: RadioMessage = {
        id: `tire-${Date.now()}`,
        time: `LAP ${prev.currentLap}`,
        from: 'engineer',
        message: `Copy. Switching to ${tire} compound now. Confirmed.`,
        priority: 'medium',
      };
      setRadioMessages((msgs) => [...msgs.slice(-19), tireMsg]);

      const newState = {
        ...prev,
        currentTire: tire,
        tireAge: 0,
        tireWear: 100,
        pitStops: prev.pitStops + 1,
        lastPitLap: prev.currentLap,
      };
      const gf = getGripFactor(newState);
      const strats = simulatePitStrategies(newState, gf, trackAdjustment);
      setStrategies(strats);
      setRecommendations(generateRecommendations(newState, strats, strategyGoalRef.current));
      return newState;
    });
  }, []);

  // ─── Slider handlers ──────────────────────────────────────────────────────
  const handleTireWearChange = useCallback((wear: number) => {
    setRaceState((prev) => {
      const newState = { ...prev, tireWear: wear };
      const gf = getGripFactor(newState);
      const strats = simulatePitStrategies(newState, gf, trackAdjustment);
      setStrategies(strats);
      setRecommendations(generateRecommendations(newState, strats, strategyGoalRef.current));
      return newState;
    });
  }, []);

  const handleWeatherChange = useCallback((rainChance: number) => {
    setRaceState((prev) => {
      const weather: RaceState['weather'] =
        rainChance > 90 ? 'heavy-rain' : rainChance > 60 ? 'light-rain' : rainChance > 35 ? 'cloudy' : 'sunny';
      const newState = { ...prev, rainChance, weather };
      const gf = getGripFactor(newState);
      const strats = simulatePitStrategies(newState, gf, trackAdjustment);
      setStrategies(strats);
      setRecommendations(generateRecommendations(newState, strats, strategyGoalRef.current));

      // Fire a radio message when crossing thresholds
      if ((prev.rainChance <= 60 && rainChance > 60) || (prev.rainChance <= 90 && rainChance > 90)) {
        const weatherMsg: RadioMessage = {
          id: `weather-${Date.now()}`,
          time: `LAP ${prev.currentLap}`,
          from: 'ai',
          message: rainChance > 90
            ? `HEAVY RAIN INCOMING. Rain probability ${rainChance}%. Recommend immediate switch to wet tires.`
            : `Rain probability rising to ${rainChance}%. Consider intermediates. Monitoring conditions.`,
          priority: rainChance > 90 ? 'critical' : 'high',
        };
        setRadioMessages((msgs) => [...msgs.slice(-19), weatherMsg]);

        // Audio alert on weather threshold
        if (rainChance > 90) {
          fireAlert({ level: 'critical', message: 'Heavy rain incoming. Switch to wet tyres.' });
        } else {
          fireAlert({ level: 'warning', message: 'Rain probability rising. Consider intermediates.' });
        }
      }

      return newState;
    });
  }, []);

  // ─── Alternate Strategy handler ────────────────────────────────────────────
  const handleAlternateStrategy = useCallback(() => {
    setRaceState((prev) => {
      // Randomise strategy parameters to simulate exploring an alternative
      const strategies = [
        { tire: 'soft' as const, label: 'AGGRESSIVE', desc: 'Switch to softs and push hard. Higher risk, higher reward.' },
        { tire: 'hard' as const, label: 'CONSERVATIVE', desc: 'Switch to hards and extend the stint. Lower risk, consistent pace.' },
        { tire: 'medium' as const, label: 'BALANCED', desc: 'Stay on mediums. Optimal balance of pace and longevity.' },
      ];
      const alt = strategies[Math.floor(Math.random() * strategies.length)];

      const stratMsg: RadioMessage = {
        id: `strat-${Date.now()}`,
        time: `LAP ${prev.currentLap}`,
        from: 'ai',
        message: `ALTERNATE STRATEGY: ${alt.label}. ${alt.desc} Confidence: ${(70 + Math.random() * 25).toFixed(0)}%.`,
        priority: 'high',
      };
      setRadioMessages((msgs) => [...msgs.slice(-19), stratMsg]);

      // Shift some params to simulate the strategy
      const newGapAhead = Math.max(0.1, prev.gapAhead + (Math.random() - 0.5) * 1.5);
      const newGapBehind = Math.max(0.1, prev.gapBehind + (Math.random() - 0.5) * 1.0);
      const newPos = Math.max(1, Math.min(20, prev.position + (Math.random() > 0.6 ? -1 : Math.random() > 0.5 ? 1 : 0)));

      const newState: RaceState = {
        ...prev,
        currentTire: alt.tire,
        tireAge: 0,
        tireWear: 100,
        position: newPos,
        gapAhead: newGapAhead,
        gapBehind: newGapBehind,
        pitStops: prev.pitStops + 1,
        lastPitLap: prev.currentLap,
      };

      // Generate fresh AI recs based on new state
      const altRec: AIRecommendation = {
        id: `rec-alt-${Date.now()}`,
        type: 'pace',
        title: `${alt.label} MODE`,
        description: alt.desc,
        risk: alt.tire === 'soft' ? 'high' : alt.tire === 'hard' ? 'low' : 'medium',
        confidence: parseFloat((70 + Math.random() * 25).toFixed(0)),
        timestamp: new Date().toISOString(),
        urgent: alt.tire === 'soft',
      };
      const gf = getGripFactor(newState);
      const strats = simulatePitStrategies(newState, gf, trackAdjustment);
      setStrategies(strats);
      setRecommendations([altRec, ...generateRecommendations(newState, strats, strategyGoalRef.current)]);

      return newState;
    });
  }, []);

  // ─── Audio toggle ─────────────────────────────────────────────────────────────────
  const handleToggleAudio = useCallback(() => {
    setAudioEnabled(prev => {
      const newVal = !prev;
      setMuted(!newVal);
      setVoiceEnabled(newVal);
      return newVal;
    });
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ': // Space = Start / Stop
          e.preventDefault();
          if (isRacing) {
            handleStopRace();
          } else if (raceState.raceStatus !== 'finished') {
            handleStartRace();
          }
          break;
        case 'p': // P = Pit stop
          if (isRacing) {
            e.preventDefault();
            handlePitNow();
          }
          break;
        case 'w': // W = What-If
          if (isRacing) {
            e.preventDefault();
            setShowWhatIf((prev) => !prev);
          }
          break;
        case 'm': // M = Mute/Unmute
          e.preventDefault();
          handleToggleAudio();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRacing, raceState.raceStatus, handleStartRace, handleStopRace, handlePitNow, handleToggleAudio]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (weatherIntervalRef.current) clearInterval(weatherIntervalRef.current);
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-900 racing-grid-bg p-3 flex flex-col gap-3">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-green/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-neon-red/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full gap-3">
        {/* Top Bar */}
        <TopBar state={raceState} liveWeather={liveWeather} weatherLoading={weatherLoading} />

        {/* Main Content: Left + Center + Right */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Left Panel - Controls */}
          <div className="w-[260px] flex-shrink-0">
            <ControlPanel
              state={raceState}
              onStartRace={handleStartRace}
              onStopRace={handleStopRace}
              onPitNow={handlePitNow}
              onChangeTire={handleChangeTire}
              onTireWearChange={handleTireWearChange}
              onWeatherChange={handleWeatherChange}
              onAlternateStrategy={handleAlternateStrategy}
              onOpenWhatIf={() => setShowWhatIf(true)}
              onToggleAudio={handleToggleAudio}
              onReset={handleReset}
              audioEnabled={audioEnabled}
              isRacing={isRacing}
              autoStrategy={autoStrategy}
              onToggleAutoStrategy={() => setAutoStrategy(prev => !prev)}
              strategyGoal={strategyGoal}
              onStrategyGoalChange={setStrategyGoal}
              onTrackChange={handleTrackChange}
              onApiKeySubmit={handleApiKeySubmit}
              apiKey={apiKeyInput}
              liveWeather={liveWeather}
              weatherLoading={weatherLoading}
            />
          </div>

          {/* Center Panel - Charts */}
          <div className="flex-1 min-w-0">
            <CenterPanel lapData={lapData} state={raceState} />
          </div>

          {/* Right Panel - AI */}
          <div className="w-[340px] flex-shrink-0">
            <AIPanel recommendations={recommendations} strategies={strategies} state={raceState} trackAdjustment={trackAdjustment} />
          </div>
        </div>

        {/* Bottom Panel - Radio */}
        <RadioPanel messages={radioMessages} />
      </div>

      {/* What-If Modal */}
      <WhatIfModal
        state={raceState}
        isOpen={showWhatIf}
        onClose={() => setShowWhatIf(false)}
      />

      {/* Race Result Modal */}
      <RaceResultModal
        isOpen={showResult}
        onClose={() => setShowResult(false)}
        state={raceState}
        lapData={lapData}
      />
    </div>
  );
}
