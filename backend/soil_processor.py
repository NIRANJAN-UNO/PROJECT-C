import os
import numpy as np
import rasterio
from typing import Dict, Any

SOIL_FILE_PATH = "E:/soildata.tif"

class SoilProcessor:
    """
    Saturated Hydraulic Conductivity (Ksat) Soil Raster Processing Engine
    
    Reads E:/soildata.tif (487x314 grid covering Kollidam basin) to extract
    real-world soil permeability, infiltration rate, and Hydrologic Soil Group (HSG).
    """
    def __init__(self, filepath: str = SOIL_FILE_PATH):
        self.filepath = filepath
        self.dataset = None
        self.array = None
        self.load_raster()

    def load_raster(self) -> bool:
        if os.path.exists(self.filepath):
            try:
                self.dataset = rasterio.open(self.filepath)
                self.array = self.dataset.read(1)
                print(f"[SoilProcessor] Successfully loaded soil raster: {self.filepath} ({self.dataset.width}x{self.dataset.height})")
                return True
            except Exception as e:
                print(f"[SoilProcessor] Error reading soil raster: {e}")
                return False
        else:
            print(f"[SoilProcessor] Soil raster not found at: {self.filepath}")
            return False

    def get_info(self) -> Dict[str, Any]:
        if self.dataset is None:
            return {"error": "Soil raster not loaded"}
        bounds = self.dataset.bounds
        return {
            "filename": os.path.basename(self.filepath),
            "width": self.dataset.width,
            "height": self.dataset.height,
            "crs": str(self.dataset.crs),
            "bounds": {
                "min_lng": bounds.left,
                "max_lng": bounds.right,
                "min_lat": bounds.bottom,
                "max_lat": bounds.top
            }
        }

    def get_soil_at_point(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Samples soil Ksat (mm/day) at coordinate. If coordinate lands on a 
        background pixel (0 or NaN), performs a 3x3 window nearest-neighbor query.
        """
        if self.dataset is None:
            return {"hsg": "B (Alluvial Loam)", "ksat_mm_hr": 14.5}
        
        val = 320.0
        try:
            row, col = self.dataset.index(lng, lat)
            if 0 <= row < self.dataset.height and 0 <= col < self.dataset.width:
                val = float(self.array[row, col])
                
                # If background pixel (0 or NaN), perform 3x3 window search for closest soil class
                if np.isnan(val) or val <= 0.0 or val > 10000:
                    r_min = max(0, row - 1)
                    r_max = min(self.dataset.height, row + 2)
                    c_min = max(0, col - 1)
                    c_max = min(self.dataset.width, col + 2)
                    
                    window = self.array[r_min:r_max, c_min:c_max]
                    valid_window = window[~np.isnan(window) & (window > 0)]
                    
                    if len(valid_window) > 0:
                        val = float(np.mean(valid_window))
                    else:
                        val = 320.0 # Basin mean fallback
            else:
                val = 320.0
        except Exception:
            val = 320.0

        # Convert Ksat from mm/day to mm/hr
        ksat_mm_hr = round(val / 24.0, 2)

        # Hydrologic Soil Group classification
        if ksat_mm_hr > 15.0:
            hsg = "A (Sandy, High Permeability)"
        elif ksat_mm_hr > 10.0:
            hsg = "B (Sandy Loam, Moderate Permeability)"
        elif ksat_mm_hr > 5.0:
            hsg = "C (Clay Loam, Low Permeability)"
        else:
            hsg = "D (Heavy Coastal Clay, Very Low Permeability)"

        return {
            "hsg": hsg,
            "ksat_mm_hr": ksat_mm_hr,
            "raw_ksat_mm_day": round(val, 1)
        }

# Singleton instance
soil_processor = SoilProcessor()
