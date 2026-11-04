import React, { useState } from 'react';
import {
  X,
  Download,
  Film,
  Sparkles,
  Settings2,
  FileCheck,
  AlertCircle,
  Smartphone,
  Monitor,
  Tv,
  CheckCircle2,
  Ratio,
  Gauge,
  Zap,
  Flame,
  Sun,
  MoveUpRight
} from 'lucide-react';
import { ColorGamut, HDR10PlusMetadata, VideoExportOptions } from '../types';
import { EXPORT_PRESETS, ExportProgress, VideoExporter } from '../utils/videoExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceVideoElement: HTMLVideoElement | null;
  metadata: HDR10PlusMetadata;
  gamut: ColorGamut;
  useLut: boolean;
  lutData?: Float32Array;
  lutSize: number;
  lutIntensity: number;
  lutName: string;
  exposure: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sourceVideoElement,
  metadata,
  gamut,
  useLut,
  lutData,
  lutSize,
  lutIntensity,
  lutName,
  exposure
}) => {
  if (!isOpen) return null;

  const [selectedPresetName, setSelectedPresetName] = useState('FHD_1080P');
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [isCustomResolution, setIsCustomResolution] = useState(false);
  const [fitMode, setFitMode] = useState<'fit' | 'fill' | 'stretch'>('fit');
  const [fps, setFps] = useState(30);
  const [bitrateMbps, setBitrateMbps] = useState(18);
  const [exportSidecarJSON, setExportSidecarJSON] = useState(true);

  // New Export Features
  const [enableOpticalFlow60Fps, setEnableOpticalFlow60Fps] = useState(metadata.opticalFlowEnabled ?? true);
  const [enableUpscaling, setEnableUpscaling] = useState(metadata.upscaleFactor > 1.0);
  const [upscaleFactor, setUpscaleFactor] = useState(metadata.upscaleFactor || 1.5);
  const [enableSharpness, setEnableSharpness] = useState(metadata.sharpnessEnabled ?? true);
  const [sharpnessAmount, setSharpnessAmount] = useState(metadata.sharpnessAmount || 0.75);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedJsonUrl, setExportedJsonUrl] = useState<string | null>(null);
  const [exporterInstance, setExporterInstance] = useState<VideoExporter | null>(null);

  const currentPreset = EXPORT_PRESETS.find((p) => p.presetName === selectedPresetName) || EXPORT_PRESETS[2];

  const handleStartExport = async () => {
    if (!sourceVideoElement) return;

    const baseWidth = isCustomResolution ? customWidth : currentPreset.width;
    const baseHeight = isCustomResolution ? customHeight : currentPreset.height;

    const options: VideoExportOptions = {
      presetName: isCustomResolution ? `Custom_${baseWidth}x${baseHeight}` : currentPreset.presetName,
      width: baseWidth,
      height: baseHeight,
      label: isCustomResolution ? 'Custom Resolution' : currentPreset.label,
      aspectRatio: isCustomResolution ? `${baseWidth}:${baseHeight}` : currentPreset.aspectRatio,
      fps: enableOpticalFlow60Fps ? 60 : fps,
      bitrateMbps,
      fitMode,
      format: 'webm',
      embedHDRMetadata: true,
      exportSidecarJSON,
      enableOpticalFlow60Fps,
      enableUpscaling,
      upscaleFactor: enableUpscaling ? upscaleFactor : 1.0,
      enableSharpness,
      sharpnessAmount
    };

    setIsExporting(true);
    setProgress({
      progressPercent: 0,
      currentSecond: 0,
      totalDuration: sourceVideoElement.duration || 5,
      isCompleted: false,
      isError: false,
      currentFps: enableOpticalFlow60Fps ? 60 : fps
    });

    const exporter = new VideoExporter();
    setExporterInstance(exporter);

    try {
      const result = await exporter.exportVideo(
        sourceVideoElement,
        options,
        {
          metadata,
          gamut,
          useLut,
          lutData,
          lutSize,
          lutIntensity,
          exposure
        },
        (prog) => setProgress(prog)
      );

      setExportedVideoUrl(result.videoBlobUrl);
      if (result.jsonMetadataUrl) {
        setExportedJsonUrl(result.jsonMetadataUrl);
      }
      setIsExporting(false);
    } catch (err: any) {
      console.error('Export failed:', err);
      setIsExporting(false);
      setProgress((prev) => ({
        ...(prev || {
          progressPercent: 0,
          currentSecond: 0,
          totalDuration: 1,
          isCompleted: false,
        }),
        isError: true,
        errorMessage: err.message || 'Video export encountered an error'
      }));
    }
  };

  const handleCancelExport = () => {
    if (exporterInstance) {
      exporterInstance.cancel();
      setIsExporting(false);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#0c0e17] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#111420]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Export Master Video
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  HDR10+ BT.2020 PQ
                </span>
                {enableOpticalFlow60Fps && (
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    60 FPS FLOW
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Multi-Resolution, Optical Flow 60 FPS, CAS Sharpness & Nits Boost</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Export Status / Progress View */}
          {progress && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  {progress.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : progress.isError ? (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  )}
                  {progress.isCompleted
                    ? 'Export Complete! Ready to Download'
                    : progress.isError
                    ? 'Export Error'
                    : `Encoding HDR10+ Video Frames (${progress.currentFps || 30} FPS)...`}
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {progress.progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    progress.isCompleted
                      ? 'bg-emerald-500'
                      : progress.isError
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500'
                  }`}
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>
                  Rendered: {progress.currentSecond.toFixed(1)}s / {progress.totalDuration.toFixed(1)}s
                  {progress.upscaledResolution && ` • ${progress.upscaledResolution}`}
                </span>
                {progress.fileSizeMb && (
                  <span className="text-emerald-400 font-semibold">{progress.fileSizeMb} MB</span>
                )}
              </div>

              {progress.isError && (
                <div className="space-y-2">
                  <div className="text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-800/60">
                    {progress.errorMessage}
                  </div>
                  <button
                    onClick={() => setProgress(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    Adjust Settings & Try Again
                  </button>
                </div>
              )}

              {/* Download Buttons once complete */}
              {progress.isCompleted && exportedVideoUrl && (
                <div className="pt-2 flex flex-wrap gap-2.5">
                  <button
                    onClick={() =>
                      downloadFile(
                        exportedVideoUrl,
                        `HDR10Plus_${currentPreset.presetName}_${enableOpticalFlow60Fps ? '60FPS' : '30FPS'}_${Date.now()}.webm`
                      )
                    }
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    Download Video ({progress.fileSizeMb} MB)
                  </button>

                  {exportedJsonUrl && (
                    <button
                      onClick={() =>
                        downloadFile(
                          exportedJsonUrl,
                          `HDR10Plus_ST2094-40_Metadata_${Date.now()}.json`
                        )
                      }
                      className="flex items-center gap-2 py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                      HDR10+ JSON Sidecar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Configuration Form */}
          {!isExporting && !progress?.isCompleted && (
            <>
              {/* 1. Multiple Export Video Size Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Ratio className="w-4 h-4 text-amber-400" />
                    Export Video Resolution & Aspect Ratio
                  </label>
                  <button
                    onClick={() => setIsCustomResolution(!isCustomResolution)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    {isCustomResolution ? 'Use Standard Presets' : 'Custom Dimensions'}
                  </button>
                </div>

                {!isCustomResolution ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {EXPORT_PRESETS.map((preset) => {
                      const isSelected = selectedPresetName === preset.presetName;
                      return (
                        <button
                          key={preset.presetName}
                          onClick={() => {
                            setSelectedPresetName(preset.presetName);
                            setBitrateMbps(preset.recommendedBitrate);
                          }}
                          className={`p-3 rounded-2xl border text-left flex items-start justify-between transition ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/30'
                              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1.5">
                              {preset.label}
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400">
                                {preset.aspectRatio}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {preset.width} × {preset.height} px
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                              {preset.description}
                            </div>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-slate-400">Width (pixels)</label>
                      <input
                        type="number"
                        min={320}
                        max={7680}
                        step={2}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(parseInt(e.target.value, 10))}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100"
                      />
                    </div>
                    <span className="text-slate-600 font-bold mt-5">×</span>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-slate-400">Height (pixels)</label>
                      <input
                        type="number"
                        min={240}
                        max={4320}
                        step={2}
                        value={customHeight}
                        onChange={(e) => setCustomHeight(parseInt(e.target.value, 10))}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Optical Flow 60 FPS, Upscaling & Sharpness Toggles */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  Motion & Resolution Enhancers
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Optical Flow 60 FPS Toggle */}
                  <label className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableOpticalFlow60Fps}
                      onChange={(e) => setEnableOpticalFlow60Fps(e.target.checked)}
                      className="mt-0.5 accent-emerald-500 rounded"
                    />
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        60 FPS Optical Flow
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                          Motion Synthesizer
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Converts 30 fps video to 60 fps using bidirectional motion vectors
                      </div>
                    </div>
                  </label>

                  {/* Super-Resolution Upscaling Toggle */}
                  <label className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableUpscaling}
                      onChange={(e) => setEnableUpscaling(e.target.checked)}
                      className="mt-0.5 accent-amber-500 rounded"
                    />
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        Super-Resolution Upscale
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                          {upscaleFactor}x
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Reconstructs high-frequency details for 4K / QHD display
                      </div>
                    </div>
                  </label>

                  {/* Sharpness (CAS) */}
                  <label className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableSharpness}
                      onChange={(e) => setEnableSharpness(e.target.checked)}
                      className="mt-0.5 accent-cyan-500 rounded"
                    />
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        Contrast Adaptive Sharpening
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                          {Math.round(sharpnessAmount * 100)}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Crisp anti-ringing edge enhancement
                      </div>
                    </div>
                  </label>

                  {/* HDR Pop & Specular Bloom indicator */}
                  <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <Flame className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        HDR Pop & Bloom:
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${metadata.hdrEffectEnabled ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'}`}>
                          {metadata.hdrEffectEnabled ? 'ACTIVE' : 'OFF'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Micro-contrast pop: {Math.round(metadata.hdrPopIntensity * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Bitrate, FPS, and Fit Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                  <label className="text-xs font-semibold text-slate-300 flex justify-between">
                    <span>Encoding Bitrate</span>
                    <span className="font-mono text-amber-400">{bitrateMbps} Mbps</span>
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={50}
                    step={1}
                    value={bitrateMbps}
                    onChange={(e) => setBitrateMbps(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-800 accent-amber-500 rounded cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>6M (Mobile)</span>
                    <span>18M (High)</span>
                    <span>50M (Master)</span>
                  </div>
                </div>

                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                  <label className="text-xs font-semibold text-slate-300">Base Frame Rate</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[24, 30, 60].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setFps(rate);
                          if (rate === 60) setEnableOpticalFlow60Fps(true);
                        }}
                        className={`py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
                          fps === rate || (enableOpticalFlow60Fps && rate === 60)
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {rate} FPS
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                  <label className="text-xs font-semibold text-slate-300">Aspect Ratio Fit</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'fit', label: 'Fit Box' },
                      { id: 'fill', label: 'Crop Fill' },
                      { id: 'stretch', label: 'Stretch' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFitMode(item.id as any)}
                        className={`py-1.5 rounded-xl text-xs font-semibold transition ${
                          fitMode === item.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Brightness & Color Pipeline Summary */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-2">
                <div className="font-semibold flex items-center justify-between text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    HDR10+ Brightness & Color Encoding Pipeline
                  </span>
                  <label className="flex items-center gap-1 text-[11px] font-normal cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={exportSidecarJSON}
                      onChange={(e) => setExportSidecarJSON(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    Include .JSON Sidecar
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px] text-slate-300">
                  <div>Color Space: <strong className="text-amber-400">{gamut.toUpperCase()} (10-Bit)</strong></div>
                  <div>EOTF: <strong className="text-emerald-400">SMPTE ST 2084 PQ</strong></div>
                  <div>Target Peak Nits: <strong className="text-white">{metadata.targetedNits} Nits</strong></div>
                  <div>Master Brightness: <strong className="text-amber-300">{((metadata.brightnessBoost || 1.0) * 100).toFixed(0)}% ({metadata.brightnessBoost}x)</strong></div>
                  <div>Diffuse White: <strong className="text-cyan-300">{metadata.diffuseWhiteNits || 250} Nits</strong></div>
                  <div>Frame Rate: <strong className="text-emerald-400">{enableOpticalFlow60Fps ? '60 FPS (Optical Flow)' : `${fps} FPS`}</strong></div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#111420] flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition disabled:opacity-40"
          >
            {progress?.isCompleted ? 'Close' : 'Cancel'}
          </button>

          {!progress?.isCompleted && (
            <div>
              {isExporting ? (
                <button
                  onClick={handleCancelExport}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg"
                >
                  Stop Export
                </button>
              ) : (
                <button
                  onClick={handleStartExport}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  Start HDR10+ Render & Export
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
