import React from 'react';
import { Sliders, Sparkles, CheckCircle2, MapPin, Droplets, Layers, Building2 } from 'lucide-react';
import { calculateMCDAScore, MCDA_PROFILES } from '../utils/hydrology';

export default function MCDAPanel({ 
  dams, 
  weights, 
  onWeightChange, 
  selectedDam, 
  onSelectDam,
  activeModel,
  onSelectModel
}) {
  const sliderConfig = [
    { key: 'slope', label: 'Terrain Slope', icon: '📐', hint: 'Favors gentle channel gradients (<2°)' },
    { key: 'flow', label: 'Flow Accumulation', icon: '🌊', hint: 'High catchment stream network order' },
    { key: 'soil', label: 'Soil Permeability', icon: '💧', hint: 'Alluvial infiltration capacity (HSG B/C)' },
    { key: 'farmland', label: 'Farmland Proximity', icon: '🌾', hint: 'Distance to agricultural clusters' },
    { key: 'width', label: 'Stream Stability', icon: '🏗️', hint: 'Narrow cross-section for low cost' }
  ];

  return (
    <div className="w-full h-[540px] overflow-y-auto scrollbar-thin glass-panel p-5 space-y-5 pr-3">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-900/50 pb-3 gap-2">
        <div className="flex items-center gap-2 text-cyan-400">
          <Sliders className="w-5 h-5" />
          <h2 className="text-base font-bold tracking-wide">Multi-Criteria AI Decision Engine</h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">COP30 DEM Spatial Weighting</span>
      </div>

      {/* Decision Profile Preset Pills */}
      {activeModel && onSelectModel && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MCDA_PROFILES).map(([key, profile]) => {
            const isSelected = activeModel === key;
            return (
              <button
                key={key}
                onClick={() => onSelectModel(key)}
                className={`p-2.5 rounded-xl text-left border transition ${
                  isSelected 
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md ${
                    isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {profile.badge}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-400 font-mono">
                    {profile.score}
                  </span>
                </div>
                <div className="text-xs font-bold line-clamp-1">{profile.name}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* AHP Weight Sliders Grid */}
      <div className="grid grid-cols-1 gap-4 bg-slate-900/60 p-4 rounded-xl border border-blue-900/40">
        {sliderConfig.map(s => {
          const val = weights[s.key] || 0;
          return (
            <div key={s.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1">
                  <span>{s.icon}</span> {s.label}
                </span>
                <span className="font-mono text-cyan-400 font-bold">{val}%</span>
              </div>

              <input 
                type="range"
                min="0"
                max="60"
                step="5"
                value={val}
                onChange={(e) => onWeightChange(s.key, parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              <div className="text-[10px] text-slate-400">{s.hint}</div>
            </div>
          );
        })}
      </div>

      {/* Ranked Candidate Check-Dam Location Cards */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-col gap-1 text-xs font-bold text-slate-300">
          <span>RANKED CANDIDATE CHECK-DAM LOCATIONS ({dams.length})</span>
          <span className="text-[10px] text-slate-400 font-mono">Click card to inspect on map & profile graph</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {dams.map(dam => {
            const isSelected = selectedDam && selectedDam.id === dam.id;
            const liveScore = calculateMCDAScore(dam, weights);

            return (
              <div
                key={dam.id}
                onClick={() => onSelectDam(dam)}
                className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                  isSelected 
                    ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400' 
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                {/* Header Rank Badge & Score */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                    isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    #{dam.rank} Site
                  </span>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-cyan-400 font-mono">
                      {liveScore}/100
                    </span>
                  </div>
                </div>

                {/* Location Name & District */}
                <h3 className="text-xs font-bold text-slate-100 line-clamp-1 mb-0.5">
                  {dam.regionName || dam.name}
                </h3>

                <p className="text-[10px] text-slate-400 mb-2">
                  {dam.district} ({dam.lat.toFixed(3)}°N, {dam.lng.toFixed(3)}°E)
                </p>

                {/* Key Telemetry Breakdown */}
                <div className="space-y-1 text-[10px] border-t border-slate-800/80 pt-2 font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>DEM Elev:</span>
                    <span className="text-cyan-300 font-bold">{dam.cop30_elevation_m} m</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Rec Storage:</span>
                    <span className="text-cyan-300 font-bold">{dam.recStorageML} ML</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Water Table:</span>
                    <span className="text-emerald-400 font-bold">+{dam.aquiferRiseM} m</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Cropland:</span>
                    <span className="text-amber-400 font-bold">{dam.farmlandAcres ? dam.farmlandAcres.toLocaleString() : 0} Acres</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
