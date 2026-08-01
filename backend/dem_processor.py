import os
import math
import numpy as np
import rasterio
from typing import Dict, Any, List, Tuple

# File location for Digital Elevation Model (DEM) raster file
DEM_FILE_PATH = "E:/output_hh.tif"

# ─── Known Water Body Exclusion Zones ────────────────────────────────────────
# These are existing lakes, tanks, and reservoirs along the Kollidam basin.
# The algorithm will NOT place candidate check-dam sites inside these areas
# since the storage capacity already exists there.
WATER_BODY_EXCLUSION_ZONES = [
    {
        "name": "Veeranam Lake",
        "lat_min": 11.26, "lat_max": 11.36,
        "lng_min": 79.43, "lng_max": 79.57,
        "reason": "Existing large irrigation tank — no check dam needed"
    },
    {
        "name": "Kollidam Barrage / Mukkombu Anicut Backwater",
        "lat_min": 10.85, "lat_max": 10.92,
        "lng_min": 78.58, "lng_max": 78.65,
        "reason": "Existing anicut regulator infrastructure already present"
    },
    {
        "name": "Kallanai (Grand Anicut) Backwater Pool",
        "lat_min": 10.81, "lat_max": 10.86,
        "lng_min": 78.79, "lng_max": 78.86,
        "reason": "Historic Grand Anicut dam — existing structure, no new dam needed"
    },
    {
        "name": "Lower Anicut Backwater Zone",
        "lat_min": 11.10, "lat_max": 11.18,
        "lng_min": 79.41, "lng_max": 79.50,
        "reason": "Existing Lower Anicut weir and its backwater pool"
    },
    {
        "name": "Pichavaram Coastal Wetlands",
        "lat_min": 11.38, "lat_max": 11.52,
        "lng_min": 79.75, "lng_max": 79.90,
        "reason": "Protected mangrove wetland zone — construction prohibited"
    }
]

class DEMProcessor:
    """
    Reads ground elevation data (30m resolution), calculates terrain slope 
    and aspect angles, and finds potential locations for dams.
    """
    def __init__(self, filepath: str = DEM_FILE_PATH):
        self.filepath = filepath
        self.dataset = None
        self.array = None
        self.cell_size_m = 30.0  # Cell size of each grid square in meters
        self.load_raster()

    def load_raster(self) -> bool:
        """Opens the elevation file and loads terrain values into memory."""
        if os.path.exists(self.filepath):
            try:
                self.dataset = rasterio.open(self.filepath)
                self.array = self.dataset.read(1)
                print(f"[DEMProcessor] Elevation data loaded successfully: {self.filepath} ({self.dataset.width}x{self.dataset.height})")
                return True
            except Exception as load_err:
                print(f"[DEMProcessor] Could not read elevation file: {load_err}")
                return False
        else:
            print(f"[DEMProcessor] Elevation file not found at: {self.filepath}")
            return False

    def get_info(self) -> Dict[str, Any]:
        """Returns height statistics and summary information for the elevation map."""
        if self.dataset is None:
            return {"error": "DEM raster not loaded"}
        
        map_bounds = self.dataset.bounds
        valid_heights = self.array[~np.isnan(self.array) & (self.array > -9000)]

        return {
            "filename": os.path.basename(self.filepath),
            "width": self.dataset.width,
            "height": self.dataset.height,
            "crs": str(self.dataset.crs),
            "bounds": {
                "min_lng": map_bounds.left,
                "max_lng": map_bounds.right,
                "min_lat": map_bounds.bottom,
                "max_lat": map_bounds.top
            },
            "pixel_scale_deg": self.dataset.transform.a,
            "spatial_resolution": "~30m (1 arc-second Copernicus DEM)",
            "min_elevation_m": round(float(np.min(valid_heights)), 2),
            "max_elevation_m": round(float(np.max(valid_heights)), 2),
            "mean_elevation_m": round(float(np.mean(valid_heights)), 2),
            "std_elevation_m": round(float(np.std(valid_heights)), 2)
        }

    def get_elevation_at_point(self, lat: float, lng: float) -> float:
        """Returns the ground height in meters at a given latitude and longitude coordinate."""
        if self.dataset is None:
            return 45.0
        
        try:
            row_idx, col_idx = self.dataset.index(lng, lat)
            if 0 <= row_idx < self.dataset.height and 0 <= col_idx < self.dataset.width:
                height_val = float(self.array[row_idx, col_idx])
                return round(height_val, 2) if not np.isnan(height_val) and height_val > -9000 else 0.0
            return 0.0
        except Exception:
            return 45.0

    def calculate_slope_and_aspect(self, lat: float, lng: float) -> Tuple[float, float]:
        """
        Calculates how steep the land is (slope in degrees) and 
        which direction the slope faces (aspect in degrees).
        """
        if self.dataset is None:
            return (0.8, 180.0)
        
        try:
            row_idx, col_idx = self.dataset.index(lng, lat)
            if 1 <= row_idx < self.dataset.height - 1 and 1 <= col_idx < self.dataset.width - 1:
                # Get 3x3 grid of surrounding elevation values
                neighborhood_grid = self.array[row_idx-1:row_idx+2, col_idx-1:col_idx+2]
                
                # Calculate height changes along horizontal (X) and vertical (Y) axes
                change_in_x = ((neighborhood_grid[0, 2] + 2*neighborhood_grid[1, 2] + neighborhood_grid[2, 2]) - 
                               (neighborhood_grid[0, 0] + 2*neighborhood_grid[1, 0] + neighborhood_grid[2, 0])) / (8 * self.cell_size_m)
                
                change_in_y = ((neighborhood_grid[2, 0] + 2*neighborhood_grid[2, 1] + neighborhood_grid[2, 2]) - 
                               (neighborhood_grid[0, 0] + 2*neighborhood_grid[0, 1] + neighborhood_grid[0, 2])) / (8 * self.cell_size_m)
                
                # Compute steepness angle in degrees
                slope_radians = math.atan(math.sqrt(change_in_x**2 + change_in_y**2))
                slope_degrees = round(math.degrees(slope_radians), 2)
                
                # Compute direction angle facing in degrees
                aspect_radians = math.atan2(change_in_y, -change_in_x)
                aspect_degrees = math.degrees(aspect_radians)
                if aspect_degrees < 0:
                    aspect_degrees += 360.0
                
                return (slope_degrees, round(aspect_degrees, 1))
            return (0.8, 180.0)
        except Exception:
            return (0.8, 180.0)

    def is_inside_exclusion_zone(self, lat: float, lng: float) -> dict:
        """
        Returns the exclusion zone if a coordinate falls inside a known water body / existing dam.
        Returns None if the coordinate is safe to place a check dam.
        """
        for zone in WATER_BODY_EXCLUSION_ZONES:
            if (zone["lat_min"] <= lat <= zone["lat_max"] and
                    zone["lng_min"] <= lng <= zone["lng_max"]):
                return zone
        return None

    def extract_dynamic_candidate_sites(
        self, 
        meander_coords: List[List[float]], 
        num_sites: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Scans river coordinates using elevation data to find flat, 
        suitable places for building water structures.
        Automatically excludes any point inside a known lake, tank, or existing dam.
        """
        if not meander_coords:
            return []

        collected_points = []
        excluded_count = 0
        for point_idx, point_coords in enumerate(meander_coords):
            lat, lng = point_coords[0], point_coords[1]

            # Skip points inside known water body exclusion zones
            exclusion = self.is_inside_exclusion_zone(lat, lng)
            if exclusion:
                excluded_count += 1
                continue

            height_m = self.get_elevation_at_point(lat, lng)
            slope_deg, aspect_deg = self.calculate_slope_and_aspect(lat, lng)
            
            collected_points.append({
                "index": point_idx,
                "lat": lat,
                "lng": lng,
                "elev": height_m,
                "slope": slope_deg,
                "aspect": aspect_deg
            })

        if excluded_count > 0:
            print(f"[DEMProcessor] Excluded {excluded_count} coords inside water body zones")

        # Sort points to prioritize gentle slopes and lower heights
        collected_points.sort(key=lambda item: (item["slope"], item["elev"]))
        
        # Pick well-spaced locations along the river
        selected_locations = []
        minimum_spacing = max(5, len(meander_coords) // (num_sites + 1))
        
        for location in collected_points:
            if len(selected_locations) >= num_sites:
                break
            if all(abs(location["index"] - picked["index"]) >= minimum_spacing for picked in selected_locations):
                selected_locations.append(location)

        # Re-sort into river flow order (from start to end)
        selected_locations.sort(key=lambda item: item["index"])
        return selected_locations

# Shared instance for use across the application
dem_processor = DEMProcessor()

