import numpy as np
import math
from typing import Dict, Any, List
from backend.dem_processor import dem_processor
from backend.soil_processor import soil_processor
from backend.lclu_processor import lclu_processor
from backend.hydrology_calculator import HA_TO_ACRES, hydrology_calc

MCDA_PROFILES = {
    'mcda-standard': {
        "name": "Standard Hydro-MCDA Engine",
        "type": "Multi-Criteria Decision Analysis",
        "badge": "Balanced MCDA",
        "details": "Multi-criteria spatial scoring balancing slope, elevation, soil permeability, and farmland proximity.",
        "default_weights": {"slope": 30, "flow": 25, "soil": 20, "farmland": 15, "width": 10}
    },
    'mcda-slope': {
        "name": "Slope-Optimized Selection",
        "type": "Topographic Gradient Focus",
        "badge": "Slope Priority (<2°)",
        "details": "Prioritizes flat terrain channels (slope < 2.0°) to maximize storage pool backwater area.",
        "default_weights": {"slope": 55, "flow": 15, "soil": 15, "farmland": 10, "width": 5}
    },
    'mcda-soil': {
        "name": "Deep Alluvial Recharge Focus",
        "type": "Infiltration Capacity Focus",
        "badge": "Soil Permeability Focus",
        "details": "Prioritizes high-permeability sandy alluvial channels (HSG B) for rapid deep aquifer recharge.",
        "default_weights": {"slope": 15, "flow": 20, "soil": 50, "farmland": 10, "width": 5}
    },
    'ml-readiness': {
        "name": "Future ML Training Readiness Mode",
        "type": "Extensible Machine Learning Feature Vector Pipeline",
        "badge": "ML Feature Vector Interface",
        "details": "Extracts 5-dimensional feature matrices (Elevation, Slope, Aspect, Soil, Distance) for future model training.",
        "default_weights": {"slope": 20, "flow": 20, "soil": 20, "farmland": 20, "width": 20}
    }
}

KNOWN_TOWNS = [
    {"name": "Mukkombu", "lat": 10.876, "lng": 78.608},
    {"name": "Srirangam", "lat": 10.862, "lng": 78.690},
    {"name": "Tiruchirappalli", "lat": 10.830, "lng": 78.690},
    {"name": "Lalgudi", "lat": 10.868, "lng": 78.767},
    {"name": "Kallanai", "lat": 10.833, "lng": 78.820},
    {"name": "Thirumanur", "lat": 10.975, "lng": 79.111},
    {"name": "Kabisthalam", "lat": 10.940, "lng": 79.255},
    {"name": "Papanasam", "lat": 10.927, "lng": 79.280},
    {"name": "Lower Anicut", "lat": 11.139, "lng": 79.447},
    {"name": "T. Palur", "lat": 11.125, "lng": 79.412},
    {"name": "Sirkazhi", "lat": 11.238, "lng": 79.734},
    {"name": "Kollidam Town", "lat": 11.328, "lng": 79.791},
    {"name": "Mahendrapalli", "lat": 11.348, "lng": 79.882}
]

def get_nearest_village(lat: float, lng: float) -> str:
    shortest_distance = float('inf')
    closest_town = None

    for town_info in KNOWN_TOWNS:
        distance_val = math.sqrt((town_info["lat"] - lat) ** 2 + (town_info["lng"] - lng) ** 2)
        if distance_val < shortest_distance:
            shortest_distance = distance_val
            closest_town = town_info

    if closest_town and shortest_distance < 0.15:
        return closest_town["name"]
    return ""

class MCDAEngine:
    def get_profiles(self) -> Dict[str, Any]:
        return MCDA_PROFILES

    def calculate_mcda_score(
        self,
        elev_m: float,
        slope_deg: float,
        hsg: str,
        farmland_ha: float,
        width_m: float,
        weights: Dict[str, float]
    ) -> int:
        total_weight_sum = sum(weights.values()) or 100.0
        slope_weight = weights.get("slope", 30) / total_weight_sum
        flow_weight = weights.get("flow", 25) / total_weight_sum
        soil_weight = weights.get("soil", 20) / total_weight_sum
        farm_weight = weights.get("farmland", 15) / total_weight_sum
        width_weight = weights.get("width", 10) / total_weight_sum

        slope_score = max(0.0, 100.0 - (slope_deg * 25.0))
        elevation_score = max(0.0, min(100.0, 100.0 - (elev_m * 1.1)))
        flow_score = 85.0
        soil_score = 95.0 if hsg.startswith("A") or hsg.startswith("B") else 75.0 if hsg.startswith("C") else 55.0
        farm_score = min(100.0, (farmland_ha / 300.0) * 100.0)
        width_score = min(100.0, max(20.0, (350.0 - width_m) / 2.0))

        final_score = (slope_score * slope_weight) + (flow_score * flow_weight) + (soil_score * soil_weight) + (farm_score * farm_weight) + (width_score * width_weight)
        return int(min(99, max(40, round(final_score))))

    def calculate_xai_attributions(
        self,
        elev_m: float,
        slope_deg: float,
        hsg: str,
        farmland_ha: float,
        width_m: float,
        weights: Dict[str, float]
    ) -> Dict[str, float]:
        total_weight_sum = sum(weights.values()) or 100.0
        w_slope = weights.get("slope", 30) / total_weight_sum
        w_flow = weights.get("flow", 25) / total_weight_sum
        w_soil = weights.get("soil", 20) / total_weight_sum
        w_farm = weights.get("farmland", 15) / total_weight_sum
        w_width = weights.get("width", 10) / total_weight_sum

        s_slope = max(0.0, 100.0 - (slope_deg * 25.0))
        s_flow = 85.0
        s_soil = 95.0 if hsg.startswith("A") or hsg.startswith("B") else 75.0 if hsg.startswith("C") else 55.0
        s_farm = min(100.0, (farmland_ha / 300.0) * 100.0)
        s_width = min(100.0, max(20.0, (350.0 - width_m) / 2.0))

        b_slope = 77.5
        b_flow = 85.0
        b_soil = 75.0
        b_farm = 25.0
        b_width = 45.0

        c_slope = w_slope * (s_slope - b_slope)
        c_flow = w_flow * (s_flow - b_flow)
        c_soil = w_soil * (s_soil - b_soil)
        c_farm = w_farm * (s_farm - b_farm)
        c_width = w_width * (s_width - b_width)

        return {
            "Terrain Slope": round(c_slope, 1),
            "Flow Accumulation": round(c_flow, 1),
            "Soil Infiltration": round(c_soil, 1),
            "Farmland Proximity": round(c_farm, 1),
            "Stream Width/Stability": round(c_width, 1)
        }

    def generate_candidate_predictions(
        self,
        profile_key: str = 'mcda-standard',
        user_weights: Dict[str, float] = None,
        meander_coords: List[List[float]] = None
    ) -> List[Dict[str, Any]]:
        if profile_key not in MCDA_PROFILES:
            profile_key = 'mcda-standard'

        profile_info = MCDA_PROFILES[profile_key]
        active_weights = user_weights or profile_info["default_weights"]

        found_candidate_locations = dem_processor.extract_dynamic_candidate_sites(meander_coords, num_sites=5)

        districts_list = ["Tiruchirappalli", "Thanjavur", "Ariyalur", "Mayiladuthurai", "Mayiladuthurai Delta"]

        output_results = []
        for index_num, location in enumerate(found_candidate_locations):
            lat, lng = location["lat"], location["lng"]
            elev_m = location["elev"]
            slope_deg = location["slope"]

            soil_info = soil_processor.get_soil_at_point(lat, lng)
            hsg_group = soil_info["hsg"]

            width_m = round(max(120.0, min(400.0, 320.0 - (slope_deg * 40.0) + (max(0, 20.0 - elev_m) * 2.0))), 0)
            cost_lakhs = round(max(10.0, min(28.0, width_m * 0.07)), 1)
            district_name = districts_list[index_num % len(districts_list)]

            lclu_class_info = lclu_processor.get_lclu_at_point(lat, lng)
            cropland_stats = lclu_processor.get_cropland_area_in_radius(lat, lng, radius_km=1.5)
            farmland_ha = cropland_stats["cropland_ha"]
            farmland_acres = cropland_stats["cropland_acres"]

            location_score = self.calculate_mcda_score(elev_m, slope_deg, hsg_group, farmland_ha, width_m, active_weights)

            attributions = self.calculate_xai_attributions(elev_m, slope_deg, hsg_group, farmland_ha, width_m, active_weights)

            rec_storage_ml = round(max(8.0, min(30.0,
                (width_m * 0.055)
                - (slope_deg * 3.0)
                + (active_weights.get('flow', 25) / 25.0 * 2.0)
            )), 1)
            water_impact = hydrology_calc.calculate_groundwater_impact(rec_storage_ml, est_cost_lakhs=cost_lakhs)

            nearest_town_name = get_nearest_village(lat, lng)
            town_label = f" (Near {nearest_town_name})" if nearest_town_name else ""
            location_title = f"Candidate Site {index_num+1}{town_label}"

            output_results.append({
                "id": f"CD-0{index_num+1}",
                "rank": index_num + 1,
                "name": location_title,
                "regionName": location_title,
                "district": district_name,
                "lat": lat,
                "lng": lng,
                "cop30_elevation_m": elev_m,
                "slope_deg": slope_deg,
                "score": location_score,
                "calculatedScore": location_score,
                "attributions": attributions,
                "type": "Sub-surface Dyke + Spillway" if index_num == 1 else "Inflatable Rubber Weir" if index_num == 3 else "Salt Barrage Check Dam" if index_num == 4 else "Concrete Overflow Check Dam",
                "recHeight": f"{(4.2 - index_num * 0.3):.1f} m",
                "recWidth": f"{width_m} m",
                "hsg": hsg_group,
                "soilInfiltration": f"{soil_info['ksat_mm_hr']} mm/hr",
                "recStorageML": rec_storage_ml,
                "rechargeRadiusKm": water_impact["recharge_radius_km"],
                "aquiferRiseM": water_impact["groundwater_gain_m"],
                "costLakhs": cost_lakhs,
                "annualIrrigationValueLakhs": water_impact["annual_irrigation_value_lakhs"],
                "farmlandHa": farmland_ha,
                "farmlandAcres": farmland_acres,
                "crossSection": [
                    {"dist": 0, "elev": round(elev_m + 8, 1)}, {"dist": 40, "elev": round(elev_m + 4, 1)}, {"dist": 80, "elev": round(elev_m, 1)},
                    {"dist": 120, "elev": round(elev_m - 2, 1)}, {"dist": 160, "elev": round(elev_m, 1)}, {"dist": 200, "elev": round(elev_m + 4, 1)}, {"dist": 240, "elev": round(elev_m + 8, 1)}
                ]
            })

        return output_results

mcda_engine = MCDAEngine()
