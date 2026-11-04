import React, { useState } from 'react';
import { ColorGamut, HDR10PlusMetadata } from '../types';
import {
  Sparkles,
  Sun,
  Flame,
  Zap,
  Activity,
  Layers,
  Eye,
  Sliders,
  MoveUpRight,
  Gauge,
  Film
} from 'lucide-react';

interface HDR10PlusControlsProps {
  metadata: HDR10PlusMetadata;
  gamut: ColorGamut;
  onMetadataChange: (newMetadata: HDR10PlusMetadata) => void;
  onGamutChange: (gamut: ColorGamut) => void;
}

export const HDR10PlusControls: React.FC<HDR10PlusControlsProps> = ({
  metadata,
  gamut,
  onMetadataChange,
  onGamutChange,
}) => {
  const [subTab, setSubTab] = useState<'brightness_nits' | 'hdr_effect' | 'sharpness_upscale' | 'optical_flow'>('brightness_nits');

  const updateField = <K extends keyof HDR10PlusMetadata>(field: K, value: HDR10PlusMetadata[K]) => {
    onMetadataChange({
      ...metadata,
      [field]: value
    });
  };

  // SVG Bézier curve coordinates
  const width = 280;
  const height = 110;
  const kx = metadata.kneePointX * width;
  const ky = height - metadata.kneePointY * height;
  const endX = width;
  const endY = height - Math.min(1.0, metadata.specularBoost * 0.65) * height;

  const curvePath = `M 0 ${height} L ${kx} ${ky} Q ${kx + (endX - kx) * 0.45 * metadata.bezierWeight} ${ky * 0.6} ${endX} ${endY}`;

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#0e111a] rounded-2xl border border-slate-800 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
              HDR10+ Mastering Suite
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                BT.2020 PQ
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Brightness Nits, HDR Effect, Sharpness Upscaling & 60 FPS Optical Flow
            </p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px] font-medium">
        <button
          onClick={() => setSubTab('brightness_nits')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
            subTab === 'brightness_nits'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Brightness</span>
        </button>
        <button
          onClick={() => setSubTab('hdr_effect')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
            subTab === 'hdr_effect'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>HDR Pop</span>
        </button>
        <button
          onClick={() => setSubTab('sharpness_upscale')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
            subTab === 'sharpness_upscale'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Upscale</span>
        </button>
        <button
          onClick={() => setSubTab('optical_flow')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
            subTab === 'optical_flow'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>60 FPS</span>
        </button>
      </div>

      {/* 1. BRIGHTNESS NITS & TONE MAPPING PANEL */}
      {subTab === 'brightness_nits' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Notice banner addressing low brightness in PQ */}
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 flex items-start gap-2">
            <Sun className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Fix Low PQ Brightness:</strong> Standard SDR 100 nits appears dim on HDR displays. Boost <strong>Master Brightness</strong> or <strong>Diffuse White Nits</strong> below to elevate scene illumination to 250–400 Nits!
            </div>
          </div>

          {/* Master Nits Brightness Multiplier */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Master Brightness / Exposure Gain
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {((metadata.brightnessBoost || 1.0) * 100).toFixed(0)}% ({metadata.brightnessBoost?.toFixed(2)}x)
              </span>
            </div>
            <input
              type="range"
              min={1.0}
              max={3.5}
              step={0.05}
              value={metadata.brightnessBoost || 1.0}
              onChange={(e) => updateField('brightnessBoost', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 accent-amber-500 rounded cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>1.0x (Standard)</span>
              <span>2.0x (+100% Brightness)</span>
              <span>3.5x (Super Bright)</span>
            </div>
          </div>

          {/* Diffuse Paper White Level */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">Diffuse Reference Paper White</span>
              <span className="font-mono text-cyan-400 font-bold">
                {metadata.diffuseWhiteNits || 250} Nits
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 100, label: '100 Nits', desc: 'SDR Dark' },
                { val: 200, label: '200 Nits', desc: 'Studio Ref' },
                { val: 250, label: '250 Nits', desc: 'Vivid Rec.' },
                { val: 350, label: '350 Nits', desc: 'Daylight' },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => updateField('diffuseWhiteNits', item.val)}
                  className={`p-2 rounded-xl text-center border transition ${
                    (metadata.diffuseWhiteNits || 250) === item.val
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-mono">{item.label}</div>
                  <div className="text-[9px] opacity-75">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Peak Display Nits */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <span>Target Peak Display Luminance</span>
              <span className="font-mono text-amber-400 font-bold">{metadata.targetedNits} NITS PEAK</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1000, 2000, 4000, 10000].map((nits) => (
                <button
                  key={nits}
                  onClick={() => {
                    updateField('targetedNits', nits);
                    updateField('maxCLL', nits);
                  }}
                  className={`py-2 px-1 rounded-xl border text-center transition font-mono ${
                    metadata.targetedNits === nits
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs'
                  }`}
                >
                  <div className="text-xs font-extrabold">{nits}</div>
                  <div className="text-[8px] opacity-80">Nits</div>
                </button>
              ))}
            </div>
          </div>

          {/* Midtone Gamma Lift & Shadow Offset */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span>Midtone Lift</span>
                <span className="font-mono text-amber-400">{(metadata.midtoneLift || 1.2).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={2.0}
                step={0.05}
                value={metadata.midtoneLift || 1.2}
                onChange={(e) => updateField('midtoneLift', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-[9px] text-slate-400 block">Brightens faces & dark areas</span>
            </div>

            <div className="space-y-1 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span>Black Pedestal</span>
                <span className="font-mono text-amber-400">{((metadata.blackPedestal || 0.0) * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={-0.05}
                max={0.15}
                step={0.01}
                value={metadata.blackPedestal || 0.0}
                onChange={(e) => updateField('blackPedestal', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-[9px] text-slate-400 block">Recovers crushed shadow detail</span>
            </div>
          </div>

          {/* Color Gamut Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex justify-between">
              <span>Target Color Space Gamut</span>
              <span className="font-mono text-cyan-400 uppercase text-[10px]">{gamut} (10-Bit Wide)</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'bt2020', label: 'BT.2020', badge: 'HDR 10-Bit' },
                { id: 'dci_p3', label: 'DCI-P3', badge: 'Cinema P3' },
                { id: 'adobe_rgb', label: 'Adobe RGB', badge: 'Print Wide' },
                { id: 'bt709', label: 'Rec.709', badge: 'SDR Master' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => onGamutChange(item.id as ColorGamut)}
                  className={`p-2 rounded-xl text-left border transition flex flex-col ${
                    gamut === item.id
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className="text-[9px] opacity-75">{item.badge}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. HDR EFFECT & SPECULAR BLOOM PANEL */}
      {subTab === 'hdr_effect' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Master Toggle */}
          <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div>
              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                Enable HDR Effect & Specular Bloom
              </div>
              <div className="text-[11px] text-slate-400">
                Adds micro-contrast depth and radiant specular glow to bright lights
              </div>
            </div>
            <button
              onClick={() => updateField('hdrEffectEnabled', !metadata.hdrEffectEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                metadata.hdrEffectEnabled
                  ? 'bg-rose-500 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {metadata.hdrEffectEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* HDR Pop Intensity */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">HDR Pop (Micro-Contrast & Texture)</span>
              <span className="font-mono text-rose-400 font-bold">
                {((metadata.hdrPopIntensity || 0.8) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.0}
              max={2.0}
              step={0.05}
              value={metadata.hdrPopIntensity || 0.8}
              onChange={(e) => updateField('hdrPopIntensity', parseFloat(e.target.value))}
              disabled={!metadata.hdrEffectEnabled}
              className="w-full h-1.5 bg-slate-800 accent-rose-500 rounded cursor-pointer disabled:opacity-40"
            />
            <span className="text-[10px] text-slate-400 block">
              Gives standard video that punchy, three-dimensional HDR look
            </span>
          </div>

          {/* Specular Bloom Glow */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">Specular Highlight Bloom (Glow)</span>
              <span className="font-mono text-amber-400 font-bold">
                {((metadata.specularBloomIntensity || 0.7) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.0}
              max={2.0}
              step={0.05}
              value={metadata.specularBloomIntensity || 0.7}
              onChange={(e) => updateField('specularBloomIntensity', parseFloat(e.target.value))}
              disabled={!metadata.hdrEffectEnabled}
              className="w-full h-1.5 bg-slate-800 accent-amber-500 rounded cursor-pointer disabled:opacity-40"
            />
            <span className="text-[10px] text-slate-400 block">
              Simulates camera lens halo and specular flare on neon and sunlight
            </span>
          </div>

          {/* Bloom Threshold */}
          <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Bloom Trigger Cutoff Threshold</span>
              <span className="font-mono text-cyan-400">
                {((metadata.bloomThreshold || 0.7) * 100).toFixed(0)}% IRE
              </span>
            </div>
            <input
              type="range"
              min={0.4}
              max={0.95}
              step={0.02}
              value={metadata.bloomThreshold || 0.7}
              onChange={(e) => updateField('bloomThreshold', parseFloat(e.target.value))}
              disabled={!metadata.hdrEffectEnabled}
              className="w-full h-1.5 bg-slate-800 accent-cyan-400 rounded cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Wide Gamut Color Vibrance */}
          <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>BT.2020 Smart Vibrance</span>
              <span className="font-mono text-emerald-400">
                {(metadata.colorVibrance || 1.15).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.8}
              step={0.05}
              value={metadata.colorVibrance || 1.15}
              onChange={(e) => updateField('colorVibrance', parseFloat(e.target.value))}
              disabled={!metadata.hdrEffectEnabled}
              className="w-full h-1.5 bg-slate-800 accent-emerald-400 rounded cursor-pointer disabled:opacity-40"
            />
            <span className="text-[10px] text-slate-400 block">
              Saturates colors into wide gamut without clipping skin tones
            </span>
          </div>
        </div>
      )}

      {/* 3. SHARPNESS & VIDEO UPSCALING PANEL */}
      {subTab === 'sharpness_upscale' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Master Sharpening Toggle */}
          <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div>
              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                Contrast Adaptive Sharpening (CAS)
              </div>
              <div className="text-[11px] text-slate-400">
                High-frequency edge sharpener with anti-ringing halo clamp
              </div>
            </div>
            <button
              onClick={() => updateField('sharpnessEnabled', !metadata.sharpnessEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                metadata.sharpnessEnabled
                  ? 'bg-cyan-500 text-slate-950 shadow-lg'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {metadata.sharpnessEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Sharpness Slider */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">Sharpness Amount</span>
              <span className="font-mono text-cyan-400 font-bold">
                {((metadata.sharpnessAmount || 0.75) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.0}
              max={2.0}
              step={0.05}
              value={metadata.sharpnessAmount || 0.75}
              onChange={(e) => updateField('sharpnessAmount', parseFloat(e.target.value))}
              disabled={!metadata.sharpnessEnabled}
              className="w-full h-1.5 bg-slate-800 accent-cyan-400 rounded cursor-pointer disabled:opacity-40"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>0% (Soft)</span>
              <span>75% (Natural)</span>
              <span>150% (Crisp 4K)</span>
              <span>200% (Ultra)</span>
            </div>
          </div>

          {/* Video Upscaling Factor */}
          <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <MoveUpRight className="w-3.5 h-3.5 text-amber-400" />
                Super-Resolution Upscaling Factor
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {metadata.upscaleFactor || 1.0}x
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { factor: 1.0, label: '1.0x', desc: 'Native' },
                { factor: 1.5, label: '1.5x', desc: 'QHD 1440p' },
                { factor: 2.0, label: '2.0x', desc: '4K Super' },
                { factor: 4.0, label: '4.0x', desc: '8K Ultra' },
              ].map((item) => (
                <button
                  key={item.factor}
                  onClick={() => updateField('upscaleFactor', item.factor)}
                  className={`p-2 rounded-xl text-center border transition ${
                    (metadata.upscaleFactor || 1.0) === item.factor
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-mono font-bold">{item.label}</div>
                  <div className="text-[9px] opacity-80">{item.desc}</div>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-slate-400 pt-1">
              Reconstructs high-frequency pixels using bicubic edge-adaptive interpolation when previewing and exporting.
            </div>
          </div>
        </div>
      )}

      {/* 4. OPTICAL FLOW 30 TO 60 FPS INTERPOLATION PANEL */}
      {subTab === 'optical_flow' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Master Optical Flow Toggle */}
          <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div>
              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-400" />
                30 FPS to 60 FPS Optical Flow Interpolation
              </div>
              <div className="text-[11px] text-slate-400">
                Synthesizes intermediate frames with motion vector tracking
              </div>
            </div>
            <button
              onClick={() => updateField('opticalFlowEnabled', !metadata.opticalFlowEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                metadata.opticalFlowEnabled
                  ? 'bg-emerald-500 text-slate-950 shadow-lg'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {metadata.opticalFlowEnabled ? '60 FPS ON' : '30 FPS NATIVE'}
            </button>
          </div>

          {/* Flow Sensitivity */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">Motion Vector Sensitivity</span>
              <span className="font-mono text-emerald-400 font-bold">
                {(metadata.flowSensitivity || 1.0).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={metadata.flowSensitivity || 1.0}
              onChange={(e) => updateField('flowSensitivity', parseFloat(e.target.value))}
              disabled={!metadata.opticalFlowEnabled}
              className="w-full h-1.5 bg-slate-800 accent-emerald-500 rounded cursor-pointer disabled:opacity-40"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>0.5x (Subtle)</span>
              <span>1.0x (Standard)</span>
              <span>2.0x (Fast Action)</span>
            </div>
          </div>

          {/* Motion Vector Visualizer Toggle */}
          <div className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              Visualize Optical Flow Motion Vectors
            </span>
            <button
              onClick={() => updateField('showMotionVectors', !metadata.showMotionVectors)}
              disabled={!metadata.opticalFlowEnabled}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                metadata.showMotionVectors
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {metadata.showMotionVectors ? 'Vectors Visible' : 'Normal Video'}
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
            <strong>How Optical Flow Works:</strong> The shader computes temporal luminance gradients $(I_x, I_y, I_t)$ between consecutive frames to estimate pixel velocity vectors, then synthesizes in-between frames for buttery smooth 60 FPS playback and export!
          </div>
        </div>
      )}

      {/* Dynamic Tone Curve Graph (Always visible at bottom for reference) */}
      <div className="flex flex-col gap-1 bg-black/40 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-amber-400" />
            ST 2094-40 Bézier Tone Mapping Curve
          </span>
          <span className="text-amber-400 font-bold">Knee: {(metadata.kneePointX * 100).toFixed(0)}%</span>
        </div>

        <div className="relative w-full h-20 bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
            <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1={width / 2} y1="0" x2={width / 2} y2={height} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1={height} x2={width} y2="0" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            <path d={curvePath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
            <circle cx={kx} cy={ky} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Metadata Readout Pill */}
      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <div>MaxCLL: <span className="text-amber-400 font-semibold">{metadata.maxCLL} Nits</span></div>
        <div>White: <span className="text-cyan-400 font-semibold">{metadata.diffuseWhiteNits || 250} Nits</span></div>
        <div>Mode: <span className="text-emerald-400 font-semibold">{metadata.opticalFlowEnabled ? '60 FPS Flow' : '30 FPS'}</span></div>
      </div>
    </div>
  );
};
