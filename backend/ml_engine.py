import numpy as np
import math
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from typing import List, Dict, Any

from backend.dem_processor import dem_processor, WATER_BODY_EXCLUSION_ZONES
from backend.soil_processor import soil_processor
from backend.lclu_processor import lclu_processor
from backend.hydrology_calculator import HA_TO_ACRES, hydrology_calc


class MLEngine:
    """
    Machine Learning engine that uses clustering and regression 
    models to suggest dam locations.
    """
    def __init__(self):
        self.kmeans = KMeans(n_clusters=5, random_state=42, n_init='auto')
        self.regressor = RandomForestRegressor(n_estimators=50, random_state=42)

    def extract_features(self, meander_coords: List[List[float]]) -> tuple:
        """Reads terrain elevation, slope, aspect, and soil values for each point along the river.
        Automatically skips any point inside a known water body / existing dam exclusion zone."""
        feature_matrix = []
        point_details_list = []
        skipped = 0
        for index_pos, point in enumerate(meander_coords):
            lat, lng = point[0], point[1]

            # Skip points inside known water body / existing infrastructure zones
            if dem_processor.is_inside_exclusion_zone(lat, lng):
                skipped += 1
                continue

            height_m = dem_processor.get_elevation_at_point(lat, lng)
            slope_deg, aspect_deg = dem_processor.calculate_slope_and_aspect(lat, lng)
            
            # Read soil infiltration capacity
            soil_info = soil_processor.get_soil_at_point(lat, lng)
            ksat_rate = soil_info["ksat_mm_hr"]
            
            # Feature array: [Elevation, Slope, Aspect, Soil Permeability, Index]
            feature_matrix.append([height_m, slope_deg, aspect_deg, ksat_rate, float(index_pos)])
            point_details_list.append({
                "lat": lat,
                "lng": lng,
                "elev": height_m,
                "slope": slope_deg,
                "aspect": aspect_deg,
                "ksat": ksat_rate,
                "hsg": soil_info["hsg"],
                "index": index_pos
            })
        if skipped > 0:
            print(f"[MLEngine] Skipped {skipped} points inside water body exclusion zones")
        return np.array(feature_matrix), point_details_list

    def predict_kmeans(self, meander_coords: List[List[float]], weights: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """Groups river coordinates into 5 geographic clusters using K-Means and picks the center of each group."""
        X_features, point_details_list = self.extract_features(meander_coords)
        if len(X_features) == 0:
            return []

        self.kmeans.fit(X_features)
        group_labels = self.kmeans.labels_
        center_points = self.kmeans.cluster_centers_

        # Calculate target suitability scores for training
        target_scores = [90.0 - (feat[1] * 12.0) - (feat[0] * 0.1) + (feat[3] * 0.5) for feat in X_features]
        self.regressor.fit(X_features, target_scores)
        model_scores = self.regressor.predict(X_features)

        chosen_candidate_points = []
        for group_id in range(5):
            member_indices = np.where(group_labels == group_id)[0]
            if len(member_indices) == 0:
                continue
            
            center = center_points[group_id]
            distances_from_center = np.linalg.norm(X_features[member_indices] - center, axis=1)
            closest_point_idx = member_indices[np.argmin(distances_from_center)]
            point_item = point_details_list[closest_point_idx]
            
            chosen_candidate_points.append({
                "lat": point_item["lat"],
                "lng": point_item["lng"],
                "elev": point_item["elev"],
                "slope": point_item["slope"],
                "ksat": point_item["ksat"],
                "hsg": point_item["hsg"],
                "score": int(round(model_scores[closest_point_idx])),
                "index": point_item["index"]
            })

        chosen_candidate_points.sort(key=lambda item: item["index"])
        return self.format_predictions(chosen_candidate_points, "K-Means Cluster", weights)

    def predict_randomforest(self, meander_coords: List[List[float]], weights: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """Trains a Random Forest decision tree model to score and select the top 5 river locations."""
        X_features, point_details_list = self.extract_features(meander_coords)
        if len(X_features) == 0:
            return []

        # Create training labels that reward gentle slope and high infiltration rate
        location_scores = []
        for feat in X_features:
            slope_val = feat[1]
            elev_val = feat[0]
            ksat_val = feat[3]
            calculated_val = 90.0 - (slope_val * 15.0) - (abs(elev_val - 35.0) * 0.3) + (ksat_val * 0.8)
            location_scores.append(max(40.0, min(99.0, calculated_val)))

        self.regressor.fit(X_features, location_scores)
        predicted_scores = self.regressor.predict(X_features)

        # Collect points along with predicted score values
        all_scored_points = []
        for index_i, point_item in enumerate(point_details_list):
            all_scored_points.append({
                "lat": point_item["lat"],
                "lng": point_item["lng"],
                "elev": point_item["elev"],
                "slope": point_item["slope"],
                "ksat": point_item["ksat"],
                "hsg": point_item["hsg"],
                "score": int(round(predicted_scores[index_i])),
                "index": point_item["index"]
            })

        # Select top 5 best scoring points while keeping proper spacing between them
        all_scored_points.sort(key=lambda item: item["score"], reverse=True)
        selected_points = []
        minimum_gap = max(8, len(meander_coords) // 7)

        for candidate in all_scored_points:
            if len(selected_points) >= 5:
                break
            if all(abs(candidate["index"] - selected["index"]) >= minimum_gap for selected in selected_points):
                selected_points.append(candidate)

        selected_points.sort(key=lambda item: item["index"])
        return self.format_predictions(selected_points, "RF Regressor", weights)

    def format_predictions(self, points: List[Dict[str, Any]], label_prefix: str, weights: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """Formats the output dictionary for each predicted site."""
        from backend.mcda_engine import get_nearest_village, mcda_engine
        active_weights = weights or {"slope": 30, "flow": 25, "soil": 20, "farmland": 15, "width": 10}
        districts_list = ["Tiruchirappalli", "Thanjavur", "Ariyalur", "Mayiladuthurai", "Mayiladuthurai Delta"]
        width_values = [240, 310, 190, 280, 350]
        cost_values = [18.5, 22.0, 14.8, 19.2, 16.0]

        formatted_list = []
        for index_i, point_item in enumerate(points):
            lat, lng = point_item["lat"], point_item["lng"]
            elev_m = point_item["elev"]
            slope_deg = point_item["slope"]
            score_val = point_item["score"]
            hsg_group = point_item["hsg"]
            width_m = width_values[index_i % len(width_values)]
            cost_lakhs = cost_values[index_i % len(cost_values)]
            district_name = districts_list[index_i % len(districts_list)]
            
            # Query 10m Satellite LCLU Raster for exact Cropland Hectares & Land Cover Class
            lclu_class_info = lclu_processor.get_lclu_at_point(lat, lng)
            cropland_stats = lclu_processor.get_cropland_area_in_radius(lat, lng, radius_km=1.5)
            farmland_ha = cropland_stats["cropland_ha"]
            farmland_acres = cropland_stats["cropland_acres"]
            rec_storage_ml = round(max(8.0, min(25.0, (width_m * 0.05) + (elev_m * 0.15))), 1)

            
            water_impact = hydrology_calc.calculate_groundwater_impact(rec_storage_ml, est_cost_lakhs=cost_lakhs)
            aquifer_gain_m = water_impact["groundwater_gain_m"]

            nearest_village_name = get_nearest_village(lat, lng)
            town_label = f" (Near {nearest_village_name})" if nearest_village_name else ""
            site_title = f"{label_prefix} Site {index_i+1}{town_label}"

            formatted_list.append({
                "id": f"CD-0{index_i+1}",
                "rank": index_i + 1,
                "name": site_title,
                "regionName": site_title,
                "district": district_name,
                "lat": lat,
                "lng": lng,
                "cop30_elevation_m": elev_m,
                "slope_deg": slope_deg,
                "score": score_val,
                "calculatedScore": score_val,
                "attributions": mcda_engine.calculate_xai_attributions(elev_m, slope_deg, hsg_group, farmland_ha, width_m, active_weights),
                "type": "Sub-surface Dyke + Spillway" if index_i == 1 else "Inflatable Rubber Weir" if index_i == 3 else "Salt Barrage Check Dam" if index_i == 4 else "Concrete Overflow Check Dam",

                "recHeight": f"{(4.2 - index_i * 0.3):.1f} m",
                "recWidth": f"{width_m} m",
                "hsg": hsg_group,
                "soilInfiltration": f"{point_item['ksat']} mm/hr",
                "recStorageML": rec_storage_ml,
                "rechargeRadiusKm": water_impact["recharge_radius_km"],
                "aquiferRiseM": aquifer_gain_m,
                "costLakhs": cost_lakhs,
                "annualIrrigationValueLakhs": water_impact["annual_irrigation_value_lakhs"],
                "farmlandHa": farmland_ha,
                "farmlandAcres": farmland_acres,
                "crossSection": [
                    {"dist": 0, "elev": round(elev_m + 8, 1)}, {"dist": 40, "elev": round(elev_m + 4, 1)}, {"dist": 80, "elev": round(elev_m, 1)},
                    {"dist": 120, "elev": round(elev_m - 2, 1)}, {"dist": 160, "elev": round(elev_m, 1)}, {"dist": 200, "elev": round(elev_m + 4, 1)}, {"dist": 240, "elev": round(elev_m + 8, 1)}
                ]
            })

        return formatted_list

# Shared instance for use across the application
ml_engine = MLEngine()

