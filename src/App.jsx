import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import MCDAPanel from './components/MCDAPanel';
import GEEAnalyticsModal from './components/GEEAnalyticsModal';
import CaseStudySimulator from './components/CaseStudySimulator';
import HydroCalculator from './components/HydroCalculator';

import { HIGH_RES_RIVER_MEANDER } from './data/kollidamData';
import { scanRiverChannelForDams, HA_TO_ACRES, calculateGroundwaterImpact } from './utils/hydrology';

export default function App() {
  const [activeMode, setActiveMode] = useState('ai-network'); // 'ai-network' | 'case-study' | 'custom-sim'
  const [activeModel, setActiveModel] = useState('mcda-standard'); // 'mcda-standard' | 'mcda-slope'
  const [customDam, setCustomDam] = useState(null);
  const [isGEEOpen, setIsGEEOpen] = useState(false);
  const [rainfallMM, setRainfallMM] = useState(150);

  // Dynamic candidate dams state (fetched from Python FastAPI backend)
  const [apiDams, setApiDams] = useState(null);

  // MCDA Weight sliders state
  const [weights, setWeights] = useState({
    slope: 30,
    flow: 25,
    soil: 20,
    farmland: 15,
    width: 10
  });

  // Local fallback calculation engine
  const localDams = useMemo(() => {
    return scanRiverChannelForDams(HIGH_RES_RIVER_MEANDER, activeModel, weights);
  }, [activeModel, weights]);

  // Use API dams if available, else local fallback
  const scannedDams = apiDams || localDams;

  const [selectedDam, setSelectedDam] = useState(scannedDams[0]);

  // Fetch dynamic DEM candidate predictions from Python FastAPI backend
  useEffect(() => {
    async function fetchBackendPredictions() {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/hydrology/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile_key: activeModel,
            weights: weights,
            meander_coords: HIGH_RES_RIVER_MEANDER
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.predictions && data.predictions.length > 0) {
            setApiDams(data.predictions);
            setSelectedDam(data.predictions[0]);
          }
        }
      } catch (err) {
        console.warn("FastAPI backend offline, using client-side COP30 profile:", err);
      }
    }

    fetchBackendPredictions();
  }, [activeModel, weights]);

  // Keep selectedDam in sync when scannedDams change
  useEffect(() => {
    if (scannedDams && scannedDams.length > 0) {
      setSelectedDam(scannedDams[0]);
    }
  }, [scannedDams]);

  // Layer toggles state
  const [layers, setLayers] = useState({
    riverPath: true,
    candidateSites: true,
    rechargeZones: true
  });

  // Handle MCDA Weight changes
  const handleWeightChange = (key, val) => {
    setWeights(prev => ({ ...prev, [key]: val }));
  };

  // Live Real-Time DEM Sampling for Virtual Custom Check Dam on map click
  const handlePlaceCustomDam = async (latlng) => {
    const lat = latlng.lat;
    const lng = latlng.lng;
    
    let sampledElev = 45.0;
    let sampledSlope = 0.8;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/dem/elevation?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.cop30_elevation_m !== undefined) {
          sampledElev = data.cop30_elevation_m;
          sampledSlope = data.slope_deg || 0.8;
        }
      }
    } catch (err) {
      console.warn("FastAPI backend offline, using local raster estimate:", err);
    }

    const localHeight = 3.5;
    const localWidth = 220;
    
    const recStorageML = Number(Math.max(5.0, Math.min(45.0, (localWidth * localHeight * 0.015) / Math.max(0.2, sampledSlope))).toFixed(1));
    const gw = calculateGroundwaterImpact(recStorageML, 5.5);

    const newDam = {
      id: "CD-CUSTOM",
      rank: "?",
      name: `Virtual Check Dam (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
      district: "Custom Virtual Site",
      lat: lat,
      lng: lng,
      cop30_elevation_m: sampledElev,
      slope_deg: sampledSlope,
      score: 88,
      calculatedScore: 88,
      type: "Proposed Concrete Overflow Check Dam",
      recHeight: `${localHeight} m`,
      recWidth: `${localWidth} m`,
      hsg: "B (Alluvial Loam)",
      slopeDeg: sampledSlope,
      streamOrder: 6,
      soilInfiltration: "5.5 mm/hr",
      recStorageML: recStorageML,
      rechargeRadiusKm: gw.radiusKm,
      aquiferRiseM: gw.deltaHMeters,
      costLakhs: 17.5,
      annualIrrigationValueLakhs: Math.round((recStorageML * 2.8) / 10),
      farmlandHa: gw.rechargeAreaHa,
      farmlandAcres: gw.rechargeAreaAcres,
      crossSection: [
        { dist: 0, elev: roundVal(sampledElev + 8) },
        { dist: 40, elev: roundVal(sampledElev + 4) },
        { dist: 80, elev: roundVal(sampledElev) },
        { dist: 120, elev: roundVal(sampledElev - 2) },
        { dist: 160, elev: roundVal(sampledElev) },
        { dist: 200, elev: roundVal(sampledElev + 4) },
        { dist: 240, elev: roundVal(sampledElev + 8) }
      ]
    };

    setCustomDam(newDam);
    setSelectedDam(newDam);
  };

  const roundVal = (v) => Math.round(v * 10) / 10;

  // Aggregate stats calculation
  const totalCapturedML = useMemo(() => {
    return scannedDams.reduce((acc, dam) => acc + dam.recStorageML, 0).toFixed(1);
  }, [scannedDams]);

  const totalTMC = (totalCapturedML / 28316.8).toFixed(3);
  
  const avgDeltaH = useMemo(() => {
    const sum = scannedDams.reduce((acc, dam) => acc + dam.aquiferRiseM, 0);
    return (sum / scannedDams.length).toFixed(2);
  }, [scannedDams]);

  const totalFarmlandHa = useMemo(() => {
    return scannedDams.reduce((acc, dam) => acc + dam.farmlandHa, 0);
  }, [scannedDams]);

  const totalFarmlandAcres = useMemo(() => {
    return Math.round(totalFarmlandHa * HA_TO_ACRES);
  }, [totalFarmlandHa]);

  return (
    <div className="min-h-screen bg-[#e2e8f0] text-slate-800 p-0 flex flex-col justify-between">
      {/* Unified Top Main Application Workspace (Flush to screen border) */}
      <div className="w-full bg-white border-b border-slate-200 flex-grow shadow-sm">
        <Header 
          totalCapturedML={totalCapturedML}
          totalTMC={totalTMC}
          avgDeltaH={avgDeltaH}
          totalFarmlandHa={totalFarmlandHa}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          onOpenGEE={() => setIsGEEOpen(true)}
        />
        <div className="grid grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <MapView 
              dams={scannedDams}
              selectedDam={selectedDam}
              onSelectDam={setSelectedDam}
              customDam={customDam}
              onPlaceCustomDam={handlePlaceCustomDam}
              layers={layers}
              setLayers={setLayers}
              weights={weights}
            />
          </div>
          <div className="lg:col-span-1">
            <MCDAPanel 
              dams={scannedDams}
              weights={weights}
              onWeightChange={handleWeightChange}
              selectedDam={selectedDam}
              onSelectDam={setSelectedDam}
              activeModel={activeModel}
              onSelectModel={setActiveModel}
              layers={layers}
              setLayers={setLayers}
            />
          </div>
        </div>
      </div>

      {/* Lower Section for toggleable Simulators (Separated into boxed cards with margins) */}
      {(activeMode === 'case-study' || activeMode === 'custom-sim') && (
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 space-y-6">
          {activeMode === 'case-study' && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200">
              <CaseStudySimulator />
            </div>
          )}

          {activeMode === 'custom-sim' && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200">
              <HydroCalculator 
                rainfallMM={rainfallMM}
                onRainfallChange={setRainfallMM}
                selectedDam={selectedDam}
              />
            </div>
          )}
        </div>
      )}

      {/* Google Earth Engine Modal */}
      <GEEAnalyticsModal 
        isOpen={isGEEOpen}
        onClose={() => setIsGEEOpen(false)}
      />
    </div>
  );
}
