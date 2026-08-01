import React from 'react';
import { Mountain, Droplets, Grid, Sprout, Waves, Layers } from 'lucide-react';
import { calculateMCDAScore, MCDA_PROFILES } from '../utils/hydrology';

export default function MCDAPanel({ 
  dams,
  weights, 
  onWeightChange, 
  selectedDam,
  onSelectDam,
  activeModel,
  onSelectModel,
  layers,
  setLayers
}) {
  const sliderConfig = [
    { key: 'slope', label: 'Terrain slope', icon: Mountain, hint: 'Lower slope is better' },
    { key: 'flow', label: 'Flow accumulation', icon: Droplets, hint: 'Higher flow is better' },
    { key: 'soil', label: 'Soil permeability', icon: Grid, hint: 'Higher permeability is better' },
    { key: 'farmland', label: 'Farmland proximity', icon: Sprout, hint: 'Closer fields are better' },
    { key: 'width', label: 'Stream stability', icon: Waves, hint: 'More stable is better' }
  ];

  const modelOptions = [
    { key: 'mcda-standard', label: 'Standard MCDA' },
    { key: 'mcda-slope', label: 'Slope Focus' },
    { key: 'ml-kmeans', label: 'AI K-Means' },
    { key: 'ml-randomforest', label: 'AI Random Forest' }
  ];

  return (
    <div className="w-full bg-white p-4 flex flex-col h-[calc(100vh-72px)] border-l border-slate-200 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-slate-200">
      
      {/* 1. Model Presets Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">AI & Criteria Engine</h2>
          <span className="text-[10px] text-slate-400 font-medium">Select Model</span>
        </div>

        {activeModel && onSelectModel && (
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100/70 p-1 rounded-lg border border-slate-200/80">
            {modelOptions.map(opt => {
              const isSelected = activeModel === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => onSelectModel(opt.key)}
                  className={`py-1.5 px-2 rounded text-center text-xs font-bold transition ${
                    isSelected 
                      ? 'bg-[#0f766e] text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Weight Sliders */}
      <div className="space-y-3.5 bg-slate-50/60 p-3 rounded-lg border border-slate-200/60">
        {sliderConfig.map(s => {
          const val = weights[s.key] || 0;
          const Icon = s.icon;
          const pct = Math.min(100, (val / 60) * 100);

          return (
            <div key={s.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  {s.label}
                </span>
                <span className="font-mono text-[#0f766e] font-extrabold">{val}%</span>
              </div>
              
              <input 
                type="range"
                min="0"
                max="60"
                step="5"
                value={val}
                onChange={(e) => onWeightChange(s.key, parseInt(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #0f766e ${pct}%, #cbd5e1 ${pct}%)`
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-[9.5px] text-slate-400 font-medium text-right">{s.hint}</div>
            </div>
          );
        })}
      </div>

      {/* 3. Layer Toggles (Minimalist Inline Controls) */}
      {layers && setLayers && (
        <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/60 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 mb-1">
            <Layers className="w-3.5 h-3.5 text-[#0f766e]" />
            <span>Spatial Map Layers</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-650">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input 
                type="checkbox" 
                checked={layers.riverPath} 
                onChange={(e) => setLayers({...layers, riverPath: e.target.checked})}
                className="rounded text-[#0f766e] focus:ring-0 accent-[#0f766e]"
              />
              <span>River Network</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input 
                type="checkbox" 
                checked={layers.candidateSites} 
                onChange={(e) => setLayers({...layers, candidateSites: e.target.checked})}
                className="rounded text-[#0f766e] focus:ring-0 accent-[#0f766e]"
              />
              <span>Check Dams</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input 
                type="checkbox" 
                checked={layers.rechargeZones} 
                onChange={(e) => setLayers({...layers, rechargeZones: e.target.checked})}
                className="rounded text-[#0f766e] focus:ring-0 accent-[#0f766e]"
              />
              <span>Recharge Zones</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input 
                type="checkbox" 
                checked={layers.floodZone || false} 
                onChange={(e) => setLayers({...layers, floodZone: e.target.checked})}
                className="rounded text-rose-500 focus:ring-0 accent-rose-500"
              />
              <span>Flood Inundation</span>
            </label>
          </div>
        </div>
      )}

      {/* 4. Ranked Candidate Sites */}
      <div className="space-y-2.5 pt-1">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
          Ranked Candidate Sites ({dams.length})
        </h3>
        
        <div className="space-y-2">
          {dams.slice(0, 5).map(dam => {
            const isSelected = selectedDam && selectedDam.id === dam.id;
            const liveScore = calculateMCDAScore(dam, weights);

            return (
              <div
                key={dam.id}
                onClick={() => onSelectDam(dam)}
                className={`p-3 rounded-lg cursor-pointer border flex items-center justify-between transition ${
                  isSelected 
                    ? 'bg-[#f0fdfa] border-[#0f766e] shadow-sm ring-1 ring-[#0f766e]/30' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    dam.rank === 1 ? 'bg-[#0f766e] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    #{dam.rank}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">
                      {dam.regionName || dam.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {dam.lat.toFixed(4)}° N, {dam.lng.toFixed(4)}° E
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right flex-shrink-0 pl-2">
                  <div className="text-[10px] text-slate-500 leading-tight font-semibold">
                    <div>{dam.recStorageML} ML</div>
                    <div className="text-[#0f766e]">+{dam.aquiferRiseM} m GW</div>
                  </div>
                  <div className="text-lg font-extrabold text-[#0f766e] font-mono w-7 text-center">
                    {liveScore}
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
