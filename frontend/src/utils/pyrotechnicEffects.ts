import { Platform } from 'react-native';

export type PyrotechnicType = 'rocket' | 'bomb' | 'sparkler' | 'chakkar' | 'aerial';

export interface PyrotechnicEffectItem {
  id: string;
  type: PyrotechnicType;
  title: string;
  category: string;
  startX?: number;
  startY?: number;
}

type PyrotechnicListener = (effect: PyrotechnicEffectItem) => void;
const listeners = new Set<PyrotechnicListener>();

export function subscribePyrotechnicEffect(listener: PyrotechnicListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function detectPyrotechnicType(title: string = '', category: string = ''): PyrotechnicType {
  const text = `${title} ${category}`.toLowerCase();
  if (text.includes('rocket') || text.includes('sky')) return 'rocket';
  if (
    text.includes('bomb') ||
    text.includes('bijili') ||
    text.includes('sound') ||
    text.includes('boom') ||
    text.includes('atom') ||
    text.includes('laxmi') ||
    text.includes('cracker')
  ) {
    return 'bomb';
  }
  if (
    text.includes('sparkler') ||
    text.includes('pot') ||
    text.includes('fountain') ||
    text.includes('pencil') ||
    text.includes('candle')
  ) {
    return 'sparkler';
  }
  if (
    text.includes('chakkar') ||
    text.includes('wheel') ||
    text.includes('spinner') ||
    text.includes('chakri')
  ) {
    return 'chakkar';
  }
  return 'aerial';
}

// Synthesizer Web Audio API for Pyrotechnic Sound Effects (Zero External Files, 100% Offline Instant Sound)
export function playPyrotechnicSound(type: PyrotechnicType) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === 'rocket') {
      // Rocket Swoosh + Launch Sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.35);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      // Pop sound at burst
      setTimeout(() => {
        try {
          const popOsc = ctx.createOscillator();
          const popGain = ctx.createGain();
          popOsc.type = 'triangle';
          popOsc.frequency.setValueAtTime(450, ctx.currentTime);
          popOsc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
          popGain.gain.setValueAtTime(0.3, ctx.currentTime);
          popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          popOsc.connect(popGain);
          popGain.connect(ctx.destination);
          popOsc.start();
          popOsc.stop(ctx.currentTime + 0.15);
        } catch {}
      }, 350);
    } else if (type === 'bomb') {
      // Boom Bass Blast + White Noise Crackle
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'sparkler') {
      // Sparkler Sparkling Crackle Tones
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800 + i * 400, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
          } catch {}
        }, i * 60);
      }
    } else if (type === 'chakkar') {
      // Whistling Spinner Oscillating Sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.25);
      osc.frequency.linearRampToValueAtTime(500, now + 0.4);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Multi-shell Aerial Burst
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {}
}

export function triggerPyrotechnicCartEffect(
  title: string,
  category: string = '',
  startX?: number,
  startY?: number
) {
  const type = detectPyrotechnicType(title, category);
  const effect: PyrotechnicEffectItem = {
    id: `pyro-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    title,
    category,
    startX,
    startY,
  };

  // Play instant audio sound
  playPyrotechnicSound(type);

  // Notify active listeners
  listeners.forEach((listener) => listener(effect));
}
