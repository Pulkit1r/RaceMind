import { motion } from 'framer-motion';
import type { RaceState } from '../data';
import type { WeatherData } from '../weatherApi';
import {
  Cloud, Sun, CloudRain, CloudLightning, Flag, Timer, Gauge,
  Zap, Fuel, Radio, Trophy, BarChart3, Wifi, WifiOff, Wind, Droplets
} from 'lucide-react';

interface TopBarProps {
  state: RaceState;
  liveWeather?: WeatherData | null;
  weatherLoading?: boolean;
  liveMode?: boolean;
}

function WeatherIcon({ weather }: { weather: RaceState['weather'] }) {
  const iconClass = 'w-5 h-5';
  switch (weather) {
    case 'sunny': return <Sun className={`${iconClass} text-neon-yellow`} />;
    case 'cloudy': return <Cloud className={`${iconClass} text-slate-400`} />;
    case 'light-rain': return <CloudRain className={`${iconClass} text-neon-blue`} />;
    case 'heavy-rain': return <CloudLightning className={`${iconClass} text-neon-blue`} />;
  }
}

function StatusBadge({ status }: { status: RaceState['raceStatus'] }) {
  const colors: Record<string, string> = {
    'pre-race': 'bg-neon-purple/20 text-neon-purple border-neon-purple/30',
    'racing': 'bg-neon-green/20 text-neon-green border-neon-green/30',
    'safety-car': 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30',
    'vsc': 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30',
    'red-flag': 'bg-neon-red/20 text-neon-red border-neon-red/30',
    'finished': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  
  return (
    <motion.span
      animate={status === 'racing' ? { boxShadow: ['0 0 8px rgba(0,255,136,0.2)', '0 0 20px rgba(0,255,136,0.4)', '0 0 8px rgba(0,255,136,0.2)'] } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className={`px-3 py-1 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider border ${colors[status]}`}
    >
      {status === 'vsc' ? 'VSC' : status.replace('-', ' ')}
    </motion.span>
  );
}

function DataCell({ icon, label, value, color = 'text-slate-200', live = false }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <div className="text-slate-500">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-heading">{label}</span>
        <span className={`text-sm font-mono font-semibold ${color} ${live ? 'telemetry-live' : ''}`}>{value}</span>
      </div>
    </div>
  );
}

export default function TopBar({ state, liveWeather, weatherLoading, liveMode }: TopBarProps) {
  const lapProgress = state.totalLaps > 0 ? (state.currentLap / state.totalLaps) * 100 : 0;
  const isLive = liveWeather?.isLive ?? false;

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="glass-strong rounded-xl px-4 py-2 flex items-center justify-between gap-4 relative overflow-hidden"
    >
      {/* Lap progress bar background */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full bg-surface-700">
        <motion.div
          className="h-full bg-gradient-to-r from-neon-purple via-neon-green to-neon-purple"
          style={{ boxShadow: '0 0 10px rgba(0,255,136,0.3), 0 0 20px rgba(168,85,247,0.2)' }}
          initial={{ width: 0 }}
          animate={{ width: `${lapProgress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Left: Logo + Race Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-green flex items-center justify-center animate-float-glow">
            <Zap className="w-5 h-5 text-surface-900" />
          </div>
          <div>
            <h1 className="font-heading text-sm font-bold tracking-wider text-white glow-text-purple">
              RACEMIND AI
              {liveMode && (
                <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-neon-red/20 text-neon-red border border-neon-red/30 animate-neon-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-red animate-pulse" />
                  LIVE
                </span>
              )}
            </h1>
            <p className="text-[9px] text-slate-500 font-mono">{state.trackName}</p>
          </div>
        </div>

        <div className="w-px h-8 bg-surface-500" />

        <StatusBadge status={state.raceStatus} />
      </div>

      {/* Center: Key Metrics */}
      <div className="flex items-center gap-1 divide-x divide-surface-500">
        <DataCell
          icon={<Flag className="w-3.5 h-3.5" />}
          label="Lap"
          value={`${state.currentLap}/${state.totalLaps}`}
          color="text-neon-green"
          live={state.raceStatus === 'racing'}
        />
        <DataCell
          icon={<Trophy className="w-3.5 h-3.5" />}
          label="Position"
          value={`P${state.position}`}
          color={state.position <= 3 ? 'text-neon-green' : 'text-slate-200'}
          live={state.raceStatus === 'racing'}
        />
        <DataCell
          icon={<Timer className="w-3.5 h-3.5" />}
          label="Gap Ahead"
          value={`+${state.gapAhead.toFixed(1)}s`}
          color="text-neon-yellow"
          live={state.raceStatus === 'racing'}
        />
        <DataCell
          icon={<Timer className="w-3.5 h-3.5" />}
          label="Gap Behind"
          value={`-${state.gapBehind.toFixed(1)}s`}
          color="text-neon-red"
          live={state.raceStatus === 'racing'}
        />
        <DataCell
          icon={<Fuel className="w-3.5 h-3.5" />}
          label="Fuel"
          value={`${state.fuelRemaining.toFixed(0)}kg`}
          color={state.fuelRemaining < 20 ? 'text-neon-red' : 'text-slate-200'}
          live={state.raceStatus === 'racing'}
        />
        <DataCell
          icon={<Gauge className="w-3.5 h-3.5" />}
          label="ERS"
          value={`${Math.round(state.ersDeployment)}%`}
          color="text-neon-blue"
          live={state.raceStatus === 'racing'}
        />
      </div>

      {/* Right: Weather + Live Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700/50">
          <WeatherIcon weather={state.weather} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-heading">Weather</span>
              {/* Live/Sim Badge */}
              <motion.span
                animate={isLive ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-heading font-bold tracking-wider ${
                  weatherLoading
                    ? 'bg-neon-yellow/15 text-neon-yellow border border-neon-yellow/20'
                    : isLive
                    ? 'bg-neon-green/15 text-neon-green border border-neon-green/20'
                    : 'bg-neon-purple/15 text-neon-purple border border-neon-purple/20'
                }`}
              >
                {weatherLoading ? (
                  <><span className="w-1 h-1 rounded-full bg-neon-yellow animate-ping" /> FETCHING</>
                ) : isLive ? (
                  <><Wifi className="w-2 h-2" /> LIVE</>
                ) : (
                  <><WifiOff className="w-2 h-2" /> SIM</>
                )}
              </motion.span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-300">
                {state.airTemp}°C Air / {state.trackTemp}°C Track
              </span>
              <span className="text-[10px] font-mono text-neon-blue">
                {state.rainChance}% rain
              </span>
            </div>
            {/* Extra detail row when live weather available */}
            {liveWeather && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5 text-[8px] font-mono text-slate-500">
                  <Wind className="w-2 h-2" /> {liveWeather.windSpeed.toFixed(1)}m/s
                </span>
                <span className="flex items-center gap-0.5 text-[8px] font-mono text-slate-500">
                  <Droplets className="w-2 h-2" /> {liveWeather.humidity}%
                </span>
                <span className="text-[8px] font-mono text-slate-600">
                  Grip: {(liveWeather.gripFactor * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
