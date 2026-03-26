import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Brain, FlaskConical, TrendingDown, Shield,
  ChevronRight, ArrowRight, Play, Gauge, Target,
  BarChart3, Cpu, Timer, CircleDot, Radio
} from 'lucide-react';

// ─── Typing Effect ──────────────────────────────────────────────────────────
function TypingText({ text, className = '' }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="inline-block w-[2px] h-[1em] bg-neon-green ml-1 animate-neon-pulse align-middle" />}
    </span>
  );
}

// ─── Animated Counter ───────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = value / 40;
    const interval = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(interval);
      } else {
        setCount(Math.round(start));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Animated Section Wrapper ───────────────────────────────────────────────
function FadeInSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Feature Card ───────────────────────────────────────────────────────────
const features = [
  {
    icon: <Gauge className="w-6 h-6" />,
    title: 'Race Simulation Engine',
    desc: 'Physics-based lap time model with tire degradation, fuel burn, and compound-specific performance curves.',
    color: '#00ff88',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'AI Strategy Recommendations',
    desc: 'Real-time BOX BOX / STAY OUT calls with confidence percentages and multi-factor reasoning.',
    color: '#a855f7',
  },
  {
    icon: <FlaskConical className="w-6 h-6" />,
    title: 'What-If Simulator',
    desc: 'Instantly compare pit strategies. Change pit lap, compound, and see the time delta update live.',
    color: '#00d4ff',
  },
  {
    icon: <TrendingDown className="w-6 h-6" />,
    title: 'Tire Degradation Model',
    desc: 'Non-linear quadratic cliff effect per compound. Soft, Medium, Hard — each with unique wear curves.',
    color: '#ff3366',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Risk & Safety Score',
    desc: 'AI-calculated risk assessment for every strategy. Audio & voice alerts on critical threshold crossings.',
    color: '#fbbf24',
  },
];

// ─── How-It-Works Steps ─────────────────────────────────────────────────────
const steps = [
  {
    num: '01',
    title: 'Input Race Data',
    desc: 'Select tire compound, set weather conditions, and configure the 50-lap simulation parameters.',
    icon: <Target className="w-8 h-8" />,
  },
  {
    num: '02',
    title: 'AI Simulates Strategies',
    desc: 'The engine sweeps all pit windows and compounds, running deterministic physics models for each scenario.',
    icon: <Cpu className="w-8 h-8" />,
  },
  {
    num: '03',
    title: 'Get Optimal Decision',
    desc: 'Receive ranked strategies, confidence scores, and actionable "BOX BOX" or "STAY OUT" recommendations.',
    icon: <BarChart3 className="w-8 h-8" />,
  },
];

// ─── Stats ──────────────────────────────────────────────────────────────────
const stats = [
  { value: 50, suffix: '+', label: 'Laps Simulated' },
  { value: 3, suffix: '', label: 'Tire Compounds' },
  { value: 92, suffix: '%', label: 'AI Confidence' },
  { value: 22, suffix: 's', label: 'Pit Stop Model' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-900 text-slate-200 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 racing-grid-bg opacity-60" />
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-neon-purple/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-neon-green/6 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-neon-red/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-neon-blue/5 rounded-full blur-[130px]" />
        <div className="absolute inset-0 scan-line" />
        <motion.div
          className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-green/20 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-neon-purple/15 to-transparent"
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 glass-strong"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple to-neon-green flex items-center justify-center animate-float-glow">
              <Zap className="w-5 h-5 text-surface-900" />
            </div>
            <span className="font-heading text-lg font-bold tracking-wider text-white glow-text-purple">
              RACEMIND AI
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-neon-green transition-colors font-heading tracking-wider uppercase">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-400 hover:text-neon-green transition-colors font-heading tracking-wider uppercase">How It Works</a>
            <a href="#visuals" className="text-sm text-slate-400 hover:text-neon-green transition-colors font-heading tracking-wider uppercase">Visuals</a>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="cursor-pointer px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-green text-surface-900 font-heading text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(0,255,136,0.2)]"
          >
            Launch App
          </motion.button>
        </div>
      </motion.nav>

      <section
        className="relative z-10 min-h-screen flex items-center justify-center px-6"
      >
        <div className="text-center max-w-5xl mx-auto pt-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-neon-green animate-neon-pulse" />
            <span className="text-xs font-heading text-neon-green tracking-wider uppercase">
              AI-Powered Race Engineering
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-5xl md:text-7xl lg:text-8xl font-heading font-black tracking-tight leading-none mb-6"
          >
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AI-Powered Race
            </span>
            <br />
            <span className="bg-gradient-to-r from-neon-purple via-neon-green to-neon-blue bg-clip-text text-transparent">
              Strategy Simulator
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="text-lg md:text-xl text-slate-400 mb-10 font-mono h-8"
          >
            <TypingText text="Make real-time race decisions like an F1 engineer" />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0,255,136,0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-neon-green to-neon-green-dim text-surface-900 font-heading text-sm font-bold tracking-wider uppercase shadow-[0_0_30px_rgba(0,255,136,0.2)] transition-all"
            >
              <Play className="w-5 h-5" />
              Start Simulation
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.a
              href="#features"
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl glass text-slate-300 font-heading text-sm font-bold tracking-wider uppercase hover:text-neon-purple hover:border-neon-purple/30 transition-all cursor-pointer"
            >
              Explore Features
              <ArrowRight className="w-4 h-4" />
            </motion.a>
          </motion.div>

          {/* Hero visual - fake telemetry display */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.8 }}
            className="mt-16 mx-auto max-w-3xl"
          >
            <div className="glass-card-glow rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-neon-purple/10 rounded-full blur-[60px]" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-neon-green/10 rounded-full blur-[60px]" />

              {/* Fake HUD */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                {['LAP 23/50', 'P2 +0.7s', 'MEDIUM C3', 'ERS 89%'].map((val, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-700/50 text-center">
                    <span className={`text-sm font-mono font-bold ${
                      i === 0 ? 'text-neon-green' : i === 1 ? 'text-neon-yellow' : i === 2 ? 'text-neon-purple' : 'text-neon-blue'
                    }`}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Fake chart area */}
              <div className="h-32 rounded-xl bg-surface-700/30 border border-surface-500/20 flex items-end justify-between px-4 pb-3 pt-2 relative overflow-hidden">
                <div className="absolute top-2 left-4 text-[9px] font-heading text-slate-600 uppercase tracking-wider">Lap Time Telemetry</div>
                {Array.from({ length: 20 }, (_, i) => {
                  const h = 30 + Math.sin(i * 0.5) * 15 + Math.random() * 20;
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: 2.0 + i * 0.05 }}
                      className="w-[3%] rounded-t bg-gradient-to-t from-neon-purple/60 to-neon-green/60"
                    />
                  );
                })}
              </div>

              {/* BOX BOX overlay */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 3.0 }}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-neon-red/15 border border-neon-red/30"
              >
                <span className="text-xs font-heading font-bold text-neon-red glow-text-red tracking-wider">
                  🟥 BOX BOX BOX
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ STATS BAR ═══════════════════ */}
      <section className="relative z-10 py-12 border-y border-surface-500/20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <FadeInSection key={i} delay={i * 0.1} className="text-center">
              <div className="text-3xl md:text-4xl font-heading font-black text-white glow-text-purple">
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </div>
              <p className="text-xs text-slate-500 font-heading uppercase tracking-wider mt-1">{s.label}</p>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* ═══════════════════ FEATURES SECTION ═══════════════════ */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-xs font-heading text-neon-purple tracking-[0.3em] uppercase">Capabilities</span>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-white mt-3 mb-4">
              Built for Race Engineers
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Every tool an F1 strategist needs — powered by physics-based AI models, not guesswork.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: `0 0 30px ${f.color}15` }}
                  className="glass-card rounded-2xl p-6 h-full group cursor-default transition-all duration-300 hover:border-opacity-40"
                  style={{ ['--glow' as string]: f.color }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:shadow-[0_0_20px_var(--glow)]"
                    style={{ backgroundColor: `${f.color}15`, color: f.color }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-heading text-lg font-bold text-white mb-2 tracking-wide">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {f.desc}
                  </p>
                </motion.div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-xs font-heading text-neon-green tracking-[0.3em] uppercase">Process</span>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-white mt-3 mb-4">
              How It Works
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Three steps from raw race data to optimal pit strategy.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-[60px] left-[16%] right-[16%] h-px bg-gradient-to-r from-neon-purple/30 via-neon-green/30 to-neon-blue/30" />

            {steps.map((step, i) => (
              <FadeInSection key={i} delay={i * 0.15}>
                <div className="text-center relative">
                  {/* Step number */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-24 h-24 rounded-2xl mx-auto mb-6 flex items-center justify-center glass-card-glow relative"
                  >
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-surface-800 border-2 border-neon-purple flex items-center justify-center">
                      <span className="text-[10px] font-heading font-bold text-neon-purple">{step.num}</span>
                    </div>
                    <span className="text-neon-purple">{step.icon}</span>
                  </motion.div>
                  <h3 className="font-heading text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ VISUAL / TELEMETRY SECTION ═══════════════════ */}
      <section id="visuals" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-xs font-heading text-neon-blue tracking-[0.3em] uppercase">Live Telemetry</span>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-white mt-3 mb-4">
              Race-Grade Visuals
            </h2>
          </FadeInSection>

          <FadeInSection>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Tire degradation viz */}
              <div className="glass-card rounded-2xl p-6 overflow-hidden relative">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-neon-red/10 rounded-full blur-[40px]" />
                <h3 className="font-heading text-sm font-bold text-slate-300 tracking-wider uppercase mb-4 flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-neon-red" />
                  Tire Degradation Curves
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'SOFT', color: '#ff3366', data: [100, 88, 72, 52, 30, 12] },
                    { name: 'MEDIUM', color: '#fbbf24', data: [100, 92, 82, 70, 56, 40] },
                    { name: 'HARD', color: '#94a3b8', data: [100, 95, 88, 79, 70, 60] },
                  ].map((tire) => (
                    <div key={tire.name} className="text-center">
                      <span className="text-[10px] font-heading font-bold tracking-wider" style={{ color: tire.color }}>
                        {tire.name}
                      </span>
                      <div className="h-24 flex items-end justify-between gap-0.5 mt-2">
                        {tire.data.map((val, j) => (
                          <motion.div
                            key={j}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${val}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: j * 0.1 }}
                            className="flex-1 rounded-t-sm"
                            style={{ backgroundColor: `${tire.color}60` }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategy comparison */}
              <div className="glass-card rounded-2xl p-6 overflow-hidden relative">
                <div className="absolute -top-8 -left-8 w-32 h-32 bg-neon-green/10 rounded-full blur-[40px]" />
                <h3 className="font-heading text-sm font-bold text-slate-300 tracking-wider uppercase mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-neon-green" />
                  Strategy Comparison
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'ONE STOP (M→H)', time: '1:23:45.2', delta: 'BEST', color: '#00ff88' },
                    { label: 'TWO STOP (S→M→S)', time: '1:24:01.8', delta: '+16.6s', color: '#fbbf24' },
                    { label: 'NO STOP', time: '1:25:12.4', delta: '+87.2s', color: '#ff3366' },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-surface-700/40 border border-surface-500/20"
                    >
                      <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: s.color }} />
                      <div className="flex-1">
                        <span className="text-xs font-heading font-bold text-slate-300">{s.label}</span>
                        <p className="text-xs font-mono text-slate-500">{s.time}</p>
                      </div>
                      <span
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                        style={{
                          color: s.color,
                          backgroundColor: `${s.color}15`,
                        }}
                      >
                        {s.delta}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* Radio preview */}
          <FadeInSection className="mt-6">
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-neon-purple/10 rounded-full blur-[50px]" />
              <h3 className="font-heading text-sm font-bold text-slate-300 tracking-wider uppercase mb-4 flex items-center gap-2">
                <Radio className="w-4 h-4 text-neon-green" />
                Team Radio Feed
                <span className="flex items-center gap-1 ml-2">
                  <div className="flex items-end gap-[1.5px] h-3">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="audio-bar w-[2px] rounded-full bg-neon-green" />
                    ))}
                  </div>
                  <span className="text-[9px] text-neon-green font-mono glow-text-green">LIVE</span>
                </span>
              </h3>
              <div className="flex gap-3 overflow-hidden">
                {[
                  { from: 'ENGINEER', msg: 'BOX BOX BOX! Come in this lap.', color: '#00ff88', priority: 'critical' },
                  { from: 'DRIVER', msg: 'Copy. Boxing, boxing. Let\'s go.', color: '#00d4ff', priority: 'low' },
                  { from: 'AI', msg: 'Optimal window in 3 laps. Confidence: 92%.', color: '#a855f7', priority: 'high' },
                ].map((radio, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                    className={`flex-1 p-3 rounded-xl border ${
                      radio.priority === 'critical' ? 'border-neon-red/30 bg-neon-red/5' : 'border-surface-500/20 bg-surface-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-heading font-bold tracking-wider" style={{ color: radio.color }}>
                        {radio.from}
                      </span>
                    </div>
                    <p className={`text-[11px] font-mono ${
                      radio.priority === 'critical' ? 'text-neon-red font-bold' : 'text-slate-400'
                    }`}>
                      "{radio.msg}"
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeInSection>
            <motion.div
              className="glass-card-glow rounded-3xl p-12 relative overflow-hidden"
            >
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-neon-purple/10 rounded-full blur-[80px]" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-neon-green/10 rounded-full blur-[80px]" />

              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-green flex items-center justify-center mx-auto mb-6 animate-float-glow">
                  <Zap className="w-8 h-8 text-surface-900" />
                </div>
                <h2 className="text-3xl md:text-5xl font-heading font-black text-white mb-4">
                  Ready to Race?
                </h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  Experience AI-powered race strategy like never before. No setup required — start simulating in seconds.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(0,255,136,0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/dashboard')}
                  className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-neon-green to-neon-green-dim text-surface-900 font-heading text-base font-bold tracking-wider uppercase shadow-[0_0_40px_rgba(0,255,136,0.2)] transition-all"
                >
                  <Zap className="w-5 h-5" />
                  Launch RaceMind AI
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </div>
            </motion.div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="display-flex justify-items-center align-items-center relative z-10 border-t border-surface-500/20 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-neon-purple" />
            <span className="font-heading text-xs font-bold tracking-wider text-slate-500">RACEMIND AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
