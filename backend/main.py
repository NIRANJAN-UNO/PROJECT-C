import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from backend.dem_processor import dem_processor
from backend.rainfall_processor import rainfall_processor
from backend.hydrology_calculator import hydrology_calc
from backend.mcda_engine import mcda_engine
from backend.ml_engine import ml_engine

app = FastAPI(
    title="PROJECT C - Real-World Geospatial GIS, ML & Precipitation API",
    description="Full-stack Python GIS Backend handling COP30 DEM, Real Rainfall Rasters, and K-Means AI Predictions",
    version="6.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def get_root():
    return {
        "status": "online",
        "system": "PROJECT C Real-World GIS & AI Engine",
        "dem_info": dem_processor.get_info(),
        "rainfall_info": rainfall_processor.get_info()
    }

@app.get("/api/dem/info")
def get_dem_info():
    return dem_processor.get_info()

@app.get("/api/dem/elevation")
def get_point_elevation(lat: float = Query(...), lng: float = Query(...)):
    elev = dem_processor.get_elevation_at_point(lat, lng)
    slope, aspect = dem_processor.calculate_slope_and_aspect(lat, lng)
    return {
        "lat": lat,
        "lng": lng,
        "cop30_elevation_m": elev,
        "slope_deg": slope,
        "aspect_deg": aspect,
        "source": "Copernicus 30m DEM (output_hh.tif)"
    }

@app.get("/api/rainfall/info")
def get_rainfall_info():
    return rainfall_processor.get_info()

@app.get("/api/rainfall/daily")
def get_daily_rainfall(date: str = Query("2021-11-18", description="Date format YYYY-MM-DD")):
    return rainfall_processor.get_daily_rainfall(date)

class SCSCNRequest(BaseModel):
    rainfall_mm: Optional[float] = None
    date_str: str = "2021-11-18"
    curve_number: float = 80.0
    catchment_area_sq_km: float = 450.0

@app.post("/api/hydrology/scs-cn")
def calculate_scs_cn(req: SCSCNRequest):
    runoff = hydrology_calc.calculate_scs_cn_runoff(
        rainfall_mm=req.rainfall_mm,
        date_str=req.date_str,
        curve_number=req.curve_number,
        catchment_area_sq_km=req.catchment_area_sq_km
    )
    gw = hydrology_calc.calculate_groundwater_impact(runoff["runoff_volume_ml"])
    return {
        "runoff": runoff,
        "groundwater": gw
    }

class ScanRequest(BaseModel):
    profile_key: str = "mcda-standard"
    weights: Dict[str, float] = {"slope": 30, "flow": 25, "soil": 20, "farmland": 15, "width": 10}
    meander_coords: List[List[float]] = []

@app.post("/api/hydrology/scan")
def scan_hydrology(req: ScanRequest):
    if req.profile_key == 'ml-readiness':
        # Train and run actual machine learning (K-Means Clustering + RandomForestRegressor)
        predictions = ml_engine.train_and_predict(req.meander_coords)
        engine_type = "Python scikit-learn (K-Means + RandomForestRegressor)"
    else:
        # Run analytical Multi-Criteria Decision Analysis (MCDA)
        predictions = mcda_engine.generate_candidate_predictions(
            profile_key=req.profile_key,
            user_weights=req.weights,
            meander_coords=req.meander_coords
        )
        engine_type = "Python MCDA Scoring Engine"

    return {
        "status": "success",
        "active_profile": req.profile_key,
        "backend_engine": f"{engine_type} + Copernicus 30m DEM + Real Rainfall TIFs",
        "predictions": predictions
    }

@app.post("/api/ml/extract-features")
def extract_features(lat: float = Query(...), lng: float = Query(...)):
    return mcda_engine.extract_ml_feature_vector(lat, lng)
