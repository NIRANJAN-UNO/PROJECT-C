import os
import math
import numpy as np
import rasterio
from typing import Dict, Any, List, Tuple

DEM_FILE_PATH = "E:/output_hh.tif"

class DEMProcessor:
    def __init__(self, filepath: str = DEM_FILE_PATH):
        self.filepath = filepath
        self.dataset = None
        self.array = None
        self.slope_array = None
        self.load_raster()

    def load_raster(self) -> bool:
        if os.path.exists(self.filepath):
            try:
                self.dataset = rasterio.open(self.filepath)
                self.array = self.dataset.read(1)
                print(f"[DEMProcessor] Successfully loaded: {self.filepath} ({self.dataset.width}x{self.dataset.height})")
                return True
            except Exception as e:
                print(f"[DEMProcessor] Error opening raster: {e}")
                return False
        else:
            print(f"[DEMProcessor] File not found: {self.filepath}")
            return False

    def get_info(self) -> Dict[str, Any]:
        if self.dataset is None:
            return {"error": "DEM raster not loaded"}
        
        bounds = self.dataset.bounds
        return {
            "filename": os.path.basename(self.filepath),
            "width": self.dataset.width,
            "height": self.dataset.height,
            "bands": self.dataset.count,
            "crs": str(self.dataset.crs),
            "bounds": {
                "min_lng": bounds.left,
                "max_lng": bounds.right,
                "min_lat": bounds.bottom,
                "max_lat": bounds.top
            },
            "pixel_scale_deg": self.dataset.transform.a,
            "resolution_meters": "~30m (1 arc-second)",
            "min_elevation_m": float(np.nanmin(self.array)),
            "max_elevation_m": float(np.nanmax(self.array)),
            "mean_elevation_m": float(np.nanmean(self.array))
        }

    def get_elevation_at_point(self, lat: float, lng: float) -> float:
        if self.dataset is None:
            return 45.0
        
        try:
            row, col = self.dataset.index(lng, lat)
            if 0 <= row < self.dataset.height and 0 <= col < self.dataset.width:
                val = float(self.array[row, col])
                return round(val, 2) if not np.isnan(val) else 0.0
            return 0.0
        except Exception:
            return 45.0

    def sample_elevation_profile(self, coords: List[Tuple[float, float]]) -> List[Dict[str, Any]]:
        profile = []
        for lat, lng in coords:
            elev = self.get_elevation_at_point(lat, lng)
            profile.append({
                "lat": lat,
                "lng": lng,
                "elevation_m": elev
            })
        return profile

    def calculate_slope_degrees(self, lat: float, lng: float) -> float:
        """Estimates terrain slope in degrees at a specific lat/lng using 3x3 pixel window"""
        if self.dataset is None:
            return 0.8
        
        try:
            row, col = self.dataset.index(lng, lat)
            if 1 <= row < self.dataset.height - 1 and 1 <= col < self.dataset.width - 1:
                window = self.array[row-1:row+2, col-1:col+2]
                dx = (window[1, 2] - window[1, 0]) / (2 * 30.0)
                dy = (window[2, 1] - window[0, 1]) / (2 * 30.0)
                slope_rad = math.atan(math.sqrt(dx*dx + dy*dy))
                return round(math.degrees(slope_rad), 2)
            return 0.8
        except Exception:
            return 0.8

# Global singleton instance
dem_processor = DEMProcessor()
