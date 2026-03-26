import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RaceState } from '../data';
import { TIRE_COLORS } from '../data';
import {
  Play, Square, Octagon, Shuffle, Settings,
  ChevronDown, AlertTriangle, Droplets, CircleDot, FlaskConical
} from 'lucide-react';

interface ControlPanelProps {
  state: RaceState;
  onStartRace: () => void;
  onStopRace: () => void;
  onPitNow: () => void;
  onChangeTire: (tire: RaceState['currentTire']) => void;
  onTireWearChange: (wear: number) => void;
  onWeatherChange: (rainChance: number) => void;
  onAlternateStrategy: () => void;
  onOpenWhatIf: () => void;
  isRacing: boolean;
}

const tireOptions: { value: RaceState['currentTire']; label: string; short: string }[] = [
  { value: 'soft', label: 'Soft (C5)', short: 'S' },
  { value: 'medium', label: 'Medium (C3)', short: 'M' },
  { value: 'hard', label: 'Hard (C2)', short: 'H' },
];

function ActionButton({ onClick, icon, label, variant, disabled = false, pulse = false }: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant: 'green' | 'red' | 'purple' | 'yellow' | 'neutral';
  disabled?: boolean;
  pulse?: boolean;
}) {
  const variants = {
    green: 'bg-neon-green/10 border-neon-green/30 text-neon-green hover:bg-neon-green/20 hover:border-neon-green/50 hover:shadow-[0_0_20px_rgba(0,255,136,0.2)]',
    red: 'bg-neon-red/10 border-neon-red/30 text-neon-red hover:bg-neon-red/20 hover:border-neon-red/50 hover:shadow-[0_0_20px_rgba(255,51,102,0.2)]',
    purple: 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20 hover:border-neon-purple/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
    yellow: 'bg-neon-yellow/10 border-neon-yellow/30 text-neon-yellow hover:bg-neon-yellow/20 hover:border-neon-yellow/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]',
    neutral: 'bg-surface-600/50 border-surface-500 text-slate-300 hover:bg-surface-500 hover:border-slate-500',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 font-heading text-xs font-semibold tracking-wider uppercase disabled:opacity-30 disabled:pointer-events-none ${variants[variant]}`}
    >
      {pulse && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current animate-ping" />
      )}
      {icon}
      {label}
    </motion.button>
  );
}

function NeonSlider({ value, min, max, step, label, displayValue, onChange, colorClass = '' }: {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  displayValue: string;
  onChange: (v: number) => void;
  colorClass?: string;
}) {
  // Compute fill percentage for track background
  const pct = ((value - min) / (max - min)) * 100;

  // Color mapping for the filled portion
  const fillColor: Record<string, string> = {
    '': 'rgba(168,85,247,0.5)',
    'slider-red': 'rgba(255,51,102,0.5)',
    'slider-blue': 'rgba(0,212,255,0.5)',
  };
  const fill = fillColor[colorClass] || fillColor[''];

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-slate-500 font-heading uppercase tracking-wider">{label}</span>
        <span className="font-mono font-bold text-slate-200">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`neon-slider ${colorClass}`}
        style={{
          background: `linear-gradient(90deg, ${fill} 0%, ${fill} ${pct}%, rgba(34,35,54,0.8) ${pct}%, rgba(34,35,54,0.8) 100%)`,
        }}
      />
      <div className="flex justify-between text-[8px] text-slate-600 font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function ControlPanel({
  state, onStartRace, onStopRace, onPitNow, onChangeTire,
  onTireWearChange, onWeatherChange, onAlternateStrategy, onOpenWhatIf, isRacing
}: ControlPanelProps) {
  const [tireMenuOpen, setTireMenuOpen] = useState(false);

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
      className="glass-card rounded-xl p-4 flex flex-col gap-3 h-full overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-neon-purple" />
        <h2 className="font-heading text-xs font-bold tracking-wider text-slate-300 uppercase">
          Race Control
        </h2>
      </div>

      {/* === BUTTONS SECTION === */}
      <div className="space-y-2">
        {/* Start / Stop Simulation */}
        {!isRacing ? (
          <ActionButton
            onClick={onStartRace}
            icon={<Play className="w-4 h-4" />}
            label="Start Simulation"
            variant="green"
            pulse
          />
        ) : (
          <ActionButton
            onClick={onStopRace}
            icon={<Square className="w-4 h-4" />}
            label="Stop Simulation"
            variant="red"
          />
        )}

        {/* Pit Now */}
        <ActionButton
          onClick={onPitNow}
          icon={<Octagon className="w-4 h-4" />}
          label="Pit Now"
          variant="yellow"
          disabled={!isRacing}
          pulse={isRacing && state.tireWear < 30}
        />

        {/* Try Alternate Strategy */}
        <ActionButton
          onClick={onAlternateStrategy}
          icon={<Shuffle className="w-4 h-4" />}
          label="Alt Strategy"
          variant="purple"
          disabled={!isRacing}
        />

        {/* What-If Simulator */}
        <ActionButton
          onClick={onOpenWhatIf}
          icon={<FlaskConical className="w-4 h-4" />}
          label="What If"
          variant="neutral"
          disabled={!isRacing}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent" />

      {/* === SLIDERS SECTION === */}
      <div className="space-y-3">
        <h3 className="font-heading text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          Overrides
        </h3>

        {/* Tire Wear Slider */}
        <NeonSlider
          value={state.tireWear}
          min={0}
          max={100}
          step={1}
          label="Tire Wear"
          displayValue={`${state.tireWear.toFixed(0)}%`}
          onChange={onTireWearChange}
          colorClass="slider-red"
        />

        {/* Tire Wear Warning */}
        <AnimatePresence>
          {state.tireWear < 30 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-red/10 border border-neon-red/20"
            >
              <AlertTriangle className="w-3 h-3 text-neon-red animate-neon-pulse" />
              <span className="text-[9px] text-neon-red font-mono">TIRE WEAR CRITICAL</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weather Slider */}
        <NeonSlider
          value={state.rainChance}
          min={0}
          max={100}
          step={1}
          label="Rain Probability"
          displayValue={`${state.rainChance.toFixed(0)}%`}
          onChange={onWeatherChange}
          colorClass="slider-blue"
        />

        {/* Weather state indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700/40">
          <Droplets className="w-3 h-3 text-neon-blue" />
          <span className="text-[9px] font-heading text-slate-400 uppercase tracking-wider">
            {state.rainChance < 20 ? 'Dry' : state.rainChance < 50 ? 'Possible rain' : state.rainChance < 75 ? 'Rain likely' : 'Heavy rain'}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent" />

      {/* === TIRE TYPE DROPDOWN === */}
      <div className="space-y-2">
        <h3 className="font-heading text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          Tire Compound
        </h3>

        {/* Current tire badge */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-700/50 border border-surface-500/50">
          <div
            className="w-9 h-9 rounded-full border-[3px] flex items-center justify-center font-heading font-black text-[10px]"
            style={{
              borderColor: TIRE_COLORS[state.currentTire],
              color: TIRE_COLORS[state.currentTire],
              boxShadow: `0 0 12px ${TIRE_COLORS[state.currentTire]}40`,
            }}
          >
            {tireOptions.find(t => t.value === state.currentTire)?.short ?? state.currentTire[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold capitalize" style={{ color: TIRE_COLORS[state.currentTire] }}>
              {state.currentTire}
            </p>
            <p className="text-[9px] text-slate-500 font-mono">Age: {state.tireAge} laps</p>
          </div>
        </div>

        {/* Dropdown */}
        <div className="relative">
          <button
            onClick={() => setTireMenuOpen(!tireMenuOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-700/50 border border-surface-500/50 text-xs text-slate-300 hover:border-neon-purple/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CircleDot className="w-3.5 h-3.5 text-neon-purple" />
              <span className="font-heading tracking-wider uppercase text-[10px]">Change Compound</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${tireMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {tireMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-1 left-0 right-0 z-50 glass-strong rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              >
                {tireOptions.map((tire) => (
                  <button
                    key={tire.value}
                    onClick={() => {
                      onChangeTire(tire.value);
                      setTireMenuOpen(false);
                    }}
                    disabled={tire.value === state.currentTire}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs hover:bg-surface-500/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-heading font-black"
                      style={{
                        borderColor: TIRE_COLORS[tire.value],
                        color: TIRE_COLORS[tire.value],
                      }}
                    >
                      {tire.short}
                    </div>
                    <span className="font-mono" style={{ color: TIRE_COLORS[tire.value] }}>
                      {tire.label}
                    </span>
                    {tire.value === state.currentTire && (
                      <span className="ml-auto text-[8px] text-slate-500 font-heading uppercase">Active</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent" />

      {/* Quick Stats pinned to bottom */}
      <div className="mt-auto space-y-2">
        <h3 className="font-heading text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          Session Stats
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-surface-700/40 text-center">
            <p className="text-[9px] text-slate-500 font-heading uppercase">Pit Stops</p>
            <p className="text-lg font-mono font-bold text-neon-purple">{state.pitStops}</p>
          </div>
          <div className="p-2 rounded-lg bg-surface-700/40 text-center">
            <p className="text-[9px] text-slate-500 font-heading uppercase">Last Pit</p>
            <p className="text-lg font-mono font-bold text-slate-300">
              {state.lastPitLap > 0 ? `L${state.lastPitLap}` : '—'}
            </p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
