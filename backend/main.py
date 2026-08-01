import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.dem_processor import dem_processor
from backend.hydrology_calculator import hydrology_calc
from backend.ml_engine import ml_engine

app = FastAPI(
    title="PROJECT C - Modular Geospatial AI Engine",
    description="Full-stack Python GIS Backend handling DEM rasters, ML predictions, and SCS-CN hydrology",
    version="3.5.0"
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
        "system": "PROJECT C Modular Python GIS Engine",
        "dem_info": dem_processor.get_info()
    }

@app.get("/api/dem/info")
def get_dem_info():
    return dem_processor.get_info()

@app.get("/api/dem/elevation")
def get_point_elevation(lat: float = Query(...), lng: float = Query(...)):
    elev = dem_processor.get_elevation_at_point(lat, lng)
    slope = dem_processor.calculate_slope_degrees(lat, lng)
    return {
        "lat": lat,
        "lng": lng,
        "cop30_elevation_m": elev,
        "slope_deg": slope,
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
    model_type: str = "xgboost"
    weights: Dict[str, float] = {"slope": 30, "flow": 25, "soil": 20, "farmland": 15, "width": 10}
    meander_coords: List[List[float]] = []

@app.post("/api/hydrology/scan")
def scan_hydrology(req: ScanRequest):
    predictions = ml_engine.predict_check_dams(
        model_type=req.model_type,
        weights=req.weights,
        meander_coords=req.meander_coords
    )
    return {
        "status": "success",
        "active_model": req.model_type,
        "benchmarks": ml_engine.get_benchmarks().get(req.model_type, {}),
        "predictions": predictions
    }
