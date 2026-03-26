import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { LapData, RaceState } from '../data';
import { formatLapTime, TIRE_COLORS } from '../data';
import { BarChart3, TrendingDown, Clock, Activity } from 'lucide-react';

interface CenterPanelProps {
  lapData: LapData[];
  state: RaceState;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 border border-neon-purple/20 text-xs">
      <p className="font-heading text-neon-purple text-[10px] mb-1">LAP {label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-mono font-bold" style={{ color: entry.color }}>
            {entry.name === 'Lap Time' ? formatLapTime(entry.value) : `${entry.value}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectorDisplay({ lapData, state }: { lapData: LapData[]; state: RaceState }) {
  const lastLap = lapData[lapData.length - 1];
  if (!lastLap) return null;

  const sectors = [
    { label: 'S1', value: lastLap.sector1, best: false },
    { label: 'S2', value: lastLap.sector2, best: false },
    { label: 'S3', value: lastLap.sector3, best: false },
  ];

  // Find personal bests for each sector
  const bestS1 = Math.min(...lapData.map(l => l.sector1));
  const bestS2 = Math.min(...lapData.map(l => l.sector2));
  const bestS3 = Math.min(...lapData.map(l => l.sector3));
  sectors[0].best = lastLap.sector1 <= bestS1 + 0.05;
  sectors[1].best = lastLap.sector2 <= bestS2 + 0.05;
  sectors[2].best = lastLap.sector3 <= bestS3 + 0.05;

  return (
    <div className="flex gap-2">
      {sectors.map((sector, idx) => (
        <motion.div
          key={sector.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`flex-1 p-2 rounded-lg text-center border ${
            sector.best
              ? 'bg-neon-purple/10 border-neon-purple/30'
              : 'bg-surface-700/40 border-surface-500/30'
          }`}
        >
          <p className="text-[9px] font-heading text-slate-500 uppercase">{sector.label}</p>
          <p className={`text-sm font-mono font-bold ${sector.best ? 'text-neon-purple' : 'text-slate-300'}`}>
            {sector.value.toFixed(3)}
          </p>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex-1 p-2 rounded-lg text-center bg-surface-700/40 border border-surface-500/30"
      >
        <p className="text-[9px] font-heading text-slate-500 uppercase">Total</p>
        <p className="text-sm font-mono font-bold text-neon-green">
          {formatLapTime(lastLap.time)}
        </p>
      </motion.div>
    </div>
  );
}

export default function CenterPanel({ lapData, state }: CenterPanelProps) {
  const avgLapTime = useMemo(() => {
    if (lapData.length === 0) return 0;
    return lapData.reduce((sum, l) => sum + l.time, 0) / lapData.length;
  }, [lapData]);

  return (
    <motion.section
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      className="flex flex-col gap-4 h-full"
    >
      {/* Sector Times */}
      {lapData.length > 0 && <SectorDisplay lapData={lapData} state={state} />}

      {/* Lap Time Chart */}
      <div className="glass-card rounded-xl p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neon-green" />
            <h2 className="font-heading text-xs font-bold tracking-wider text-slate-300 uppercase">
              Lap Times
            </h2>
          </div>
          {lapData.length > 0 && (
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-slate-500">
                AVG: <span className="text-slate-300">{formatLapTime(avgLapTime)}</span>
              </span>
              <span className="text-slate-500">
                FAST: <span className="text-neon-purple">{formatLapTime(state.fastestLap)}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0">
          {lapData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lapData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.08)" />
                <XAxis
                  dataKey="lap"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: 'rgba(168,85,247,0.15)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: 'rgba(168,85,247,0.15)' }}
                  tickLine={false}
                  tickFormatter={(v: number) => formatLapTime(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={state.fastestLap}
                  stroke="#a855f7"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="time"
                  name="Lap Time"
                  stroke="#00ff88"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: '#00ff88',
                    stroke: '#00ff88',
                    strokeWidth: 2,
                    filter: 'drop-shadow(0 0 6px rgba(0,255,136,0.5))',
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Activity className="w-8 h-8 text-surface-500 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-heading">Waiting for race data...</p>
                <p className="text-[10px] text-slate-600 mt-1">Start the race to see lap time telemetry</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tire Wear Chart */}
      <div className="glass-card rounded-xl p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-neon-red" />
            <h2 className="font-heading text-xs font-bold tracking-wider text-slate-300 uppercase">
              Tire Degradation
            </h2>
          </div>
          {lapData.length > 0 && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border-2"
                style={{ borderColor: TIRE_COLORS[state.currentTire] }}
              />
              <span
                className="text-[10px] font-heading font-bold uppercase tracking-wider"
                style={{ color: TIRE_COLORS[state.currentTire] }}
              >
                {state.currentTire}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0">
          {lapData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lapData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tireWearGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff3366" stopOpacity={0.3} />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#00ff88" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.08)" />
                <XAxis
                  dataKey="lap"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: 'rgba(168,85,247,0.15)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: 'rgba(168,85,247,0.15)' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={30} stroke="#ff3366" strokeDasharray="5 5" strokeOpacity={0.4} />
                <ReferenceLine y={50} stroke="#fbbf24" strokeDasharray="5 5" strokeOpacity={0.2} />
                <Area
                  type="monotone"
                  dataKey="tireWear"
                  name="Tire Wear"
                  stroke="#ff3366"
                  strokeWidth={2}
                  fill="url(#tireWearGradient)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: '#ff3366',
                    stroke: '#ff3366',
                    strokeWidth: 2,
                    filter: 'drop-shadow(0 0 6px rgba(255,51,102,0.5))',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 text-surface-500 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-heading">No tire data yet...</p>
                <p className="text-[10px] text-slate-600 mt-1">Tire degradation will be tracked during the race</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
