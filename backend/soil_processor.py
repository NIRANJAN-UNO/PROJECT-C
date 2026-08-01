import os
import numpy as np
import rasterio
from typing import Dict, Any

# File location for soil data raster
SOIL_FILE_PATH = "E:/soildata.tif"

class SoilProcessor:
    """
    Handles reading soil property raster maps and looking up soil 
    type and permeability at given coordinates.
    """
    def __init__(self, filepath: str = SOIL_FILE_PATH):
        self.filepath = filepath
        self.dataset = None
        self.array = None
        self.load_raster()

    def load_raster(self) -> bool:
        """Opens and reads the soil data file into memory."""
        if os.path.exists(self.filepath):
            try:
                self.dataset = rasterio.open(self.filepath)
                self.array = self.dataset.read(1)
                print(f"[SoilProcessor] Loaded soil data from: {self.filepath} ({self.dataset.width}x{self.dataset.height})")
                return True
            except Exception as read_err:
                print(f"[SoilProcessor] Failed to open soil file: {read_err}")
                return False
        else:
            print(f"[SoilProcessor] Soil file missing at location: {self.filepath}")
            return False

    def get_info(self) -> Dict[str, Any]:
        """Provides summary info about the loaded soil file."""
        if self.dataset is None:
            return {"error": "Soil raster not loaded"}
        area_bounds = self.dataset.bounds
        return {
            "filename": os.path.basename(self.filepath),
            "width": self.dataset.width,
            "height": self.dataset.height,
            "crs": str(self.dataset.crs),
            "bounds": {
                "min_lng": area_bounds.left,
                "max_lng": area_bounds.right,
                "min_lat": area_bounds.bottom,
                "max_lat": area_bounds.top
            }
        }

    def get_soil_at_point(self, lat: float, lng: float) -> Dict[str, Any]:
        """Looks up soil details (group and permeability rate) for a lat/lng location."""
        if self.dataset is None:
            return {"hsg": "B (Alluvial Loam)", "ksat_mm_hr": 14.5}
        
        soil_rate = 320.0
        try:
            row_idx, col_idx = self.dataset.index(lng, lat)
            if 0 <= row_idx < self.dataset.height and 0 <= col_idx < self.dataset.width:
                soil_rate = float(self.array[row_idx, col_idx])
                
                # If pixel value is invalid or zero, search nearby neighboring pixels
                if np.isnan(soil_rate) or soil_rate <= 0.0 or soil_rate > 10000:
                    start_row = max(0, row_idx - 1)
                    end_row = min(self.dataset.height, row_idx + 2)
                    start_col = max(0, col_idx - 1)
                    end_col = min(self.dataset.width, col_idx + 2)
                    
                    neighbor_box = self.array[start_row:end_row, start_col:end_col]
                    valid_pixels = neighbor_box[~np.isnan(neighbor_box) & (neighbor_box > 0)]
                    
                    if len(valid_pixels) > 0:
                        soil_rate = float(np.mean(valid_pixels))
                    else:
                        soil_rate = 320.0
            else:
                soil_rate = 320.0
        except Exception:
            soil_rate = 320.0

        # Change permeability rate from mm/day to mm/hr
        ksat_mm_hr = round(soil_rate / 24.0, 2)

        # Categorize soil into standard groups based on infiltration speed
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
            "raw_ksat_mm_day": round(soil_rate, 1)
        }

# Shared instance for use across the application
soil_processor = SoilProcessor()

