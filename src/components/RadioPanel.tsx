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
    glowColor: 'rgba(0,255,136,0.15)',
  },
  driver: {
    icon: <User className="w-3 h-3" />,
    label: 'DRIVER',
    color: 'text-neon-blue',
    bg: 'bg-neon-blue/10',
    border: 'border-neon-blue/20',
    dotColor: 'bg-neon-blue',
    glowColor: 'rgba(0,212,255,0.15)',
  },
  ai: {
    icon: <Brain className="w-3 h-3" />,
    label: 'AI',
    color: 'text-neon-purple',
    bg: 'bg-neon-purple/10',
    border: 'border-neon-purple/20',
    dotColor: 'bg-neon-purple',
    glowColor: 'rgba(168,85,247,0.15)',
  },
};

const priorityStyles: Record<string, string> = {
  low: '',
  medium: '',
  high: 'border-neon-yellow/20',
  critical: 'border-neon-red/30 bg-neon-red/5 animate-urgent-pulse',
};

function AudioWave({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-[2px] h-3 ml-auto">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="audio-bar w-[2px] rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export default function RadioPanel({ messages }: RadioPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const isCritical = latestMsg?.priority === 'critical';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  return (
    <motion.section
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
      className={`rounded-xl p-3 flex flex-col ${
        isCritical ? 'glass-card-glow' : 'glass-card'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Radio className={`w-4 h-4 ${isCritical ? 'text-neon-red animate-neon-pulse' : 'text-neon-green'}`} />
          <h2 className="font-heading text-xs font-bold tracking-wider text-slate-300 uppercase">
            Team Radio
          </h2>
        </div>

        {/* Live indicator with audio wave */}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="flex items-end gap-[1.5px] h-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="audio-bar w-[2px] rounded-full bg-neon-green"
              />
            ))}
          </div>
          <span className="text-[9px] text-neon-green font-mono glow-text-green">LIVE</span>
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
          {messages.map((msg) => {
            const sender = senderConfig[msg.from];
            const isMsgCritical = msg.priority === 'critical';
            const isMsgHigh = msg.priority === 'high';
            const hasBOX = msg.message.toUpperCase().includes('BOX');

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.8, x: 40, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.4,
                  type: 'spring',
                  stiffness: 180,
                  damping: 18,
                }}
                className={`flex-shrink-0 w-[280px] p-2.5 rounded-xl border transition-all duration-300 ${
                  sender.border
                } ${sender.bg} ${priorityStyles[msg.priority]}`}
                style={
                  isMsgCritical || (hasBOX && isMsgHigh)
                    ? { boxShadow: `0 0 20px ${sender.glowColor}, 0 0 40px ${sender.glowColor}` }
                    : undefined
                }
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={sender.color}>{sender.icon}</span>
                  <span className={`text-[9px] font-heading font-bold uppercase tracking-wider ${sender.color}`}>
                    {sender.label}
                  </span>
                  {(isMsgCritical || hasBOX) && (
                    <span className="flex h-2 w-2 ml-0.5">
                      <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75 ${
                        isMsgCritical ? 'bg-neon-red' : 'bg-neon-yellow'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        isMsgCritical ? 'bg-neon-red' : 'bg-neon-yellow'
                      }`} />
                    </span>
                  )}
                  <span className="text-[9px] text-slate-600 font-mono ml-auto">{msg.time}</span>
                </div>
                <p className={`text-[11px] leading-relaxed font-mono ${
                  isMsgCritical
                    ? 'text-neon-red font-bold glow-text-red'
                    : hasBOX
                      ? 'text-neon-yellow font-bold'
                      : 'text-slate-300'
                }`}>
                  "{msg.message}"
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="w-full flex items-center justify-center py-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Radio className="w-4 h-4 animate-float-glow" />
              <span className="text-xs font-heading">Radio silence — waiting for race start...</span>
              <div className="flex gap-1 ml-2">
                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-neon-purple" />
                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-neon-purple" />
                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-neon-purple" />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
