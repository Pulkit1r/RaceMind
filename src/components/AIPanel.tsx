import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIRecommendation, StrategyResult, RaceState } from '../data';
import type { StrategyAdjustment } from '../raceMemory';
import { isFittedModelActive } from '../physics';
import StrategyPanel from './StrategyPanel';
import {
  Brain, AlertTriangle, TrendingUp, Fuel, CloudRain,
  Target, Shield, Zap, Loader2, ChevronDown, ChevronUp, SkullIcon,
  HelpCircle, Dna, Satellite
} from 'lucide-react';

interface AIPanelProps {
  recommendations: AIRecommendation[];
  strategies: StrategyResult[];
  state: RaceState;
  trackAdjustment?: StrategyAdjustment;
  ergastSeededCount?: number;
}

const typeConfig: Record<string, { icon: React.ReactNode; accentClass: string }> = {
  pit: { icon: <AlertTriangle className="w-4 h-4" />, accentClass: 'neon-red' },
  tire: { icon: <Target className="w-4 h-4" />, accentClass: 'neon-yellow' },
  pace: { icon: <TrendingUp className="w-4 h-4" />, accentClass: 'neon-green' },
  fuel: { icon: <Fuel className="w-4 h-4" />, accentClass: 'neon-orange' },
  weather: { icon: <CloudRain className="w-4 h-4" />, accentClass: 'neon-blue' },
  overtake: { icon: <Zap className="w-4 h-4" />, accentClass: 'neon-purple' },
};

const riskColors = {
  low: { bg: 'bg-neon-green/10', text: 'text-neon-green', border: 'border-neon-green/20' },
  medium: { bg: 'bg-neon-yellow/10', text: 'text-neon-yellow', border: 'border-neon-yellow/20' },
  high: { bg: 'bg-neon-red/10', text: 'text-neon-red', border: 'border-neon-red/20' },
};

// Generate "Why this decision?" explanation based on recommendation type
function generateWhyExplanation(rec: AIRecommendation, state: RaceState): string {
  const wearPct = Math.round(state.tireWear);
  const lapsLeft = state.totalLaps - state.currentLap;

  switch (rec.type) {
    case 'pit':
      if (rec.title.includes('BOX')) {
        return `Tire wear is at ${wearPct}% with ${lapsLeft} laps remaining. At current degradation rate, tires will fall off the performance cliff within ${Math.max(1, Math.floor(wearPct / 4))} laps. Pitting now for fresh tires saves approximately ${(2 + Math.random() * 4).toFixed(1)}s over the remaining stint compared to staying out. The pit stop time loss (${(22 + Math.random() * 3).toFixed(1)}s) is offset by ${(0.5 + Math.random() * 0.8).toFixed(1)}s/lap faster pace on fresh rubber.`;
      }
      return `Current stint can be extended ${Math.floor(wearPct / 3)} more laps before the tire cliff. Staying out avoids the ${(22 + Math.random() * 3).toFixed(1)}s pit stop loss. Track position is more valuable than fresh tires at this stage. Gap behind is ${state.gapBehind.toFixed(1)}s — pitting would drop you behind.`;

    case 'tire':
      return `${state.currentTire.toUpperCase()} compound currently at ${wearPct}% life. Degradation rate: ${(3.5 - wearPct * 0.02).toFixed(2)}%/lap. Tire temperature is ${Math.round(state.trackTemp + 30)}°C (optimal range: 80-100°C). Surface grip coefficient estimated at ${(0.6 + wearPct * 0.004).toFixed(3)}. ${wearPct < 40 ? 'WARNING: Approaching non-linear degradation zone where lap times increase exponentially.' : 'Tires performing within acceptable parameters.'}`;

    case 'fuel':
      return `Fuel remaining: ${state.fuelRemaining.toFixed(1)}kg of 70kg capacity. Consumption rate: 1.4kg/lap. Projected to finish with ${Math.max(0, state.fuelRemaining - lapsLeft * 1.4).toFixed(1)}kg. ${state.fuelRemaining < 20 ? 'CRITICAL: Switch to fuel-saving engine mode. Lift-and-coast through turns 3, 7, and 12 to save 0.3kg/lap.' : 'Fuel load within nominal range. Lighter car provides ~0.03s/lap advantage per kg burned.'}`;

    case 'weather':
      return `Rain probability: ${state.rainChance}%. Ambient temp: ${state.airTemp}°C, Track temp: ${Math.round(state.trackTemp)}°C. ${state.rainChance > 60 ? `Cloud density suggests rainfall within ${Math.floor(5 + Math.random() * 10)} minutes. Intermediate tires provide ${(2 + Math.random() * 3).toFixed(1)}s/lap advantage in wet conditions. Transition window: 2-3 laps after rain begins.` : 'Conditions stable. Dry compound optimal. Monitoring satellite data for changes.'}`;

    case 'overtake':
      return `Gap to car ahead: ${state.gapAhead.toFixed(1)}s. DRS ${state.drs ? 'ACTIVE — +12-15km/h advantage on main straight' : 'not available'}. ERS deployment: ${Math.round(state.ersDeployment)}%. ${state.gapAhead < 1.0 ? 'Within striking distance. Deploy full ERS through sector 3 for optimal overtake setup.' : `Need to close ${(state.gapAhead - 0.8).toFixed(1)}s to enter DRS range. Push through sector 2.`}`;

    case 'pace':
    default:
      return `Current pace: ${wearPct > 60 ? 'competitive' : wearPct > 30 ? 'manageable' : 'degraded'}. Tire state allows ${wearPct > 60 ? 'full push mode' : wearPct > 30 ? 'controlled aggression' : 'defensive driving only'}. Gap ahead: ${state.gapAhead.toFixed(1)}s, behind: ${state.gapBehind.toFixed(1)}s. ${state.gapBehind < 1.0 ? 'Pressure from behind — defend position through key corners.' : 'Clear air — focus on consistent lap times to protect the gap.'}`;
  }
}

// Generate "What if you ignore AI?" consequence
function generateIgnoreConsequence(rec: AIRecommendation, state: RaceState): string {
  if (rec.title.includes('BOX')) {
    const extraLoss = (3 + Math.random() * 5).toFixed(1);
    return `⚠️ If you ignore this: Tires will hit the performance cliff in ~${Math.max(1, Math.floor(state.tireWear / 4))} laps, losing ${extraLoss}s/lap. You'll likely lose ${Math.ceil(parseFloat(extraLoss) / 1.5)} positions and still need to pit — but later, with worse tire life and more time lost.`;
  }
  if (rec.title.includes('STAY OUT') || rec.title.includes('HOLD')) {
    return `⚠️ If you ignore this: An unnecessary pit stop costs ~23s. With ${state.totalLaps - state.currentLap} laps left, you won't recover that time. You'd drop ${Math.ceil(23 / state.gapBehind)} positions and finish outside the points.`;
  }
  if (rec.type === 'weather') {
    return `⚠️ If you ignore this: Staying on dry tires in wet conditions costs 4-8s/lap. Within 3 laps you'd lose ${Math.ceil(6 * 3 / state.gapBehind)} positions. Risk of aquaplaning in turns 3, 9, and 14 — potential DNF.`;
  }
  if (rec.type === 'fuel') {
    return `⚠️ If you ignore this: Continued full-power running risks running out of fuel before the finish. FIA regulations require 1.0kg minimum fuel sample — falling below means disqualification regardless of finishing position.`;
  }
  return `⚠️ If you ignore this: Current strategy becomes sub-optimal. Estimated time penalty: ${(1 + Math.random() * 4).toFixed(1)}s over remaining laps. Position risk: ${rec.risk === 'high' ? 'lose 2-3 positions' : rec.risk === 'medium' ? 'lose 1 position' : 'marginal impact'}.`;
}

function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(100,100,120,0.15)" strokeWidth="2.5" />
        <motion.circle
          cx="20" cy="20" r="18" fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-mono font-bold" style={{ color }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, index, state }: { rec: AIRecommendation; index: number; state: RaceState }) {
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[rec.type] || typeConfig.pace;
  const risk = riskColors[rec.risk];
  const accentColor = getComputedColor(config.accentClass);
  const isBoxBox = rec.title.includes('BOX');
  const isStayOut = rec.title.includes('STAY OUT') || rec.title.includes('HOLD');

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      layout
      className={`relative p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
        rec.urgent
          ? 'bg-neon-red/5 border-neon-red/30 animate-urgent-pulse'
          : isBoxBox
            ? 'bg-neon-yellow/5 border-neon-yellow/20 shadow-[0_0_20px_rgba(251,191,36,0.06)]'
            : isStayOut
              ? 'bg-neon-green/5 border-neon-green/20 shadow-[0_0_15px_rgba(0,255,136,0.04)]'
              : 'glass-card hover:border-neon-purple/30'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {rec.urgent && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-red opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-neon-red"></span>
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <ConfidenceRing value={rec.confidence} color={accentColor} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-${config.accentClass}`}>{config.icon}</span>
            <h3 className={`font-heading text-xs font-bold tracking-wider ${
              rec.urgent ? 'text-neon-red glow-text-red' :
              isBoxBox ? 'text-neon-yellow glow-text-red' :
              isStayOut ? 'text-neon-green glow-text-green' :
              'text-slate-200'
            }`}>
              {rec.title}
            </h3>
            <button className="ml-auto text-slate-600 hover:text-neon-purple transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
            {rec.description}
          </p>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[9px] font-heading font-bold uppercase tracking-wider border ${risk.bg} ${risk.text} ${risk.border}`}>
              {rec.risk} risk
            </span>
            <span className="text-[9px] text-slate-600 font-mono">
              {new Date(rec.timestamp).toLocaleTimeString()}
            </span>
            {!expanded && (
              <span className="ml-auto text-[8px] text-neon-purple/60 font-heading uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-2.5 h-2.5" /> Why?
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── "Why this decision?" Expandable Section ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-surface-500/30 space-y-2">
              {/* Why this decision */}
              <div className="p-2.5 rounded-lg bg-neon-purple/5 border border-neon-purple/15">
                <p className="text-[9px] font-heading text-neon-purple uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Why This Decision
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {generateWhyExplanation(rec, state)}
                </p>
              </div>

              {/* What if you ignore AI */}
              <div className="p-2.5 rounded-lg bg-neon-red/5 border border-neon-red/15">
                <p className="text-[9px] font-heading text-neon-red uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> If You Ignore This
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {generateIgnoreConsequence(rec, state)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ThinkingState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 rounded-xl glass-card shimmer-overlay"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-neon-purple animate-spin" />
        </div>
        <div>
          <p className="text-xs font-heading text-neon-purple font-bold tracking-wider">
            AI ANALYZING
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] text-slate-500 font-mono">Processing telemetry</span>
            <div className="flex gap-1 ml-1">
              <span className="thinking-dot w-1 h-1 rounded-full bg-neon-purple" />
              <span className="thinking-dot w-1 h-1 rounded-full bg-neon-purple" />
              <span className="thinking-dot w-1 h-1 rounded-full bg-neon-purple" />
            </div>
          </div>
        </div>
      </div>
      {/* Fake loading bars */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-slate-600 font-mono w-12">Tires</span>
          <div className="flex-1 h-1 rounded-full bg-surface-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-neon-green/50"
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ duration: 1.5, ease: 'easeOut', repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-slate-600 font-mono w-12">Strategy</span>
          <div className="flex-1 h-1 rounded-full bg-surface-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-neon-purple/50"
              initial={{ width: 0 }}
              animate={{ width: '60%' }}
              transition={{ duration: 1.8, ease: 'easeOut', delay: 0.3, repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-slate-600 font-mono w-12">Weather</span>
          <div className="flex-1 h-1 rounded-full bg-surface-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-neon-blue/50"
              initial={{ width: 0 }}
              animate={{ width: '45%' }}
              transition={{ duration: 2.0, ease: 'easeOut', delay: 0.6, repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getComputedColor(accentClass: string): string {
  const map: Record<string, string> = {
    'neon-green': '#00ff88',
    'neon-red': '#ff3366',
    'neon-purple': '#a855f7',
    'neon-blue': '#00d4ff',
    'neon-yellow': '#fbbf24',
    'neon-orange': '#f97316',
  };
  return map[accentClass] || '#a855f7';
}

export default function AIPanel({ recommendations, strategies = [], state, trackAdjustment, ergastSeededCount }: AIPanelProps) {
  const hasStrategies = strategies.length > 0;
  const isRacing = state.raceStatus === 'racing';
  const isEarlyRace = isRacing && state.currentLap > 0 && state.currentLap < 3;
  const showThinking = isRacing && recommendations.length === 0 && !hasStrategies && isEarlyRace;
  const hasMemory = trackAdjustment && trackAdjustment.experienceLevel !== 'none';

  return (
    <motion.aside
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      className="glass-card-glow rounded-xl p-4 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-neon-purple/30 to-neon-blue/30 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-neon-purple animate-float-glow" />
        </div>
        <h2 className="font-heading text-xs font-bold tracking-wider text-slate-300 uppercase">
          AI Strategy
        </h2>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isRacing ? 'bg-neon-green animate-neon-pulse' : 'bg-surface-500'}`} />
          <span className={`text-[9px] font-mono ${isRacing ? 'text-neon-green glow-text-green' : 'text-slate-600'}`}>
            {isRacing ? 'LIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Confidence overview bar */}
      <div className="mb-3 p-2 rounded-lg bg-surface-700/40 border border-surface-500/30">
        <div className="flex items-center justify-between text-[9px] mb-1.5">
          <span className="font-heading text-slate-500 uppercase tracking-wider">Model Confidence</span>
          <motion.span
            className="font-mono text-neon-green font-bold glow-text-green"
            key={recommendations.length > 0
              ? Math.round(recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length)
              : 0}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {recommendations.length > 0
              ? Math.round(recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length)
              : 0}%
          </motion.span>
        </div>
        <div className="h-1 rounded-full bg-surface-700 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-neon-purple via-neon-green to-neon-blue"
            animate={{
              width: `${recommendations.length > 0
                ? recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length
                : 0}%`
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              boxShadow: '0 0 8px rgba(0,255,136,0.3)',
            }}
          />
        </div>
      </div>

      {/* ML Model & Data Provenance Badges */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {isFittedModelActive() && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-heading font-bold uppercase tracking-wider bg-neon-green/10 text-neon-green border border-neon-green/20">
            <Dna className="w-2.5 h-2.5" />
            Model fitted on real F1 data
          </span>
        )}
        {(ergastSeededCount ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-heading font-bold uppercase tracking-wider bg-neon-blue/10 text-neon-blue border border-neon-blue/20">
            <Satellite className="w-2.5 h-2.5" />
            Seeded from {ergastSeededCount} real F1 races
          </span>
        )}
      </div>

      {/* Track Memory Insight */}
      {trackAdjustment && (
        <div className={`mb-3 p-2 rounded-lg border text-[9px] ${
          hasMemory
            ? 'bg-neon-blue/5 border-neon-blue/15'
            : 'bg-surface-700/30 border-surface-500/20'
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[8px]">🧠</span>
            <span className={`font-heading uppercase tracking-wider font-bold ${
              hasMemory ? 'text-neon-blue' : 'text-slate-500'
            }`}>
              Track Memory
              {hasMemory && (
                <span className="ml-1 text-[7px] px-1 py-0.5 rounded bg-neon-blue/10 text-neon-blue border border-neon-blue/20">
                  {trackAdjustment.experienceLevel.toUpperCase()}
                </span>
              )}
            </span>
            {trackAdjustment.confidenceBoost > 0 && (
              <span className="ml-auto font-mono text-neon-green font-bold">+{trackAdjustment.confidenceBoost}%</span>
            )}
          </div>
          <p className="text-slate-400 font-mono leading-relaxed">
            {trackAdjustment.trackInsight}
          </p>
        </div>
      )}

      {/* Keyboard shortcut hints */}
      {isRacing && (
        <div className="mb-3 flex gap-1.5 flex-wrap">
          <span className="px-1.5 py-0.5 rounded bg-surface-700/60 border border-surface-500/30 text-[8px] text-slate-500 font-mono">
            <kbd className="text-slate-400">P</kbd> Pit
          </span>
          <span className="px-1.5 py-0.5 rounded bg-surface-700/60 border border-surface-500/30 text-[8px] text-slate-500 font-mono">
            <kbd className="text-slate-400">W</kbd> What-If
          </span>
          <span className="px-1.5 py-0.5 rounded bg-surface-700/60 border border-surface-500/30 text-[8px] text-slate-500 font-mono">
            <kbd className="text-slate-400">M</kbd> Mute
          </span>
          <span className="px-1.5 py-0.5 rounded bg-surface-700/60 border border-surface-500/30 text-[8px] text-slate-500 font-mono">
            <kbd className="text-slate-400">Space</kbd> Stop
          </span>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* AI Thinking State */}
        <AnimatePresence>
          {showThinking && <ThinkingState />}
        </AnimatePresence>

        {/* Strategy Engine Results */}
        {hasStrategies && (
          <StrategyPanel strategies={strategies} state={state} />
        )}

        {/* Divider */}
        {hasStrategies && recommendations.length > 0 && (
          <div className="h-px bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent" />
        )}

        {/* Recommendations — now with expandable "Why?" */}
        <AnimatePresence mode="popLayout">
          {recommendations.map((rec, idx) => (
            <RecommendationCard key={rec.id} rec={rec} index={idx} state={state} />
          ))}
        </AnimatePresence>

        {/* Click hint */}
        {recommendations.length > 0 && (
          <p className="text-[8px] text-slate-600 text-center font-mono">
            Click any recommendation to see AI reasoning
          </p>
        )}

        {/* Standby state (pre-race) */}
        {!hasStrategies && recommendations.length === 0 && !showThinking && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-8 h-8 text-surface-500 mx-auto mb-2 animate-float-glow" />
              <p className="text-sm text-slate-500 font-heading">AI Standby</p>
              <p className="text-[10px] text-slate-600 mt-1">Strategy engine activates during the race</p>
              <p className="text-[9px] text-slate-600 mt-2 font-mono">
                Press <kbd className="px-1.5 py-0.5 rounded bg-surface-700 text-slate-400 border border-surface-500/50">Space</kbd> to start
              </p>
              <div className="flex gap-1 justify-center mt-3">
                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-neon-purple" />
                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-neon-purple" />
                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-neon-purple" />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
