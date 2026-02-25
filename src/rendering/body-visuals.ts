export type BodyRenderPreset = 'Balanced' | 'Chunky' | 'Technical';

export interface BodyRenderSettings {
  preset: BodyRenderPreset;
  nodeRadiusMult: number;
  linkThicknessMult: number;
  edgeWidthFrac: number;
  edgeDarkness: number;
  moduleColors: boolean;
}

export type BodyRenderSettingKey = Exclude<keyof BodyRenderSettings, 'preset'>;

type BodyPresetValues = Omit<BodyRenderSettings, 'preset'>;

const PRESET_VALUES: Record<BodyRenderPreset, BodyPresetValues> = {
  Balanced: {
    nodeRadiusMult: 1.0,
    linkThicknessMult: 0.78,
    edgeWidthFrac: 0.18,
    edgeDarkness: 0.32,
    moduleColors: false,
  },
  Chunky: {
    nodeRadiusMult: 1.06,
    linkThicknessMult: 1.05,
    edgeWidthFrac: 0.16,
    edgeDarkness: 0.24,
    moduleColors: false,
  },
  Technical: {
    nodeRadiusMult: 0.94,
    linkThicknessMult: 0.62,
    edgeWidthFrac: 0.24,
    edgeDarkness: 0.44,
    moduleColors: false,
  },
};

export function createBodyRenderSettingsForPreset(preset: BodyRenderPreset): BodyRenderSettings {
  return { preset, ...PRESET_VALUES[preset] };
}

export function createDefaultBodyRenderSettings(): BodyRenderSettings {
  return createBodyRenderSettingsForPreset('Balanced');
}

export function clampBodyRenderSettings(settings: BodyRenderSettings): BodyRenderSettings {
  return {
    preset: settings.preset,
    nodeRadiusMult: clamp(settings.nodeRadiusMult, 0.75, 1.35),
    linkThicknessMult: clamp(settings.linkThicknessMult, 0.35, 1.5),
    edgeWidthFrac: clamp(settings.edgeWidthFrac, 0.02, 0.45),
    edgeDarkness: clamp(settings.edgeDarkness, 0, 0.8),
    moduleColors: settings.moduleColors,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
