import React from 'react';
import { Waves, ShieldAlert, Cpu, Database, Activity, MapPin } from 'lucide-react';

export default function Header({ 
  activeMode, 
  setActiveMode, 
  totalCapturedML, 
  totalTMC, 
  avgDeltaH, 
  totalFarmlandHa,
  onOpenGEE
}) {
  return (
    <header className="w-full glass-panel-glow px-6 py-4 mb-4 flex flex-col lg:flex-row items-center justify-between gap-4">
      {/* Title & Branding */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-cyan-500/20 border border-cyan-400/40 rounded-xl text-cyan-400">
          <Waves className="w-8 h-8 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              PROJECT C
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-full">
              v2.4 DSS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Geospatial AI & Hydrological Decision Support System | Lower Kollidam Basin (~160 km)
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center bg-slate-900/80 p-1.5 rounded-xl border border-blue-900/50">
        <button
          onClick={() => setActiveMode('ai-network')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeMode === 'ai-network'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          AI Proposed Network
        </button>

        <button
          onClick={() => setActiveMode('case-study')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeMode === 'case-study'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Nov 2021 Flood Disaster Study
        </button>

        <button
          onClick={() => setActiveMode('custom-sim')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeMode === 'custom-sim'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Rainfall Simulator
        </button>
      </div>

      {/* Top Stat Gauges & GEE Button */}
      <div className="flex items-center gap-4">
        <div className="hidden xl:flex items-center gap-4 border-r border-slate-700/60 pr-4">
          <div className="text-right">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Captured Water</span>
            <span className="text-sm font-bold text-cyan-400">{totalCapturedML} ML <span className="text-[10px] text-slate-400">({totalTMC} TMC)</span></span>
          </div>

          <div className="text-right">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Water Table Gain</span>
            <span className="text-sm font-bold text-emerald-400">+{avgDeltaH} m</span>
          </div>

          <div className="text-right">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Farmland Recharged</span>
            <span className="text-sm font-bold text-amber-400">{totalFarmlandHa.toLocaleString()} Ha</span>
          </div>
        </div>

        <button
          onClick={onOpenGEE}
          className="flex items-center gap-2 px-3 py-2 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold transition"
          title="Open Google Earth Engine Script Integration"
        >
          <Database className="w-4 h-4 text-cyan-400" />
          <span>GEE Pipeline</span>
        </button>
      </div>
    </header>
  );
}
