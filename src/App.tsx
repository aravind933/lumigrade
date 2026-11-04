import React, { useState, useRef } from 'react';
import {
  Film,
  Sparkles,
  Download,
  Upload,
  Smartphone,
  Maximize2,
  Minimize2,
  Sliders,
  Layers,
  Activity,
  Code2,
  SplitSquareVertical,
  Eye,
  Info,
  CheckCircle2,
  Tv,
  HelpCircle,
  Video,
  Sun,
  Flame,
  Zap,
  Gauge
} from 'lucide-react';

import { ColorGamut, HDR10PlusMetadata, MonitoringMode, LutPreset, VideoSource } from './types';
import { BUILTIN_LUTS } from './utils/builtinLuts';
import { SAMPLE_VIDEOS } from './utils/sampleVideos';
import { AndroidFrame } from './components/AndroidFrame';
import { VideoPlayerView } from './components/VideoPlayerView';
import { HDR10PlusControls } from './components/HDR10PlusControls';
import { LutSelector } from './components/LutSelector';
import { ScopesMonitor } from './components/ScopesMonitor';
import { ExportModal } from './components/ExportModal';
import { AndroidCodeExport } from './components/AndroidCodeExport';
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  // Video Sources
  const [videoList, setVideoList] = useState<VideoSource[]>(SAMPLE_VIDEOS);
  const [activeVideo, setActiveVideo] = useState<VideoSource>(SAMPLE_VIDEOS[0]);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const customFileInputRef = useRef<HTMLInputElement | null>(null);

  // HDR10+ Parameters State with Brightness Nits boost, HDR Pop & Optical Flow
  const [metadata, setMetadata] = useState<HDR10PlusMetadata>({
    maxCLL: 1000,
    maxFALL: 380,
    targetedNits: 1000,
    diffuseWhiteNits: 250, // Reference diffuse white (elevates brightness from standard 100N)
    brightnessBoost: 1.35, // 135% master brightness gain
    midtoneLift: 1.25,     // Midtone gamma lift (prevents dark scenes from crushing)
    blackPedestal: 0.0,
    kneePointX: 0.45,
    kneePointY: 0.65,
    bezierWeight: 1.25,
    specularBoost: 1.45,
    shadowRollOff: 1.10,
    saturationBoost: 1.15,
    scenePercentiles: [0.02, 0.08, 0.20, 0.45, 0.70, 0.88, 0.98],

    // HDR Effect Engine
    hdrEffectEnabled: true,
    hdrPopIntensity: 0.85,
    specularBloomIntensity: 0.70,
    bloomThreshold: 0.65,
    colorVibrance: 1.18,

    // Sharpness & Upscaling
    sharpnessEnabled: true,
    sharpnessAmount: 0.80,
    upscaleFactor: 1.0,
    upscaleAlgorithm: 'bicubic_cas',

    // Optical Flow 30 to 60 FPS Interpolation
    opticalFlowEnabled: false,
    targetFps: 60,
    flowSensitivity: 1.0,
    motionSmoothness: 0.85,
    showMotionVectors: false
  });

  const [gamut, setGamut] = useState<ColorGamut>('bt2020');
  const [exposure, setExposure] = useState<number>(1.0);

  // 3D LUT State
  const [currentLut, setCurrentLut] = useState<LutPreset>(BUILTIN_LUTS[0]);
  const [useLut, setUseLut] = useState(true);
  const [lutIntensity, setLutIntensity] = useState(1.0);

  // Monitoring & Display Modes
  const [monitoringMode, setMonitoringMode] = useState<MonitoringMode>('split_ab');
  const [isMobileFrameView, setIsMobileFrameView] = useState(false);
  const [activeTab, setActiveTab] = useState<'tone' | 'lut' | 'scopes' | 'android_code'>('tone');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Real-time Scopes
  const [scopesData, setScopesData] = useState<any>(null);

  // Quick Toggles
  const handleToggleOpticalFlow = () => {
    setMetadata((prev) => ({
      ...prev,
      opticalFlowEnabled: !prev.opticalFlowEnabled,
      showMotionVectors: false
    }));
  };

  const handleToggleHdrPop = () => {
    setMetadata((prev) => ({
      ...prev,
      hdrEffectEnabled: !prev.hdrEffectEnabled
    }));
  };

  const handleToggleSharpness = () => {
    setMetadata((prev) => ({
      ...prev,
      sharpnessEnabled: !prev.sharpnessEnabled
    }));
  };

  // User Custom Video Upload
  const handleCustomVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const customSource: VideoSource = {
      id: `custom_vid_${Date.now()}`,
      title: file.name,
      description: `User uploaded video (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
      url: fileUrl,
      isCustomUpload: true
    };

    setVideoList((prev) => [customSource, ...prev]);
    setActiveVideo(customSource);
  };

  const mainAppContent = (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#090a0f] text-slate-100">
      {/* App Header */}
      <header className="px-4 py-3 bg-[#0d0f18] border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-[1.5px] shadow-lg shadow-amber-500/10">
              <div className="w-full h-full bg-[#090a0f] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white">LumiGrad</span>
                <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded shadow">
                  HDR10+
                </span>
                {metadata.opticalFlowEnabled && (
                  <span className="text-[9px] font-mono font-bold bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded shadow">
                    60 FPS
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                SDR to BT.2020 PQ • 3D LUT • 60 FPS Optical Flow • CAS Upscaling
              </p>
            </div>
          </div>

          {/* Sample Video Selector Dropdown */}
          <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Video:</span>
            <select
              value={activeVideo.id}
              onChange={(e) => {
                const found = videoList.find((v) => v.id === e.target.value);
                if (found) setActiveVideo(found);
              }}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 max-w-[210px] truncate"
            >
              {videoList.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>

            {/* Custom Upload */}
            <input
              ref={customFileInputRef}
              type="file"
              accept="video/*"
              onChange={handleCustomVideoUpload}
              className="hidden"
            />
            <button
              onClick={() => customFileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              title="Upload your own SDR video to convert"
            >
              <Upload className="w-3 h-3 text-amber-400" />
              Upload Video
            </button>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {/* PWA Install */}
          <PWAInstallButton />

          {/* View toggle (Mobile Android vs Studio) */}
          <button
            onClick={() => setIsMobileFrameView(!isMobileFrameView)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition"
            title={isMobileFrameView ? 'Switch to Studio Widescreen' : 'Switch to Android Phone View'}
          >
            {isMobileFrameView ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Studio View</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Android View</span>
              </>
            )}
          </button>

          {/* Export Video Master Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.35)] transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Video</span>
          </button>
        </div>
      </header>

      {/* Mobile-Only Video Switcher bar */}
      <div className="flex md:hidden items-center justify-between px-3 py-1.5 bg-[#0b0d14] border-b border-slate-800/60 text-xs">
        <select
          value={activeVideo.id}
          onChange={(e) => {
            const found = videoList.find((v) => v.id === e.target.value);
            if (found) setActiveVideo(found);
          }}
          className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2 py-0.5 max-w-[200px] truncate"
        >
          {videoList.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>

        <button
          onClick={() => customFileInputRef.current?.click()}
          className="flex items-center gap-1 text-[11px] text-amber-400 font-medium"
        >
          <Upload className="w-3 h-3" />
          Upload
        </button>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Video Player Viewport & Scopes */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto space-y-4">
          {/* Main Video Monitor */}
          <VideoPlayerView
            videoSrc={activeVideo.url}
            metadata={metadata}
            gamut={gamut}
            monitoringMode={monitoringMode}
            onSetMonitoringMode={setMonitoringMode}
            useLut={useLut}
            lutData={currentLut.cubeData}
            lutSize={currentLut.cubeSize}
            lutIntensity={lutIntensity}
            lutName={currentLut.name}
            exposure={exposure}
            onExposureChange={setExposure}
            videoElementRef={videoElementRef}
            onFrameUpdate={setScopesData}
            onToggleOpticalFlow={handleToggleOpticalFlow}
            onToggleHdrPop={handleToggleHdrPop}
            onToggleSharpness={handleToggleSharpness}
          />

          {/* Fast Status Bar for A/B Comparison and Master Settings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-[#0e111a] p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Input Color:</span>
              <span className="font-mono font-bold text-slate-200">SDR BT.709</span>
            </div>
            <div className="bg-[#0e111a] p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Output Peak:</span>
              <span className="font-mono font-bold text-amber-400 uppercase">
                {metadata.targetedNits} Nits ({((metadata.brightnessBoost || 1.0) * 100).toFixed(0)}% Gain)
              </span>
            </div>
            <div className="bg-[#0e111a] p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Transfer EOTF:</span>
              <span className="font-mono font-bold text-cyan-400">ST 2084 PQ</span>
            </div>
            <div className="bg-[#0e111a] p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Frame Motion:</span>
              <span className={`font-mono font-bold ${metadata.opticalFlowEnabled ? 'text-emerald-400' : 'text-slate-300'}`}>
                {metadata.opticalFlowEnabled ? '60 FPS Flow' : '30 FPS Native'}
              </span>
            </div>
          </div>

          {/* Scopes Section (Visible on large screens or in studio mode) */}
          <div className="hidden sm:block">
            <ScopesMonitor scopesData={scopesData} targetNits={metadata.targetedNits} />
          </div>
        </div>

        {/* Right Sidebar: Control Tabs */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#0a0c13] flex flex-col shrink-0 overflow-hidden">
          {/* Tabs navigation */}
          <div className="flex items-center border-b border-slate-800 bg-[#0d0f18] px-2 pt-2 shrink-0 overflow-x-auto">
            {[
              { id: 'tone', label: 'HDR Controls', icon: Sparkles },
              { id: 'lut', label: '3D LUTs', icon: Layers },
              { id: 'scopes', label: 'Scopes', icon: Activity },
              { id: 'android_code', label: 'Android APK', icon: Code2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition border-t-2 ${
                    isActive
                      ? 'bg-[#0e111a] text-amber-400 border-amber-500 shadow-inner'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {activeTab === 'tone' && (
              <HDR10PlusControls
                metadata={metadata}
                gamut={gamut}
                onMetadataChange={setMetadata}
                onGamutChange={setGamut}
              />
            )}

            {activeTab === 'lut' && (
              <LutSelector
                currentLut={currentLut}
                useLut={useLut}
                lutIntensity={lutIntensity}
                onSelectLut={setCurrentLut}
                onToggleUseLut={setUseLut}
                onIntensityChange={setLutIntensity}
              />
            )}

            {activeTab === 'scopes' && (
              <ScopesMonitor scopesData={scopesData} targetNits={metadata.targetedNits} />
            )}

            {activeTab === 'android_code' && <AndroidCodeExport />}
          </div>

          {/* Bottom Quick-Action Export Bar */}
          <div className="p-3 bg-[#0d0f18] border-t border-slate-800 flex items-center justify-between shrink-0">
            <div className="text-[11px] font-mono text-slate-400">
              Output: <strong className="text-amber-400">{metadata.targetedNits}N</strong> • <strong className="text-emerald-400">{metadata.opticalFlowEnabled ? '60 FPS' : '30 FPS'}</strong>
            </div>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export Video
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Resolution Video Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sourceVideoElement={videoElementRef.current}
        metadata={metadata}
        gamut={gamut}
        useLut={useLut}
        lutData={currentLut.cubeData}
        lutSize={currentLut.cubeSize}
        lutIntensity={lutIntensity}
        lutName={currentLut.name}
        exposure={exposure}
      />
    </div>
  );

  return (
    <AndroidFrame
      isMobileView={isMobileFrameView}
      onToggleView={() => setIsMobileFrameView(!isMobileFrameView)}
    >
      {mainAppContent}
    </AndroidFrame>
  );
}
