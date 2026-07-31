// Hydrological & Spatial MCDA Math Utilities

/**
 * Calculates SCS-CN Runoff Volume
 * @param {number} rainfallMM Storm rainfall in mm (e.g. 50 - 300mm)
 * @param {number} curveNumber SCS Curve Number (CN: 60 - 95 based on soil & land use)
 * @param {number} catchmentAreaSqKm Catchment area in km²
 * @returns {object} { runoffMM, volumeML, volumeTMC }
 */
export function calculateSCSCNRunoff(rainfallMM, curveNumber = 80, catchmentAreaSqKm = 450) {
  // Potential maximum retention S in mm
  const S = (25400 / curveNumber) - 254;
  
  // Initial abstraction Ia (typically 0.2 * S)
  const Ia = 0.2 * S;
  
  let runoffMM = 0;
  if (rainfallMM > Ia) {
    const num = Math.pow((rainfallMM - Ia), 2);
    const den = (rainfallMM - Ia) + S;
    runoffMM = num / den;
  }
  
  // Convert runoff depth (mm) over catchment area (km²) to Volume
  // 1 mm depth over 1 km² = 1,000 m³ = 1,000,000 Liters (1 Million Liters)
  const volumeML = runoffMM * catchmentAreaSqKm;
  
  // Convert Million Liters to TMC (1 TMC = 28,316.8 Million Liters)
  const volumeTMC = volumeML / 28316.8;
  
  return {
    runoffMM: Number(runoffMM.toFixed(2)),
    volumeML: Number(volumeML.toFixed(1)),
    volumeTMC: Number(volumeTMC.toFixed(3)),
    potentialRetentionS: Number(S.toFixed(1))
  };
}

/**
 * Recalculate MCDA Score for candidate check-dam locations
 * @param {object} dam Check dam object
 * @param {object} weights User weight settings { slope, flow, soil, farmland, width }
 * @returns {number} Score from 0 to 100
 */
export function calculateMCDAScore(dam, weights) {
  const totalWeight = weights.slope + weights.flow + weights.soil + weights.farmland + weights.width;
  if (totalWeight === 0) return dam.score;
  
  // Normalize weights
  const wSlope = weights.slope / totalWeight;
  const wFlow = weights.flow / totalWeight;
  const wSoil = weights.soil / totalWeight;
  const wFarmland = weights.farmland / totalWeight;
  const wWidth = weights.width / totalWeight;
  
  // Normalize individual sub-scores (0-100 scale)
  const sSlope = Math.max(0, 100 - (dam.slopeDeg * 25)); // Lower slope = higher suitability for check dam pool
  const sFlow = Math.min(100, dam.streamOrder * 16);
  const sSoil = dam.hsg.startsWith("B") ? 95 : dam.hsg.startsWith("C") ? 75 : 55;
  const sFarmland = Math.min(100, (dam.farmlandHa / 5000) * 100);
  const sWidth = Math.min(100, (350 - dam.recWidth.replace(" m", "")) / 2);
  
  const finalScore = (sSlope * wSlope) + (sFlow * wFlow) + (sSoil * wSoil) + (sFarmland * wFarmland) + (sWidth * wWidth);
  return Math.round(Math.min(99, Math.max(40, finalScore)));
}

/**
 * Computes predicted groundwater table rise and recharge radius
 * @param {number} capturedML Captured volume in Million Liters
 * @param {number} infiltrationRateMmHr Soil infiltration rate in mm/hr
 */
export function calculateGroundwaterImpact(capturedML, infiltrationRateMmHr = 6.0) {
  // Specific yield of unconfined alluvial aquifer ~ 0.12 (12%)
  const specificYield = 0.12;
  
  // Estimated effective infiltration area in hectares
  const rechargeAreaHa = Math.min(4500, (capturedML / 12) * 850);
  
  // Water table rise in meters: Delta H = Volume / (Area * Specific Yield)
  const volumeM3 = capturedML * 1000;
  const areaM2 = rechargeAreaHa * 10000;
  const deltaHMeters = volumeM3 / (areaM2 * specificYield);
  
  // Recharge radius in km
  const radiusKm = Math.sqrt(areaM2 / Math.PI) / 1000;
  
  return {
    rechargeAreaHa: Math.round(rechargeAreaHa),
    deltaHMeters: Number(Math.min(5.5, deltaHMeters).toFixed(2)),
    radiusKm: Number(radiusKm.toFixed(2))
  };
}
