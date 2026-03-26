import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RadioMessage } from '../data';
import { Radio, Headphones, User, Brain, Volume2 } from 'lucide-react';

interface RadioPanelProps {
  messages: RadioMessage[];
}

const senderConfig = {
  engineer: {
    icon: <Headphones className="w-3 h-3" />,
    label: 'ENGINEER',
    color: 'text-neon-green',
    bg: 'bg-neon-green/10',
    border: 'border-neon-green/20',
    dotColor: 'bg-neon-green',
  },
  driver: {
    icon: <User className="w-3 h-3" />,
    label: 'DRIVER',
    color: 'text-neon-blue',
    bg: 'bg-neon-blue/10',
    border: 'border-neon-blue/20',
    dotColor: 'bg-neon-blue',
  },
  ai: {
    icon: <Brain className="w-3 h-3" />,
    label: 'AI',
    color: 'text-neon-purple',
    bg: 'bg-neon-purple/10',
    border: 'border-neon-purple/20',
    dotColor: 'bg-neon-purple',
  },
};

const priorityStyles = {
  low: '',
  medium: '',
  high: 'border-neon-yellow/20',
  critical: 'border-neon-red/30 bg-neon-red/5',
};

export default function RadioPanel({ messages }: RadioPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [messages]);

  return (
    <motion.section
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
      className="glass-card rounded-xl p-3 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-neon-green" />
          <h2 className="font-heading text-xs font-bold tracking-wider text-slate-300 uppercase">
            Team Radio
          </h2>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <Volume2 className="w-3 h-3 text-neon-green animate-neon-pulse" />
          <span className="text-[9px] text-neon-green font-mono">LIVE</span>
        </div>
        
        <div className="ml-auto flex items-center gap-3 text-[9px]">
          {Object.entries(senderConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
              <span className={`font-heading uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Messages - horizontal scroll */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const sender = senderConfig[msg.from];
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.8, x: 30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                className={`flex-shrink-0 w-[280px] p-2.5 rounded-xl border ${sender.border} ${sender.bg} ${priorityStyles[msg.priority]}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={sender.color}>{sender.icon}</span>
                  <span className={`text-[9px] font-heading font-bold uppercase tracking-wider ${sender.color}`}>
                    {sender.label}
                  </span>
                  <span className="text-[9px] text-slate-600 font-mono ml-auto">{msg.time}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                  "{msg.message}"
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="w-full flex items-center justify-center py-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Radio className="w-4 h-4" />
              <span className="text-xs font-heading">Radio silence — waiting for race start...</span>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
