import React from 'react';
import { BarChart3, Activity, Layers, Sun } from 'lucide-react';
import { FALSE_COLOR_STEPS } from '../utils/colorScience';

interface ScopesMonitorProps {
  scopesData?: {
    rHist: Uint32Array;
    gHist: Uint32Array;
    bHist: Uint32Array;
    lumaHist: Uint32Array;
  } | null;
  targetNits: number;
}

export const ScopesMonitor: React.FC<ScopesMonitorProps> = ({ scopesData, targetNits }) => {
  const buckets = 64;

  // Find max value in histograms for normalization
  let maxCount = 1;
  if (scopesData) {
    for (let i = 0; i < buckets; i++) {
      if (scopesData.rHist[i] > maxCount) maxCount = scopesData.rHist[i];
      if (scopesData.gHist[i] > maxCount) maxCount = scopesData.gHist[i];
      if (scopesData.bHist[i] > maxCount) maxCount = scopesData.bHist[i];
      if (scopesData.lumaHist[i] > maxCount) maxCount = scopesData.lumaHist[i];
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#0e111a] rounded-2xl border border-slate-800 text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
              Live HDR Video Scopes
              <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded">
                REAL-TIME
              </span>
            </h4>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          Ceiling: <span className="text-amber-400 font-bold">{targetNits} Nits</span>
        </div>
      </div>

      {/* Real-time RGB Histogram */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>RGB Parade Distribution</span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-rose-400 font-bold">● R</span>
            <span className="text-emerald-400 font-bold">● G</span>
            <span className="text-cyan-400 font-bold">● B</span>
            <span className="text-amber-300 font-bold">● Luma</span>
          </div>
        </div>

        <div className="relative w-full h-24 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-1 flex items-end">
          {/* Background grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-20">
            <div className="border-b border-white w-full text-[8px] font-mono text-white">1000 Nits (Peak)</div>
            <div className="border-b border-white w-full text-[8px] font-mono text-white">300 Nits (Highlights)</div>
            <div className="border-b border-white w-full text-[8px] font-mono text-white">100 Nits (SDR Reference)</div>
            <div className="border-b border-white w-full text-[8px] font-mono text-white">0 Nits (Blacks)</div>
          </div>

          {/* Histogram Bars */}
          <svg className="w-full h-full" viewBox="0 0 64 100" preserveAspectRatio="none">
            {scopesData && (
              <>
                {/* Red channel */}
                <path
                  d={`M 0 100 ${Array.from(scopesData.rHist)
                    .map((val, i) => `L ${i} ${100 - (val / maxCount) * 85}`)
                    .join(' ')} L 63 100 Z`}
                  fill="rgba(244, 63, 94, 0.25)"
                  stroke="#f43f5e"
                  strokeWidth="0.8"
                />
                {/* Green channel */}
                <path
                  d={`M 0 100 ${Array.from(scopesData.gHist)
                    .map((val, i) => `L ${i} ${100 - (val / maxCount) * 85}`)
                    .join(' ')} L 63 100 Z`}
                  fill="rgba(34, 197, 94, 0.25)"
                  stroke="#22c55e"
                  strokeWidth="0.8"
                />
                {/* Blue channel */}
                <path
                  d={`M 0 100 ${Array.from(scopesData.bHist)
                    .map((val, i) => `L ${i} ${100 - (val / maxCount) * 85}`)
                    .join(' ')} L 63 100 Z`}
                  fill="rgba(6, 182, 212, 0.25)"
                  stroke="#06b6d4"
                  strokeWidth="0.8"
                />
                {/* Luma curve */}
                <path
                  d={`M 0 100 ${Array.from(scopesData.lumaHist)
                    .map((val, i) => `L ${i} ${100 - (val / maxCount) * 90}`)
                    .join(' ')} L 63 100 Z`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* IRE / Nits Reference Scale */}
      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono pt-1">
        <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
          <div className="text-slate-500">Blacks</div>
          <div className="text-slate-300 font-bold">&lt; 5 Nits</div>
        </div>
        <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
          <div className="text-slate-500">Skin Midtone</div>
          <div className="text-emerald-400 font-bold">120-220 Nits</div>
        </div>
        <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
          <div className="text-slate-500">HDR Shoulder</div>
          <div className="text-amber-400 font-bold">400-800 Nits</div>
        </div>
        <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
          <div className="text-slate-500">Specular Peak</div>
          <div className="text-rose-400 font-bold">1000+ Nits</div>
        </div>
      </div>
    </div>
  );
};
