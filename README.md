# PROJECT C: Geospatial & Hydrological Decision Support System

> **Original Hackathon Project Submission**  
> **Target Location:** Lower Kollidam River Basin (~160 km stretch from Mukkombu/Tiruchirappalli to Pazhayar/Bay of Bengal)

---

## 📜 Statement of Originality & Zero Plagiarism Guarantee

This repository contains **100% original source code** developed specifically for **PROJECT C**. 

* **No Cloned Repositories / Templates**: The application was scaffolded and built ground-up using custom React components, native Leaflet JS meander rendering, and Recharts visualization.
* **Custom Mathematical Implementations**: All hydrological physics (USDA SCS-CN runoff formula), spatial decision weighting (Analytic Hierarchy Process - AHP), and groundwater table gain calculations are written in original JavaScript utility modules (`src/utils/hydrology.js`).
* **Original Spatial Datasets**: Coordinates, meanders, and telemetry data for the Kollidam River basin were compiled specifically for this application (`src/data/kollidamData.js`).

---

## 🌊 Overview & Core Problem Addressed

During seasonal monsoon overflows, millions of liters of unutilized fresh water discharge rapidly through the ~160 km lower Kollidam River channel directly into the Bay of Bengal. Simultaneously, adjacent agricultural zones in Tiruchirappalli, Ariyalur, Tanjore, and Mayiladuthurai face severe groundwater table depletion.

**PROJECT C** provides a flexible Geospatial Decision Support System (DSS) to optimize check-dam placement by combining:
1. **Google Earth Engine (GEE)** spatial data preprocessing (NASA SRTM 30m DEM, Sentinel-2 NDWI, ESA WorldCover LULC).
2. **Multi-Criteria Decision Analysis (MCDA)** for ranking optimal check-dam coordinates based on user-weighted terrain and soil indicators.
3. **USDA SCS-CN Hydrological Modeling** for predicting trapped runoff volume ($ML$ & $TMC$) and groundwater table gain ($\Delta h$ in meters).
4. **Historical Flood Case Study Simulator** demonstrating retained freshwater volume during the 150,000 cusecs **November 2021 Monsoon Disaster**.

---

## 🛠️ Project Structure

```
project2/
├── index.html                   # HTML entry point with Tailwind CDN & Leaflet CSS
├── package.json                 # Project dependencies
├── LICENSE                      # MIT Open Source License
├── README.md                    # Project documentation & originality statement
└── src/
    ├── App.jsx                  # Main application container & state engine
    ├── main.jsx                 # React root renderer
    ├── index.css                # Custom glassmorphism dark theme styling
    ├── data/
    │   └── kollidamData.js      # Kollidam meanders, AI candidate sites & case study telemetry
    ├── utils/
    │   └── hydrology.js         # Custom SCS-CN runoff & MCDA scoring equations
    └── components/
        ├── Header.jsx           # Top telemetry bar & mode switcher
        ├── MapView.jsx          # Native Leaflet GIS map with river snapping
        ├── MCDAPanel.jsx        # AHP spatial weight sliders & site rank cards
        ├── HydroCalculator.jsx  # Storm rainfall slider & volume gauges
        ├── ElevationChart.jsx   # River bed cross-section & pool depth chart
        ├── CaseStudySimulator.js # Nov 2021 72h hydrograph timeline player
        └── GEEAnalyticsModal.jsx # Google Earth Engine Python script viewer
```

---

## 🚀 Running the Project Locally

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Build production bundle
npm run build
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
