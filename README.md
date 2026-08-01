# Project C — Kollidam River Check Dam Site Finder

**Hackathon Project | Lower Kollidam River Basin, Tamil Nadu**

---

## What is this?

The Kollidam river loses a massive amount of freshwater every monsoon season. It just flows straight into the Bay of Bengal — doing nothing useful — while farms in the same district struggle with dry borewells 6 months later.

This project tries to fix that. It's a web-based tool that uses actual elevation data, real soil maps, and satellite rainfall records to find the best spots along the river to build check dams.

The idea is simple: trap the water where it makes the most sense — flat terrain, good soil, near farmland — and let it slowly recharge the groundwater beneath.

---

## The problem we are solving

Every November, the Kollidam swells up. In 2021, the discharge crossed 1,50,000 cusecs. Villages flooded. Crops were destroyed. And then — within weeks — the same river dried up and farmers were pumping from 300-foot borewells.

There is no infrastructure to hold that water. It comes, destroys things, and leaves. This project is an attempt to look at that 160 km river stretch (from Mukkombu near Trichy all the way to Pazhayar on the coast) and find where a check dam would actually help.

---

## How it works

The backend reads three types of real data:

- **Copernicus 30m DEM** — elevation and slope at every point along the river
- **Soil permeability raster** — how fast water soaks into the ground at each location
- **Daily rainfall TIF files (2015–2025)** — actual recorded rain data, not estimates

It then scores each possible dam location using a weighted formula that considers slope, soil type, nearby farmland area, and stream width. Two machine learning models (K-Means clustering and Random Forest) also run separately and compare their picks against the formula-based scoring.

The frontend shows all of this on a live Leaflet map, with charts, cross-section views, and a 2021 flood simulation.

---

## Project layout

```
project2/
├── backend/
│   ├── main.py                  # FastAPI routes
│   ├── dem_processor.py         # Elevation and slope from COP30 raster
│   ├── soil_processor.py        # Soil permeability lookup
│   ├── rainfall_processor.py    # Daily rainfall TIF reading
│   ├── hydrology_calculator.py  # SCS-CN runoff and groundwater math
│   ├── mcda_engine.py           # Weighted scoring and XAI attributions
│   ├── ml_engine.py             # K-Means and Random Forest predictions
│   ├── lclu_processor.py        # Satellite land cover / cropland data
│   └── river_processor.py       # OSM river network GeoJSON
└── src/
    ├── App.jsx                  # Main app
    ├── index.css                # Dark theme styling
    ├── components/              # Map, panels, charts, simulator
    └── utils/
        └── hydrology.js         # Frontend hydrology calculations
```

---

## Running it

```bash
# install packages
npm install

# start frontend
npm run dev

# start backend (in a separate terminal)
uvicorn backend.main:app --reload
```

Make sure the GeoTIFF files are placed at `E:/output_hh.tif`, `E:/soildata.tif`, and `E:/rainfall data/` before starting the backend.

---

## A note on originality

All the code here was written from scratch for this project. The hydrological formulas (SCS-CN, groundwater table rise) are standard civil engineering equations that anyone working in water resources would recognize — but the implementation, the weighting system, the way the rasters are queried, and the XAI attribution logic are all original work.

The DEM and rainfall data come from Copernicus and IMD respectively. The river network comes from OpenStreetMap. Everything else was built specifically for this.

---

## License

MIT — do what you want with it.
