export type ColorGamut = 'bt2020' | 'dci_p3' | 'bt709' | 'adobe_rgb';

export type EOTFCurve = 'pq_st2084' | 'hlg' | 'gamma24' | 'srgb';

export interface HDR10PlusMetadata {
  maxCLL: number; // Maximum Content Light Level in nits (e.g. 1000 - 10000)
  maxFALL: number; // Maximum Frame Average Light Level in nits (e.g. 400)
  targetedNits: number; // 1000, 2000, 4000, 10000
  diffuseWhiteNits: number; // Reference diffuse white (100 - 500 nits, fixes low brightness)
  brightnessBoost: number; // Master Nits Brightness Multiplier (1.0x - 4.0x)
  midtoneLift: number; // Midtone gamma lift (0.8 - 2.0)
  blackPedestal: number; // Shadow offset (-0.05 - 0.15)
  kneePointX: number; // 0.0 - 1.0 (input threshold where tone mapping begins)
  kneePointY: number; // 0.0 - 1.0 (output mapped luminance at knee point)
  bezierWeight: number; // Dynamic tone curve curvature
  specularBoost: number; // Highlight recovery multiplier (1.0 - 3.5)
  shadowRollOff: number; // Shadow detail recovery (0.8 - 2.0)
  saturationBoost: number; // Gamut expansion chroma boost (1.0 - 1.8)
  scenePercentiles: number[]; // [1%, 10%, 25%, 50%, 75%, 90%, 99%] light distribution

  // HDR Effect Engine
  hdrEffectEnabled: boolean;
  hdrPopIntensity: number; // Micro-contrast & local dynamic range pop (0.0 - 2.0)
  specularBloomIntensity: number; // Radiant glow on peak highlights (0.0 - 2.0)
  bloomThreshold: number; // Threshold for bloom trigger (0.4 - 0.95)
  colorVibrance: number; // Smart wide-gamut vibrance (1.0 - 1.8)

  // Sharpness & Upscaling
  sharpnessEnabled: boolean;
  sharpnessAmount: number; // Contrast Adaptive Sharpening (0.0 - 2.0)
  upscaleFactor: number; // 1.0, 1.5, 2.0, 4.0 (Super-Resolution upscale)
  upscaleAlgorithm: 'bicubic_cas' | 'edge_directed_sr' | 'bilinear';

  // Optical Flow 30 to 60 FPS Interpolation
  opticalFlowEnabled: boolean;
  targetFps: 30 | 60 | 120;
  flowSensitivity: number; // 0.5 - 2.0
  motionSmoothness: number; // 0.0 - 1.0
  showMotionVectors: boolean;
}

export interface LutPreset {
  id: string;
  name: string;
  category: 'cinema' | 'hdr_expansion' | 'vintage' | 'creative' | 'technical';
  description: string;
  thumbnailColor: string;
  previewGradient: string;
  cubeData?: Float32Array; // 3D texture raw data (size^3 * 4)
  cubeSize: number; // e.g., 17 or 33
  isCustom?: boolean;
}

export interface VideoExportOptions {
  presetName: string;
  width: number;
  height: number;
  label: string;
  aspectRatio: string;
  fps: number;
  bitrateMbps: number;
  fitMode: 'fit' | 'fill' | 'stretch';
  format: 'mp4' | 'webm';
  embedHDRMetadata: boolean;
  exportSidecarJSON: boolean;
  enableOpticalFlow60Fps: boolean;
  enableUpscaling: boolean;
  upscaleFactor: number;
  enableSharpness: boolean;
  sharpnessAmount: number;
}

export type ViewDisplayMode = 'android_mobile' | 'studio_fullscreen';

export type MonitoringMode = 'normal' | 'split_ab' | 'false_color' | 'sdr_only' | 'hdr_only';

export interface VideoSource {
  id: string;
  title: string;
  description: string;
  url: string;
  duration?: number;
  width?: number;
  height?: number;
  isCustomUpload?: boolean;
}
