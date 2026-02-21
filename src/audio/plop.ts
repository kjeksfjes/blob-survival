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

  // Short, low-volume "tick" with a gentle pitch drop.
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const baseFreq = 980 + Math.random() * 260; // 980–1240 Hz, varied
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(620, t + 0.028);

  // Very short envelope for a subtle click-like texture.
  const duration = 0.036;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.02, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

/** Play a subtle descending "beeeow" on death. Auto-throttled. */
export function beow() {
  const now = performance.now();
  if (now - lastBeowTime < MIN_INTERVAL) return;
  lastBeowTime = now;

  if (!ctx || ctx.state === 'suspended') return;

  const t = ctx.currentTime;

  // Soft, short descending tone: calmer than the old "beow".
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const baseFreq = 240 + Math.random() * 90;  // 240–330 Hz
  const endFreq = 130 + Math.random() * 55;   // 130–185 Hz
  const duration = 0.11 + Math.random() * 0.04; // 110–150ms
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.02, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}
