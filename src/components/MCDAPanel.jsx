import React, { useState } from 'react';
import { Mountain, Droplets, Grid, Sprout, Waves, ChevronDown, ChevronUp, Sliders, Trophy, Cpu } from 'lucide-react';
import { calculateMCDAScore, MCDA_PROFILES } from '../utils/hydrology';

export default function MCDAPanel({ 
  dams = [],
  weights, 
  onWeightChange, 
  selectedDam,
  onSelectDam,
  activeModel,
  onSelectModel
}) {
  const [openSections, setOpenSections] = useState({
    criteria: true,
    sites: true,
    info: false
  });

  const toggleSection = (sectionKey) => {
    setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const sliderConfig = [
    { key: 'slope', label: 'Terrain slope', icon: Mountain, hint: 'Lower slope is better' },
    { key: 'flow', label: 'Flow accumulation', icon: Droplets, hint: 'Higher flow is better' },
    { key: 'soil', label: 'Soil permeability', icon: Grid, hint: 'Higher permeability is better' },
    { key: 'farmland', label: 'Farmland proximity', icon: Sprout, hint: 'Closer fields are better' },
    { key: 'width', label: 'Stream stability', icon: Waves, hint: 'More stable is better' }
  ];

  const selectableProfiles = Object.entries(MCDA_PROFILES).filter(([key]) => !key.startsWith('ml-'));

  const activeProfileData = MCDA_PROFILES[activeModel] || MCDA_PROFILES['mcda-standard'];

  return (
    <div className="w-full bg-slate-50/60 p-4 h-[calc(100vh-72px)] overflow-y-auto space-y-4 border-l border-slate-200">
      
      {/* SECTION 1: Decision Criteria & Weight Sliders */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Accordion Header */}
        <button 
          onClick={() => toggleSection('criteria')}
          className="w-full px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between transition border-b border-slate-100"
        >
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
            <Sliders className="w-4 h-4 text-[#0f766e]" />
            <span>Decision Criteria Weights</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400">Total 100%</span>
            {openSections.criteria ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {/* Accordion Body */}
        {openSections.criteria && (
          <div className="p-4 space-y-4">
            {/* Presets Toggle */}
            {activeModel && onSelectModel && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evaluation Profile</div>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
                  {selectableProfiles.map(([key, profile]) => {
                    const isSelected = activeModel === key;
                    return (
                      <button
                        key={key}
                        onClick={() => onSelectModel(key)}
                        className={`py-1.5 px-2.5 rounded text-center text-xs font-bold transition ${
                          isSelected 
                            ? 'bg-[#0f766e] text-white shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                      >
                        {key === 'mcda-standard' ? 'Balanced MCDA' : 'Slope-Optimized'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sliders List */}
            <div className="space-y-3.5 pt-1">
              {sliderConfig.map(s => {
                const val = weights[s.key] || 0;
                const Icon = s.icon;
                const pct = Math.min(100, (val / 60) * 100);

                return (
                  <div key={s.key} className="flex gap-2.5 items-start">
                    <Icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>{s.label}</span>
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
                          background: `linear-gradient(to right, #0f766e ${pct}%, #e2e8f0 ${pct}%)`
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#0f766e]"
                      />
                      
                      <div className="text-[9.5px] text-slate-400 font-medium leading-none">{s.hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Ranked Candidate Check Dam Sites */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Accordion Header */}
        <button 
          onClick={() => toggleSection('sites')}
          className="w-full px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between transition border-b border-slate-100"
        >
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Ranked Candidate Sites</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-[#0f766e] bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#dcfce7]">
              {dams.length} Sites
            </span>
            {openSections.sites ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {/* Accordion Body */}
        {openSections.sites && (
          <div className="p-3 space-y-2.5">
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
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-sm ${
                      dam.rank === 1 ? 'bg-[#0f766e] text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      #{dam.rank}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">
                        {dam.regionName || dam.name}
                      </h4>
                      <p className="text-[9.5px] text-slate-400 font-mono mt-0.5 truncate">
                        {dam.lat.toFixed(4)}° N, {dam.lng.toFixed(4)}° E
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right flex-shrink-0 pl-2">
                    <div className="text-[9.5px] text-slate-500 leading-tight font-medium hidden xs:block">
                      <div>Storage: <span className="font-bold text-slate-800">{dam.recStorageML} ML</span></div>
                      <div>GW Rise: <span className="font-bold text-[#0f766e]">+{dam.aquiferRiseM} m</span></div>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 px-2 py-1 rounded-md min-w-[38px]">
                      <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Score</span>
                      <span className="text-sm font-extrabold text-[#0f766e] font-mono leading-tight mt-0.5">
                        {liveScore}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: Model Engine Summary */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <button 
          onClick={() => toggleSection('info')}
          className="w-full px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between transition"
        >
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
            <Cpu className="w-4 h-4 text-purple-600" />
            <span>Active Model Profile</span>
          </div>
          {openSections.info ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.info && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800">{activeProfileData.name}</div>
            <p className="text-[11px] leading-relaxed text-slate-500">{activeProfileData.details}</p>
            <div className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-200">
              {activeProfileData.badge}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
