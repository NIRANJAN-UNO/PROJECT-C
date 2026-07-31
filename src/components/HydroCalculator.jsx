import React from 'react';
import { CloudRain, Gauge, TrendingUp, DollarSign, Sprout, ArrowUpRight } from 'lucide-react';
import { calculateSCSCNRunoff, calculateGroundwaterImpact } from '../utils/hydrology';

export default function HydroCalculator({ rainfallMM, onRainfallChange, selectedDam }) {
  const cn = selectedDam ? (selectedDam.hsg.startsWith('B') ? 78 : selectedDam.hsg.startsWith('C') ? 83 : 88) : 80;
  const hydro = calculateSCSCNRunoff(rainfallMM, cn, 450);
  const gw = calculateGroundwaterImpact(hydro.volumeML, 6.0);
  
  // Cost benefit estimates
  const estCostLakhs = selectedDam ? selectedDam.costLakhs : 18.0;
  const annualIrrigationValueLakhs = Math.round((hydro.volumeML * 2.8) / 10);
  const paybackMonths = Number(((estCostLakhs / (annualIrrigationValueLakhs || 1)) * 12).toFixed(1));

  return (
    <div className="w-full glass-panel p-5 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-blue-900/50 pb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <CloudRain className="w-5 h-5" />
          <h2 className="text-base font-bold tracking-wide">SCS-CN Hydrological Runoff Engine</h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">USDA Soil Conservation Service Method</span>
      </div>

      {/* Rainfall Slider */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-blue-900/40 space-y-2">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-slate-300">Simulated Monsoon Storm Event (Rainfall):</span>
          <span className="text-cyan-400 font-mono text-sm px-2 py-0.5 bg-cyan-500/10 border border-cyan-400/30 rounded-md">
            {rainfallMM} mm Storm
          </span>
        </div>
        
        <input 
          type="range" 
          min="50" 
          max="300" 
          step="5"
          value={rainfallMM}
          onChange={(e) => onRainfallChange(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        <div className="flex justify-between text-[10px] text-slate-400 pt-1">
          <span>50 mm (Moderate Rain)</span>
          <span>150 mm (Heavy Monsoon)</span>
          <span>300 mm (Extreme Cyclone Event)</span>
        </div>
      </div>

      {/* Dynamic Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-blue-900/40">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold mb-1">
            <span>Trapped Runoff</span>
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-extrabold text-cyan-400 font-mono">
            {hydro.volumeML} <span className="text-xs text-slate-400">ML</span>
          </div>
          <span className="text-[10px] text-slate-400">~{hydro.volumeTMC} TMC Freshwater</span>
        </div>

        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-blue-900/40">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold mb-1">
            <span>Water Table Gain</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-extrabold text-emerald-400 font-mono">
            +{gw.deltaHMeters} <span className="text-xs text-slate-400">meters</span>
          </div>
          <span className="text-[10px] text-slate-400">Radius: ~{gw.radiusKm} km</span>
        </div>

        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-blue-900/40">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold mb-1">
            <span>Farmland Recharged</span>
            <Sprout className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-extrabold text-amber-400 font-mono">
            {gw.rechargeAreaHa.toLocaleString()} <span className="text-xs text-slate-400">Ha</span>
          </div>
          <span className="text-[10px] text-slate-400">Drought Mitigation Zone</span>
        </div>

        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-blue-900/40">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold mb-1">
            <span>Payback Period</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-extrabold text-indigo-400 font-mono">
            {paybackMonths} <span className="text-xs text-slate-400">Months</span>
          </div>
          <span className="text-[10px] text-slate-400">Annual Value: ₹{annualIrrigationValueLakhs}L</span>
        </div>
      </div>

      {/* Formula Breakdown Info Box */}
      <div className="p-3 bg-blue-950/30 border border-blue-900/40 rounded-lg text-[11px] text-slate-300 font-mono flex items-center justify-between">
        <span>Formula: Q = (P - 0.2S)² / (P + 0.8S) | S = (25400/CN) - 254 | Active CN: {cn}</span>
        <ArrowUpRight className="w-4 h-4 text-cyan-400" />
      </div>
    </div>
  );
}
