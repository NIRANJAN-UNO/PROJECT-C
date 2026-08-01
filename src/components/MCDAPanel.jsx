import React, { useState } from 'react';
import { Mountain, Droplets, Grid, Sprout, Waves, ChevronDown, ChevronUp, Sliders, Trophy, Cpu } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts';
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
    info: false,
    xai: true
  });

  const getAttributions = (dam) => {
    if (dam.attributions) return dam.attributions;
    // Local fallback calculation for custom placed dams or offline mode
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
    const wSlope = (weights.slope || 0) / totalWeight;
    const wFlow = (weights.flow || 0) / totalWeight;
    const wSoil = (weights.soil || 0) / totalWeight;
    const wFarmland = (weights.farmland || 0) / totalWeight;
    const wWidth = (weights.width || 0) / totalWeight;

    const sSlope = Math.max(0, 100 - ((dam.slopeDeg || dam.slope_deg || 0.8) * 25));
    const sFlow = 85.0;
    const sSoil = dam.hsg.startsWith("A") || dam.hsg.startsWith("B") ? 95.0 : dam.hsg.startsWith("C") ? 75.0 : 55.0;
    const sFarm = Math.min(100, ((dam.farmlandHa || 200) / 300) * 100);
    const sWidth = Math.min(100, Math.max(20, (350 - parseFloat(dam.recWidth || 260)) / 2));

    return {
      "Terrain Slope": Math.round(wSlope * (sSlope - 77.5) * 10) / 10,
      "Flow Accumulation": Math.round(wFlow * (sFlow - 85.0) * 10) / 10,
      "Soil Infiltration": Math.round(wSoil * (sSoil - 75.0) * 10) / 10,
      "Farmland Proximity": Math.round(wFarmland * (sFarm - 25.0) * 10) / 10,
      "Stream Width/Stability": Math.round(wWidth * (sWidth - 45.0) * 10) / 10
    };


  };

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

  const selectableProfiles = Object.entries(MCDA_PROFILES);

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
            <span>Decision Criteria & Models</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400">Total 100%</span>
            {openSections.criteria ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {/* Accordion Body */}
        {openSections.criteria && (
          <div className="p-4 space-y-4">
            {/* Model Selector Dropdown & Badges */}
            {activeModel && onSelectModel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hydrological Model Engine</span>
                  <span className="text-[9.5px] font-bold text-[#0f766e] bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#dcfce7]">
                    {selectableProfiles.length} Models Available
                  </span>
                </div>
                
                {/* Select Dropdown */}
                <select
                  value={activeModel}
                  onChange={(e) => onSelectModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg p-2.5 outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                >
                  <optgroup label="Multi-Criteria Decision Analysis (MCDA)">
                    <option value="mcda-standard">⚖️ Standard Hydro-MCDA (Balanced)</option>
                    <option value="mcda-slope">📐 Slope-Optimized Selection (&lt;2°)</option>
                    <option value="mcda-soil">💧 Deep Alluvial Soil Recharge (Ksat)</option>
                  </optgroup>
                  <optgroup label="Machine Learning & AI Models">
                    <option value="ml-kmeans">🤖 K-Means Spatial Clustering AI</option>
                    <option value="ml-randomforest">🌲 Random Forest Regressor AI</option>
                  </optgroup>
                </select>

                {/* Active Model Description Pill */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-[11px] leading-relaxed text-slate-600">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-0.5">
                    <span>{activeProfileData.name}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-500">{activeProfileData.details}</div>
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
                      <div>Cropland: <span className="font-bold text-amber-600">{dam.farmlandAcres ? dam.farmlandAcres.toLocaleString() : 0} Ac</span></div>
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



      {/* SECTION 4: AI Explainability (XAI) */}
      {selectedDam && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <button 
            onClick={() => toggleSection('xai')}
            className="w-full px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between transition border-b border-slate-100"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
              <Cpu className="w-4 h-4 text-[#0f766e]" />
              <span>AI Explanation: {selectedDam.regionName || selectedDam.name}</span>
            </div>
            {openSections.xai ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.xai && (
            <div className="p-4 space-y-3">
              <div className="text-[10px] text-slate-500 leading-relaxed">
                This chart shows how individual features pushed the suitability score **above** (positive/teal) or **below** (negative/rose) the global river average (baseline: 73).
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={Object.entries(getAttributions(selectedDam)).map(([feature, val]) => ({
                      feature,
                      value: val,
                      color: val >= 0 ? '#0f766e' : '#be123c'
                    }))} 
                    layout="vertical" 
                    margin={{ left: -10, right: 10, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" fontSize={9} stroke="#94a3b8" />
                    <YAxis dataKey="feature" type="category" fontSize={8.5} width={90} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', fontSize: '10px', color: '#000' }}
                      formatter={(value) => [`${value} pts`, 'Score Contribution']}
                    />
                    <ReferenceLine x={0} stroke="#cbd5e1" />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {Object.entries(getAttributions(selectedDam)).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry[1] >= 0 ? '#0f766e' : '#be123c'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Final Score: <strong>{calculateMCDAScore(selectedDam, weights)}/100</strong></span>
                <span>Sum of Impacts: <strong>{(Object.values(getAttributions(selectedDam)).reduce((a, b) => a + b, 0)).toFixed(1)} pts</strong></span>
              </div>

              {/* LCLU Farmland Detail Box */}
              <div className="p-3 bg-[#fffbeb] border border-[#fef3c7] rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#b45309]">
                  <Sprout className="w-4 h-4 text-[#d97706]" />
                  <span>Cropland Recharged (Satellite LCLU)</span>
                </div>
                <div className="text-[11px] leading-relaxed text-amber-900 font-semibold">
                  Supplies aquifer groundwater recharge to <span className="underline text-amber-950 font-extrabold">{selectedDam.farmlandAcres ? selectedDam.farmlandAcres.toLocaleString() : 0} Acres</span> ({selectedDam.farmlandHa || 0} Hectares) of agricultural fields.
                </div>
                <div className="text-[9px] text-amber-800/80 leading-normal border-t border-amber-200/50 pt-1.5 font-medium">
                  🛰️ Analyzed from Copernicus 10m Land Use land cover classification rasters. Detects active crops inside a 1.5km spatial buffer zone.
                </div>
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
}
