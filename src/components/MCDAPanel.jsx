import React from 'react';
import { Mountain, Droplets, Grid, Sprout, Waves } from 'lucide-react';
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
    { key: 'slope', label: 'Terrain slope', icon: Mountain, hint: 'Lower slope is better' },
    { key: 'flow', label: 'Flow accumulation', icon: Droplets, hint: 'Higher flow is better' },
    { key: 'soil', label: 'Soil permeability', icon: Grid, hint: 'Higher permeability is better' },
    { key: 'farmland', label: 'Farmland proximity', icon: Sprout, hint: 'Closer fields are better' },
    { key: 'width', label: 'Stream stability', icon: Waves, hint: 'More stable is better' }
  ];

  const selectableProfiles = Object.entries(MCDA_PROFILES).filter(([key]) => !key.startsWith('ml-'));

  return (
    <div className="w-full bg-white p-5 flex flex-col justify-between h-[calc(100vh-72px)] border-l border-slate-200">
      {/* Upper Section */}
      <div className="space-y-4 flex-shrink-0">
        {/* Panel Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Decision criteria</h2>
          <span className="text-[10px] text-slate-400 font-medium">Weights total 100%</span>
        </div>

        {/* Presets */}
        {activeModel && onSelectModel && (
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200/60">
            {selectableProfiles.map(([key, profile]) => {
              const isSelected = activeModel === key;
              return (
                <button
                  key={key}
                  onClick={() => onSelectModel(key)}
                  className={`py-1.5 px-3 rounded text-center text-xs font-bold transition ${
                    isSelected 
                      ? 'bg-[#0f766e] text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {key === 'mcda-standard' ? 'Standard' : 'Slope-optimized'}
                </button>
              );
            })}
          </div>
        )}

        {/* Sliders Grid */}
        <div className="space-y-3.5 pt-1">
          {sliderConfig.map(s => {
            const val = weights[s.key] || 0;
            const Icon = s.icon;
            const pct = Math.min(100, (val / 60) * 100);

            return (
              <div key={s.key} className="flex gap-3 items-start">
                <Icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{s.label}</span>
                    <span className="font-mono text-[#0f766e]">{val}%</span>
                  </div>
                  
                  <input 
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={val}
                    onChange={(e) => onWeightChange(s.key, parseInt(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, #0f766e ${pct}%, #e2e8f0 ${pct}%)`
                    }}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                  />
                  
                  <div className="text-[9px] text-slate-400 font-medium leading-none">{s.hint}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Middle Section: Ranked Candidate Sites (Scaled up to fill height smoothly) */}
      <div className="flex-grow flex flex-col min-h-0 pt-4 border-t border-slate-150 my-3 justify-end">
        <h3 className="text-xs font-bold text-slate-800 mb-2.5 flex-shrink-0">Ranked candidate sites</h3>
        
        <div className="flex-grow space-y-3.5 pr-0.5">
          {dams.slice(0, 5).map(dam => {
            const isSelected = selectedDam && selectedDam.id === dam.id;
            const liveScore = calculateMCDAScore(dam, weights);

            return (
              <div
                key={dam.id}
                onClick={() => onSelectDam(dam)}
                className={`p-3.5 rounded-lg cursor-pointer border flex items-center justify-between transition ${
                  isSelected 
                    ? 'bg-[#f0fdfa] border-[#0f766e] shadow-sm ring-1 ring-[#0f766e]/20' 
                    : 'bg-white border-slate-150 hover:bg-slate-50/50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Larger Rank Badge */}
                  <div className={`w-9.5 h-9.5 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    dam.rank === 1 ? 'bg-[#0f766e] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {dam.rank}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">
                      {dam.regionName || dam.name}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                      {dam.lat.toFixed(4)}° N, {dam.lng.toFixed(4)}° E
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 text-right flex-shrink-0 pl-1">
                  <div className="text-[9.5px] text-slate-400 leading-tight font-semibold">
                    <div>STORAGE <span className="font-extrabold text-slate-700">{dam.recStorageML} ML</span></div>
                    <div>GW RISE <span className="font-extrabold text-[#0f766e]">+{dam.aquiferRiseM} m</span></div>
                  </div>
                  <span className="text-xl font-extrabold text-[#0f766e] font-mono w-6 text-center">
                    {liveScore}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
