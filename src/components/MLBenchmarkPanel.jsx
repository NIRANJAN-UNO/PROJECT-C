import React from 'react';
import { Cpu, Layers, Sparkles, CheckCircle2, Sliders } from 'lucide-react';
import { MCDA_PROFILES } from '../utils/hydrology';

export default function MLBenchmarkPanel({ activeModel, onSelectModel }) {
  return (
    <div className="w-full glass-panel p-5 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-blue-900/50 pb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <Sliders className="w-5 h-5" />
          <h2 className="text-base font-bold tracking-wide">Spatial Decision Mode & Extensible ML Interface</h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">DEM-Grounded Analytical Pipelines</span>
      </div>

      {/* 4 Decision Profile Cards Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(MCDA_PROFILES).map(([key, profile]) => {
          const isSelected = activeModel === key;
          return (
            <div
              key={key}
              onClick={() => onSelectModel(key)}
              className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                isSelected 
                  ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400' 
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                  isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  {profile.badge}
                </span>
                <span className="text-[11px] font-bold text-cyan-300 font-mono">
                  {profile.score}
                </span>
              </div>

              <h3 className="text-xs font-bold text-slate-100 line-clamp-1 mb-1">
                {profile.name}
              </h3>
              
              <p className="text-[10px] text-slate-400 line-clamp-2 mb-2">
                {profile.details}
              </p>

              <div className="flex items-center justify-between text-[10px] border-t border-slate-800/80 pt-2 text-slate-300 font-mono">
                <span className="text-slate-500">Methodology:</span>
                <span className="font-semibold text-emerald-300">{profile.type}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
