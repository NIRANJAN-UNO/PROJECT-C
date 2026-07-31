import React, { useState } from 'react';
import { Database, X, Code, Copy, Check, ExternalLink, Cpu } from 'lucide-react';
import { GEE_PYTHON_SCRIPT } from '../data/kollidamData';

export default function GEEAnalyticsModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GEE_PYTHON_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl glass-panel-glow border-cyan-500/40 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Database className="w-6 h-6" />
            <h2 className="text-lg font-extrabold text-white">
              Google Earth Engine (GEE) Remote Sensing Engine
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Our spatial AI engine leverages <strong>Google Earth Engine (GEE)</strong> cloud infrastructure to extract NASA SRTM 30m Digital Elevation Models (DEM), Sentinel-2 NDWI spectral water indices, and ESA WorldCover 10m LULC datasets for the lower Kollidam River basin.
        </p>

        {/* Satellite Indices Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-cyan-500/30">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">NASA SRTM DEM</span>
            <span className="text-sm font-bold text-cyan-300">30m Spatial Grid</span>
            <p className="text-[10px] text-slate-400 mt-1">Calculates river bed slope gradient & flow accumulation topology.</p>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-blue-500/30">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Sentinel-2 NDWI</span>
            <span className="text-sm font-bold text-blue-300">(B3 - B8) / (B3 + B8)</span>
            <p className="text-[10px] text-slate-400 mt-1">Extracts active river channel width & surface water presence.</p>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-emerald-500/30">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">ESA WorldCover</span>
            <span className="text-sm font-bold text-emerald-300">10m LULC Classes</span>
            <p className="text-[10px] text-slate-400 mt-1">Maps agricultural land use to SCS Curve Numbers (CN: 75-88).</p>
          </div>
        </div>

        {/* Code View */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
              <Code className="w-4 h-4 text-cyan-400" />
              kollidam_gee_pipeline.py (Python ee API)
            </span>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-64 scrollbar-thin">
            {GEE_PYTHON_SCRIPT}
          </pre>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition"
          >
            Close GEE Pipeline Window
          </button>
        </div>
      </div>
    </div>
  );
}
