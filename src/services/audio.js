// Zero-asset audio: a synthesized ambient drone/bed plus a few short SFX
// blips, generated entirely with the Web Audio API oscillators/noise —
// no sound files to host or download. Narration read-aloud rides the same
// on/off toggle via the browser's built-in SpeechSynthesis.
//
// Everything here is best-effort and fire-and-forget: any failure (no
// AudioContext support, autoplay policy blocking until a user gesture, etc.)
// is swallowed rather than surfaced, since sound is a nice-to-have and must
// never interrupt gameplay.

const STORAGE_KEY = "dnd-audio-enabled";
let ctx = null;
let masterGain = null;
let ambienceNodes = null;
let enabled = false;

function getCtx() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.22;
  masterGain.connect(ctx.destination);
  return ctx;
}

export function isAudioEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAudioEnabled(on) {
  enabled = !!on;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore — the toggle just won't persist across reloads
  }
  try {
    if (enabled) startAmbience();
    else stopAmbience();
  } catch {
    // audio is best-effort — never let it break the toggle
  }
  if (!enabled && window.speechSynthesis) window.speechSynthesis.cancel();
}

function startAmbience() {
  const c = getCtx();
  if (!c || ambienceNodes) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const droneGain = c.createGain();
  droneGain.gain.value = 0.05;
  const osc1 = c.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 55;
  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 82.5;
  osc1.connect(droneGain);
  osc2.connect(droneGain);
  droneGain.connect(masterGain);

  const bufferSize = 2 * c.sampleRate;
  const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 400;
  const noiseGain = c.createGain();
  noiseGain.gain.value = 0.03;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);

  osc1.start();
  osc2.start();
  noise.start();
  ambienceNodes = { osc1, osc2, noise };
}

function stopAmbience() {
  if (!ambienceNodes) return;
  try {
    ambienceNodes.osc1.stop();
    ambienceNodes.osc2.stop();
    ambienceNodes.noise.stop();
  } catch {
    // already stopped — fine
  }
  ambienceNodes = null;
}

const SFX_PRESETS = {
  diceRoll: { type: "square", freq: 220, dur: 0.08, gain: 0.08 },
  hit: { type: "sawtooth", freq: 110, dur: 0.15, gain: 0.12 },
  levelUp: { type: "sine", freq: 660, dur: 0.4, gain: 0.1, sweepUp: true },
  xp: { type: "triangle", freq: 880, dur: 0.15, gain: 0.08 },
};

export function playSfx(kind) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const p = SFX_PRESETS[kind] || SFX_PRESETS.diceRoll;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(masterGain);
  osc.type = p.type;
  osc.frequency.setValueAtTime(p.freq, now);
  if (p.sweepUp) osc.frequency.exponentialRampToValueAtTime(p.freq * 2, now + p.dur);
  gain.gain.setValueAtTime(p.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + p.dur);
  osc.start(now);
  osc.stop(now + p.dur + 0.02);
}

/** Reads narration text aloud, if the audio toggle is on and the browser supports it. */
export function speakNarration(text) {
  if (!enabled || !window.speechSynthesis || !text?.trim()) return;
  try {
    window.speechSynthesis.cancel(); // don't stack up overlapping lines
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch {
    // speech synthesis is best-effort too
  }
}
