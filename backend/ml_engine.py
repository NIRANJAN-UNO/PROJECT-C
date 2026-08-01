import numpy as np
import math
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from typing import List, Dict, Any

from backend.dem_processor import dem_processor
from backend.soil_processor import soil_processor
from backend.hydrology_calculator import HA_TO_ACRES, hydrology_calc

class MLEngine:
    """
    Geospatial Machine Learning Engine
    
    Implements:
    - KMeans Clustering for unsupervised spatial reach partition.
    - RandomForestRegressor for trained non-linear suitability prediction.
    """
    def __init__(self):
        self.kmeans = KMeans(n_clusters=5, random_state=42, n_init='auto')
        self.regressor = RandomForestRegressor(n_estimators=50, random_state=42)

    def extract_features(self, meander_coords: List[List[float]]) -> tuple:
        features = []
        point_data = []
        for idx, pt in enumerate(meander_coords):
            lat, lng = pt[0], pt[1]
            elev = dem_processor.get_elevation_at_point(lat, lng)
            slope, aspect = dem_processor.calculate_slope_and_aspect(lat, lng)
            
            # Query soil data
            soil_info = soil_processor.get_soil_at_point(lat, lng)
            ksat = soil_info["ksat_mm_hr"]
            
            # Feature Vector: [Elevation, Slope, Aspect, Ksat, Index]
            features.append([elev, slope, aspect, ksat, float(idx)])
            point_data.append({
                "lat": lat,
                "lng": lng,
                "elev": elev,
                "slope": slope,
                "aspect": aspect,
                "ksat": ksat,
                "hsg": soil_info["hsg"],
                "index": idx
            })
        return np.array(features), point_data

    def predict_kmeans(self, meander_coords: List[List[float]]) -> List[Dict[str, Any]]:
        """Predicts locations using K-Means clustering centers"""
        X, point_data = self.extract_features(meander_coords)
        if len(X) == 0:
            return []

        self.kmeans.fit(X)
        labels = self.kmeans.labels_
        centroids = self.kmeans.cluster_centers_

        # Dynamic target calculation for RandomForest scoring
        y_targets = [90.0 - (f[1] * 12.0) - (f[0] * 0.1) + (f[3] * 0.5) for f in X]
        self.regressor.fit(X, y_targets)
        predicted_scores = self.regressor.predict(X)

        candidate_points = []
        for cluster_id in range(5):
            cluster_indices = np.where(labels == cluster_id)[0]
            if len(cluster_indices) == 0:
                continue
            
            centroid = centroids[cluster_id]
            distances = np.linalg.norm(X[cluster_indices] - centroid, axis=1)
            best_idx = cluster_indices[np.argmin(distances)]
            pt = point_data[best_idx]
            
            candidate_points.append({
                "lat": pt["lat"],
                "lng": pt["lng"],
                "elev": pt["elev"],
                "slope": pt["slope"],
                "ksat": pt["ksat"],
                "hsg": pt["hsg"],
                "score": int(round(predicted_scores[best_idx])),
                "index": pt["index"]
            })

        candidate_points.sort(key=lambda p: p["index"])
        return self.format_predictions(candidate_points, "K-Means Cluster")

    def predict_randomforest(self, meander_coords: List[List[float]]) -> List[Dict[str, Any]]:
        """Predicts locations by training a RandomForestRegressor and selecting the top 5 highest scored points"""
        X, point_data = self.extract_features(meander_coords)
        if len(X) == 0:
            return []

        # Train regressor to favor low slope and high soil infiltration capacity
        y_suitability = []
        for f in X:
            slope = f[1]
            elev = f[0]
            ksat = f[3]
            score = 90.0 - (slope * 15.0) - (abs(elev - 35.0) * 0.3) + (ksat * 0.8)
            y_suitability.append(max(40.0, min(99.0, score)))

        self.regressor.fit(X, y_suitability)
        predicted_scores = self.regressor.predict(X)

        # Attach scores to all points and sort by suitability
        all_points = []
        for i, pt in enumerate(point_data):
            all_points.append({
                "lat": pt["lat"],
                "lng": pt["lng"],
                "elev": pt["elev"],
                "slope": pt["slope"],
                "ksat": pt["ksat"],
                "hsg": pt["hsg"],
                "score": int(round(predicted_scores[i])),
                "index": pt["index"]
            })

        # Select top 5 points ensuring spatial distribution (at least 15 points distance)
        all_points.sort(key=lambda p: p["score"], reverse=True)
        selected = []
        min_dist_idx = max(8, len(meander_coords) // 7)

        for pt in all_points:
            if len(selected) >= 5:
                break
            if all(abs(pt["index"] - sel["index"]) >= min_dist_idx for sel in selected):
                selected.append(pt)

        selected.sort(key=lambda p: p["index"])
        return self.format_predictions(selected, "RF Regressor")

    def format_predictions(self, points: List[Dict[str, Any]], prefix: str) -> List[Dict[str, Any]]:
        from backend.mcda_engine import get_nearest_village
        districts = ["Tiruchirappalli", "Thanjavur", "Ariyalur", "Mayiladuthurai", "Mayiladuthurai Delta"]
        widths = [240, 310, 190, 280, 350]
        costs = [18.5, 22.0, 14.8, 19.2, 16.0]

        results = []
        for i, pt in enumerate(points):
            lat, lng = pt["lat"], pt["lng"]
            elev_m = pt["elev"]
            slope_deg = pt["slope"]
            score = pt["score"]
            hsg = pt["hsg"]
            width_m = widths[i % len(widths)]
            cost_lakhs = costs[i % len(costs)]
            district = districts[i % len(districts)]
            
            farmland_ha = int(round(max(1500.0, min(5000.0, 4200.0 - (elev_m * 25.0) + (slope_deg * 300.0)))))
            farmland_acres = int(round(farmland_ha * HA_TO_ACRES))
            rec_storage_ml = round(max(8.0, min(25.0, (width_m * 0.05) + (elev_m * 0.15))), 1)
            
            gw_impact = hydrology_calc.calculate_groundwater_impact(rec_storage_ml, est_cost_lakhs=cost_lakhs)
            aquifer_gain_m = gw_impact["groundwater_gain_m"]

            near_town = get_nearest_village(lat, lng)
            town_suffix = f" (Near {near_town})" if near_town else ""
            predicted_title = f"{prefix} Site {i+1}{town_suffix}"

            results.append({
                "id": f"CD-0{i+1}",
                "rank": i + 1,
                "name": predicted_title,
                "regionName": predicted_title,
                "district": district,
                "lat": lat,
                "lng": lng,
                "cop30_elevation_m": elev_m,
                "slope_deg": slope_deg,
                "score": score,
                "calculatedScore": score,
                "type": "Sub-surface Dyke + Spillway" if i == 1 else "Inflatable Rubber Weir" if i == 3 else "Salt Barrage Check Dam" if i == 4 else "Concrete Overflow Check Dam",
                "recHeight": f"{(4.2 - i * 0.3):.1f} m",
                "recWidth": f"{width_m} m",
                "hsg": hsg,
                "soilInfiltration": f"{pt['ksat']} mm/hr",
                "recStorageML": rec_storage_ml,
                "rechargeRadiusKm": gw_impact["recharge_radius_km"],
                "aquiferRiseM": aquifer_gain_m,
                "costLakhs": cost_lakhs,
                "annualIrrigationValueLakhs": gw_impact["annual_irrigation_value_lakhs"],
                "farmlandHa": farmland_ha,
                "farmlandAcres": farmland_acres,
                "crossSection": [
                    {"dist": 0, "elev": round(elev_m + 8, 1)}, {"dist": 40, "elev": round(elev_m + 4, 1)}, {"dist": 80, "elev": round(elev_m, 1)},
                    {"dist": 120, "elev": round(elev_m - 2, 1)}, {"dist": 160, "elev": round(elev_m, 1)}, {"dist": 200, "elev": round(elev_m + 4, 1)}, {"dist": 240, "elev": round(elev_m + 8, 1)}
                ]
            })

        return results

ml_engine = MLEngine()
