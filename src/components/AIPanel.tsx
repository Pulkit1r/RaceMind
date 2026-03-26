import { motion, AnimatePresence } from 'framer-motion';
import type { AIRecommendation, StrategyResult, RaceState } from '../data';
import StrategyPanel from './StrategyPanel';
import {
  Brain, AlertTriangle, TrendingUp, Fuel, CloudRain,
  Target, Shield, Zap, Loader2
} from 'lucide-react';

interface AIPanelProps {
  recommendations: AIRecommendation[];
  strategies: StrategyResult[];
  state: RaceState;
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

function RecommendationCard({ rec, index }: { rec: AIRecommendation; index: number }) {
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
      className={`relative p-3 rounded-xl border transition-all duration-300 ${
        rec.urgent
          ? 'bg-neon-red/5 border-neon-red/30 animate-urgent-pulse'
          : isBoxBox
            ? 'bg-neon-yellow/5 border-neon-yellow/20 shadow-[0_0_20px_rgba(251,191,36,0.06)]'
            : isStayOut
              ? 'bg-neon-green/5 border-neon-green/20 shadow-[0_0_15px_rgba(0,255,136,0.04)]'
              : 'glass-card hover:border-neon-purple/30'
      }`}
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
          </div>
        </div>
      </div>
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

export default function AIPanel({ recommendations, strategies = [], state }: AIPanelProps) {
  const hasStrategies = strategies.length > 0;
  const isRacing = state.raceStatus === 'racing';
  const isEarlyRace = isRacing && state.currentLap > 0 && state.currentLap < 3;
  const showThinking = isRacing && recommendations.length === 0 && !hasStrategies && isEarlyRace;

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

        {/* Recommendations */}
        <AnimatePresence mode="popLayout">
          {recommendations.map((rec, idx) => (
            <RecommendationCard key={rec.id} rec={rec} index={idx} />
          ))}
        </AnimatePresence>

        {/* Standby state (pre-race) */}
        {!hasStrategies && recommendations.length === 0 && !showThinking && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-8 h-8 text-surface-500 mx-auto mb-2 animate-float-glow" />
              <p className="text-sm text-slate-500 font-heading">AI Standby</p>
              <p className="text-[10px] text-slate-600 mt-1">Strategy engine activates during the race</p>
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
