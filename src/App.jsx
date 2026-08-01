import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import MCDAPanel from './components/MCDAPanel';
import HydroCalculator from './components/HydroCalculator';
import ElevationChart from './components/ElevationChart';
import CaseStudySimulator from './components/CaseStudySimulator';
import GEEAnalyticsModal from './components/GEEAnalyticsModal';

import { HIGH_RES_RIVER_MEANDER } from './data/kollidamData';
import { scanRiverChannelForDams, HA_TO_ACRES, calculateSCSCNRunoff, calculateGroundwaterImpact } from './utils/hydrology';

export default function App() {
  const [activeMode, setActiveMode] = useState('ai-network'); // 'ai-network' | 'case-study' | 'custom-sim'
  const [activeModel, setActiveModel] = useState('mcda-standard'); // 'mcda-standard' | 'mcda-slope' | 'mcda-soil' | 'ml-readiness'
  const [rainfallMM, setRainfallMM] = useState(150);
  const [customDam, setCustomDam] = useState(null);
  const [isGEEOpen, setIsGEEOpen] = useState(false);

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
    rechargeZones: true,
    floodZone: false
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
      // Live HTTP API call to Python FastAPI GIS Backend querying E:\output_hh.tif!
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

    const hydro = calculateSCSCNRunoff(rainfallMM, 82, 450);
    const gw = calculateGroundwaterImpact(hydro.volumeML, 5.5);

    const newDam = {
      id: "CD-CUSTOM",
      rank: "?",
      name: `Virtual Check Dam (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E) | DEM: ${sampledElev}m`,
      district: "Custom Virtual Site",
      lat: lat,
      lng: lng,
      cop30_elevation_m: sampledElev,
      slope_deg: sampledSlope,
      score: 88,
      calculatedScore: 88,
      type: "Proposed Concrete Overflow Check Dam",
      recHeight: "3.5 m",
      recWidth: "220 m",
      hsg: "B (Alluvial Loam)",
      slopeDeg: sampledSlope,
      streamOrder: 6,
      soilInfiltration: "5.5 mm/hr",
      recStorageML: hydro.volumeML,
      rechargeRadiusKm: gw.radiusKm,
      aquiferRiseM: gw.deltaHMeters,
      costLakhs: 17.5,
      annualIrrigationValueLakhs: Math.round((hydro.volumeML * 2.8) / 10),
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

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    if (mode === 'case-study') {
      setLayers(prev => ({ ...prev, floodZone: true }));
    }
  };

  return (
    <div className="min-h-screen bg-[#070B19] text-slate-100 p-4 md:p-6 space-y-6">
      {/* Top Header & Telemetry Bar */}
      <Header 
        activeMode={activeMode}
        setActiveMode={handleModeChange}
        totalCapturedML={totalCapturedML}
        totalTMC={totalTMC}
        avgDeltaH={avgDeltaH}
        totalFarmlandHa={totalFarmlandHa}
        totalFarmlandAcres={totalFarmlandAcres}
        onOpenGEE={() => setIsGEEOpen(true)}
      />

      {/* Main Mode Views */}
      {activeMode === 'case-study' ? (
        /* Nov 2021 Flood Disaster Case Study View */
        <div className="space-y-6">
          <CaseStudySimulator />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MapView 
                dams={scannedDams}
                selectedDam={selectedDam}
                onSelectDam={setSelectedDam}
                customDam={customDam}
                onPlaceCustomDam={handlePlaceCustomDam}
                layers={layers}
                setLayers={setLayers}
              />
            </div>
            <div>
              <ElevationChart selectedDam={selectedDam} />
            </div>
          </div>
        </div>
      ) : (
        /* AI Network & Custom Rainfall Simulator View */
        <div className="space-y-6">
          {/* Upper Section: Map & Hydrological Calculator */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MapView 
                dams={scannedDams}
                selectedDam={selectedDam}
                onSelectDam={setSelectedDam}
                customDam={customDam}
                onPlaceCustomDam={handlePlaceCustomDam}
                layers={layers}
                setLayers={setLayers}
              />
            </div>

            <div className="space-y-6">
              <HydroCalculator 
                rainfallMM={rainfallMM}
                onRainfallChange={setRainfallMM}
                selectedDam={selectedDam}
              />

              <ElevationChart selectedDam={selectedDam} />
            </div>
          </div>

          {/* Unified Multi-Criteria AI Decision Engine Panel */}
          <MCDAPanel 
            dams={scannedDams}
            weights={weights}
            onWeightChange={handleWeightChange}
            selectedDam={selectedDam}
            onSelectDam={setSelectedDam}
            activeModel={activeModel}
            onSelectModel={setActiveModel}
          />
        </div>
      )}

      {/* Google Earth Engine Script Integration Modal */}
      <GEEAnalyticsModal 
        isOpen={isGEEOpen}
        onClose={() => setIsGEEOpen(false)}
      />
    </div>
  );
}
