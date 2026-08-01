import os
import rasterio
import numpy as np
from typing import Dict, Any

LCLU_FILE_PATH = "E:/LCLU.tif"

# Standard ESA WorldCover 10m Land Use / Land Cover Class Mappings
LCLU_CLASSES = {
    10: {"name": "Tree Cover / Forest", "type": "Forest", "cn_hsg_b": 60, "farmland": False, "is_water": False, "is_built": False},
    20: {"name": "Shrubland", "type": "Shrub", "cn_hsg_b": 66, "farmland": False, "is_water": False, "is_built": False},
    30: {"name": "Grassland", "type": "Grass", "cn_hsg_b": 61, "farmland": False, "is_water": False, "is_built": False},
    40: {"name": "Agricultural Cropland", "type": "Cropland", "cn_hsg_b": 78, "farmland": True, "is_water": False, "is_built": False},
    50: {"name": "Built-up / Urban", "type": "Urban", "cn_hsg_b": 92, "farmland": False, "is_water": False, "is_built": True},
    60: {"name": "Bare / Sparse Vegetation", "type": "Bare", "cn_hsg_b": 86, "farmland": False, "is_water": False, "is_built": False},
    80: {"name": "Permanent Water Body", "type": "Water", "cn_hsg_b": 100, "farmland": False, "is_water": True, "is_built": False},
    90: {"name": "Herbaceous Wetland", "type": "Wetland", "cn_hsg_b": 85, "farmland": False, "is_water": True, "is_built": False},
    95: {"name": "Mangroves / Coastal Wetland", "type": "Wetland", "cn_hsg_b": 85, "farmland": False, "is_water": True, "is_built": False}
}

DEFAULT_CLASS = {"name": "Agricultural Cropland", "type": "Cropland", "cn_hsg_b": 78, "farmland": True, "is_water": False, "is_built": False}

class LCLUProcessor:
    """
    Reads 10m ESA WorldCover Satellite Land Use / Land Cover (LCLU) GeoTIFF data.
    Provides fast spatial sampling of land cover classification for any lat/lng point,
    enabling automatic urban/water exclusion and exact cropland recharge calculations.
    """
    def __init__(self, filepath: str = LCLU_FILE_PATH):
        self.filepath = filepath
        self.dataset = None
        self.load_raster()

    def load_raster(self) -> bool:
        if os.path.exists(self.filepath):
            try:
                self.dataset = rasterio.open(self.filepath)
                print(f"[LCLUProcessor] Successfully opened 10m LCLU raster: {self.filepath} ({self.dataset.width}x{self.dataset.height})")
                return True
            except Exception as err:
                print(f"[LCLUProcessor] Error opening LCLU raster: {err}")
                return False
        else:
            print(f"[LCLUProcessor] LCLU raster file not found: {self.filepath}")
            return False

    def get_info(self) -> Dict[str, Any]:
        if self.dataset is None:
            return {"error": "LCLU raster not loaded"}
        return {
            "filename": os.path.basename(self.filepath),
            "width": self.dataset.width,
            "height": self.dataset.height,
            "crs": str(self.dataset.crs),
            "resolution": "~10m (ESA WorldCover)",
            "bounds": {
                "min_lng": self.dataset.bounds.left,
                "max_lng": self.dataset.bounds.right,
                "min_lat": self.dataset.bounds.bottom,
                "max_lat": self.dataset.bounds.top
            }
        }

    def get_lclu_at_point(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Samples the 10m LCLU pixel value for a given (lat, lng) coordinate.
        Returns detailed land cover class information and hydrological curve number attributes.
        """
        if self.dataset is None:
            return {
                "class_code": 40,
                "name": DEFAULT_CLASS["name"],
                "type": DEFAULT_CLASS["type"],
                "is_farmland": True,
                "is_built_up": False,
                "is_water_body": False
            }

        try:
            py, px = self.dataset.index(lng, lat)
            if 0 <= py < self.dataset.height and 0 <= px < self.dataset.width:
                # Read 1x1 window
                window = rasterio.windows.Window(px, py, 1, 1)
                val_arr = self.dataset.read(1, window=window)
                class_code = int(val_arr[0, 0])
                
                class_info = LCLU_CLASSES.get(class_code, DEFAULT_CLASS)
                return {
                    "class_code": class_code,
                    "name": class_info["name"],
                    "type": class_info["type"],
                    "is_farmland": class_info["farmland"],
                    "is_built_up": class_info["is_built"],
                    "is_water_body": class_info["is_water"],
                    "curve_number_base": class_info["cn_hsg_b"]
                }
        except Exception:
            pass

        return {
            "class_code": 40,
            "name": DEFAULT_CLASS["name"],
            "type": DEFAULT_CLASS["type"],
            "is_farmland": True,
            "is_built_up": False,
            "is_water_body": False,
            "curve_number_base": 78
        }

# Singleton instance
lclu_processor = LCLUProcessor()
