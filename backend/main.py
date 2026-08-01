import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from backend.dem_processor import dem_processor
from backend.soil_processor import soil_processor
from backend.rainfall_processor import rainfall_processor
from backend.lclu_processor import lclu_processor
from backend.hydrology_calculator import hydrology_calc
from backend.mcda_engine import mcda_engine
from backend.ml_engine import ml_engine
from backend.river_processor import river_processor

# Main web service application built with FastAPI
app = FastAPI(
    title="Geospatial River Analysis & Hydrology API",
    description="Web service API for elevation analysis, soil lookup, rainfall calculations, and dam location predictions",
    version="8.0.0"
)

# Enable CORS middleware to allow web browser requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def get_root():
    """Returns the current online status and dataset information."""
    return {
        "status": "online",
        "system": "Geospatial GIS & AI Analysis Engine",
        "dem_info": dem_processor.get_info(),
        "soil_info": soil_processor.get_info(),
        "rainfall_info": rainfall_processor.get_info(),
        "river_network_info": river_processor.get_info(),
        "lclu_info": lclu_processor.get_info()
    }


@app.get("/api/dem/info")
def get_dem_info():
    """Returns details about the elevation map file."""
    return dem_processor.get_info()

@app.get("/api/dem/elevation")
def get_point_elevation(lat: float = Query(...), lng: float = Query(...)):
    """Returns elevation, slope, aspect, and soil data for a single latitude/longitude point."""
    height_m = dem_processor.get_elevation_at_point(lat, lng)
    slope_deg, aspect_deg = dem_processor.calculate_slope_and_aspect(lat, lng)
    soil_details = soil_processor.get_soil_at_point(lat, lng)
    return {
        "lat": lat,
        "lng": lng,
        "cop30_elevation_m": height_m,
        "slope_deg": slope_deg,
        "aspect_deg": aspect_deg,
        "soil_hsg": soil_details["hsg"],
        "soil_ksat_mm_hr": soil_details["ksat_mm_hr"],
        "source": "Copernicus 30m DEM + Soil GeoTIFF"
    }


@app.get("/api/rainfall/info")
def get_rainfall_info():
    """Returns summary information about the rainfall dataset."""
    return rainfall_processor.get_info()

@app.get("/api/rainfall/daily")
def get_daily_rainfall(date: str = Query("2021-11-18", description="Date in format YYYY-MM-DD")):
    """Returns rainfall numbers for a specified date."""
    return rainfall_processor.get_daily_rainfall(date)

class SCSCNRequest(BaseModel):
    rainfall_mm: Optional[float] = None
    date_str: str = "2021-11-18"
    curve_number: float = 80.0
    catchment_area_sq_km: float = 450.0

@app.post("/api/hydrology/scs-cn")
def calculate_scs_cn(request_data: SCSCNRequest):
    """Calculates rainfall runoff volume and groundwater impact."""
    runoff_result = hydrology_calc.calculate_scs_cn_runoff(
        rainfall_mm=request_data.rainfall_mm,
        date_str=request_data.date_str,
        curve_number=request_data.curve_number,
        catchment_area_sq_km=request_data.catchment_area_sq_km
    )
    groundwater_result = hydrology_calc.calculate_groundwater_impact(runoff_result["runoff_volume_ml"])
    return {
        "runoff": runoff_result,
        "groundwater": groundwater_result
    }

class ScanRequest(BaseModel):
    profile_key: str = "mcda-standard"
    weights: Dict[str, float] = {"slope": 30, "flow": 25, "soil": 20, "farmland": 15, "width": 10}
    meander_coords: List[List[float]] = []

@app.post("/api/hydrology/scan")
def scan_hydrology(scan_params: ScanRequest):
    """Scans the REAL OSM Kollidam river network coordinates and predicts optimal candidate dam sites."""
    
    # Always use real OSM river GeoJSON coordinates — this ensures all candidate sites
    # are placed directly ON the actual Kollidam river channel, not on estimated meanders
    real_river_coords = river_processor.get_meander_coords_from_geojson()
    
    # Fallback to client-provided coords only if river GeoJSON is unavailable
    coords_to_use = real_river_coords if len(real_river_coords) > 10 else scan_params.meander_coords

    if scan_params.profile_key == 'ml-kmeans':
        predicted_sites = ml_engine.predict_kmeans(coords_to_use, scan_params.weights)
        engine_label = "Python scikit-learn (K-Means Clustering) on OSM River Network"
    elif scan_params.profile_key == 'ml-randomforest':
        predicted_sites = ml_engine.predict_randomforest(coords_to_use, scan_params.weights)
        engine_label = "Python scikit-learn (RandomForestRegressor) on OSM River Network"
    else:
        predicted_sites = mcda_engine.generate_candidate_predictions(
            profile_key=scan_params.profile_key,
            user_weights=scan_params.weights,
            meander_coords=coords_to_use
        )
        engine_label = "Python MCDA Scoring Engine on OSM River Network"

    return {
        "status": "success",
        "active_profile": scan_params.profile_key,
        "backend_engine": f"{engine_label} + Copernicus 30m DEM + Soil Raster + Real Rainfall TIFs",
        "river_coords_used": len(coords_to_use),
        "predictions": predicted_sites
    }


@app.post("/api/ml/extract-features")
def extract_features(lat: float = Query(...), lng: float = Query(...)):
    """Returns terrain feature values at a given location."""
    height_m = dem_processor.get_elevation_at_point(lat, lng)
    slope_deg, aspect_deg = dem_processor.calculate_slope_and_aspect(lat, lng)
    soil_details = soil_processor.get_soil_at_point(lat, lng)
    exclusion = dem_processor.is_inside_exclusion_zone(lat, lng)
    return {
        "lat": lat,
        "lng": lng,
        "elevation_m": height_m,
        "slope_deg": slope_deg,
        "aspect_deg": aspect_deg,
        "soil_hsg": soil_details["hsg"],
        "ksat_mm_hr": soil_details["ksat_mm_hr"],
        "in_exclusion_zone": exclusion["name"] if exclusion else None
    }

@app.get("/api/exclusion-zones")
def get_exclusion_zones():
    """Returns known water body / existing dam exclusion zones as GeoJSON polygons for map display."""
    from backend.dem_processor import WATER_BODY_EXCLUSION_ZONES
    features = []
    for zone in WATER_BODY_EXCLUSION_ZONES:
        # Build a rectangular polygon from the bounding box
        lat_min, lat_max = zone["lat_min"], zone["lat_max"]
        lng_min, lng_max = zone["lng_min"], zone["lng_max"]
        polygon_coords = [[
            [lng_min, lat_min], [lng_max, lat_min],
            [lng_max, lat_max], [lng_min, lat_max],
            [lng_min, lat_min]  # close the ring
        ]]
        features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": polygon_coords},
            "properties": {
                "name": zone["name"],
                "reason": zone["reason"]
            }
        })
    return {"type": "FeatureCollection", "features": features}


# ─── River Network Endpoints ─────────────────────────────────────────────────

@app.get("/api/river/info")
def get_river_info():
    """Returns summary info about the loaded river network GeoJSON."""
    return river_processor.get_info()

@app.get("/api/river/network")
def get_river_network(rivers_only: bool = Query(False)):
    """Returns the full river network GeoJSON for Leaflet rendering.
    Set rivers_only=true to get only the 184 main river segments (no canals)."""
    if rivers_only:
        return river_processor.get_river_only_geojson()
    return river_processor.get_geojson()

@app.get("/api/river/intersections")
def get_river_intersections(top: int = Query(10)):
    """Returns top N tributary intersection nodes sorted by stream convergence priority."""
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [pt["lng"], pt["lat"]]},
                "properties": {
                    "segments_meeting": pt["segments_meeting"],
                    "waterway_types": pt["waterway_types"],
                    "priority": pt["priority"]
                }
            }
            for pt in river_processor.get_top_n_intersections(top)
        ]
    }

@app.post("/api/river/scan-intersections")
def scan_from_intersections():
    """
    Option B: AI site selection driven directly from OSM river intersection nodes.
    Extracts real confluence coordinates from river network GeoJSON and runs ML models.
    """
    # Get meander coords extracted directly from GeoJSON river lines
    geojson_coords = river_processor.get_meander_coords_from_geojson()

    # Run K-Means on the real river coordinates
    kmeans_sites = ml_engine.predict_kmeans(geojson_coords)

    # Run RandomForest on the real river coordinates
    rf_sites = ml_engine.predict_randomforest(geojson_coords)

    return {
        "status": "success",
        "source": "OSM River Network GeoJSON (river network.geojson)",
        "total_coords_used": len(geojson_coords),
        "tributary_intersections": len(river_processor.get_intersections()),
        "kmeans_predictions": kmeans_sites,
        "randomforest_predictions": rf_sites
    }


# ─── LCLU (Land Use / Land Cover) Endpoints ───────────────────────────────

@app.get("/api/lclu/info")
def get_lclu_info():
    """Returns summary metadata for the 10m satellite LCLU raster."""
    return lclu_processor.get_info()

@app.get("/api/lclu/point")
def get_lclu_at_point(lat: float = Query(...), lng: float = Query(...)):
    """Returns 10m land cover class (cropland, forest, built-up, water, etc.) at a GPS location."""
    class_info = lclu_processor.get_lclu_at_point(lat, lng)
    cropland_stats = lclu_processor.get_cropland_area_in_radius(lat, lng, radius_km=1.5)
    return {
        "lat": lat,
        "lng": lng,
        "land_cover": class_info,
        "cropland_recharge_area": cropland_stats
    }

