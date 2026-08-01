import math
from typing import Dict, Any
from backend.rainfall_processor import rainfall_processor

HA_TO_ACRES = 2.47105

class HydrologyCalculator:
    @staticmethod
    def calculate_scs_cn_runoff(
        rainfall_mm: float = None,
        date_str: str = "2021-11-18",
        curve_number: float = 80.0,
        catchment_area_sq_km: float = 450.0
    ) -> Dict[str, Any]:
        daily_rain_details = None
        if rainfall_mm is None and date_str:
            daily_rain_details = rainfall_processor.get_daily_rainfall(date_str)
            rainfall_mm = daily_rain_details["mean_mm"]

        if rainfall_mm is None or rainfall_mm < 0:
            rainfall_mm = 45.0

        valid_curve_number = max(10.0, min(100.0, curve_number))
        max_soil_retention = (25400.0 / valid_curve_number) - 254.0
        initial_water_loss = 0.2 * max_soil_retention

        runoff_depth_mm = 0.0
        if rainfall_mm > initial_water_loss:
            numerator = (rainfall_mm - initial_water_loss) ** 2
            denominator = (rainfall_mm - initial_water_loss) + max_soil_retention
            runoff_depth_mm = numerator / denominator if denominator > 0 else 0.0

        water_volume_ml = runoff_depth_mm * catchment_area_sq_km
        water_volume_tmc = water_volume_ml / 28316.8

        return {
            "rainfall_mm": round(rainfall_mm, 2),
            "date_str": date_str,
            "curve_number": valid_curve_number,
            "potential_retention_S_mm": round(max_soil_retention, 1),
            "initial_abstraction_Ia_mm": round(initial_water_loss, 1),
            "runoff_depth_mm": round(runoff_depth_mm, 2),
            "runoff_volume_ml": round(water_volume_ml, 1),
            "runoff_volume_tmc": round(water_volume_tmc, 3),
            "data_source": daily_rain_details["source"] if daily_rain_details else "Direct Input"
        }

    @staticmethod
    def calculate_groundwater_impact(
        captured_ml: float,
        soil_infiltration_mm_hr: float = 6.0,
        est_cost_lakhs: float = 18.0
    ) -> Dict[str, Any]:
        soil_yield_ratio = 0.12
        recharge_area_ha = round(5.0 + math.sqrt(captured_ml) * 3.5, 1)
        recharge_area_acres = round(recharge_area_ha * HA_TO_ACRES)

        water_cubic_meters = captured_ml * 1000.0
        recharge_area_sq_meters = recharge_area_ha * 10000.0

        water_level_rise_m = water_cubic_meters / (recharge_area_sq_meters * soil_yield_ratio) if recharge_area_sq_meters > 0 else 0.0
        water_level_rise_m = min(5.5, water_level_rise_m)

        recharge_radius_km = math.sqrt(recharge_area_sq_meters / math.pi) / 1000.0 if recharge_area_sq_meters > 0 else 0.0

        annual_irrigation_value_lakhs = round((captured_ml * 2.8) / 10.0)
        payback_months = round((est_cost_lakhs / max(1.0, annual_irrigation_value_lakhs)) * 12.0, 1)

        return {
            "captured_ml": captured_ml,
            "recharge_area_ha": recharge_area_ha,
            "recharge_area_acres": recharge_area_acres,
            "groundwater_gain_m": round(water_level_rise_m, 2),
            "recharge_radius_km": round(recharge_radius_km, 2),
            "annual_irrigation_value_lakhs": annual_irrigation_value_lakhs,
            "payback_months": payback_months
        }

hydrology_calc = HydrologyCalculator()
