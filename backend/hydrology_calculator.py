import math
from typing import Dict, Any

HA_TO_ACRES = 2.47105

class HydrologyCalculator:
    @staticmethod
    def calculate_scs_cn_runoff(
        rainfall_mm: float, 
        curve_number: float = 80.0, 
        catchment_area_sq_km: float = 450.0
    ) -> Dict[str, Any]:
        """
        USDA Soil Conservation Service Curve Number (SCS-CN) Runoff Formula:
        S = (25400 / CN) - 254
        Ia = 0.2 * S (Initial Abstraction)
        Q = (P - Ia)^2 / (P - Ia + S) for P > Ia
        """
        S = (25400.0 / max(10.0, min(100.0, curve_number))) - 254.0
        Ia = 0.2 * S
        
        runoff_mm = 0.0
        if rainfall_mm > Ia:
            num = (rainfall_mm - Ia) ** 2
            den = (rainfall_mm - Ia) + S
            runoff_mm = num / den if den > 0 else 0.0
        
        volume_ml = runoff_mm * catchment_area_sq_km
        volume_tmc = volume_ml / 28316.8
        
        return {
            "rainfall_mm": rainfall_mm,
            "curve_number": curve_number,
            "potential_retention_S_mm": round(S, 1),
            "initial_abstraction_Ia_mm": round(Ia, 1),
            "runoff_depth_mm": round(runoff_mm, 2),
            "runoff_volume_ml": round(volume_ml, 1),
            "runoff_volume_tmc": round(volume_tmc, 3)
        }

    @staticmethod
    def calculate_groundwater_impact(
        captured_ml: float, 
        infiltration_rate_mm_hr: float = 6.0,
        est_cost_lakhs: float = 18.0
    ) -> Dict[str, Any]:
        """
        Calculates aquifer elevation gain (Δh meters) and recharged cropland area (Acres & Hectares)
        """
        specific_yield = 0.12
        recharge_area_ha = min(4500.0, (captured_ml / 12.0) * 850.0)
        recharge_area_acres = round(recharge_area_ha * HA_TO_ACRES)
        
        volume_m3 = captured_ml * 1000.0
        area_m2 = recharge_area_ha * 10000.0
        
        delta_h_meters = volume_m3 / (area_m2 * specific_yield) if area_m2 > 0 else 0.0
        delta_h_meters = min(5.5, delta_h_meters)
        
        radius_km = math.sqrt(area_m2 / math.pi) / 1000.0 if area_m2 > 0 else 0.0
        
        annual_irrigation_value_lakhs = round((captured_ml * 2.8) / 10.0)
        payback_months = round((est_cost_lakhs / max(1.0, annual_irrigation_value_lakhs)) * 12.0, 1)

        return {
            "captured_ml": captured_ml,
            "recharge_area_ha": round(recharge_area_ha),
            "recharge_area_acres": recharge_area_acres,
            "groundwater_gain_m": round(delta_h_meters, 2),
            "recharge_radius_km": round(radius_km, 2),
            "annual_irrigation_value_lakhs": annual_irrigation_value_lakhs,
            "payback_months": payback_months
        }

# Singleton Instance
hydrology_calc = HydrologyCalculator()
