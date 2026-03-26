import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StrategyResult, RaceState } from '../data';
import { TIRE_COLORS, formatLapTime } from '../data';
import {
  Trophy, Flag, Timer, TrendingUp
} from 'lucide-react';

interface StrategyPanelProps {
  strategies: StrategyResult[];
  state: RaceState;
}

function DeltaBadge({ delta, isBest }: { delta: number; isBest: boolean }) {
  if (isBest) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-neon-green/15 text-neon-green border border-neon-green/20">
        <Trophy className="w-2.5 h-2.5" />
        OPTIMAL
      </span>
    );
  }
  const color = delta < 5 ? 'text-neon-yellow' : delta < 15 ? 'text-neon-orange' : 'text-neon-red';
  const bg = delta < 5 ? 'bg-neon-yellow/10 border-neon-yellow/15' : delta < 15 ? 'bg-neon-orange/10 border-neon-orange/15' : 'bg-neon-red/10 border-neon-red/15';
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${bg} ${color}`}>
      +{delta.toFixed(1)}s
    </span>
  );
}

function TireChip({ compound, size = 'sm' }: { compound: string; size?: 'sm' | 'md' }) {
  const letter = compound[0].toUpperCase();
  const dim = size === 'md' ? 'w-6 h-6 text-[9px] border-2' : 'w-4 h-4 text-[7px] border-[1.5px]';
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-heading font-black`}
      style={{
        borderColor: TIRE_COLORS[compound] ?? '#94a3b8',
        color: TIRE_COLORS[compound] ?? '#94a3b8',
        boxShadow: `0 0 6px ${(TIRE_COLORS[compound] ?? '#94a3b8')}30`,
      }}
    >
      {letter}
    </div>
  );
}

function StrategyRow({ strat, rank, isExpanded, onToggle }: {
  strat: StrategyResult;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: rank * 0.04 }}
      className={`rounded-xl border transition-all duration-200 cursor-pointer ${
        strat.isBest
          ? 'bg-neon-green/5 border-neon-green/25 shadow-[0_0_12px_rgba(0,255,136,0.06)]'
          : 'glass-card hover:border-neon-purple/25'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 p-2.5">
        {/* Rank */}
        <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-heading font-bold ${
          rank === 0 ? 'bg-neon-green/15 text-neon-green' : 'bg-surface-700/60 text-slate-500'
        }`}>
          {rank + 1}
        </div>

        {/* Tire transition */}
        <div className="flex items-center gap-1">
          <TireChip compound={strat.tiresBefore} />
          <span className="text-[8px] text-slate-600">→</span>
          <TireChip compound={strat.tiresAfter} />
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-heading font-bold tracking-wider truncate ${
            strat.isBest ? 'text-neon-green' : 'text-slate-300'
          }`}>
            {strat.label}
          </p>
          {strat.pitLap > 0 && (
            <p className="text-[8px] text-slate-600 font-mono">Lap {strat.pitLap}</p>
          )}
        </div>

        {/* Delta */}
        <DeltaBadge delta={strat.delta} isBest={strat.isBest} />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-2.5 pb-2.5"
          >
            <div className="h-px bg-surface-500/30 mb-2" />
            <div className="grid grid-cols-3 gap-2">
              <div className="p-1.5 rounded-lg bg-surface-700/30 text-center">
                <p className="text-[7px] text-slate-600 font-heading uppercase">Total Time</p>
                <p className="text-[10px] font-mono font-bold text-slate-300">
                  {formatLapTime(strat.totalTime)}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-surface-700/30 text-center">
                <p className="text-[7px] text-slate-600 font-heading uppercase">Pit Lap</p>
                <p className="text-[10px] font-mono font-bold text-slate-300">
                  {strat.pitLap > 0 ? `L${strat.pitLap}` : 'None'}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-surface-700/30 text-center">
                <p className="text-[7px] text-slate-600 font-heading uppercase">Delta</p>
                <p className={`text-[10px] font-mono font-bold ${strat.isBest ? 'text-neon-green' : 'text-neon-red'}`}>
                  {strat.isBest ? '—' : `+${strat.delta.toFixed(3)}s`}
                </p>
              </div>
            </div>

            {/* Mini sparkline */}
            <div className="mt-2 flex items-end gap-[1px] h-6">
              {strat.lapTimes.map((lt, i) => {
                const minLt = Math.min(...strat.lapTimes);
                const maxLt = Math.max(...strat.lapTimes);
                const range = maxLt - minLt || 1;
                const heightPct = 20 + ((lt - minLt) / range) * 80;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: `${TIRE_COLORS[strat.tiresAfter] ?? '#a855f7'}30`,
                    }}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function StrategyPanel({ strategies, state }: StrategyPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topStrategies = useMemo(() => strategies.slice(0, 6), [strategies]);
  const best = topStrategies[0];

  if (topStrategies.length === 0) {
    return (
      <div className="p-3 rounded-xl glass-card">
        <div className="flex items-center gap-2 mb-2">
          <Flag className="w-3.5 h-3.5 text-neon-purple" />
          <h3 className="font-heading text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            Strategy Engine
          </h3>
        </div>
        <div className="text-center py-3">
          <Timer className="w-6 h-6 text-surface-500 mx-auto mb-1" />
          <p className="text-[10px] text-slate-600 font-heading">Calculating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Best strategy highlight */}
      {best && (
        <motion.div
          key={best.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 rounded-xl bg-neon-green/5 border border-neon-green/20 shadow-[0_0_15px_rgba(0,255,136,0.06)]"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Trophy className="w-3.5 h-3.5 text-neon-green" />
            <h3 className="font-heading text-[10px] font-bold tracking-wider text-neon-green uppercase">
              Best Strategy
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <TireChip compound={best.tiresBefore} size="md" />
            <span className="text-[10px] text-slate-500">→</span>
            <TireChip compound={best.tiresAfter} size="md" />
            <div className="flex-1 ml-1">
              <p className="text-[11px] font-heading font-bold text-white tracking-wider">
                {best.label}
              </p>
              <p className="text-[9px] font-mono text-slate-400">
                {formatLapTime(best.totalTime)} remaining
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Strategy comparison list */}
      {topStrategies.length > 1 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-3 h-3 text-neon-purple" />
            <h3 className="font-heading text-[9px] font-bold tracking-wider text-slate-500 uppercase">
              Alternatives
            </h3>
          </div>
          {topStrategies.slice(1).map((strat, idx) => (
            <StrategyRow
              key={strat.id}
              strat={strat}
              rank={idx + 1}
              isExpanded={expandedId === strat.id}
              onToggle={() => setExpandedId(expandedId === strat.id ? null : strat.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
