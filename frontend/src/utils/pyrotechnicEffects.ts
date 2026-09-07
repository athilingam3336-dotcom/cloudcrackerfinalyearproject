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

// Signature Diwali Happiness Whistling Rocket + Festive Burst Sound Synthesizer
export function playDiwaliHappinessRocketSound() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // 1. High-Energy Diwali Whistling Rocket Ascending Sweep (Visil / Pwhiiiish!)
    const whistleOsc = ctx.createOscillator();
    const whistleGain = ctx.createGain();

    // Whistle vibrato modulation
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(35, now);
    lfoGain.gain.setValueAtTime(60, now);
    lfo.connect(whistleOsc.frequency);

    whistleOsc.type = 'sine';
    whistleOsc.frequency.setValueAtTime(550, now);
    whistleOsc.frequency.exponentialRampToValueAtTime(2200, now + 0.35);

    whistleGain.gain.setValueAtTime(0.28, now);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    whistleOsc.connect(whistleGain);
    whistleGain.connect(ctx.destination);

    lfo.start(now);
    whistleOsc.start(now);
    lfo.stop(now + 0.38);
    whistleOsc.stop(now + 0.38);

    // 2. Joyful Diwali Explosion Burst (Boom! ✨🎆) at peak
    setTimeout(() => {
      try {
        const burstCtx = new AudioCtxClass();
        const bNow = burstCtx.currentTime;

        // Sub-bass Boom
        const boomOsc = burstCtx.createOscillator();
        const boomGain = burstCtx.createGain();
        boomOsc.type = 'triangle';
        boomOsc.frequency.setValueAtTime(240, bNow);
        boomOsc.frequency.exponentialRampToValueAtTime(45, bNow + 0.25);
        boomGain.gain.setValueAtTime(0.4, bNow);
        boomGain.gain.exponentialRampToValueAtTime(0.001, bNow + 0.28);

        boomOsc.connect(boomGain);
        boomGain.connect(burstCtx.destination);
        boomOsc.start(bNow);
        boomOsc.stop(bNow + 0.28);

        // Golden Sparkle Chimes
        for (let i = 0; i < 3; i++) {
          const sparkOsc = burstCtx.createOscillator();
          const sparkGain = burstCtx.createGain();
          sparkOsc.type = 'sine';
          sparkOsc.frequency.setValueAtTime(1400 + i * 350, bNow + i * 0.04);
          sparkGain.gain.setValueAtTime(0.12, bNow + i * 0.04);
          sparkGain.gain.exponentialRampToValueAtTime(0.001, bNow + i * 0.04 + 0.1);
          sparkOsc.connect(sparkGain);
          sparkGain.connect(burstCtx.destination);
          sparkOsc.start(bNow + i * 0.04);
          sparkOsc.stop(bNow + i * 0.04 + 0.1);
        }
      } catch {}
    }, 320);
  } catch {}
}

export function playPyrotechnicSound(type?: PyrotechnicType) {
  playDiwaliHappinessRocketSound();
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
