import React from 'react';
import { Wifi, BatteryMedium, Signal, Smartphone, Maximize2 } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  isMobileView: boolean;
  onToggleView: () => void;
  title?: string;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  isMobileView,
  onToggleView,
}) => {
  if (!isMobileView) {
    return <div className="w-full h-full flex flex-col">{children}</div>;
  }

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-6 min-h-screen bg-[#07080c]">
      {/* Android Device Shell */}
      <div className="relative w-full max-w-[420px] h-[92vh] max-h-[890px] bg-[#0c0e14] rounded-[48px] shadow-[0_0_60px_rgba(0,0,0,0.85)] border-[5px] border-[#252836] flex flex-col overflow-hidden ring-1 ring-white/10">
        
        {/* Top Bezel & Camera Punch-hole + Status Bar */}
        <div className="relative h-9 px-6 pt-2 bg-[#0c0e14] flex items-center justify-between text-[11px] font-semibold text-slate-300 select-none z-30">
          <span className="font-mono">{currentTime}</span>
          
          {/* Centered Camera Punch-hole */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-3.5 h-3.5 bg-black rounded-full ring-2 ring-[#1f2333]/80 flex items-center justify-center shadow-inner">
            <div className="w-1.5 h-1.5 bg-[#082f49] rounded-full" />
          </div>

          {/* Android Status Icons */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1 rounded">5G</span>
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px]">94%</span>
              <BatteryMedium className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Screen Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#090a0f]">
          {children}
        </div>

        {/* Bottom Android Gesture Navigation Bar */}
        <div className="h-6 bg-[#0c0e14] flex items-center justify-center select-none z-30">
          <div className="w-32 h-1 bg-slate-500/50 rounded-full hover:bg-slate-300 transition" />
        </div>
      </div>

      {/* Floating View Switcher Helper for Desktop */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800 backdrop-blur shadow-lg">
        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
        <span>Android Phone Simulation Mode</span>
        <button
          onClick={onToggleView}
          className="ml-2 flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition"
        >
          <Maximize2 className="w-3 h-3" />
          Switch to Studio Widescreen
        </button>
      </div>
    </div>
  );
};
