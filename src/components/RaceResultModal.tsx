import { useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import type { RaceState, LapData } from '../data';
import { formatLapTime, TIRE_COLORS } from '../data';
import {
  Trophy, Flag, Timer, Fuel, CircleDot, TrendingUp,
  Zap, X, Brain, BarChart3, Target, Download, Loader2
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
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = useCallback(async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      // Make the hidden card visible momentarily for capture
      const el = reportRef.current;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      el.style.top = '0';
      el.style.display = 'flex';

      const canvas = await html2canvas(el, {
        backgroundColor: '#0a0a0f',
        scale: 2,
        width: 800,
        height: 450,
        logging: false,
      });

      el.style.display = 'none';

      const link = document.createElement('a');
      link.download = `racemind-${state.trackName.replace(/\s+/g, '-').toLowerCase()}-P${state.position}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[Report] Failed to generate:', err);
    } finally {
      setDownloading(false);
    }
  }, [state]);

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

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                className="flex gap-3"
              >
                <button
                  onClick={handleDownloadReport}
                  disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-700/60 border border-neon-purple/25 text-neon-purple font-heading text-sm font-bold tracking-wider uppercase hover:bg-neon-purple/10 transition-colors disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloading ? 'Generating...' : 'Download Report'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-green text-surface-900 font-heading text-sm font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(0,255,136,0.15)] hover:shadow-[0_0_30px_rgba(0,255,136,0.25)] transition-shadow"
                >
                  Back to Dashboard
                </button>
              </motion.div>
            </div>

            {/* Hidden Race Report Card for PNG export */}
            <div
              ref={reportRef}
              style={{
                display: 'none',
                width: 800,
                height: 450,
                background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
                color: '#e2e8f0',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                flexDirection: 'column',
                padding: 32,
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background glow */}
              <div style={{
                position: 'absolute', top: -60, right: -60, width: 200, height: 200,
                background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent)',
                borderRadius: '50%',
              }} />
              <div style={{
                position: 'absolute', bottom: -60, left: -60, width: 200, height: 200,
                background: 'radial-gradient(circle, rgba(0,255,136,0.1), transparent)',
                borderRadius: '50%',
              }} />

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, color: '#fff' }}>
                    RACEMIND AI — RACE REPORT
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    {state.trackName} • {lapData.length} Laps • {state.driverName}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>
                    {grade}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>GRADE</div>
                </div>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'POSITION', value: `P${endPos}`, sub: posGained > 0 ? `↑${posGained}` : posGained < 0 ? `↓${Math.abs(posGained)}` : '—', color: endPos <= 3 ? '#00ff88' : '#e2e8f0' },
                  { label: 'FASTEST LAP', value: formatLapTime(fastestLap), sub: `Lap ${fastestLapNum}`, color: '#a855f7' },
                  { label: 'TOTAL TIME', value: formatLapTime(totalTime), sub: `${lapData.length} laps`, color: '#00d4ff' },
                  { label: 'PIT STOPS', value: String(state.pitStops), sub: state.pitStops === 1 ? 'One-stop' : state.pitStops === 2 ? 'Two-stop' : 'No stop', color: '#fbbf24' },
                ].map((stat, i) => (
                  <div key={i} style={{
                    flex: 1, padding: '12px 16px', borderRadius: 12,
                    background: 'rgba(30,30,45,0.7)', border: '1px solid rgba(100,100,120,0.2)',
                  }}>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: 'monospace' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Lap Time Sparkline */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
                  LAP TIME PROGRESSION
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  {lapData.map((ld, i) => {
                    const minT = Math.min(...lapData.map(l => l.time));
                    const maxT = Math.max(...lapData.map(l => l.time));
                    const range = maxT - minT || 1;
                    const heightPct = 20 + ((ld.time - minT) / range) * 80;
                    const isFL = ld.time === fastestLap;
                    return (
                      <div key={i} style={{
                        flex: 1,
                        height: `${heightPct}%`,
                        borderRadius: '3px 3px 0 0',
                        background: isFL
                          ? '#a855f7'
                          : `rgba(0,255,136,${0.2 + (1 - (ld.time - minT) / range) * 0.4})`,
                        minWidth: 2,
                      }} />
                    );
                  })}
                </div>
              </div>

              {/* Footer watermark */}
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: '#334155', letterSpacing: 1 }}>
                  Avg: {formatLapTime(avgLapTime)} • Consistency: ±{(consistency / 2).toFixed(2)}s • Score: {decisionScore}/100
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: 2 }}>
                  racemind.app
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
