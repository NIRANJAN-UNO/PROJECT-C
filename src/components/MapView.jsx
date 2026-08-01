import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RIVER_PATH, HIGH_RES_RIVER_MEANDER, TRIBUTARY_STREAMS, KOLLIDAM_CENTER, KOLLIDAM_BOUNDS } from '../data/kollidamData';
import { Layers, Sparkles, Anchor } from 'lucide-react';

// Custom Marker SVG Creator
const createMarkerIcon = (rank, isCustom = false) => {
  const color = isCustom ? '#F59E0B' : '#00F2FE';
  const label = isCustom ? 'Custom' : `#${rank}`;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="14" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2"/>
      <circle cx="18" cy="18" r="8" fill="${color}"/>
      <text x="18" y="21" font-size="10" font-weight="bold" fill="#000" text-anchor="middle">${label}</text>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

// Helper: Snap any map click coordinates to the nearest point on the river meander line
function snapToRiverMeander(clickLatLng) {
  let minDistance = Infinity;
  let snappedPoint = HIGH_RES_RIVER_MEANDER[0];

  const clickLat = clickLatLng.lat;
  const clickLng = clickLatLng.lng;

  for (let i = 0; i < HIGH_RES_RIVER_MEANDER.length; i++) {
    const pt = HIGH_RES_RIVER_MEANDER[i];
    const dist = Math.pow(pt[0] - clickLat, 2) + Math.pow(pt[1] - clickLng, 2);
    if (dist < minDistance) {
      minDistance = dist;
      snappedPoint = pt;
    }
  }

  return { lat: snappedPoint[0], lng: snappedPoint[1] };
}

export default function MapView({ 
  dams = [],
  selectedDam, 
  onSelectDam, 
  customDam, 
  onPlaceCustomDam,
  layers,
  setLayers
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const bounds = L.latLngBounds(
      L.latLng(10.60, 78.40),
      L.latLng(11.60, 80.10)
    );

    const map = L.map(mapContainerRef.current, {
      center: KOLLIDAM_CENTER,
      zoom: 9.5,
      minZoom: 8.5,
      maxZoom: 16,
      maxBounds: bounds,
      maxBoundsViscosity: 0.9,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO &amp; OpenStreetMap',
      maxZoom: 18
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    map.on('click', (e) => {
      const snappedLatLng = snapToRiverMeander(e.latlng);
      onPlaceCustomDam(snappedLatLng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Dynamic Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Flood Inundation Polygon Layer
    if (layers.floodZone) {
      const floodPolygon = [
        [10.870, 78.650], [10.860, 78.780], [10.825, 78.880],
        [10.900, 79.100], [11.050, 79.320], [11.200, 79.660],
        [11.340, 79.800], [11.370, 79.830], [11.310, 79.790],
        [11.180, 79.640], [11.020, 79.300], [10.880, 79.020],
        [10.810, 78.800], [10.840, 78.630]
      ];
      L.polygon(floodPolygon, {
        color: '#EF4444',
        fillColor: '#EF4444',
        fillOpacity: 0.18,
        weight: 1.5,
        dashArray: '4,4'
      }).addTo(layerGroup);
    }

    // 2. High-Resolution River Channel & Tributary Network
    if (layers.riverPath) {
      L.polyline(HIGH_RES_RIVER_MEANDER, { color: '#3B82F6', weight: 14, opacity: 0.25, lineCap: 'round', lineJoin: 'round' }).addTo(layerGroup);
      L.polyline(HIGH_RES_RIVER_MEANDER, { color: '#00F2FE', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(layerGroup);

      TRIBUTARY_STREAMS.forEach(stream => {
        L.polyline(stream, { color: '#38BDF8', weight: 2.5, opacity: 0.7, dashArray: '4,4' }).addTo(layerGroup);
      });
    }

    // 3. Dynamic Model Predicted Check Dams & Recharge Cones
    if (dams && dams.length > 0) {
      dams.forEach(dam => {
        // Recharge Cone
        if (layers.rechargeZones) {
          L.circle([dam.lat, dam.lng], {
            radius: dam.rechargeRadiusKm * 1000,
            color: '#10B981',
            fillColor: '#10B981',
            fillOpacity: 0.12,
            weight: 1,
            dashArray: '3,3'
          }).addTo(layerGroup);
        }

        // Candidate Marker
        if (layers.candidateSites) {
          const marker = L.marker([dam.lat, dam.lng], {
            icon: createMarkerIcon(dam.rank, false)
          });

          const popupContent = `
            <div style="padding: 4px; min-width: 220px;">
              <div style="font-weight: 800; color: #00F2FE; font-size: 12px; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
                ${dam.id}: ${dam.name}
              </div>
              <div style="font-size: 11px; color: #CBD5E1; line-height: 1.6;">
                <p><strong>COP30 DEM Elevation:</strong> ${dam.cop30_elevation_m !== undefined ? dam.cop30_elevation_m : '45.0'} meters MSL</p>
                <p><strong>Terrain Slope:</strong> ${dam.slope_deg !== undefined ? dam.slope_deg : '0.8'}°</p>
                <p><strong>Coordinates:</strong> ${dam.lat.toFixed(4)}°N, ${dam.lng.toFixed(4)}°E</p>
                <p><strong>Structure Type:</strong> ${dam.type}</p>
                <p><strong>Storage Capacity:</strong> ${dam.recStorageML} Million Liters</p>
                <p><strong>Water Table Gain:</strong> +${dam.aquiferRiseM} meters</p>
                <p><strong>Farmland Benefited:</strong> ${dam.farmlandAcres ? dam.farmlandAcres.toLocaleString() : 0} Acres (${dam.farmlandHa} Ha)</p>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('click', () => onSelectDam(dam));
          marker.addTo(layerGroup);
        }
      });
    }

    // 4. Virtual Custom Dam Marker with Real-Time COP30 DEM Telemetry
    if (customDam) {
      const customMarker = L.marker([customDam.lat, customDam.lng], {
        icon: createMarkerIcon('?', true)
      });

      const popupContent = `
        <div style="padding: 4px; min-width: 220px;">
          <div style="font-weight: 800; color: #F59E0B; font-size: 12px; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
            ⚡ Virtual Check Dam (Live COP-DEM 30m Query)
          </div>
          <div style="font-size: 11px; color: #CBD5E1; line-height: 1.6;">
            <p><strong>COP30 DEM Elevation:</strong> <span style="color: #00F2FE; font-weight: bold;">${customDam.cop30_elevation_m !== undefined ? customDam.cop30_elevation_m : '45.0'} m MSL</span></p>
            <p><strong>Terrain Slope:</strong> <span style="color: #10B981; font-weight: bold;">${customDam.slope_deg !== undefined ? customDam.slope_deg : '0.8'}°</span></p>
            <p><strong>GPS Coordinates:</strong> ${customDam.lat.toFixed(4)}°N, ${customDam.lng.toFixed(4)}°E</p>
            <p><strong>Est Storage:</strong> ${customDam.recStorageML} Million Liters</p>
            <p><strong>Predicted Gain:</strong> +${customDam.aquiferRiseM} meters</p>
            <p><strong>Cropland Recharged:</strong> ${customDam.farmlandAcres ? customDam.farmlandAcres.toLocaleString() : 0} Acres (${customDam.farmlandHa} Ha)</p>
          </div>
        </div>
      `;

      customMarker.bindPopup(popupContent).addTo(layerGroup);
    }
  }, [layers, dams, customDam, onSelectDam]);

  // Fly to selected dam
  useEffect(() => {
    if (selectedDam && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedDam.lat, selectedDam.lng], 11, {
        duration: 1.2
      });
    }
  }, [selectedDam]);

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-blue-900/40 glass-panel">
      {/* Map Control Floating Toolbar */}
      <div className="absolute top-4 right-4 z-[1000] glass-panel p-3 text-xs space-y-2 max-w-[220px]">
        <div className="flex items-center gap-1.5 font-bold text-cyan-400 border-b border-slate-700/60 pb-1">
          <Layers className="w-4 h-4" />
          <span>Spatial Layer Toggles</span>
        </div>

        <label className="flex items-center justify-between gap-2 cursor-pointer hover:text-cyan-300">
          <span>River Topology & Meanders</span>
          <input 
            type="checkbox" 
            checked={layers.riverPath} 
            onChange={(e) => setLayers({...layers, riverPath: e.target.checked})}
            className="accent-cyan-400"
          />
        </label>

        <label className="flex items-center justify-between gap-2 cursor-pointer hover:text-cyan-300">
          <span>AI Candidate Sites</span>
          <input 
            type="checkbox" 
            checked={layers.candidateSites} 
            onChange={(e) => setLayers({...layers, candidateSites: e.target.checked})}
            className="accent-cyan-400"
          />
        </label>

        <label className="flex items-center justify-between gap-2 cursor-pointer hover:text-cyan-300">
          <span>Recharge Cones</span>
          <input 
            type="checkbox" 
            checked={layers.rechargeZones} 
            onChange={(e) => setLayers({...layers, rechargeZones: e.target.checked})}
            className="accent-cyan-400"
          />
        </label>

        <label className="flex items-center justify-between gap-2 cursor-pointer hover:text-rose-300">
          <span>Flood Inundation Zone</span>
          <input 
            type="checkbox" 
            checked={layers.floodZone} 
            onChange={(e) => setLayers({...layers, floodZone: e.target.checked})}
            className="accent-rose-400"
          />
        </label>
      </div>

      {/* Map Click Instructions Banner */}
      <div className="absolute bottom-4 left-4 z-[1000] glass-panel px-3 py-2 text-[11px] flex items-center gap-2 text-cyan-300 border border-cyan-500/30">
        <Anchor className="w-4 h-4 text-amber-400" />
        <span>Click near river to drop a virtual dam — <strong>Queries output_hh.tif GeoTIFF live</strong>.</span>
      </div>

      {/* Native Leaflet Container DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[540px]" />
    </div>
  );
}
