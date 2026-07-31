import React from 'react';
import { Sliders, Award, MapPin, CheckCircle, ChevronRight, Droplet } from 'lucide-react';

export default function MCDAPanel({ 
  dams, 
  weights, 
  onWeightChange, 
  selectedDam, 
  onSelectDam 
}) {
  return (
    <div className="w-full glass-panel p-5 space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-blue-900/50 pb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <Sliders className="w-5 h-5" />
          <h2 className="text-base font-bold tracking-wide">Multi-Criteria AI Decision Engine</h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">AHP Spatial Weighting</span>
      </div>

      {/* Interactive Weight Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-900/60 p-3 rounded-xl border border-blue-900/40">
        <div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
            <span>Terrain Slope</span>
            <span className="text-cyan-400 font-mono">{weights.slope}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="50" 
            value={weights.slope}
            onChange={(e) => onWeightChange('slope', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
            <span>Flow Accumulation</span>
            <span className="text-cyan-400 font-mono">{weights.flow}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="50" 
            value={weights.flow}
            onChange={(e) => onWeightChange('flow', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
            <span>Soil Permeability</span>
            <span className="text-cyan-400 font-mono">{weights.soil}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="50" 
            value={weights.soil}
            onChange={(e) => onWeightChange('soil', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
            <span>Farmland Proximity</span>
            <span className="text-cyan-400 font-mono">{weights.farmland}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="50" 
            value={weights.farmland}
            onChange={(e) => onWeightChange('farmland', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
            <span>Stream Stability</span>
            <span className="text-cyan-400 font-mono">{weights.width}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="50" 
            value={weights.width}
            onChange={(e) => onWeightChange('width', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* Ranked Candidate Site Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Ranked Candidate Check-Dam Locations ({dams.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {dams.map((dam) => {
            const isSelected = selectedDam && selectedDam.id === dam.id;
            return (
              <div 
                key={dam.id}
                onClick={() => onSelectDam(dam)}
                className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                  isSelected 
                    ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/20' 
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-slate-800 text-cyan-300 border border-slate-700 rounded-md">
                    #{dam.rank} Site
                  </span>
                  <span className="text-xs font-bold text-cyan-400 font-mono">
                    {dam.calculatedScore || dam.score}/100
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-100 line-clamp-1 mb-1">
                  {dam.name}
                </h4>
                
                <p className="text-[10px] text-slate-400 mb-2">{dam.district}</p>

                <div className="space-y-1 text-[10px] border-t border-slate-800/80 pt-2 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rec Storage:</span>
                    <span className="font-semibold text-cyan-300">{dam.recStorageML} ML</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Soil Group:</span>
                    <span className="font-semibold text-emerald-300">{dam.hsg}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Water Table:</span>
                    <span className="font-semibold text-amber-300">+{dam.aquiferRiseM} m</span>
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
