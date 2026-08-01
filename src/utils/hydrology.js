// Hydrological & MCDA Analytical Benchmark Engine

// Hectares to Acres Conversion Constant
export const HA_TO_ACRES = 2.47105;

// Configurable Hydro-MCDA Decision Profiles
export const MCDA_PROFILES = {
  'mcda-standard': {
    name: "Standard Hydro-MCDA Engine",
    type: "Multi-Criteria Decision Analysis",
    score: "DEM-Weighted",
    badge: "Balanced MCDA",
    color: "cyan",
    details: "Multi-criteria spatial scoring balancing slope, elevation, soil permeability, and farmland proximity."
  },
  'mcda-slope': {
    name: "Slope-Optimized Selection",
    type: "Topographic Gradient Focus",
    score: "Slope Driven",
    badge: "Slope Priority (<2°)",
    color: "emerald",
    details: "Prioritizes flat terrain channels (slope < 2.0°) to maximize storage pool backwater area."
  },
  'mcda-soil': {
    name: "Deep Alluvial Recharge Focus",
    type: "Infiltration Capacity Focus",
    score: "Permeability Driven",
    badge: "Soil Infiltration Focus",
    color: "amber",
    details: "Prioritizes high-permeability sandy alluvial channels (HSG B) for rapid deep aquifer recharge."
  },
  'ml-readiness': {
    name: "Future ML Readiness Interface",
    type: "Extensible Machine Learning Feature Vector Pipeline",
    score: "Feature Extraction",
    badge: "ML Ready Pipeline",
    color: "blue",
    details: "Extracts 5-dimensional feature matrices (Elevation, Slope, Aspect, Soil, Distance) for future model training."
  }
};

/**
 * Calculates SCS-CN Runoff Volume
 */
export function calculateSCSCNRunoff(rainfallMM, curveNumber = 80, catchmentAreaSqKm = 450) {
  const S = (25400 / curveNumber) - 254;
  const Ia = 0.2 * S;
  
  let runoffMM = 0;
  if (rainfallMM > Ia) {
    const num = Math.pow((rainfallMM - Ia), 2);
    const den = (rainfallMM - Ia) + S;
    runoffMM = num / den;
  }
  
  const volumeML = runoffMM * catchmentAreaSqKm;
  const volumeTMC = volumeML / 28316.8;
  
  return {
    runoffMM: Number(runoffMM.toFixed(2)),
    volumeML: Number(volumeML.toFixed(1)),
    volumeTMC: Number(volumeTMC.toFixed(3)),
    potentialRetentionS: Number(S.toFixed(1))
  };
}

/**
 * Computes predicted groundwater table rise and recharge area (Hectares & Acres)
 */
export function calculateGroundwaterImpact(capturedML, infiltrationRateMmHr = 6.0) {
  const specificYield = 0.12;
  const rechargeAreaHa = Math.min(4500, (capturedML / 12) * 850);
  const rechargeAreaAcres = Math.round(rechargeAreaHa * HA_TO_ACRES);
  
  const volumeM3 = capturedML * 1000;
  const areaM2 = rechargeAreaHa * 10000;
  const deltaHMeters = volumeM3 / (areaM2 * specificYield);
  const radiusKm = Math.sqrt(areaM2 / Math.PI) / 1000;
  
  return {
    rechargeAreaHa: Math.round(rechargeAreaHa),
    rechargeAreaAcres: rechargeAreaAcres,
    deltaHMeters: Number(Math.min(5.5, deltaHMeters).toFixed(2)),
    radiusKm: Number(radiusKm.toFixed(2))
  };
}

/**
 * Recalculates MCDA Score for candidate check-dam locations
 */
export function calculateMCDAScore(dam, weights) {
  const totalWeight = weights.slope + weights.flow + weights.soil + weights.farmland + weights.width;
  if (totalWeight === 0) return dam.score;
  
  const wSlope = weights.slope / totalWeight;
  const wFlow = weights.flow / totalWeight;
  const wSoil = weights.soil / totalWeight;
  const wFarmland = weights.farmland / totalWeight;
  const wWidth = weights.width / totalWeight;
  
  const sSlope = Math.max(0, 100 - (dam.slopeDeg * 25));
  const sFlow = Math.min(100, dam.streamOrder * 16);
  const sSoil = dam.hsg.startsWith("B") ? 95 : dam.hsg.startsWith("C") ? 75 : 55;
  const sFarmland = Math.min(100, (dam.farmlandHa / 5000) * 100);
  const sWidth = Math.min(100, (350 - dam.recWidth.replace(" m", "")) / 2);
  
  const finalScore = (sSlope * wSlope) + (sFlow * wFlow) + (sSoil * wSoil) + (sFarmland * wFarmland) + (sWidth * wWidth);
  return Math.round(Math.min(99, Math.max(40, finalScore)));
}
