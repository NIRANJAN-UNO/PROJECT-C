import React from 'react';
import { Cpu, HelpCircle, Layers, Sliders, CheckCircle2, ChevronRight } from 'lucide-react';
import { MCDA_PROFILES } from '../utils/hydrology';

export default function MLBenchmarkPanel({ activeModel, onSelectModel }) {
  // Detailed static benchmarks for each model for comparative analysis
  const modelComparisons = [
    {
      key: 'mcda-standard',
      name: 'Standard MCDA',
      algo: 'Weighted Linear Combination',
      inputs: 'DEM Slope, HSG Class, Farmland Proximity, Stream Width',
      logic: 'Evaluates each point using normalized linear scoring. Simple and transparent.',
      identifiedRegion: 'Middle reaches (Near Thirumanur & Kabisthalam)',
      bestFor: 'Balanced water storage and recharge objectives.'
    },
    {
      key: 'mcda-slope',
      name: 'Slope-Optimized MCDA',
      algo: 'Topographic Gradient Focus',
      inputs: 'Terrain Slope (Weight: 55%), Elevation, HSG, Farmland',
      logic: 'Strictly penalizes slopes > 2.0° to prioritize flat check-dam pools.',
      identifiedRegion: 'Delta tail-end (Near Sirkazhi & Lower Anicut)',
      bestFor: 'Maximizing reservoir backwater area and pooling capacity.'
    },
    {
      key: 'ml-kmeans',
      name: 'K-Means Clustering AI',
      algo: 'Unsupervised Spatial Partitioning',
      inputs: '4D Feature Matrix: [Elevation, Slope, Aspect, Coordinate Index]',
      logic: 'Groups 115 coordinates into 5 geomorphic zones and selects closest points to centroids.',
      identifiedRegion: 'Distributed evenly along the entire 160km meander',
      bestFor: 'Ensuring uniform geomorphological check-dam distribution across the basin.'
    },
    {
      key: 'ml-randomforest',
      name: 'Random Forest Regressor AI',
      algo: 'Supervised Ensemble Trees (50 trees)',
      inputs: '5D Matrix: [Elev, Slope, Aspect, Soil Ksat Infiltration, Index]',
      logic: 'Trains 50 decision trees to predict non-linear suitability, ranking the top 5 spots.',
      identifiedRegion: 'Upper bedrock zones (Near Mukkombu & Lalgudi)',
      bestFor: 'High-suitability bedrock placement with maximum structural durability.'
    }
  ];

  return (
    <div className="w-full glass-panel p-5 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-blue-900/50 pb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <Cpu className="w-5 h-5" />
          <h2 className="text-base font-bold tracking-wide">AI Models & Decision Engine Comparison</h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Real-Time GIS benchmarking</span>
      </div>

      {/* Model Cards Selector */}
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
                <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider ${
                  isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  {profile.badge}
                </span>
                <span className="text-[10px] font-bold text-cyan-300 font-mono">
                  {profile.score}
                </span>
              </div>

              <h3 className="text-xs font-bold text-slate-100 line-clamp-1 mb-1">
                {profile.name}
              </h3>
              
              <p className="text-[10px] text-slate-400 line-clamp-2 mb-2">
                {profile.details}
              </p>

              <div className="flex items-center justify-between text-[10px] border-t border-slate-800/50 pt-2 text-slate-300 font-mono">
                <span className="text-slate-500">Methodology:</span>
                <span className="font-semibold text-emerald-400">{profile.type}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-300 font-semibold font-mono">
              <th className="p-3">Decision Engine</th>
              <th className="p-3">Algorithm</th>
              <th className="p-3">Input Variables</th>
              <th className="p-3">Optimization Logic</th>
              <th className="p-3">Identified Reach</th>
              <th className="p-3">Best Recommended For</th>
            </tr>
          </thead>
          <tbody>
            {modelComparisons.map((row) => {
              const isSelected = activeModel === row.key;
              return (
                <tr 
                  key={row.key}
                  onClick={() => onSelectModel(row.key)}
                  className={`border-b border-slate-800/60 transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-cyan-950/20 text-cyan-200 font-medium' 
                      : 'hover:bg-slate-900/30 text-slate-300'
                  }`}
                >
                  <td className="p-3 flex items-center gap-2">
                    {isSelected && <ChevronRight className="w-4 h-4 text-cyan-400 animate-pulse" />}
                    <span className={isSelected ? 'text-cyan-400 font-bold' : ''}>
                      {row.name}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px]">{row.algo}</td>
                  <td className="p-3 text-[11px] text-slate-400">{row.inputs}</td>
                  <td className="p-3 text-[11px] text-slate-400">{row.logic}</td>
                  <td className="p-3 text-emerald-400 font-medium">{row.identifiedRegion}</td>
                  <td className="p-3 text-[11px] text-cyan-300 font-semibold">{row.bestFor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
