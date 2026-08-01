import React, { useState, useEffect } from 'react';
import { CloudRain, Gauge, TrendingUp, DollarSign, Sprout, ArrowUpRight, Calendar, Layers, Info } from 'lucide-react';
import { calculateSCSCNRunoff, calculateGroundwaterImpact } from '../utils/hydrology';

export default function HydroCalculator({ rainfallMM, onRainfallChange, selectedDam }) {
  const [selectedDate, setSelectedDate] = useState('2021-11-18');
  const [realPrecipInfo, setRealPrecipInfo] = useState(null);
  const [stormMultiplier, setStormMultiplier] = useState(1); // 1x, 2x, 3x, 5x storm simulation multiplier

  // Preset Historical Storm Events in Kollidam Basin
  const PRESET_EVENTS = [
    { label: "Nov 18, 2021 (Monsoon Cyclone)", date: "2021-11-18" },
    { label: "Aug 04, 2022 (Severe Surge)", date: "2022-08-04" },
    { label: "Dec 15, 2024 (Cyclone Surge)", date: "2024-12-15" },
    { label: "Jul 19, 2025 (Monsoon Rainfall)", date: "2025-07-19" }
  ];

  // Fetch real rainfall GeoTIFF data from Python FastAPI backend for selected date
  useEffect(() => {
    async function fetchRealPrecip() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/rainfall/daily?date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          if (data.mean_mm !== undefined) {
            setRealPrecipInfo(data);
            // Apply multiplier to real mean rainfall
            onRainfallChange(Math.round(data.mean_mm * stormMultiplier));
          }
        }
      } catch (err) {
        console.warn("FastAPI backend offline for rainfall fetch:", err);
      }
    }
    fetchRealPrecip();
  }, [selectedDate, stormMultiplier]);

  const cn = selectedDam ? (selectedDam.hsg.startsWith('B') ? 78 : selectedDam.hsg.startsWith('C') ? 83 : 88) : 80;
  
  // Calculate runoff using multiplied rainfall
  const hydro = calculateSCSCNRunoff(rainfallMM, cn, 450);
  const gw = calculateGroundwaterImpact(hydro.volumeML, 6.0);
  
  const estCostLakhs = selectedDam ? selectedDam.costLakhs : 18.0;
  const annualIrrigationValueLakhs = Math.round((hydro.volumeML * 2.8) / 10);
  const paybackMonths = hydro.volumeML > 0 
    ? Number(((estCostLakhs / (annualIrrigationValueLakhs || 1)) * 12).toFixed(1))
    : 120.0; // Max out payback period if 0 runoff

  const Ia = Number((0.2 * ((25400 / cn) - 254)).toFixed(1));
  const isBelowThreshold = rainfallMM <= Ia;

  return (
    <div className="w-full glass-panel p-5 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-blue-900/50 pb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <CloudRain className="w-5 h-5" />
          <h2 className="text-base font-bold tracking-wide">Real 10-Year GeoTIFF Hydro Runoff Engine</h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">2015–2025 Daily Rasters</span>
      </div>

      {/* Date & Preset Storm Selector */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-blue-900/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Query Historical Rainfall GeoTIFF Date:
          </span>
          <span className="text-cyan-400 font-mono text-sm px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-400/30 rounded-md">
            {rainfallMM} mm Precip {stormMultiplier > 1 ? `(${stormMultiplier}x Sim)` : ''}
          </span>
        </div>

        {/* Preset Selector Buttons */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {PRESET_EVENTS.map(evt => (
            <button
              key={evt.date}
              onClick={() => {
                setSelectedDate(evt.date);
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-left font-semibold transition ${
                selectedDate === evt.date
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {evt.label}
            </button>
          ))}
        </div>

        {/* Storm Intensity Multiplier (Simulates Climate Change / Severe storms) */}
        <div className="space-y-1.5 pt-1.5 border-t border-slate-800/50">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Simulate Climate Storm Multiplier:</span>
            <span className="text-amber-400 font-mono">{stormMultiplier}x Scale</span>
          </div>
          <input 
            type="range"
            min="1"
            max="5"
            step="1"
            value={stormMultiplier}
            onChange={(e) => setStormMultiplier(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Direct Date Picker Input */}
        <div className="flex items-center gap-2 pt-1">
          <label className="text-[11px] text-slate-400 font-mono">Custom Date (2015-2025):</label>
          <input 
            type="date" 
            min="2015-01-01" 
            max="2025-12-31" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-cyan-300 text-xs px-2.5 py-1 rounded-md font-mono"
          />
        </div>

        {realPrecipInfo && (
          <div className="text-[10px] text-emerald-400 font-mono pt-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-400" />
            <span>Source: {realPrecipInfo.source || 'E:\\rainfall data TIF'} | Range: {realPrecipInfo.min_mm}mm - {realPrecipInfo.max_mm}mm</span>
          </div>
        )}
      </div>

      {/* Hydrological Infiltration Warning/Explanation Banner */}
      {isBelowThreshold && (
        <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl flex gap-2.5 text-xs text-amber-300">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Initial Abstraction Threshold Active</div>
            <p className="text-[11px] text-slate-300 leading-normal">
              Rainfall intensity ({rainfallMM} mm) is below the soil's Initial Abstraction threshold (Ia = {Ia} mm). 
              The dry basin soil absorbs the water entirely, generating 0 surface runoff. 
              <strong> Drag the "Storm Multiplier" slider above to scale the storm and generate runoff!</strong>
            </p>
          </div>
        </div>
      )}

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
            {gw.rechargeAreaAcres.toLocaleString()} <span className="text-xs text-slate-400">Acres</span>
          </div>
          <span className="text-[10px] text-slate-400">({gw.rechargeAreaHa.toLocaleString()} Hectares)</span>
        </div>

        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-blue-900/40">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-semibold mb-1">
            <span>Payback Period</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-extrabold text-indigo-400 font-mono">
            {hydro.volumeML > 0 ? `${paybackMonths} M` : 'N/A'}
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
