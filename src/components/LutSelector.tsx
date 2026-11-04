import React, { useRef, useState } from 'react';
import { Layers, Upload, Download, Check, Sparkles, Sliders, FileCode, CheckCircle2 } from 'lucide-react';
import { LutPreset } from '../types';
import { BUILTIN_LUTS } from '../utils/builtinLuts';
import { parseCubeFile, exportCubeString } from '../utils/cubeParser';

interface LutSelectorProps {
  currentLut: LutPreset;
  useLut: boolean;
  lutIntensity: number;
  onSelectLut: (lut: LutPreset) => void;
  onToggleUseLut: (use: boolean) => void;
  onIntensityChange: (intensity: number) => void;
}

export const LutSelector: React.FC<LutSelectorProps> = ({
  currentLut,
  useLut,
  lutIntensity,
  onSelectLut,
  onToggleUseLut,
  onIntensityChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customLuts, setCustomLuts] = useState<LutPreset[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCubeFile(text, file.name);

        const newLut: LutPreset = {
          id: `custom_${Date.now()}`,
          name: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
          category: 'creative',
          description: `Custom uploaded 3D LUT (${parsed.size}x${parsed.size}x${parsed.size} grid)`,
          thumbnailColor: '#38bdf8',
          previewGradient: 'from-blue-600 via-indigo-600 to-purple-800',
          cubeSize: parsed.size,
          cubeData: parsed.data,
          isCustom: true
        };

        setCustomLuts((prev) => [newLut, ...prev]);
        onSelectLut(newLut);
        onToggleUseLut(true);
        setUploadStatus(`Loaded: ${file.name} (${parsed.size}^3)`);
        setTimeout(() => setUploadStatus(null), 4000);
      } catch (err: any) {
        setUploadStatus(`Error: ${err.message || 'Failed to parse .cube'}`);
        setTimeout(() => setUploadStatus(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCube = () => {
    if (!currentLut.cubeData) return;
    const cubeString = exportCubeString(currentLut.cubeData, currentLut.cubeSize, currentLut.name);
    const blob = new Blob([cubeString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentLut.name.replace(/\s+/g, '_')}_HDR10Plus.cube`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allAvailableLuts = [...customLuts, ...BUILTIN_LUTS];
  const filteredLuts = activeCategory === 'all'
    ? allAvailableLuts
    : allAvailableLuts.filter((l) => l.category === activeCategory || (activeCategory === 'custom' && l.isCustom));

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#0e111a] rounded-2xl border border-slate-800 text-slate-200">
      {/* Header and Enable Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
              3D LUT Color Engine
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                .CUBE READY
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Apply cinematic film print & wide gamut emulation
            </p>
          </div>
        </div>

        {/* Master LUT Enable Toggle */}
        <button
          onClick={() => onToggleUseLut(!useLut)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            useLut
              ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {useLut ? <Check className="w-3.5 h-3.5" /> : null}
          {useLut ? 'LUT Enabled' : 'LUT Bypassed'}
        </button>
      </div>

      {/* LUT Intensity Slider */}
      {useLut && (
        <div className="flex flex-col gap-1.5 bg-black/30 p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              LUT Opacity / Blend Intensity
            </span>
            <span className="font-mono text-cyan-400 font-semibold">
              {Math.round(lutIntensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.02}
            value={lutIntensity}
            onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 accent-cyan-400 rounded cursor-pointer"
          />
        </div>
      )}

      {/* Upload Custom .CUBE Button & Category Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-[11px] overflow-x-auto py-1">
          {['all', 'hdr_expansion', 'cinema', 'vintage', 'creative', 'custom'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
              }`}
            >
              {cat === 'all' ? 'All LUTs' : cat === 'hdr_expansion' ? 'HDR Curves' : cat}
            </button>
          ))}
        </div>

        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".cube,.3dl"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload .cube
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className="text-xs p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono">
          {uploadStatus}
        </div>
      )}

      {/* LUT Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {filteredLuts.map((lut) => {
          const isSelected = currentLut.id === lut.id;
          return (
            <button
              key={lut.id}
              onClick={() => {
                onSelectLut(lut);
                onToggleUseLut(true);
              }}
              className={`relative flex flex-col p-2.5 rounded-xl border text-left transition group overflow-hidden ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              {/* Preview Gradient Strip */}
              <div
                className={`w-full h-8 rounded-lg bg-gradient-to-r ${lut.previewGradient} mb-2 shadow-inner flex items-center justify-end px-1.5`}
              >
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-slate-950 text-cyan-400 flex items-center justify-center shadow">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="font-semibold text-xs text-slate-200 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                {lut.name}
              </div>
              <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                {lut.description}
              </div>

              <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span>{lut.cubeSize}^3 Grid</span>
                <span className="uppercase text-cyan-400/80">{lut.category}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Export LUT button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <span className="text-slate-400">Active Grade: <strong className="text-slate-200">{currentLut.name}</strong></span>
        <button
          onClick={handleExportCube}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition font-medium"
          title="Export current grade as .cube 3D LUT for DaVinci Resolve or Android Media3"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          Export .cube File
        </button>
      </div>
    </div>
  );
};
