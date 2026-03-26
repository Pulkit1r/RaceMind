// ─── Audio Alert System ──────────────────────────────────────────────────────
// Uses the Web Audio API for synthesized tones and Web Speech API for voice callouts.
// No external audio files needed — everything runs in-browser.

let audioCtx: AudioContext | null = null;
let isMuted = false;
let voiceEnabled = true;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Tone generators ─────────────────────────────────────────────────────────

/** Play a single tone at a given frequency for a given duration. */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  delay: number = 0,
) {
  if (isMuted) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = 0;

  osc.connect(gain);
  gain.connect(ctx.destination);

  const startTime = ctx.currentTime + delay;
  // Smooth envelope to avoid clicks
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.setValueAtTime(volume, startTime + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** 🔴 CRITICAL alert — urgent triple-beep siren (BOX BOX, tire failure, rain). */
export function playAlertCritical() {
  // Three rapid high-pitched beeps
  playTone(880, 0.12, 'square', 0.25, 0);
  playTone(880, 0.12, 'square', 0.25, 0.18);
  playTone(1100, 0.2, 'square', 0.3, 0.36);
}

/** 🟡 WARNING alert — double descending tone (tire warn, weather). */
export function playAlertWarning() {
  playTone(660, 0.15, 'triangle', 0.2, 0);
  playTone(520, 0.2, 'triangle', 0.2, 0.2);
}

/** 🟢 INFO alert — single soft chime (strategy update, fuel info). */
export function playAlertInfo() {
  playTone(587, 0.1, 'sine', 0.15, 0);
  playTone(784, 0.15, 'sine', 0.12, 0.12);
}

/** 🏁 Race start fanfare — ascending triple tone. */
export function playRaceStart() {
  playTone(440, 0.15, 'sine', 0.2, 0);
  playTone(554, 0.15, 'sine', 0.2, 0.2);
  playTone(659, 0.25, 'sine', 0.25, 0.4);
}

// ─── Voice callouts (Text-to-Speech) ─────────────────────────────────────────

let lastSpokenText = '';
let lastSpokenTime = 0;
const SPEAK_COOLDOWN = 4000; // minimum ms between voice callouts

/** Speak a message using the Web Speech API if available. */
export function speakMessage(text: string, urgent: boolean = false) {
  if (isMuted || !voiceEnabled) return;
  if (!('speechSynthesis' in window)) return;

  // Debounce: don't repeat the same message within cooldown
  const now = Date.now();
  if (text === lastSpokenText && now - lastSpokenTime < SPEAK_COOLDOWN) return;
  lastSpokenText = text;
  lastSpokenTime = now;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = urgent ? 1.3 : 1.1;
  utterance.pitch = urgent ? 1.1 : 1.0;
  utterance.volume = urgent ? 1.0 : 0.8;

  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('David'))
  ) || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
}

// ─── High-level alert dispatcher ─────────────────────────────────────────────

export type AlertLevel = 'critical' | 'warning' | 'info' | 'race-start';

interface AlertOptions {
  level: AlertLevel;
  message?: string; // if set, also speak this text via TTS
}

/**
 * Fire an audio alert with appropriate tone + optional voice callout.
 * Call this from the simulation loop whenever a critical event occurs.
 */
export function fireAlert({ level, message }: AlertOptions) {
  switch (level) {
    case 'critical':
      playAlertCritical();
      if (message) speakMessage(message, true);
      break;
    case 'warning':
      playAlertWarning();
      if (message) speakMessage(message, false);
      break;
    case 'info':
      playAlertInfo();
      break;
    case 'race-start':
      playRaceStart();
      break;
  }
}

// ─── Mute/unmute controls ────────────────────────────────────────────────────

export function setMuted(muted: boolean) {
  isMuted = muted;
  if (muted) window.speechSynthesis?.cancel();
}

export function getMuted(): boolean {
  return isMuted;
}

export function setVoiceEnabled(enabled: boolean) {
  voiceEnabled = enabled;
}

export function getVoiceEnabled(): boolean {
  return voiceEnabled;
}

/**
 * Must be called on a user gesture (click) to unlock the AudioContext
 * in browsers with autoplay restrictions.
 */
export function unlockAudio() {
  getAudioContext();
}
