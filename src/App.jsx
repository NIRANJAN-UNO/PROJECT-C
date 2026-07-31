import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import MCDAPanel from './components/MCDAPanel';
import HydroCalculator from './components/HydroCalculator';
import ElevationChart from './components/ElevationChart';
import CaseStudySimulator from './components/CaseStudySimulator';
import GEEAnalyticsModal from './components/GEEAnalyticsModal';

import { TOP_CHECK_DAMS, NOV_2021_CASE_STUDY } from './data/kollidamData';
import { calculateMCDAScore, calculateSCSCNRunoff, calculateGroundwaterImpact } from './utils/hydrology';

export default function App() {
  const [activeMode, setActiveMode] = useState('ai-network'); // 'ai-network' | 'case-study' | 'custom-sim'
  const [rainfallMM, setRainfallMM] = useState(150);
  const [selectedDam, setSelectedDam] = useState(TOP_CHECK_DAMS[0]);
  const [customDam, setCustomDam] = useState(null);
  const [isGEEOpen, setIsGEEOpen] = useState(false);

  // MCDA Weight sliders state
  const [weights, setWeights] = useState({
    slope: 30,
    flow: 25,
    soil: 20,
    farmland: 15,
    width: 10
  });

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

  // Recalculate MCDA scores for all check dams
  const recalculatedDams = useMemo(() => {
    return TOP_CHECK_DAMS.map(dam => {
      const calculatedScore = calculateMCDAScore(dam, weights);
      return { ...dam, calculatedScore };
    }).sort((a, b) => b.calculatedScore - a.calculatedScore);
  }, [weights]);

  // Handle Placing Virtual Custom Check Dam on map click
  const handlePlaceCustomDam = (latlng) => {
    const hydro = calculateSCSCNRunoff(rainfallMM, 82, 450);
    const gw = calculateGroundwaterImpact(hydro.volumeML, 5.5);

    const newDam = {
      id: "CD-CUSTOM",
      rank: "?",
      name: `Virtual Check Dam (${latlng.lat.toFixed(3)}°N, ${latlng.lng.toFixed(3)}°E)`,
      district: "Custom Site",
      lat: latlng.lat,
      lng: latlng.lng,
      score: 85,
      type: "Proposed Concrete Check Dam",
      recHeight: "3.5 m",
      recWidth: "220 m",
      hsg: "B (Alluvial Loam)",
      slopeDeg: 0.7,
      streamOrder: 6,
      soilInfiltration: "5.5 mm/hr",
      recStorageML: hydro.volumeML,
      rechargeRadiusKm: gw.radiusKm,
      aquiferRiseM: gw.deltaHMeters,
      costLakhs: 17.5,
      annualIrrigationValueLakhs: Math.round((hydro.volumeML * 2.8) / 10),
      farmlandHa: gw.rechargeAreaHa,
      geeNDWI: 0.40,
      crossSection: [
        { dist: 0, elev: 35 }, { dist: 40, elev: 31 }, { dist: 80, elev: 28 },
        { dist: 120, elev: 26 }, { dist: 160, elev: 28 }, { dist: 200, elev: 31 }, { dist: 240, elev: 35 }
      ]
    };

    setCustomDam(newDam);
    setSelectedDam(newDam);
  };

  // Aggregate stats calculation
  const totalCapturedML = useMemo(() => {
    return TOP_CHECK_DAMS.reduce((acc, dam) => acc + dam.recStorageML, 0).toFixed(1);
  }, []);

  const totalTMC = (totalCapturedML / 28316.8).toFixed(3);
  
  const avgDeltaH = useMemo(() => {
    const sum = TOP_CHECK_DAMS.reduce((acc, dam) => acc + dam.aquiferRiseM, 0);
    return (sum / TOP_CHECK_DAMS.length).toFixed(2);
  }, []);

  const totalFarmlandHa = useMemo(() => {
    return TOP_CHECK_DAMS.reduce((acc, dam) => acc + dam.farmlandHa, 0);
  }, []);

  // Update floodZone layer visibility automatically when entering case study mode
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

          {/* Lower Section: MCDA AI Ranking Engine */}
          <MCDAPanel 
            dams={recalculatedDams}
            weights={weights}
            onWeightChange={handleWeightChange}
            selectedDam={selectedDam}
            onSelectDam={setSelectedDam}
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
