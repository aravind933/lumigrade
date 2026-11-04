import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  SplitSquareVertical,
  Eye,
  Maximize2,
  Minimize2,
  SunMedium,
  CheckCircle2,
  Sparkles,
  Sliders,
  Layers,
  Gauge,
  Flame,
  Zap
} from 'lucide-react';
import { ColorGamut, HDR10PlusMetadata, MonitoringMode } from '../types';
import { WebGLHDRRenderer } from '../utils/webglRenderer';
import { FALSE_COLOR_STEPS } from '../utils/colorScience';

interface VideoPlayerViewProps {
  videoSrc: string;
  metadata: HDR10PlusMetadata;
  gamut: ColorGamut;
  monitoringMode: MonitoringMode;
  onSetMonitoringMode: (mode: MonitoringMode) => void;
  useLut: boolean;
  lutData?: Float32Array;
  lutSize: number;
  lutIntensity: number;
  lutName: string;
  exposure: number;
  onExposureChange: (val: number) => void;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  onFrameUpdate?: (histData: any) => void;
  onToggleOpticalFlow?: () => void;
  onToggleHdrPop?: () => void;
  onToggleSharpness?: () => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  videoSrc,
  metadata,
  gamut,
  monitoringMode,
  onSetMonitoringMode,
  useLut,
  lutData,
  lutSize,
  lutIntensity,
  lutName,
  exposure,
  onExposureChange,
  videoElementRef,
  onFrameUpdate,
  onToggleOpticalFlow,
  onToggleHdrPop,
  onToggleSharpness
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<WebGLHDRRenderer | null>(null);
  const frameSubTickRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [splitPos, setSplitPos] = useState(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Initialize WebGL Renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new WebGLHDRRenderer(canvasRef.current);
    rendererRef.current = renderer;

    if (lutData) {
      renderer.uploadLutData(lutData, lutSize);
    }

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Update LUT data when changed
  useEffect(() => {
    if (rendererRef.current && lutData) {
      rendererRef.current.uploadLutData(lutData, lutSize);
    }
  }, [lutData, lutSize]);

  // Animation render loop
  const renderLoop = useCallback(() => {
    const video = videoElementRef.current;
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;

    if (video && canvas && renderer && video.readyState >= 2) {
      // Sync canvas dimensions with video (with upscaling if enabled)
      const scale = metadata.upscaleFactor || 1.0;
      const targetW = Math.round((video.videoWidth || 1280) * scale);
      const targetH = Math.round((video.videoHeight || 720) * scale);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        if (targetW > 0 && targetH > 0) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
      }

      // If optical flow 60fps is enabled, alternate between 0.0 and 0.5 sub-frame interpolation
      let flowTime = 0.0;
      if (metadata.opticalFlowEnabled) {
        flowTime = (frameSubTickRef.current % 2 === 1) ? 0.5 : 0.0;
        frameSubTickRef.current++;
      }

      renderer.renderFrame(video, {
        metadata,
        gamut,
        monitoringMode,
        splitPosition: splitPos,
        useLut,
        lutIntensity,
        exposure,
        flowInterpolationTime: flowTime
      });

      if (onFrameUpdate && Math.random() < 0.15) {
        const scopes = renderer.getHistogramAndWaveform();
        if (scopes) onFrameUpdate(scopes);
      }
    }

    if (isPlaying) {
      requestAnimationFrame(renderLoop);
    }
  }, [metadata, gamut, monitoringMode, splitPos, useLut, lutIntensity, exposure, isPlaying, onFrameUpdate, videoElementRef]);

  useEffect(() => {
    if (isPlaying) {
      const id = requestAnimationFrame(renderLoop);
      return () => cancelAnimationFrame(id);
    } else {
      renderLoop();
    }
  }, [isPlaying, renderLoop]);

  // Video element events
  const handleLoadedMetadata = () => {
    const video = videoElementRef.current;
    if (video) {
      setDuration(video.duration || 0);
      setVideoLoaded(true);
      if (canvasRef.current && video.videoWidth && video.videoHeight) {
        const scale = metadata.upscaleFactor || 1.0;
        canvasRef.current.width = Math.round(video.videoWidth * scale);
        canvasRef.current.height = Math.round(video.videoHeight * scale);
      }
      renderLoop();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoElementRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const togglePlay = () => {
    const video = videoElementRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const video = videoElementRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
      renderLoop();
    }
  };

  const toggleMute = () => {
    const video = videoElementRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  // Split-screen drag handler
  const handleSplitMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    setSplitPos(x);
  };

  const handleSplitTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0.05, Math.min(0.95, (e.touches[0].clientX - rect.left) / rect.width));
    setSplitPos(x);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex flex-col w-full bg-[#090a0f] rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
      {/* Top Monitor Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0e111a] border-b border-slate-800/80 text-xs text-slate-400 select-none flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
            <Sparkles className="w-3 h-3" />
            HDR10+ MASTER
          </span>

          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
            {metadata.targetedNits} NITS
          </span>

          <span className="text-[11px] font-mono text-amber-300 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/40">
            Gain: {((metadata.brightnessBoost || 1.0) * 100).toFixed(0)}%
          </span>

          {metadata.diffuseWhiteNits && (
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              White: {metadata.diffuseWhiteNits}N
            </span>
          )}
        </div>

        {/* Quick Toggles: 60 FPS Optical Flow, HDR Pop, Sharpness, Split A/B, False Color */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Optical Flow 60 FPS Toggle Button */}
          {onToggleOpticalFlow && (
            <button
              onClick={onToggleOpticalFlow}
              className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-semibold transition ${
                metadata.opticalFlowEnabled
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Toggle 60 FPS Optical Flow Motion Interpolation"
            >
              <Gauge className="w-3 h-3" />
              <span>{metadata.opticalFlowEnabled ? '60 FPS Flow' : '30 FPS'}</span>
            </button>
          )}

          {/* HDR Pop Toggle Button */}
          {onToggleHdrPop && (
            <button
              onClick={onToggleHdrPop}
              className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-semibold transition ${
                metadata.hdrEffectEnabled
                  ? 'bg-rose-500 text-white shadow'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Toggle HDR Pop & Specular Bloom"
            >
              <Flame className="w-3 h-3" />
              <span>HDR Pop</span>
            </button>
          )}

          {/* Sharpness Toggle Button */}
          {onToggleSharpness && (
            <button
              onClick={onToggleSharpness}
              className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-semibold transition ${
                metadata.sharpnessEnabled
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Toggle Contrast Adaptive Sharpening"
            >
              <Zap className="w-3 h-3" />
              <span>Sharp {((metadata.sharpnessAmount || 0.75) * 100).toFixed(0)}%</span>
            </button>
          )}

          <button
            onClick={() => onSetMonitoringMode(monitoringMode === 'split_ab' ? 'normal' : 'split_ab')}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition ${
              monitoringMode === 'split_ab'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Split-screen comparison (SDR vs HDR10+)"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span className="text-[11px]">A/B Split</span>
          </button>

          <button
            onClick={() => onSetMonitoringMode(monitoringMode === 'false_color' ? 'normal' : 'false_color')}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition ${
              monitoringMode === 'false_color'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="False Color exposure monitor"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[11px]">False Color</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport Canvas */}
      <div
        ref={containerRef}
        onMouseMove={handleSplitMouseMove}
        onMouseUp={() => setIsDraggingSplit(false)}
        onTouchMove={handleSplitTouchMove}
        onTouchEnd={() => setIsDraggingSplit(false)}
        className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden cursor-crosshair select-none"
      >
        <video
          ref={videoElementRef}
          src={videoSrc}
          crossOrigin="anonymous"
          playsInline
          muted={isMuted}
          loop
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
        />

        {/* Hardware-accelerated WebGL HDR Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Split screen interactive line & handle */}
        {monitoringMode === 'split_ab' && (
          <div
            style={{ left: `${splitPos * 100}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] z-20 pointer-events-auto cursor-ew-resize flex items-center justify-center"
            onMouseDown={() => setIsDraggingSplit(true)}
            onTouchStart={() => setIsDraggingSplit(true)}
          >
            <div className="w-7 h-7 -ml-[13px] bg-amber-500 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg text-slate-950 hover:scale-110 active:scale-95 transition-transform">
              <SplitSquareVertical className="w-3.5 h-3.5" />
            </div>

            <div className="absolute top-3 right-3 text-[10px] font-mono font-bold bg-black/75 text-slate-300 px-2 py-0.5 rounded border border-white/20 backdrop-blur pointer-events-none">
              SDR (BT.709)
            </div>
            <div className="absolute top-3 left-3 text-[10px] font-mono font-bold bg-amber-500/90 text-slate-950 px-2 py-0.5 rounded shadow backdrop-blur pointer-events-none whitespace-nowrap">
              HDR10+ (BT.2020) {metadata.opticalFlowEnabled ? '• 60 FPS' : ''}
            </div>
          </div>
        )}

        {/* False Color Legend overlay */}
        {monitoringMode === 'false_color' && (
          <div className="absolute top-2 left-2 z-20 bg-black/85 backdrop-blur-md p-2 rounded-lg border border-slate-800 text-[10px] font-mono space-y-1 shadow-xl">
            <div className="text-[11px] font-bold text-slate-200 border-b border-slate-700/60 pb-1 mb-1">
              FALSE COLOR NITS SCALE
            </div>
            {FALSE_COLOR_STEPS.map((step) => (
              <div key={step.label} className="flex items-center gap-2">
                <span
                  className="w-3.5 h-2.5 rounded-sm shadow-sm"
                  style={{ backgroundColor: step.color }}
                />
                <span className="text-slate-300 font-medium">{step.nits}</span>
                <span className="text-slate-500 text-[9px]">{step.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Center play icon overlay if paused */}
        {!isPlaying && videoLoaded && (
          <button
            onClick={togglePlay}
            className="absolute z-10 w-16 h-16 rounded-full bg-black/60 hover:bg-amber-500/90 text-white hover:text-slate-950 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-2xl transition group"
          >
            <Play className="w-7 h-7 translate-x-0.5 group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>

      {/* Video Transport & Timeline Controls */}
      <div className="p-3 bg-[#0c0e17] border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-amber-400 font-medium w-14">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 focus:outline-none"
          />

          <span className="font-mono text-xs text-slate-400 w-14 text-right">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
            </button>

            <button
              onClick={() => {
                if (videoElementRef.current) {
                  videoElementRef.current.currentTime = Math.max(0, currentTime - 5);
                }
              }}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              title="Rewind 5s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>

          {/* Active LUT pill and Exposure adjustment */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
              <SunMedium className="w-3.5 h-3.5 text-amber-400" />
              <span>Exp:</span>
              <input
                type="range"
                min={0.6}
                max={2.0}
                step={0.05}
                value={exposure}
                onChange={(e) => onExposureChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-800 accent-amber-500 rounded"
              />
              <span className="font-mono text-[10px] w-8 text-right text-slate-300">
                {exposure.toFixed(2)}x
              </span>
            </div>

            {useLut && (
              <div className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span className="font-medium truncate max-w-[110px]">{lutName}</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {Math.round(lutIntensity * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
