// Sound, synthesized live with WebAudio: no audio files, no network.
// A low room tone under everything, short blips for actions, a rising
// alarm when the meter climbs, and a small fanfare for the getaway.

let ctx = null;
let muted = false;
let toneNodes = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function tone(freq, seconds, type = 'sine', volume = 0.12, when = 0) {
  const ac = ensure();
  if (!ac || muted) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = ac.currentTime + when;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

export function startRoomTone() {
  const ac = ensure();
  if (!ac || muted || toneNodes) return;
  const osc = ac.createOscillator();
  const osc2 = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = 55;
  osc2.type = 'sine';
  osc2.frequency.value = 55.7;
  gain.gain.value = 0.035;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc2.start();
  toneNodes = { osc, osc2, gain };
}

export function setMuted(value) {
  muted = value;
  if (toneNodes) toneNodes.gain.gain.value = muted ? 0 : 0.035;
}

export function isMuted() {
  return muted;
}

export function playPickup() {
  tone(660, 0.12, 'sine', 0.14);
  tone(990, 0.18, 'sine', 0.12, 0.07);
}

export function playSapphire() {
  tone(523, 0.14, 'sine', 0.14);
  tone(659, 0.14, 'sine', 0.14, 0.09);
  tone(784, 0.22, 'sine', 0.14, 0.18);
  tone(1046, 0.3, 'sine', 0.12, 0.27);
}

export function playSmoke() {
  tone(220, 0.25, 'triangle', 0.1);
  tone(160, 0.3, 'triangle', 0.08, 0.05);
}

export function playEmp() {
  tone(1200, 0.1, 'square', 0.05);
  tone(300, 0.25, 'square', 0.06, 0.08);
}

export function playDecoy() {
  tone(1568, 0.12, 'sine', 0.09);
  tone(2093, 0.16, 'sine', 0.07, 0.08);
}

export function playAlarmTick() {
  tone(880, 0.09, 'square', 0.05);
}

export function playLockdown() {
  tone(440, 0.3, 'sawtooth', 0.08);
  tone(440, 0.3, 'sawtooth', 0.08, 0.35);
}

export function playCaught() {
  tone(330, 0.25, 'sawtooth', 0.12);
  tone(220, 0.4, 'sawtooth', 0.12, 0.2);
}

export function playWin() {
  const notes = [523, 659, 784, 1046, 1318];
  notes.forEach((n, i) => tone(n, 0.28, 'sine', 0.13, i * 0.11));
}
