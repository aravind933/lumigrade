import { ColorGamut, HDR10PlusMetadata } from '../types';

/**
 * Professional Color Space Transformation Matrices
 * Reference: ITU-R BT.2087 & SMPTE RP 2091
 */

// BT.709 to BT.2020 (Expanded Gamut)
export const MATRIX_BT709_TO_BT2020 = [
  0.6274040, 0.3292820, 0.0433136,
  0.0690970, 0.9195400, 0.0113619,
  0.0163916, 0.0880132, 0.8955952
];

// BT.709 to DCI-P3 (Cinema Gamut)
export const MATRIX_BT709_TO_DCIP3 = [
  0.822462, 0.177538, 0.000000,
  0.033194, 0.966806, 0.000000,
  0.017083, 0.072397, 0.910520
];

// BT.709 Identity Matrix
export const MATRIX_IDENTITY = [
  1.0, 0.0, 0.0,
  0.0, 1.0, 0.0,
  0.0, 0.0, 1.0
];

// BT.709 to Adobe RGB
export const MATRIX_BT709_TO_ADOBE_RGB = [
  0.715124, 0.284876, 0.000000,
  0.000000, 1.000000, 0.000000,
  0.000000, 0.041157, 0.958843
];

export function getGamutMatrix(gamut: ColorGamut): number[] {
  switch (gamut) {
    case 'bt2020':
      return MATRIX_BT709_TO_BT2020;
    case 'dci_p3':
      return MATRIX_BT709_TO_DCIP3;
    case 'adobe_rgb':
      return MATRIX_BT709_TO_ADOBE_RGB;
    case 'bt709':
    default:
      return MATRIX_IDENTITY;
  }
}

/**
 * SMPTE ST 2084 (Perceptual Quantizer / PQ) EOTF
 * Converts normalized PQ code value [0.0 - 1.0] to Luminance in Nits (0 - 10,000)
 */
export function pqToNits(pq: number): number {
  const m1 = 2610 / 16384; // 0.1593017578125
  const m2 = (2523 / 4096) * 128; // 78.84375
  const c1 = 3424 / 4096; // 0.8359375
  const c2 = (2413 / 4096) * 32; // 18.8515625
  const c3 = (2392 / 4096) * 32; // 18.6875

  const p = Math.pow(Math.max(0, Math.min(1, pq)), 1 / m2);
  const num = Math.max(0, p - c1);
  const den = c2 - c3 * p;
  if (den <= 0) return 10000;
  return Math.pow(num / den, 1 / m1) * 10000;
}

/**
 * Inverse SMPTE ST 2084 (OETF)
 * Converts Luminance in Nits (0 - 10,000) to normalized PQ code value [0.0 - 1.0]
 */
export function nitsToPQ(nits: number): number {
  const m1 = 2610 / 16384;
  const m2 = (2523 / 4096) * 128;
  const c1 = 3424 / 4096;
  const c2 = (2413 / 4096) * 32;
  const c3 = (2392 / 4096) * 32;

  const y = Math.max(0, Math.min(10000, nits)) / 10000;
  const ym1 = Math.pow(y, m1);
  const num = c1 + c2 * ym1;
  const den = 1 + c3 * ym1;
  return Math.pow(num / den, m2);
}

/**
 * Generates SMPTE ST 2094-40 (HDR10+) Compliant Metadata JSON structure
 */
export function generateHDR10PlusJSON(metadata: HDR10PlusMetadata, videoTitle: string) {
  return {
    version: 'SMPTE ST 2094-40:2020',
    colorStandard: 'BT.2020',
    transferCharacteristics: 'SMPTE ST 2084 (PQ)',
    videoTitle,
    generatedAt: new Date().toISOString(),
    TargetedSystemDisplay: {
      MaximumLuminance: metadata.targetedNits,
      MinimumLuminance: 0.0001,
      ColorPrimaries: {
        Red: [0.708, 0.292],
        Green: [0.170, 0.797],
        Blue: [0.131, 0.046],
        WhitePoint: [0.3127, 0.3290]
      }
    },
    SceneDynamicMetadata: {
      MaxCLL_Nits: metadata.maxCLL,
      MaxFALL_Nits: metadata.maxFALL,
      DiffuseWhite_Nits: metadata.diffuseWhiteNits || 250,
      MasterBrightnessGain: Number((metadata.brightnessBoost || 1.35).toFixed(2)),
      ToneMapping: {
        KneePoint_x: Number(metadata.kneePointX.toFixed(3)),
        KneePoint_y: Number(metadata.kneePointY.toFixed(3)),
        BezierCurveWeight: Number(metadata.bezierWeight.toFixed(2)),
        SpecularHeadroomMultiplier: Number(metadata.specularBoost.toFixed(2)),
        ShadowExpansion: Number(metadata.shadowRollOff.toFixed(2)),
        MidtoneGammaLift: Number((metadata.midtoneLift || 1.25).toFixed(2)),
        DistributionPercentiles_Nits: {
          p01: Math.round(metadata.scenePercentiles[0] * metadata.maxCLL * 0.01),
          p10: Math.round(metadata.scenePercentiles[1] * metadata.maxCLL * 0.05),
          p25: Math.round(metadata.scenePercentiles[2] * metadata.maxCLL * 0.15),
          p50: Math.round(metadata.scenePercentiles[3] * metadata.maxCLL * 0.40),
          p75: Math.round(metadata.scenePercentiles[4] * metadata.maxCLL * 0.65),
          p90: Math.round(metadata.scenePercentiles[5] * metadata.maxCLL * 0.85),
          p99: Math.round(metadata.scenePercentiles[6] * metadata.maxCLL * 0.98),
        }
      },
      ImageEnhancement: {
        HDREffectPop: metadata.hdrEffectEnabled,
        HDRPopIntensity: metadata.hdrPopIntensity,
        SpecularBloomIntensity: metadata.specularBloomIntensity,
        ContrastAdaptiveSharpening: metadata.sharpnessEnabled,
        SharpeningAmount: metadata.sharpnessAmount,
        UpscalingFactor: metadata.upscaleFactor,
        OpticalFlow60FpsInterpolated: metadata.opticalFlowEnabled
      }
    },
    AndroidIntegration: {
      mediaCodecProfile: 'VP9Profile2HDR10Plus / HEVCProfileMain10HDR10Plus',
      colorTransfer: 'COLOR_TRANSFER_ST2084',
      colorStandard: 'COLOR_STANDARD_BT2020',
      frameRate: metadata.opticalFlowEnabled ? 60 : 30
    }
  };
}

/**
 * False Color Scale Mapping for HDR Exposure
 * Professional grading monitor IRE/Nits reference:
 * - 0 - 20 Nits: Deep shadows / Sub-black (Purple / Deep Blue)
 * - 20 - 100 Nits: SDR reference range (Dark Cyan / Teal)
 * - 100 - 300 Nits: Normal Midtones & Skin Tones (Green 40-70 IRE)
 * - 300 - 700 Nits: High Dynamic Range specular highlights (Yellow / Amber)
 * - 700 - 1000 Nits: HDR Peak range (Orange)
 * - >1000 Nits: Clipping warning (Magenta / Red)
 */
export const FALSE_COLOR_STEPS = [
  { label: 'Sub-black / Clip (<5 Nits)', color: '#4c1d95', nits: '0-5' },
  { label: 'Deep Shadows (5-50 Nits)', color: '#1d4ed8', nits: '5-50' },
  { label: 'SDR Range (50-100 Nits)', color: '#06b6d4', nits: '50-100' },
  { label: 'Skin Tones (100-250 Nits)', color: '#22c55e', nits: '100-250' },
  { label: 'HDR Highlights (250-600 Nits)', color: '#eab308', nits: '250-600' },
  { label: 'HDR Peak (600-1000 Nits)', color: '#f97316', nits: '600-1000' },
  { label: 'Highlight Clip (>1000 Nits)', color: '#ef4444', nits: '>1000' },
];
