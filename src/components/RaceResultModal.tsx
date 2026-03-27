import { motion, AnimatePresence } from 'framer-motion';
import type { RaceState, LapData } from '../data';
import { formatLapTime } from '../data';
import {
  Trophy, Flag, Timer, Fuel, CircleDot, TrendingUp,
  Zap, X, Brain, BarChart3, Target
} from 'lucide-react';

interface RaceResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: RaceState;
  lapData: LapData[];
}

function StatCard({ icon, label, value, color, subtext }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subtext?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-xl border border-surface-500/30 bg-surface-700/30"
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[9px] font-heading uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <p className="text-lg font-mono font-bold" style={{ color }}>{value}</p>
      {subtext && <p className="text-[9px] text-slate-600 font-mono mt-0.5">{subtext}</p>}
    </motion.div>
  );
}

export default function RaceResultModal({ isOpen, onClose, state, lapData }: RaceResultModalProps) {
  if (!isOpen || lapData.length === 0) return null;

  const totalTime = lapData.reduce((sum, l) => sum + l.time, 0);
  const fastestLap = Math.min(...lapData.map(l => l.time));
  const slowestLap = Math.max(...lapData.map(l => l.time));
  const avgLapTime = totalTime / lapData.length;
  const consistency = slowestLap - fastestLap;

  // Find fastest lap number
  const fastestLapNum = lapData.find(l => l.time === fastestLap)?.lap || 0;

  // Position changes
  const startPos = lapData[0]?.position || 3;
  const endPos = lapData[lapData.length - 1]?.position || state.position;
  const posGained = startPos - endPos;

  // AI Decision quality score (based on tire management + result)
  const avgWearRate = lapData.length > 1
    ? (lapData[0].tireWear - lapData[lapData.length - 1].tireWear) / lapData.length
    : 0;
  const decisionScore = Math.min(98, Math.round(
    50
    + (posGained > 0 ? posGained * 8 : posGained * 3) // reward position gains
    + (state.pitStops >= 1 && state.pitStops <= 2 ? 15 : -5) // optimal pit count
    + Math.max(0, 20 - consistency * 3) // reward consistency
    + (fastestLap < 75 ? 10 : 0) // bonus for fast laps
  ));

  // Grade
  const grade = decisionScore >= 90 ? 'S' : decisionScore >= 80 ? 'A' : decisionScore >= 65 ? 'B' : decisionScore >= 50 ? 'C' : 'D';
  const gradeColor = grade === 'S' ? '#00ff88' : grade === 'A' ? '#a855f7' : grade === 'B' ? '#fbbf24' : '#ff3366';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-surface-900/80 backdrop-blur-sm" onClick={onClose} />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative w-full max-w-2xl glass-card-glow rounded-2xl overflow-hidden"
          >
            {/* Background effects */}
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-neon-green/10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-neon-purple/10 rounded-full blur-[80px]" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-surface-700/50 text-slate-500 hover:text-white hover:bg-surface-600 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-6 space-y-5">
              {/* Header */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-green to-neon-purple mx-auto mb-3 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,136,0.3)]"
                >
                  <Flag className="w-8 h-8 text-surface-900" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-heading font-black text-white tracking-wider"
                >
                  RACE COMPLETE
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-slate-500 font-mono mt-1"
                >
                  {state.trackName} • {lapData.length} Laps • {state.driverName}
                </motion.p>
              </div>

              {/* Big Result: Position + Grade */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-8"
              >
                {/* Final Position */}
                <div className="text-center">
                  <p className="text-[10px] font-heading text-slate-500 uppercase tracking-wider mb-1">Final Position</p>
                  <div className="relative">
                    <span className={`text-5xl font-heading font-black ${endPos <= 3 ? 'text-neon-green glow-text-green' : 'text-slate-200'}`}>
                      P{endPos}
                    </span>
                    {posGained !== 0 && (
                      <span className={`absolute -top-1 -right-6 text-xs font-mono font-bold ${posGained > 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                        {posGained > 0 ? `↑${posGained}` : `↓${Math.abs(posGained)}`}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-600 font-mono mt-1">Started P{startPos}</p>
                </div>

                {/* Divider */}
                <div className="w-px h-20 bg-gradient-to-b from-transparent via-neon-purple/30 to-transparent" />

                {/* AI Decision Grade */}
                <div className="text-center">
                  <p className="text-[10px] font-heading text-slate-500 uppercase tracking-wider mb-1">Strategy Grade</p>
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
                    className="text-5xl font-heading font-black"
                    style={{ color: gradeColor, textShadow: `0 0 30px ${gradeColor}40` }}
                  >
                    {grade}
                  </motion.span>
                  <p className="text-[9px] text-slate-600 font-mono mt-1">Score: {decisionScore}/100</p>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-3 gap-3"
              >
                <StatCard
                  icon={<Timer className="w-3.5 h-3.5" />}
                  label="Total Time"
                  value={formatLapTime(totalTime)}
                  color="#00d4ff"
                />
                <StatCard
                  icon={<Zap className="w-3.5 h-3.5" />}
                  label="Fastest Lap"
                  value={formatLapTime(fastestLap)}
                  color="#a855f7"
                  subtext={`Lap ${fastestLapNum}`}
                />
                <StatCard
                  icon={<Timer className="w-3.5 h-3.5" />}
                  label="Average Lap"
                  value={formatLapTime(avgLapTime)}
                  color="#00ff88"
                />
                <StatCard
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  label="Consistency"
                  value={`±${(consistency / 2).toFixed(2)}s`}
                  color="#fbbf24"
                  subtext={consistency < 2 ? 'Excellent' : consistency < 4 ? 'Good' : 'Variable'}
                />
                <StatCard
                  icon={<CircleDot className="w-3.5 h-3.5" />}
                  label="Pit Stops"
                  value={String(state.pitStops)}
                  color="#a855f7"
                  subtext={state.pitStops === 1 ? 'One-stop' : state.pitStops === 2 ? 'Two-stop' : state.pitStops === 0 ? 'No stop' : 'Multi-stop'}
                />
                <StatCard
                  icon={<Fuel className="w-3.5 h-3.5" />}
                  label="Fuel Used"
                  value={`${(70 - state.fuelRemaining).toFixed(0)}kg`}
                  color="#ff3366"
                  subtext={`${state.fuelRemaining.toFixed(1)}kg remaining`}
                />
              </motion.div>

              {/* AI Impact Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="p-4 rounded-xl bg-gradient-to-r from-neon-purple/5 to-neon-green/5 border border-neon-purple/15"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-neon-purple" />
                  <span className="text-xs font-heading font-bold text-neon-purple uppercase tracking-wider">AI Strategy Impact</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {decisionScore >= 85
                    ? `Outstanding strategy execution. ${state.pitStops} pit stop${state.pitStops !== 1 ? 's' : ''} were optimally timed. Tire management was ${consistency < 2 ? 'exceptional' : 'strong'} with ${formatLapTime(consistency)} variance. ${posGained > 0 ? `Gained ${posGained} position${posGained > 1 ? 's' : ''} through strategic decisions.` : 'Maintained competitive position throughout.'}`
                    : decisionScore >= 65
                    ? `Good strategy with room for improvement. ${posGained > 0 ? `Net gain of ${posGained} position${posGained > 1 ? 's' : ''}.` : posGained < 0 ? `Lost ${Math.abs(posGained)} position${Math.abs(posGained) > 1 ? 's' : ''} — consider earlier pit windows.` : 'Position held steady.'} Lap time consistency: ${consistency < 3 ? 'competitive' : 'could improve with better tire management'}.`
                    : `Strategy needs refinement. ${posGained < 0 ? `Lost ${Math.abs(posGained)} positions — ` : ''}Consider optimizing pit stop timing and tire compound selection. AI recommends reviewing the What-If simulator for alternative approaches.`
                  }
                </p>
              </motion.div>

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-green text-surface-900 font-heading text-sm font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(0,255,136,0.15)]"
              >
                Back to Dashboard
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
