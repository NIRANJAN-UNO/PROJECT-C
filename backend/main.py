import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.dem_processor import dem_processor
from backend.hydrology_calculator import hydrology_calc
from backend.mcda_engine import mcda_engine

app = FastAPI(
    title="PROJECT C - DEM-Driven Hydro-MCDA Decision Engine",
    description="Full-stack Python GIS Backend handling COP30 DEM rasters, MCDA scoring, and SCS-CN hydrology",
    version="4.0.0"
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
        "system": "PROJECT C DEM-Driven Analytical Engine",
        "dem_info": dem_processor.get_info()
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

class SCSCNRequest(BaseModel):
    rainfall_mm: float = 150.0
    curve_number: float = 80.0
    catchment_area_sq_km: float = 450.0

@app.post("/api/hydrology/scs-cn")
def calculate_scs_cn(req: SCSCNRequest):
    runoff = hydrology_calc.calculate_scs_cn_runoff(req.rainfall_mm, req.curve_number, req.catchment_area_sq_km)
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
    predictions = mcda_engine.generate_candidate_predictions(
        profile_key=req.profile_key,
        user_weights=req.weights,
        meander_coords=req.meander_coords
    )
    return {
        "status": "success",
        "active_profile": req.profile_key,
        "backend_engine": "Python FastAPI + Copernicus 30m DEM (output_hh.tif)",
        "predictions": predictions
    }

@app.post("/api/ml/extract-features")
def extract_features(lat: float = Query(...), lng: float = Query(...)):
    return mcda_engine.extract_ml_feature_vector(lat, lng)
