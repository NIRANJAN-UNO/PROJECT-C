import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Layers, Mountain } from 'lucide-react';

export default function ElevationChart({ selectedDam }) {
  if (!selectedDam) return null;

  // Prepare profile data with water impoundment pool level
  const data = selectedDam.crossSection.map(pt => ({
    dist: pt.dist,
    groundElev: pt.elev,
    waterLevel: pt.elev + (selectedDam.recHeight ? parseFloat(selectedDam.recHeight) : 3.5)
  }));

  return (
    <div className="w-full glass-panel p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-blue-900/50 pb-2">
        <div className="flex items-center gap-2 text-cyan-400">
          <Mountain className="w-5 h-5" />
          <h2 className="text-base font-bold tracking-wide">
            River Cross-Section & Impoundment Profile ({selectedDam.name})
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Rec Height: {selectedDam.recHeight} | Width: {selectedDam.recWidth}
        </span>
      </div>

      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGround" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#78350F" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#78350F" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00F2FE" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="dist" stroke="#64748B" unit=" m" fontSize={11} />
            <YAxis stroke="#64748B" unit=" m" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip 
              contentStyle={{ background: '#0F172A', borderColor: '#00F2FE', borderRadius: '8px', fontSize: '11px' }}
            />
            <Area type="monotone" dataKey="waterLevel" stroke="#00F2FE" fillOpacity={1} fill="url(#colorWater)" name="Water Pool Level (m MSL)" />
            <Area type="monotone" dataKey="groundElev" stroke="#F59E0B" fillOpacity={1} fill="url(#colorGround)" name="River Bed Elevation (m MSL)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
