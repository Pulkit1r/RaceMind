import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import TopBar from './components/TopBar';
import ControlPanel from './components/ControlPanel';
import CenterPanel from './components/CenterPanel';
import AIPanel from './components/AIPanel';
import RadioPanel from './components/RadioPanel';
import WhatIfModal from './components/WhatIfModal';
import { fireAlert, unlockAudio, setMuted, getMuted, setVoiceEnabled } from './audioAlerts';
import {
  initialRaceState,
  generateRadioMessage,
  generateRecommendations,
  simulatePitStrategies,
  computeTireWear,
  computeLapTime,
  type RaceState,
  type LapData,
  type RadioMessage,
  type AIRecommendation,
  type StrategyResult,
} from './data';

export default function App() {
  const [raceState, setRaceState] = useState<RaceState>({ ...initialRaceState });
  const [lapData, setLapData] = useState<LapData[]>([]);
  const [radioMessages, setRadioMessages] = useState<RadioMessage[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [strategies, setStrategies] = useState<StrategyResult[]>([]);
  const [isRacing, setIsRacing] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTireWearRef = useRef(100);
  const prevRainRef = useRef(0);

  // ─── Simulation tick ───────────────────────────────────────────────────────
  const simulateLap = useCallback(() => {
    setRaceState((prev) => {
      if (prev.currentLap >= prev.totalLaps) {
        setIsRacing(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return { ...prev, raceStatus: 'finished' };
      }

      const newLap = prev.currentLap + 1;

      // ── Tire degradation (compound-specific, accelerating) ──
      const newTireWear = computeTireWear(prev.tireWear, prev.tireAge, prev.currentTire);

      // ── Fuel consumption ──
      const fuel = Math.max(0, prev.fuelRemaining - 1.4);

      // ── Lap time from physics model ──
      const { lapTime, s1, s2, s3 } = computeLapTime(
        newTireWear,
        prev.currentTire,
        fuel,
      );

      // ── Position shuffles ──
      let newPos = prev.position;
      if (Math.random() > 0.92) {
        newPos = Math.max(1, Math.min(20, newPos + (Math.random() > 0.5 ? -1 : 1)));
      }

      const newLapData: LapData = {
        lap: newLap,
        time: lapTime,
        tireWear: parseFloat(newTireWear.toFixed(1)),
        fuelLoad: parseFloat(fuel.toFixed(1)),
        sector1: s1,
        sector2: s2,
        sector3: s3,
        position: newPos,
        gap: parseFloat((Math.random() * 3).toFixed(1)),
      };
      setLapData((prevData) => [...prevData, newLapData]);

      // ── Radio messages ──
      if (Math.random() > 0.5) {
        const msg = generateRadioMessage(newLap);
        setRadioMessages((prevMsgs) => [...prevMsgs.slice(-19), msg]);
      }

      // ── Natural weather drift ──
      let rainChance = prev.rainChance + (Math.random() - 0.48) * 4;
      rainChance = Math.max(0, Math.min(100, rainChance));

      const newState: RaceState = {
        ...prev,
        currentLap: newLap,
        position: newPos,
        tireAge: prev.tireAge + 1,
        tireWear: newTireWear,
        fuelRemaining: fuel,
        rainChance: parseFloat(rainChance.toFixed(0)),
        trackTemp: prev.trackTemp + (Math.random() - 0.5) * 0.5,
        drs: Math.random() > 0.6,
        ersDeployment: Math.max(0, Math.min(100, prev.ersDeployment + (Math.random() - 0.4) * 10)),
        gapAhead: Math.max(0.1, prev.gapAhead + (Math.random() - 0.5) * 0.4),
        gapBehind: Math.max(0.1, prev.gapBehind + (Math.random() - 0.5) * 0.3),
        fastestLap: Math.min(prev.fastestLap, lapTime),
        personalBest: Math.min(prev.personalBest, lapTime),
        raceStatus: 'racing',
        weather: rainChance > 90 ? 'heavy-rain' : rainChance > 60 ? 'light-rain' : rainChance > 35 ? 'cloudy' : 'sunny',
      };

      // ── Run strategy engine then feed results into recommendations ──
      const strats = simulatePitStrategies(newState);
      setStrategies(strats);
      const recs = generateRecommendations(newState, strats);
      setRecommendations(recs);

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
    setRadioMessages([]);
    setRecommendations([]);
    setStrategies([]);
    prevTireWearRef.current = 100;
    prevRainRef.current = 0;

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

      const newState = {
        ...prev,
        currentTire: nextTire as RaceState['currentTire'],
        tireAge: 0,
        tireWear: 100,
        pitStops: prev.pitStops + 1,
        lastPitLap: prev.currentLap,
      };
      const strats = simulatePitStrategies(newState);
      setStrategies(strats);
      setRecommendations(generateRecommendations(newState, strats));
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
      const strats = simulatePitStrategies(newState);
      setStrategies(strats);
      setRecommendations(generateRecommendations(newState, strats));
      return newState;
    });
  }, []);

  // ─── Slider handlers ──────────────────────────────────────────────────────
  const handleTireWearChange = useCallback((wear: number) => {
    setRaceState((prev) => {
      const newState = { ...prev, tireWear: wear };
      const strats = simulatePitStrategies(newState);
      setStrategies(strats);
      setRecommendations(generateRecommendations(newState, strats));
      return newState;
    });
  }, []);

  const handleWeatherChange = useCallback((rainChance: number) => {
    setRaceState((prev) => {
      const weather: RaceState['weather'] =
        rainChance > 90 ? 'heavy-rain' : rainChance > 60 ? 'light-rain' : rainChance > 35 ? 'cloudy' : 'sunny';
      const newState = { ...prev, rainChance, weather };
      const strats = simulatePitStrategies(newState);
      setStrategies(strats);
      setRecommendations(generateRecommendations(newState, strats));

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
      const strats = simulatePitStrategies(newState);
      setStrategies(strats);
      setRecommendations([altRec, ...generateRecommendations(newState, strats)]);

      return newState;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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
        <TopBar state={raceState} />

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
              isRacing={isRacing}
            />
          </div>

          {/* Center Panel - Charts */}
          <div className="flex-1 min-w-0">
            <CenterPanel lapData={lapData} state={raceState} />
          </div>

          {/* Right Panel - AI */}
          <div className="w-[340px] flex-shrink-0">
            <AIPanel recommendations={recommendations} strategies={strategies} state={raceState} />
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
    </div>
  );
}
