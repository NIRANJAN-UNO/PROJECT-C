import React, { useState, useEffect } from 'react';
import { ShieldAlert, Play, Pause, RotateCcw, Droplets, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { NOV_2021_CASE_STUDY } from '../data/kollidamData';

export default function CaseStudySimulator() {
  const [currentHourIndex, setCurrentHourIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentHourIndex((prev) => {
          if (prev >= NOV_2021_CASE_STUDY.timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentStep = NOV_2021_CASE_STUDY.timeline[currentHourIndex];
  const chartData = NOV_2021_CASE_STUDY.timeline.slice(0, currentHourIndex + 1);

  return (
    <div className="w-full glass-panel p-5 space-y-5 border-rose-500/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-rose-900/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-xl">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white">
                Historical Disaster Case Study: {NOV_2021_CASE_STUDY.eventName}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                Real Event Validation
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Peak Discharge: {NOV_2021_CASE_STUDY.peakDischargeCusecs} | Total Storm Rainfall: {NOV_2021_CASE_STUDY.totalRainfallMM} mm
            </p>
          </div>
        </div>

        {/* Timeline Player Controls */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause Event' : 'Play 72h Hydrograph'}
          </button>

          <button 
            onClick={() => { setCurrentHourIndex(0); setIsPlaying(false); }}
            className="p-1.5 text-slate-400 hover:text-white transition"
            title="Reset Timeline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comparison Cards: Status Quo vs AI Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Quo Card */}
        <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
            <span>🔴 Actual Historical Event (No Check Dams)</span>
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px]">100% Unutilized Loss</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {NOV_2021_CASE_STUDY.statusQuoSeaLossML.toLocaleString()} <span className="text-xs text-rose-300">ML Discharged to Sea</span>
          </div>
          <p className="text-xs text-slate-400">
            Millions of liters of fresh water drained rapid (~160 km channel) straight into the Bay of Bengal within 72 hrs.
          </p>
        </div>

        {/* AI Enabled Card */}
        <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>🟢 AI Proposed Network Solution</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">35.5% Retained</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {NOV_2021_CASE_STUDY.aiCapturedVolumeML.toLocaleString()} <span className="text-xs text-slate-400">ML Captured</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-300 pt-1">
            <span>Water Table Gain: <strong className="text-emerald-400">+{NOV_2021_CASE_STUDY.waterTableGainM} m</strong></span>
            <span>Recharged Farmland: <strong className="text-amber-400">{NOV_2021_CASE_STUDY.farmlandRechargedHa.toLocaleString()} Ha</strong></span>
          </div>
        </div>
      </div>

      {/* Timeline Slider & Telemetry */}
      <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">Flood Event Timeline Progress:</span>
          <span className="text-cyan-400 font-bold px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-400/30 rounded">
            {currentStep.hour} (River Flow: {currentStep.dischargeCusecs.toLocaleString()} Cusecs)
          </span>
        </div>

        <input 
          type="range" 
          min="0" 
          max={NOV_2021_CASE_STUDY.timeline.length - 1} 
          value={currentHourIndex}
          onChange={(e) => setCurrentHourIndex(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
      </div>

      {/* 72-Hour Hydrograph Chart */}
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.7}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="hour" stroke="#64748B" fontSize={11} />
            <YAxis stroke="#64748B" unit=" ML" fontSize={11} />
            <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#F43F5E', borderRadius: '8px', fontSize: '11px' }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Area type="monotone" dataKey="seaLossML" stroke="#EF4444" fillOpacity={1} fill="url(#colorLoss)" name="Unsaved Water Loss to Ocean (ML)" />
            <Area type="monotone" dataKey="aiCapturedML" stroke="#10B981" fillOpacity={1} fill="url(#colorCap)" name="AI Infrastructure Captured Volume (ML)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
