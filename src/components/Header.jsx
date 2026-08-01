import React, { useState } from 'react';
import { Leaf, Droplet, Layers, Menu, Cpu, ShieldAlert, Activity } from 'lucide-react';

export default function Header({ 
  totalCapturedML, 
  avgDeltaH, 
  totalFarmlandHa,
  activeMode,
  setActiveMode
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const simulationModes = [
    { key: 'ai-network', label: 'AI Proposed Network', icon: Cpu, desc: 'Optimized multi-criteria check dam placement.' },
    { key: 'case-study', label: 'Nov 2021 Flood Study', icon: ShieldAlert, desc: 'Historical flood runoff capture analysis.' },
    { key: 'custom-sim', label: 'Rainfall Simulator', icon: Activity, desc: 'Custom rainfall storm water retention simulator.' }
  ];

  const activeModeLabel = simulationModes.find(m => m.key === activeMode)?.label || 'AI Proposed Network';

  return (
    <header className="w-full bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 relative">
      {/* Title & Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#f0fdf4] text-[#0f766e] rounded-lg">
            <Leaf className="w-5 h-5 fill-current" />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            PROJECT C
          </h1>
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7] rounded-md">
            v2.4 DSS
          </span>
        </div>
        
        <div className="hidden md:block w-px h-5 bg-slate-300"></div>
        
        <p className="text-xs text-slate-500 font-medium hidden md:block">
          Lower Kollidam River Basin &middot; Hydrological Site Evaluation
        </p>
      </div>

      {/* Top Stat Gauges & Menu Icon */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-6 text-xs border-r border-slate-200 pr-6">
          {/* Captured Water Stat */}
          <div className="flex items-center gap-2.5">
            <div className="text-[#0f766e] bg-[#f0fdf4] p-1.5 rounded-full">
              <Droplet className="w-4 h-4 fill-current" />
            </div>
            <div className="text-left leading-tight">
              <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Captured Water</span>
              <span className="text-xs font-extrabold text-slate-800">{totalCapturedML} ML</span>
            </div>
          </div>

          {/* Aquifer Gain Stat */}
          <div className="flex items-center gap-2.5">
            <div className="text-[#0f766e] bg-[#f0fdf4] p-1.5 rounded-full">
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight">
              <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">GW Rise</span>
              <span className="text-xs font-extrabold text-[#0f766e]">+{avgDeltaH} m</span>
            </div>
          </div>

          {/* Cropland Recharged Stat */}
          <div className="flex items-center gap-2.5">
            <div className="text-[#0f766e] bg-[#f0fdf4] p-1.5 rounded-full">
              <Leaf className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight">
              <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Farmland</span>
              <span className="text-xs font-extrabold text-slate-800">{totalFarmlandHa.toLocaleString()} Ha</span>
            </div>
          </div>
        </div>

        {/* Menu Dropdown Trigger */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-2 rounded-lg transition border flex items-center gap-2 text-xs font-bold ${
              isMenuOpen 
                ? 'bg-slate-100 text-slate-800 border-slate-300' 
                : 'text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Simulation Modules"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden md:inline">{activeModeLabel}</span>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-12 z-[9999] w-[260px] bg-white border border-slate-200 rounded-lg shadow-xl p-2.5 space-y-1 text-xs">
              <div className="font-bold text-slate-700 px-2 pb-1.5 border-b border-slate-100 uppercase tracking-wider text-[9px]">
                Simulation Modes
              </div>
              {simulationModes.map(m => {
                const isSelected = activeMode === m.key;
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      setActiveMode(m.key);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-md flex items-start gap-2.5 transition ${
                      isSelected 
                        ? 'bg-slate-50 text-[#0f766e] border border-slate-200' 
                        : 'text-slate-650 hover:bg-slate-50/50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold">{m.label}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
