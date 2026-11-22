// Sound, made on the spot with WebAudio: no audio files, no network. A
// soft chime for loot, a low sting when a guard gets sure, and a slow pulse
// while the alarm is high. M toggles it; it starts only after a key press,
// as browsers require.
export function createAudio() {
  let context = null;
  let muted = false;
  let alarmNodes = null;

  function ensureContext() {
    if (!context) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function beep(frequency, seconds, type, gainValue, when = 0) {
    const ctx = ensureContext();
    if (!ctx || muted) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + seconds);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(ctx.currentTime + when);
    oscillator.stop(ctx.currentTime + when + seconds + 0.05);
  }

  return {
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopAlarm();
      return muted;
    },
    pickup() {
      beep(880, 0.18, 'sine', 0.12);
      beep(1318, 0.24, 'sine', 0.1, 0.07);
    },
    vault() {
      beep(523, 0.2, 'triangle', 0.14);
      beep(659, 0.2, 'triangle', 0.14, 0.1);
      beep(784, 0.34, 'triangle', 0.16, 0.2);
    },
    sting() {
      beep(196, 0.4, 'sawtooth', 0.08);
      beep(147, 0.5, 'sawtooth', 0.08, 0.08);
    },
    smoke() {
      beep(320, 0.3, 'sine', 0.07);
    },
    emp() {
      beep(1200, 0.12, 'square', 0.05);
      beep(500, 0.2, 'square', 0.05, 0.1);
    },
    win() {
      beep(523, 0.22, 'triangle', 0.14);
      beep(659, 0.22, 'triangle', 0.14, 0.12);
      beep(784, 0.22, 'triangle', 0.14, 0.24);
      beep(1046, 0.5, 'triangle', 0.16, 0.36);
    },
    lose() {
      beep(220, 0.4, 'sawtooth', 0.1);
      beep(174, 0.7, 'sawtooth', 0.1, 0.18);
    },
    startAlarm() {
      const ctx = ensureContext();
      if (!ctx || muted || alarmNodes) return;
      const oscillator = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 660;
      lfo.type = 'sine';
      lfo.frequency.value = 2.2;
      lfoGain.gain.value = 180;
      gain.gain.value = 0.035;
      lfo.connect(lfoGain).connect(oscillator.frequency);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      lfo.start();
      alarmNodes = { oscillator, lfo, gain };
    },
    stopAlarm() {
      if (!alarmNodes) return;
      try {
        alarmNodes.oscillator.stop();
        alarmNodes.lfo.stop();
      } catch {
        // Already stopped.
      }
      alarmNodes = null;
    },
  };
}
