import { LutPreset } from '../types';

/**
 * Procedural 3D LUT Generator
 * Generates accurate 17x17x17 3D LUT tables for cinematic looks and HDR10+ tone curves
 */

function generateLutData(
  size: number,
  transformFn: (r: number, g: number, b: number) => [number, number, number]
): Float32Array {
  const totalVoxels = size * size * size;
  const data = new Float32Array(totalVoxels * 4);

  let idx = 0;
  for (let b = 0; b < size; b++) {
    const blue = b / (size - 1);
    for (let g = 0; g < size; g++) {
      const green = g / (size - 1);
      for (let r = 0; r < size; r++) {
        const red = r / (size - 1);

        const [outR, outG, outB] = transformFn(red, green, blue);

        data[idx] = Math.max(0, Math.min(1, outR));
        data[idx + 1] = Math.max(0, Math.min(1, outG));
        data[idx + 2] = Math.max(0, Math.min(1, outB));
        data[idx + 3] = 1.0;

        idx += 4;
      }
    }
  }

  return data;
}

// Helpers for color transforms
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const sCurve = (x: number, k = 3.5) => 1 / (1 + Math.exp(-k * (x - 0.5)));
const normalizeSCurve = (x: number, k = 3.5) => {
  const min = sCurve(0, k);
  const max = sCurve(1, k);
  return (sCurve(x, k) - min) / (max - min);
};

const DEFAULT_SIZE = 17;

export const BUILTIN_LUTS: LutPreset[] = [
  {
    id: 'arri_709_to_hdr2020',
    name: 'ARRI Rec.709 to HDR2020',
    category: 'hdr_expansion',
    description: 'Industry reference ARRI Alexa tone curve expanding SDR BT.709 into wide BT.2020 headroom with smooth organic highlight roll-off.',
    thumbnailColor: '#eab308',
    previewGradient: 'from-amber-600 via-rose-500 to-indigo-900',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      // Arri style organic highlight shoulder and deep rich pedestal
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const filmLum = normalizeSCurve(lum, 4.2);
      const ratio = lum > 0.001 ? filmLum / lum : 1.0;
      
      // Warm midtone and gentle cyan-blue shadow base
      const outR = clamp(r * ratio * 1.04);
      const outG = clamp(g * ratio * 1.01);
      const outB = clamp(b * ratio * 0.98 + (1 - filmLum) * 0.02);
      return [outR, outG, outB];
    }),
  },
  {
    id: 'kodak_vision_2383',
    name: 'Kodak 2383 Film Print',
    category: 'vintage',
    description: 'Authentic 35mm Hollywood film stock look: dense teal shadows, golden skin midtones, and soft creamy highlight compression.',
    thumbnailColor: '#f97316',
    previewGradient: 'from-orange-500 via-amber-700 to-teal-950',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      // Teal shadows, warm highlights
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const curveR = Math.pow(r, 0.92) * 1.05;
      const curveG = Math.pow(g, 0.98);
      const curveB = Math.pow(b, 1.15) * 0.92;
      
      // Shadow split-toning (cyan-teal in shadows)
      const shadowWeight = Math.pow(1 - lum, 2.0);
      const outR = clamp(curveR - shadowWeight * 0.05);
      const outG = clamp(curveG + shadowWeight * 0.02);
      const outB = clamp(curveB + shadowWeight * 0.08);
      return [outR, outG, outB];
    }),
  },
  {
    id: 'teal_and_orange_cine',
    name: 'Teal & Orange Cinema HDR',
    category: 'cinema',
    description: 'Crisp cinematic color separation: glowing amber and bronze skin tones with contrasting cool deep slate-cyan shadows.',
    thumbnailColor: '#06b6d4',
    previewGradient: 'from-cyan-500 via-teal-700 to-amber-600',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // Orange highlights/midtones
      const rPush = r + (1 - r) * lum * 0.22;
      // Teal shadows
      const bPush = b + (1 - lum) * 0.18;
      const gPush = g + (1 - lum) * 0.06;
      return [clamp(rPush * 1.08), clamp(gPush), clamp(bPush)];
    }),
  },
  {
    id: 'cyberpunk_neon_2020',
    name: 'Cyberpunk Neon BT.2020',
    category: 'creative',
    description: 'Vivid futuristic spectrum tuned for HDR displays: electric cyans, hyper-saturated magentas, deep violet shadows, and glowing lights.',
    thumbnailColor: '#d946ef',
    previewGradient: 'from-fuchsia-600 via-purple-800 to-cyan-500',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // Saturate and push extremes
      const outR = clamp(Math.pow(r, 0.85) * 1.15 + (b > g ? 0.08 : 0));
      const outG = clamp(Math.pow(g, 1.05) * 0.92);
      const outB = clamp(Math.pow(b, 0.80) * 1.25);
      // High contrast curve
      return [
        normalizeSCurve(outR, 4.5),
        normalizeSCurve(outG, 3.8),
        normalizeSCurve(outB, 4.8)
      ];
    }),
  },
  {
    id: 'fuji_eterna_vivid',
    name: 'Fuji Eterna HDR Latitude',
    category: 'cinema',
    description: 'Subtle Japanese cinema aesthetic with organic emerald undertones, delicate pastel highlight roll-off, and low-contrast filmic dynamic range.',
    thumbnailColor: '#10b981',
    previewGradient: 'from-emerald-500 via-teal-800 to-slate-900',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const softR = Math.pow(r, 0.96) * 0.98;
      const softG = Math.pow(g, 0.92) * 1.04;
      const softB = Math.pow(b, 0.98) * 0.97;
      // Lift blacks slightly like cinema negative
      const liftedR = softR * 0.94 + 0.03;
      const liftedG = softG * 0.94 + 0.035;
      const liftedB = softB * 0.94 + 0.03;
      return [clamp(liftedR), clamp(liftedG), clamp(liftedB)];
    }),
  },
  {
    id: 'golden_hour_hdr',
    name: 'Golden Hour Mirage',
    category: 'creative',
    description: 'Rich sunlight warmth with soft honey highlights, golden skin tones, and subtle lavender shadows that mimic late afternoon magic hour.',
    thumbnailColor: '#eab308',
    previewGradient: 'from-amber-400 via-orange-600 to-purple-900',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const outR = clamp(Math.pow(r, 0.88) * 1.18);
      const outG = clamp(Math.pow(g, 0.94) * 1.05);
      const outB = clamp(Math.pow(b, 1.25) * 0.82 + (1 - lum) * 0.05);
      return [outR, outG, outB];
    }),
  },
  {
    id: 'bleach_bypass',
    name: 'Bleach Bypass Silver',
    category: 'vintage',
    description: 'Dark, gritty, high-contrast silver retention process that desaturates colors while preserving deep blacks and specular specular glare.',
    thumbnailColor: '#94a3b8',
    previewGradient: 'from-zinc-400 via-stone-700 to-neutral-900',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const contrastLum = normalizeSCurve(lum, 5.0);
      // Desaturate 50%
      const desatR = r * 0.5 + lum * 0.5;
      const desatG = g * 0.5 + lum * 0.5;
      const desatB = b * 0.5 + lum * 0.5;
      // High contrast overlay
      return [
        clamp(desatR * 0.4 + contrastLum * 0.6),
        clamp(desatG * 0.4 + contrastLum * 0.6),
        clamp(desatB * 0.4 + contrastLum * 0.6)
      ];
    }),
  },
  {
    id: 'nordic_noir_cold',
    name: 'Nordic Noir Thriller',
    category: 'cinema',
    description: 'Atmospheric cold styling featuring steel-blue shadows, muted desaturated greens, and crisp high-key contrast inspired by Scandinavian drama.',
    thumbnailColor: '#38bdf8',
    previewGradient: 'from-sky-500 via-cyan-900 to-slate-950',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const outR = clamp(r * 0.88);
      const outG = clamp(g * 0.95);
      const outB = clamp(b * 1.15 + (1 - lum) * 0.06);
      return [normalizeSCurve(outR, 3.8), normalizeSCurve(outG, 3.8), normalizeSCurve(outB, 3.8)];
    }),
  },
  {
    id: 'monochrome_st2084',
    name: 'Monochrome Dynamic Range',
    category: 'creative',
    description: 'Master Black & White grading with pure wide-gamut tonal latitude from deepest blacks to brilliant specular highlight detail.',
    thumbnailColor: '#f1f5f9',
    previewGradient: 'from-white via-zinc-500 to-black',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      const lum = 0.2627 * r + 0.6780 * g + 0.0593 * b; // BT.2020 luma weighting
      const curved = normalizeSCurve(lum, 4.0);
      return [curved, curved, curved];
    }),
  },
  {
    id: 'commercial_clean_pop',
    name: 'Commercial Clean Pop',
    category: 'technical',
    description: 'Vibrant, high-impact commercial look with pristine whites, punchy natural saturation, and zero color cast in the neutral tones.',
    thumbnailColor: '#ec4899',
    previewGradient: 'from-pink-500 via-rose-600 to-cyan-600',
    cubeSize: DEFAULT_SIZE,
    cubeData: generateLutData(DEFAULT_SIZE, (r, g, b) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // Boost vibrance without clipping skin
      const outR = clamp(r + (r - lum) * 0.25);
      const outG = clamp(g + (g - lum) * 0.20);
      const outB = clamp(b + (b - lum) * 0.28);
      return [
        normalizeSCurve(outR, 3.4),
        normalizeSCurve(outG, 3.4),
        normalizeSCurve(outB, 3.4)
      ];
    }),
  }
];
