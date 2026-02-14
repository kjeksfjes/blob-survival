// Create AudioContext eagerly at module load so the browser's navigation
// gesture is still fresh and the context starts in "running" state.
let ctx: AudioContext | null = null;
try { ctx = new AudioContext(); } catch { /* WebAudio unavailable */ }

// Fallback: resume on first user interaction if browser started it suspended
if (ctx) {
  const resume = () => { if (ctx!.state === 'suspended') ctx!.resume(); };
  document.addEventListener('pointerdown', resume, { once: true });
  document.addEventListener('keydown', resume, { once: true });
}

let lastPlopTime = 0;
let lastBeowTime = 0;
const MIN_INTERVAL = 60; // ms between sounds

/** Play a subtle water-droplet plop. Safe to call rapidly — auto-throttled. */
export function plop() {
  const now = performance.now();
  if (now - lastPlopTime < MIN_INTERVAL) return;
  lastPlopTime = now;

  if (!ctx || ctx.state === 'suspended') return;

  const t = ctx.currentTime;

  // Oscillator: quick pitch drop gives the "plop" character
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const baseFreq = 600 + Math.random() * 300; // 600–900 Hz, varied
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(250, t + 0.06);

  // Gain envelope: very short, subtle
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.07, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.09);
}

/** Play a subtle descending "beeeow" on death. Auto-throttled. */
export function beow() {
  const now = performance.now();
  if (now - lastBeowTime < MIN_INTERVAL) return;
  lastBeowTime = now;

  if (!ctx || ctx.state === 'suspended') return;

  const t = ctx.currentTime;

  // Triangle wave for a softer, whiny quality
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const baseFreq = 280 + Math.random() * 120; // 280–400 Hz
  const endFreq = 60 + Math.random() * 40;    // 60–100 Hz
  const duration = 0.2 + Math.random() * 0.08; // 200–280ms
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.035, t);
  gain.gain.setValueAtTime(0.035, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}
