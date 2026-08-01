import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from backend.dem_processor import dem_processor
from backend.soil_processor import soil_processor
from backend.rainfall_processor import rainfall_processor
from backend.hydrology_calculator import hydrology_calc
from backend.mcda_engine import mcda_engine
from backend.ml_engine import ml_engine

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
        "rainfall_info": rainfall_processor.get_info()
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
    """Scans river coordinates and predicts optimal candidate dam sites."""
    if scan_params.profile_key == 'ml-kmeans':
        predicted_sites = ml_engine.predict_kmeans(scan_params.meander_coords)
        engine_label = "Python scikit-learn (K-Means Clustering)"
    elif scan_params.profile_key == 'ml-randomforest':
        predicted_sites = ml_engine.predict_randomforest(scan_params.meander_coords)
        engine_label = "Python scikit-learn (RandomForestRegressor)"
    else:
        predicted_sites = mcda_engine.generate_candidate_predictions(
            profile_key=scan_params.profile_key,
            user_weights=scan_params.weights,
            meander_coords=scan_params.meander_coords
        )
        engine_label = "Python MCDA Scoring Engine"

    return {
        "status": "success",
        "active_profile": scan_params.profile_key,
        "backend_engine": f"{engine_label} + Copernicus 30m DEM + Soil Raster + Real Rainfall TIFs",
        "predictions": predicted_sites
    }

@app.post("/api/ml/extract-features")
def extract_features(lat: float = Query(...), lng: float = Query(...)):
    """Returns terrain feature values at a given location."""
    height_m = dem_processor.get_elevation_at_point(lat, lng)
    slope_deg, aspect_deg = dem_processor.calculate_slope_and_aspect(lat, lng)
    soil_details = soil_processor.get_soil_at_point(lat, lng)
    return {
        "lat": lat,
        "lng": lng,
        "elevation_m": height_m,
        "slope_deg": slope_deg,
        "aspect_deg": aspect_deg,
        "soil_hsg": soil_details["hsg"],
        "ksat_mm_hr": soil_details["ksat_mm_hr"]
    }

