import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { RaceState, WhatIfResult } from '../data';
import { simulateWhatIf, formatLapTime, TIRE_COLORS } from '../data';
import {
  X, FlaskConical, ArrowDown, ArrowUp, Minus,
  Timer, TrendingDown, TrendingUp, CircleDot
} from 'lucide-react';

interface WhatIfModalProps {
  state: RaceState;
  isOpen: boolean;
  onClose: () => void;
}

const compounds = [
  { value: 'soft', label: 'Soft', short: 'S' },
  { value: 'medium', label: 'Medium', short: 'M' },
  { value: 'hard', label: 'Hard', short: 'H' },
];

function TireChip({ compound, active, onClick }: {
  compound: string;
  active: boolean;
  onClick: () => void;
}) {
  const color = TIRE_COLORS[compound] ?? '#94a3b8';
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border-2 font-heading text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
        active
          ? 'shadow-[0_0_15px_var(--glow)]'
          : 'opacity-50 hover:opacity-80'
      }`}
      style={{
        borderColor: active ? color : 'rgba(100,100,120,0.3)',
        backgroundColor: active ? `${color}15` : 'transparent',
        color: active ? color : '#94a3b8',
        ['--glow' as string]: `${color}40`,
      }}
    >
      {compound}
    </button>
  );
}

function StatCard({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub?: string;
  accent: 'green' | 'red' | 'blue' | 'purple';
}) {
  const accents = {
    green: 'border-neon-green/20 text-neon-green',
    red: 'border-neon-red/20 text-neon-red',
    blue: 'border-neon-blue/20 text-neon-blue',
    purple: 'border-neon-purple/20 text-neon-purple',
  };
  return (
    <div className={`p-3 rounded-xl bg-surface-700/40 border ${accents[accent].split(' ')[0]}`}>
      <p className="text-[9px] font-heading text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-mono font-bold ${accents[accent].split(' ')[1]}`}>{value}</p>
      {sub && <p className="text-[9px] font-mono text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800/95 border border-surface-500/50 rounded-lg p-3 shadow-xl backdrop-blur-sm">
      <p className="text-[10px] font-heading text-slate-400 mb-1.5">Lap {label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[10px] text-slate-300 font-heading">{entry.name}:</span>
          <span className="text-[10px] font-mono font-bold" style={{ color: entry.color }}>
            {formatLapTime(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function WhatIfModal({ state, isOpen, onClose }: WhatIfModalProps) {
  const minPitLap = state.currentLap + 1;
  const maxPitLap = Math.max(minPitLap, state.totalLaps - 2);

  const [pitLap, setPitLap] = useState(Math.min(minPitLap + 5, maxPitLap));
  const [compound, setCompound] = useState('hard');

  // Recompute whenever inputs change
  const result: WhatIfResult = useMemo(
    () => simulateWhatIf(state, pitLap, compound),
    [state, pitLap, compound],
  );

  const handlePitLapChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPitLap(parseInt(e.target.value, 10));
  }, []);

  // Determine chart Y-axis range
  const allTimes = result.laps.flatMap(l => [l.current, l.whatIf]);
  const yMin = allTimes.length > 0 ? Math.floor(Math.min(...allTimes) * 10) / 10 - 0.2 : 74;
  const yMax = allTimes.length > 0 ? Math.ceil(Math.max(...allTimes) * 10) / 10 + 0.2 : 80;

  const deltaAbs = Math.abs(result.delta);
  const deltaSign = result.whatIfFaster ? '−' : '+';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-surface-800/95 border border-surface-500/40 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
          >
            {/* Glow effects */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-neon-purple/8 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-neon-blue/8 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between p-5 border-b border-surface-500/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple/30 to-neon-blue/30 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-neon-purple" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-wider text-white uppercase">
                    What-If Simulator
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Lap {state.currentLap}/{state.totalLaps} — {state.currentTire.toUpperCase()} — {state.tireWear.toFixed(0)}% wear
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-surface-700/60 border border-surface-500/30 flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="relative p-5">
              <div className="flex gap-5">
                {/* Left Controls */}
                <div className="w-56 flex-shrink-0 space-y-5">
                  {/* Pit Lap Selector */}
                  <div>
                    <label className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-heading text-slate-400 uppercase tracking-wider">
                        Pit on Lap
                      </span>
                      <span className="text-sm font-mono font-bold text-neon-purple">
                        {pitLap}
                      </span>
                    </label>
                    <input
                      type="range"
                      min={minPitLap}
                      max={maxPitLap}
                      step={1}
                      value={pitLap}
                      onChange={handlePitLapChange}
                      className="neon-slider neon-slider-purple w-full"
                      style={{
                        '--slider-fill': `${((pitLap - minPitLap) / (maxPitLap - minPitLap || 1)) * 100}%`,
                      } as React.CSSProperties}
                    />
                    <div className="flex justify-between text-[8px] font-mono text-slate-600 mt-1">
                      <span>L{minPitLap}</span>
                      <span>L{maxPitLap}</span>
                    </div>
                  </div>

                  {/* Compound Selector */}
                  <div>
                    <label className="block text-[10px] font-heading text-slate-400 uppercase tracking-wider mb-2">
                      Switch to Compound
                    </label>
                    <div className="flex gap-2">
                      {compounds.map(c => (
                        <TireChip
                          key={c.value}
                          compound={c.value}
                          active={compound === c.value}
                          onClick={() => setCompound(c.value)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Result summary */}
                  <div className="h-px bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent" />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="w-3.5 h-3.5 text-neon-blue" />
                      <span className="text-[10px] font-heading text-slate-400 uppercase tracking-wider">
                        Simulation Results
                      </span>
                    </div>

                    {/* Delta hero */}
                    <div className={`p-4 rounded-xl border text-center ${
                      result.whatIfFaster
                        ? 'bg-neon-green/5 border-neon-green/25'
                        : result.delta === 0
                          ? 'bg-surface-700/40 border-surface-500/30'
                          : 'bg-neon-red/5 border-neon-red/25'
                    }`}>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {result.whatIfFaster ? (
                          <TrendingDown className="w-4 h-4 text-neon-green" />
                        ) : result.delta === 0 ? (
                          <Minus className="w-4 h-4 text-slate-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-neon-red" />
                        )}
                        <span className={`text-2xl font-mono font-black ${
                          result.whatIfFaster ? 'text-neon-green' : result.delta === 0 ? 'text-slate-400' : 'text-neon-red'
                        }`}>
                          {deltaSign}{deltaAbs.toFixed(1)}s
                        </span>
                      </div>
                      <p className="text-[9px] font-heading text-slate-500 uppercase tracking-wider">
                        {result.whatIfFaster ? 'What-if is faster' : result.delta === 0 ? 'Same time' : 'What-if is slower'}
                      </p>
                    </div>

                    {/* Time totals */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-surface-700/30 text-center">
                        <p className="text-[7px] font-heading text-slate-600 uppercase">Current</p>
                        <p className="text-[11px] font-mono font-bold text-neon-blue">
                          {formatLapTime(result.currentTotal)}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-700/30 text-center">
                        <p className="text-[7px] font-heading text-slate-600 uppercase">What-If</p>
                        <p className="text-[11px] font-mono font-bold text-neon-purple">
                          {formatLapTime(result.whatIfTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Comparison Chart */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-heading text-xs font-bold text-slate-300 tracking-wider uppercase">
                      Lap Time Comparison
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded bg-neon-blue" />
                        <span className="text-[9px] text-slate-500 font-heading">Current ({state.currentTire})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded bg-neon-purple" />
                        <span className="text-[9px] text-slate-500 font-heading">What-If ({compound})</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={result.laps}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(100,100,120,0.12)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="lap"
                          tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}
                          axisLine={{ stroke: 'rgba(100,100,120,0.2)' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[yMin, yMax]}
                          tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => `:${(v % 60).toFixed(1)}`}
                          width={38}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {/* Pit lap indicator */}
                        <ReferenceLine
                          x={pitLap}
                          stroke="#a855f770"
                          strokeDasharray="6 3"
                          strokeWidth={2}
                          label={{
                            value: `PIT L${pitLap}`,
                            position: 'top',
                            fill: '#a855f7',
                            fontSize: 9,
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="current"
                          name="Current"
                          stroke="#00d4ff"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3, fill: '#00d4ff', stroke: '#00d4ff40', strokeWidth: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="whatIf"
                          name="What-If"
                          stroke="#a855f7"
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          dot={false}
                          activeDot={{ r: 3, fill: '#a855f7', stroke: '#a855f740', strokeWidth: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Scenario description */}
                  <div className="mt-3 p-3 rounded-xl bg-surface-700/30 border border-surface-500/20">
                    <div className="flex items-center gap-2">
                      <CircleDot className="w-3 h-3 text-neon-purple flex-shrink-0" />
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        <span className="text-neon-blue font-bold">Current:</span> Stay out on{' '}
                        <span style={{ color: TIRE_COLORS[state.currentTire] }}>{state.currentTire}s</span>{' '}
                        ({state.tireWear.toFixed(0)}% remaining) for {state.totalLaps - state.currentLap} laps.
                        {' '}
                        <span className="text-neon-purple font-bold">What-If:</span> Pit on L{pitLap}, switch to{' '}
                        <span style={{ color: TIRE_COLORS[compound] }}>{compound}s</span>{' '}
                        (+22s pit loss, fresh rubber for {state.totalLaps - pitLap} laps).
                        {' '}
                        <span className={result.whatIfFaster ? 'text-neon-green font-bold' : 'text-neon-red font-bold'}>
                          Net: {result.whatIfFaster ? 'saves' : 'costs'} {deltaAbs.toFixed(1)}s
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
