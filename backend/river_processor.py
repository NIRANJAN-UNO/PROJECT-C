import json
import os
import numpy as np
from collections import defaultdict
from typing import List, Dict, Any

RIVER_GEOJSON_PATH = "E:/river network.geojson"

class RiverNetworkProcessor:
    """
    Kollidam River Network GeoJSON Processor
    
    Reads the real OSM river network (502 features: 184 river segments + 318 canals)
    for vector layer rendering and tributary intersection AI site selection.
    """
    def __init__(self, filepath: str = RIVER_GEOJSON_PATH):
        self.filepath = filepath
        self.geojson = None
        self.features = []
        self.intersections = []
        self.load()

    def load(self):
        if not os.path.exists(self.filepath):
            print(f"[RiverNetworkProcessor] File not found: {self.filepath}")
            return
        try:
            with open(self.filepath, encoding='utf-8') as f:
                self.geojson = json.load(f)
            self.features = self.geojson.get('features', [])
            self.intersections = self._compute_intersections()
            print(f"[RiverNetworkProcessor] Loaded {len(self.features)} river/canal segments, {len(self.intersections)} tributary intersections")
        except Exception as e:
            print(f"[RiverNetworkProcessor] Error loading GeoJSON: {e}")

    def _compute_intersections(self) -> List[Dict[str, Any]]:
        """
        Detects tributary intersection nodes — points where 3+ segments meet.
        These are geomorphologically prime check-dam locations due to concentrated runoff.
        """
        endpoint_map = defaultdict(list)

        for i, feat in enumerate(self.features):
            geom = feat.get('geometry', {})
            if geom.get('type') == 'LineString':
                coords = geom.get('coordinates', [])
                if len(coords) >= 2:
                    start = (round(coords[0][0], 4), round(coords[0][1], 4))
                    end   = (round(coords[-1][0], 4), round(coords[-1][1], 4))
                    endpoint_map[start].append(i)
                    endpoint_map[end].append(i)

        intersections = []
        for (lng, lat), seg_indices in endpoint_map.items():
            if len(seg_indices) >= 3:
                seg_types = set()
                for idx in seg_indices:
                    wtype = self.features[idx].get('properties', {}).get('waterway', 'unknown')
                    seg_types.add(wtype)
                intersections.append({
                    "lat": lat,
                    "lng": lng,
                    "segments_meeting": len(seg_indices),
                    "waterway_types": list(seg_types),
                    "priority": len(seg_indices)  # More merging segments = higher runoff concentration
                })

        # Sort by highest convergence priority (most streams merging)
        intersections.sort(key=lambda x: x["priority"], reverse=True)
        return intersections

    def get_info(self) -> Dict[str, Any]:
        river_count = sum(1 for f in self.features if f.get('properties', {}).get('waterway') == 'river')
        canal_count = sum(1 for f in self.features if f.get('properties', {}).get('waterway') == 'canal')
        return {
            "filename": os.path.basename(self.filepath),
            "total_segments": len(self.features),
            "river_segments": river_count,
            "canal_segments": canal_count,
            "tributary_intersections": len(self.intersections),
            "top_convergence_node": self.intersections[0] if self.intersections else None
        }

    def get_geojson(self) -> Dict[str, Any]:
        """Returns the full GeoJSON FeatureCollection for Leaflet rendering"""
        return self.geojson or {"type": "FeatureCollection", "features": []}

    def get_river_only_geojson(self) -> Dict[str, Any]:
        """Returns only the 184 main river (non-canal) segments"""
        river_feats = [f for f in self.features if f.get('properties', {}).get('waterway') == 'river']
        return {"type": "FeatureCollection", "features": river_feats}

    def get_intersections(self) -> List[Dict[str, Any]]:
        """Returns all tributary intersection nodes sorted by stream convergence priority"""
        return self.intersections

    def get_top_n_intersections(self, n: int = 5) -> List[Dict[str, Any]]:
        """Returns the top N highest-priority intersection nodes"""
        return self.intersections[:n]

    def get_meander_coords_from_geojson(self) -> List[List[float]]:
        """
        Extracts ordered [lat, lng] waypoints from main river segments only.
        Used to feed into ML engine instead of hardcoded coordinates.
        """
        river_feats = [f for f in self.features if f.get('properties', {}).get('waterway') == 'river']
        all_coords = []
        for feat in river_feats:
            geom = feat.get('geometry', {})
            if geom.get('type') == 'LineString':
                for coord in geom.get('coordinates', []):
                    all_coords.append([coord[1], coord[0]])  # [lat, lng]

        # Deduplicate and sort by longitude (west to east along river)
        seen = set()
        unique = []
        for pt in all_coords:
            key = (round(pt[0], 4), round(pt[1], 4))
            if key not in seen:
                seen.add(key)
                unique.append(pt)

        unique.sort(key=lambda c: c[1])  # Sort by longitude, west → east
        return unique


# Singleton
river_processor = RiverNetworkProcessor()
