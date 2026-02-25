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

type Variant = {
  oscType: OscillatorType;
  startFreqMin: number;
  startFreqMax: number;
  endFreqMin: number;
  endFreqMax: number;
  durationMin: number;
  durationMax: number;
  attack: number;
  peakGain: number;
};

export type DeathCause = 'starvation' | 'killed' | 'old_age' | 'generic';

const BIRTH_VARIANTS: readonly Variant[] = [
  // birth_v1: brighter tick, short drop.
  {
    oscType: 'triangle',
    startFreqMin: 1020,
    startFreqMax: 1260,
    endFreqMin: 610,
    endFreqMax: 700,
    durationMin: 0.032,
    durationMax: 0.040,
    attack: 0.0035,
    peakGain: 0.020,
  },
  // birth_v2: softer sine-led attack.
  {
    oscType: 'sine',
    startFreqMin: 930,
    startFreqMax: 1160,
    endFreqMin: 560,
    endFreqMax: 650,
    durationMin: 0.036,
    durationMax: 0.045,
    attack: 0.005,
    peakGain: 0.018,
  },
  // birth_v3: short, slightly lower-gain triangle.
  {
    oscType: 'triangle',
    startFreqMin: 980,
    startFreqMax: 1180,
    endFreqMin: 590,
    endFreqMax: 680,
    durationMin: 0.029,
    durationMax: 0.036,
    attack: 0.003,
    peakGain: 0.017,
  },
];

const DEATH_VARIANTS: Record<DeathCause, readonly Variant[]> = {
  starvation: [
    {
      oscType: 'sine',
      startFreqMin: 260,
      startFreqMax: 330,
      endFreqMin: 145,
      endFreqMax: 190,
      durationMin: 0.10,
      durationMax: 0.13,
      attack: 0.008,
      peakGain: 0.017,
    },
    {
      oscType: 'triangle',
      startFreqMin: 240,
      startFreqMax: 305,
      endFreqMin: 130,
      endFreqMax: 175,
      durationMin: 0.11,
      durationMax: 0.14,
      attack: 0.009,
      peakGain: 0.016,
    },
    {
      oscType: 'sine',
      startFreqMin: 225,
      startFreqMax: 290,
      endFreqMin: 125,
      endFreqMax: 165,
      durationMin: 0.115,
      durationMax: 0.145,
      attack: 0.0095,
      peakGain: 0.016,
    },
  ],
  killed: [
    {
      oscType: 'sawtooth',
      startFreqMin: 205,
      startFreqMax: 265,
      endFreqMin: 108,
      endFreqMax: 145,
      durationMin: 0.10,
      durationMax: 0.13,
      attack: 0.007,
      peakGain: 0.019,
    },
    {
      oscType: 'sawtooth',
      startFreqMin: 215,
      startFreqMax: 280,
      endFreqMin: 115,
      endFreqMax: 150,
      durationMin: 0.105,
      durationMax: 0.135,
      attack: 0.0075,
      peakGain: 0.020,
    },
    {
      oscType: 'sawtooth',
      startFreqMin: 220,
      startFreqMax: 288,
      endFreqMin: 112,
      endFreqMax: 148,
      durationMin: 0.11,
      durationMax: 0.14,
      attack: 0.008,
      peakGain: 0.020,
    },
  ],
  old_age: [
    {
      oscType: 'sine',
      startFreqMin: 250,
      startFreqMax: 320,
      endFreqMin: 150,
      endFreqMax: 198,
      durationMin: 0.12,
      durationMax: 0.16,
      attack: 0.010,
      peakGain: 0.018,
    },
    {
      oscType: 'triangle',
      startFreqMin: 245,
      startFreqMax: 315,
      endFreqMin: 148,
      endFreqMax: 192,
      durationMin: 0.125,
      durationMax: 0.165,
      attack: 0.0105,
      peakGain: 0.018,
    },
    {
      oscType: 'sine',
      startFreqMin: 235,
      startFreqMax: 305,
      endFreqMin: 142,
      endFreqMax: 186,
      durationMin: 0.12,
      durationMax: 0.158,
      attack: 0.010,
      peakGain: 0.017,
    },
  ],
  generic: [
    {
      oscType: 'sine',
      startFreqMin: 240,
      startFreqMax: 330,
      endFreqMin: 130,
      endFreqMax: 185,
      durationMin: 0.11,
      durationMax: 0.15,
      attack: 0.01,
      peakGain: 0.02,
    },
    {
      oscType: 'triangle',
      startFreqMin: 230,
      startFreqMax: 310,
      endFreqMin: 125,
      endFreqMax: 178,
      durationMin: 0.11,
      durationMax: 0.15,
      attack: 0.009,
      peakGain: 0.019,
    },
    {
      oscType: 'sine',
      startFreqMin: 220,
      startFreqMax: 300,
      endFreqMin: 118,
      endFreqMax: 172,
      durationMin: 0.115,
      durationMax: 0.152,
      attack: 0.0095,
      peakGain: 0.019,
    },
  ],
};

let lastBirthVariantIndex = -1;
const lastDeathVariantIndexByCause: Record<DeathCause, number> = {
  starvation: -1,
  killed: -1,
  old_age: -1,
  generic: -1,
};

function randIn(min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}

function pickVariantNoImmediateRepeat(
  variants: readonly Variant[],
  lastIndex: number,
): [Variant, number] {
  if (variants.length === 0) throw new Error('No audio variants configured');
  if (variants.length === 1) return [variants[0], 0];
  let idx = Math.floor(Math.random() * variants.length);
  if (idx === lastIndex) idx = (idx + 1 + Math.floor(Math.random() * (variants.length - 1))) % variants.length;
  return [variants[idx], idx];
}

function playVariant(variant: Variant, atTime?: number): void {
  if (!ctx || ctx.state === 'suspended') return;
  const t = atTime ?? ctx.currentTime;
  const duration = randIn(variant.durationMin, variant.durationMax);
  const startFreq = randIn(variant.startFreqMin, variant.startFreqMax);
  const endFreq = randIn(variant.endFreqMin, variant.endFreqMax);

  const osc = ctx.createOscillator();
  osc.type = variant.oscType;
  osc.frequency.setValueAtTime(startFreq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(variant.peakGain, t + Math.max(0.001, variant.attack));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

/** Play a subtle water-droplet plop. Safe to call rapidly — auto-throttled. */
export function plop() {
  const now = performance.now();
  if (now - lastPlopTime < MIN_INTERVAL) return;
  lastPlopTime = now;

  if (!ctx || ctx.state === 'suspended') return;
  const [variant, idx] = pickVariantNoImmediateRepeat(BIRTH_VARIANTS, lastBirthVariantIndex);
  lastBirthVariantIndex = idx;
  playVariant(variant, ctx.currentTime);
}

/** Play a subtle descending death tone. Auto-throttled. */
export function beow(cause: DeathCause = 'generic') {
  const now = performance.now();
  if (now - lastBeowTime < MIN_INTERVAL) return;
  lastBeowTime = now;

  if (!ctx || ctx.state === 'suspended') return;

  const normalizedCause: DeathCause = DEATH_VARIANTS[cause] ? cause : 'generic';
  const variants = DEATH_VARIANTS[normalizedCause];
  const [variant, idx] = pickVariantNoImmediateRepeat(
    variants,
    lastDeathVariantIndexByCause[normalizedCause],
  );
  lastDeathVariantIndexByCause[normalizedCause] = idx;
  playVariant(variant, ctx.currentTime);
}
