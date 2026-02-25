export type RenderPreset = 'Crisp' | 'Classic' | 'Pixel';

export interface RenderVisualSettings {
  preset: RenderPreset;
  threshold: number;
  glowRadiusPx: number;
  glowStrength: number;
  auraStrength: number;
  edgeStrength: number;
  blobRadiusScale: number;
  pixelOffscreenScale: number;
  pixelNearest: boolean;
}

export type RenderVisualSettingKey = Exclude<keyof RenderVisualSettings, 'preset'>;

type RenderPresetValues = Omit<RenderVisualSettings, 'preset'>;

const PRESET_VALUES: Record<RenderPreset, RenderPresetValues> = {
  Crisp: {
    threshold: 0.48,
    glowRadiusPx: 2.6,
    glowStrength: 0.16,
    auraStrength: 0.30,
    edgeStrength: 0.62,
    blobRadiusScale: 0.88,
    pixelOffscreenScale: 1.0,
    pixelNearest: false,
  },
  Classic: {
    threshold: 0.35,
    glowRadiusPx: 4.0,
    glowStrength: 0.40,
    auraStrength: 0.80,
    edgeStrength: 0.50,
    blobRadiusScale: 1.0,
    pixelOffscreenScale: 1.0,
    pixelNearest: false,
  },
  Pixel: {
    threshold: 0.52,
    glowRadiusPx: 1.75,
    glowStrength: 0.08,
    auraStrength: 0.18,
    edgeStrength: 0.70,
    blobRadiusScale: 0.90,
    pixelOffscreenScale: 0.5,
    pixelNearest: true,
  },
};

export function createRenderVisualSettingsForPreset(preset: RenderPreset): RenderVisualSettings {
  return { preset, ...PRESET_VALUES[preset] };
}

export function createDefaultRenderVisualSettings(): RenderVisualSettings {
  return createRenderVisualSettingsForPreset('Crisp');
}

export function clampRenderVisualSettings(settings: RenderVisualSettings): RenderVisualSettings {
  return {
    preset: settings.preset,
    threshold: clamp(settings.threshold, 0.25, 0.75),
    glowRadiusPx: clamp(settings.glowRadiusPx, 0, 6),
    glowStrength: clamp(settings.glowStrength, 0, 1),
    auraStrength: clamp(settings.auraStrength, 0, 1),
    edgeStrength: clamp(settings.edgeStrength, 0, 1),
    blobRadiusScale: clamp(settings.blobRadiusScale, 0.7, 1.2),
    pixelOffscreenScale: clamp(settings.pixelOffscreenScale, 0.33, 1.0),
    pixelNearest: settings.pixelNearest,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
