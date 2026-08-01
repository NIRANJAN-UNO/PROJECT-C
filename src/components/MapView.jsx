import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { HIGH_RES_RIVER_MEANDER, TRIBUTARY_STREAMS, KOLLIDAM_CENTER } from '../data/kollidamData';
import { Anchor } from 'lucide-react';
import { calculateMCDAScore } from '../utils/hydrology';

// Custom Marker SVG Creator forming the vertical lollipop pin markers
const createMarkerIcon = (rank, isCustom = false) => {
  const color = isCustom ? '#f59e0b' : '#0f766e';
  const label = isCustom ? '★' : `${rank}`;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <!-- Vertical lollipop stem line pointing exactly to target -->
      <line x1="15" y1="15" x2="15" y2="38" stroke="${color}" stroke-width="2"/>
      <!-- Small anchor terminal dot -->
      <circle cx="15" cy="38" r="3.5" fill="${color}"/>
      <!-- Circular rank badge on top -->
      <circle cx="15" cy="15" r="11" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <text x="15" y="18.5" font-size="9" font-family="sans-serif" font-weight="extrabold" fill="#ffffff" text-anchor="middle">${label}</text>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [30, 42],
    iconAnchor: [15, 38], // Pin points exactly to the bottom terminal dot
    popupAnchor: [0, -38]
  });
};

function snapToRiverMeander(clickLatLng, realCoords) {
  const pool = realCoords && realCoords.length > 0 ? realCoords : HIGH_RES_RIVER_MEANDER;
  let minDistance = Infinity;
  let snappedPoint = pool[0];

  for (let i = 0; i < pool.length; i++) {
    const pt = pool[i];
    const dist = Math.pow(pt[0] - clickLatLng.lat, 2) + Math.pow(pt[1] - clickLatLng.lng, 2);
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
  weights
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  const [riverGeoJSON, setRiverGeoJSON] = useState(null);
  const [riverIntersections, setRiverIntersections] = useState([]);
  const [exclusionZones, setExclusionZones] = useState(null);
  const [showIntersections, setShowIntersections] = useState(true);
  const [showExclusionZones, setShowExclusionZones] = useState(true);
  const riverCoordPoolRef = useRef(HIGH_RES_RIVER_MEANDER);

  useEffect(() => {
    async function fetchRiverNetwork() {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/river/network?rivers_only=true');
        if (res.ok) {
          const data = await res.json();
          setRiverGeoJSON(data);
          
          // Robust coordinates parser handling LineString and MultiLineString geometries
          const coords = [];
          (data.features || []).forEach(f => {
            const geom = f.geometry;
            if (!geom) return;
            if (geom.type === 'LineString') {
              (geom.coordinates || []).forEach(c => {
                coords.push([c[1], c[0]]); // [lat, lng]
              });
            } else if (geom.type === 'MultiLineString') {
              (geom.coordinates || []).forEach(line => {
                (line || []).forEach(c => {
                  coords.push([c[1], c[0]]); // [lat, lng]
                });
              });
            }
          });
          if (coords.length > 0) {
            riverCoordPoolRef.current = coords;
          }
        }
      } catch (err) {
        console.warn('River GeoJSON offline, using local meander data');
      }
    }

    async function fetchIntersections() {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/river/intersections?top=10');
        if (res.ok) {
          const data = await res.json();
          setRiverIntersections(data.features || []);
        }
      } catch (err) {
        console.warn('River intersections offline');
      }
    }

    async function fetchExclusionZones() {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/exclusion-zones');
        if (res.ok) {
          const data = await res.json();
          setExclusionZones(data);
        }
      } catch (err) {
        console.warn('Exclusion zones offline');
      }
    }

    fetchRiverNetwork();
    fetchIntersections();
    fetchExclusionZones();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const bounds = L.latLngBounds(
      L.latLng(10.40, 78.30),
      L.latLng(11.80, 80.20)
    );

    const map = L.map(mapContainerRef.current, {
      center: KOLLIDAM_CENTER,
      zoom: 9.5,
      minZoom: 8.5,
      maxZoom: 16,
      maxBounds: bounds,
      maxBoundsViscosity: 0.9,
      zoomControl: false
    });

    L.control.zoom({ position: 'topleft' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &amp; CARTO',
      maxZoom: 18
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    map.on('click', (e) => {
      const snapped = snapToRiverMeander(e.latlng, riverCoordPoolRef.current);
      onPlaceCustomDam(snapped);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Redraw Layers
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

    // 1b. Water Body / Existing Dam Exclusion Zones
    if (showExclusionZones && exclusionZones && exclusionZones.features) {
      L.geoJSON(exclusionZones, {
        style: {
          color: '#F59E0B',
          fillColor: '#F59E0B',
          fillOpacity: 0.13,
          weight: 2,
          dashArray: '6,4'
        },
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.name || 'Exclusion Zone';
          const reason = feature.properties?.reason || '';
          layer.bindPopup(`
            <div style="font-size:11px; color:#E2E8F0; padding:4px; min-width:200px">
              <strong style="color:#F59E0B">⚠ ${name}</strong><br/>
              <span style="color:#94A3B8">${reason}</span><br/>
              <span style="color:#F87171; font-size:10px; margin-top:4px; display:block">
                ✗ No check dam sites placed inside this zone
              </span>
            </div>
          `);
          layer.bindTooltip(`⚠ ${name}`, { sticky: true, className: 'exclusion-tooltip' });
        }
      }).addTo(layerGroup);
    }

    // 1c. River network lines
    if (layers.riverPath) {
      if (riverGeoJSON && riverGeoJSON.features && riverGeoJSON.features.length > 0) {
        L.geoJSON(riverGeoJSON, {
          style: { color: '#0f766e', weight: 3.5, opacity: 0.8 }
        }).addTo(layerGroup);
      } else {
        L.polyline(HIGH_RES_RIVER_MEANDER, { color: '#0f766e', weight: 3.5, opacity: 0.8 }).addTo(layerGroup);

        TRIBUTARY_STREAMS.forEach(stream => {
          L.polyline(stream, { color: '#65a30d', weight: 2, opacity: 0.6, dashArray: '2,2' }).addTo(layerGroup);
        });
      }

      // Confluence nodes
      if (showIntersections && riverIntersections.length > 0) {
        riverIntersections.forEach((feat) => {
          const coords = feat.geometry?.coordinates;
          if (!coords) return;
          const lat = coords[1];
          const lng = coords[0];
          const segs = feat.properties?.segments_meeting || 3;

          L.circleMarker([lat, lng], {
            radius: 3.5 + segs,
            color: '#6366f1',
            fillColor: '#6366f1',
            fillOpacity: 0.8,
            weight: 1
          }).bindPopup(`
            <div style="font-size:11px; color:#334155; padding:2px; font-family:sans-serif;">
              <strong>⊕ Confluence Node</strong><br/>
              ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E
            </div>
          `).addTo(layerGroup);
        });
      }
    }

    // 2. Candidate check dams & recharge zones
    if (dams && dams.length > 0) {
      dams.forEach(dam => {
        if (layers.rechargeZones) {
          L.circle([dam.lat, dam.lng], {
            radius: dam.rechargeRadiusKm * 1000,
            color: '#0d9488',
            fillColor: '#0d9488',
            fillOpacity: 0.06,
            weight: 1,
            dashArray: '2,2'
          }).addTo(layerGroup);
        }

        if (layers.candidateSites) {
          const marker = L.marker([dam.lat, dam.lng], {
            icon: createMarkerIcon(dam.rank, false)
          });

          // Live score calculated dynamically in popup to stay in sync with sidebar
          const liveScore = calculateMCDAScore(dam, weights);

          const popupContent = `
            <div style="padding: 2px; min-width: 190px; font-family: sans-serif; color: #1e293b;">
              <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between;">
                <span>Site #${dam.rank}</span>
                <span style="color:#0f766e; font-weight:800;">Score ${liveScore}</span>
              </div>
              <table style="width: 100%; font-size: 10px; border-collapse: collapse; margin-bottom: 8px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3px 0; color: #64748b;">📐 Elevation (m)</td>
                  <td style="text-align: right; font-weight: bold; padding: 3px 0;">+${dam.cop30_elevation_m}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3px 0; color: #64748b;">◬ Slope (%)</td>
                  <td style="text-align: right; font-weight: bold; padding: 3px 0;">${dam.slope_deg}%</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3px 0; color: #64748b;">▤ Soil group</td>
                  <td style="text-align: right; font-weight: bold; padding: 3px 0;">${dam.hsg.split(' ')[0]}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 3px 0; color: #64748b;">💧 Storage (ML)</td>
                  <td style="text-align: right; font-weight: bold; padding: 3px 0;">${dam.recStorageML}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; color: #64748b;">⚡ Est. aquifer rise (m)</td>
                  <td style="text-align: right; font-weight: bold; color: #0d9488; padding: 3px 0;">+${dam.aquiferRiseM}</td>
                </tr>
              </table>
              <div style="font-size: 8px; color: #94a3b8; display:flex; justify-content:space-between; border-top:1px dashed #e2e8f0; pt:4px;">
                <span>Lat ${dam.lat.toFixed(4)}° N</span>
                <span>Long ${dam.lng.toFixed(4)}° E</span>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('click', () => onSelectDam(dam));
          marker.addTo(layerGroup);
        }
      });
    }

    // 3. Virtual Custom Dam Marker
    if (customDam) {
      const customMarker = L.marker([customDam.lat, customDam.lng], {
        icon: createMarkerIcon('★', true)
      });

      const popupContent = `
        <div style="padding: 2px; min-width: 180px; font-family: sans-serif; color: #1e293b;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            Virtual Check-Dam
          </div>
          <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
            <tr>
              <td style="padding: 3px 0; color: #64748b;">Elevation (m)</td>
              <td style="text-align: right; font-weight: bold; padding: 3px 0;">+${customDam.cop30_elevation_m}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0; color: #64748b;">Slope (%)</td>
              <td style="text-align: right; font-weight: bold; padding: 3px 0;">${customDam.slope_deg}%</td>
            </tr>
            <tr>
              <td style="padding: 3px 0; color: #64748b;">Storage (ML)</td>
              <td style="text-align: right; font-weight: bold; padding: 3px 0;">${customDam.recStorageML}</td>
            </tr>
          </table>
        </div>
      `;

      customMarker.bindPopup(popupContent).addTo(layerGroup);
    }
  }, [layers, dams, customDam, onSelectDam, riverGeoJSON, riverIntersections, showIntersections, exclusionZones, showExclusionZones, weights]);

  // Fly to selected dam (only for real candidate check dams, not for custom check dams to avoid jumps)
  useEffect(() => {
    if (selectedDam && selectedDam.id !== 'CD-CUSTOM' && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedDam.lat, selectedDam.lng], 11, {
        duration: 1.0
      });
    }
  }, [selectedDam]);

  return (
    <div className="relative w-full h-[calc(100vh-72px)] flex bg-slate-100">
      {/* Floating Legend */}
      <div className="absolute bottom-4 left-3 z-[1000] bg-white border border-slate-200 rounded-lg p-4 text-[10px] w-[180px] shadow-md text-slate-700 space-y-2">
        <div className="font-bold text-slate-800 uppercase tracking-wider text-[9px] border-b border-slate-100 pb-1">Legend</div>
        <div className="space-y-1.5 leading-tight">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0f766e] border border-white inline-block"></span>
            <span>Candidate site (rank)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488]/20 border border-[#0d9488] border-dashed inline-block"></span>
            <span>Recharge radius (~1 km)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-white inline-block"></span>
            <span>Virtual check-dam</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4.5 h-0.5 bg-[#0f766e] inline-block"></span>
            <span>River / Stream</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4.5 h-0.5 bg-[#65a30d] border-t border-dashed inline-block"></span>
            <span>Canal / Drain</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4.5 h-0.5 bg-slate-300 inline-block"></span>
            <span>Road</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-slate-100 border border-slate-300 inline-block rounded-sm"></span>
            <span>Settlement</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2.5 bg-[#f0fdf4] border border-[#dcfce7] inline-block"></span>
            <span>Farmland / Parcels</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4.5 h-0.5 border-t border-dotted border-slate-400 inline-block"></span>
            <span>Contours (10 m)</span>
          </div>
        </div>
      </div>

      {/* Instruction tooltip */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 border border-slate-200 px-2.5 py-1.5 text-[9px] flex items-center gap-1.5 text-slate-700 rounded-lg shadow-sm font-semibold">
        <Anchor className="w-3.5 h-3.5 text-amber-500" />
        <span>Click river to test a virtual check dam coordinate.</span>
      </div>

      {/* Native Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[calc(100vh-72px)]" />
    </div>
  );
}

