# ClimateScope — Climate Hazard Trend Analyzer

ClimateScope is a full-stack web application for exploring historical daily maximum temperatures and detecting heatwave-like events for a selected location. Users can search for a city or select coordinates on an interactive map, analyze a chosen date range against a historical baseline, explore trends, and export the results.

> **Important:** Heatwave events in this application use a project-specific analytical definition. They are not official heatwave declarations or warnings from the India Meteorological Department (IMD).

## Live application

- **Frontend dashboard:** https://climate-hazard-trend-analyzer-daol.vercel.app/
- **Backend API:** https://climate-hazard-trend-analyzer-lyart.vercel.app/
- **API health check:** https://climate-hazard-trend-analyzer-lyart.vercel.app/health
- **Interactive API documentation:** https://climate-hazard-trend-analyzer-lyart.vercel.app/docs
- **GitHub repository:** https://github.com/sushantk08/climate-hazard-trend-analyzer

## Features

- Search for cities and coordinates through the Open-Meteo geocoding service.
- Select a point on an interactive Leaflet map using OpenStreetMap tiles; the selected latitude and longitude feed into the analysis form.
- Choose an analysis period and a historical baseline period.
- Calculate a 95th-percentile threshold from daily maximum temperatures in the selected baseline period.
- Detect events lasting at least three consecutive calendar days with daily maximum temperatures strictly above the threshold.
- Summarize event count, total heatwave days, average event duration, longest event, and baseline threshold.
- Visualize yearly event counts and daily maximum temperature history.
- Calculate yearly linear-regression trends for event frequency and heatwave days.
- Calculate Mann–Kendall trend statistics for both yearly event frequency and yearly heatwave days, including the direction, S statistic, variance, z-score, p-value, and whether the result is significant at the selected alpha level (default 0.05).
- Show average, hottest, and coolest daily maximum temperatures for the analysis period.
- Export detected heatwave events and daily temperature history to CSV.
- Generate a PDF report with analysis settings, detection definition, summary insights, trend results, yearly values, and the detected-events table.
- Cache historical weather responses in MongoDB to reduce repeated requests for the same coordinates and date range.
- Validate key inputs and apply per-client request rate limits to the main API endpoints.

## Technology stack

- **Frontend:** React, Vite, JavaScript, Chart.js, `react-chartjs-2`
- **Interactive map:** Leaflet, React Leaflet, OpenStreetMap tiles
- **PDF export:** `jspdf`, `jspdf-autotable`
- **Backend:** Python, FastAPI, Uvicorn, HTTPX, SlowAPI
- **Database/cache:** MongoDB Atlas with PyMongo
- **Weather data and geocoding:** Open-Meteo Historical Weather API and Open-Meteo Geocoding API
- **Testing:** pytest, ESLint, Vite production build
- **Deployment:** Vercel (separate frontend and backend projects)

## How it works

1. The user searches for a city or clicks a point on the map. The selected coordinates are placed in the analysis form.
2. The user chooses an analysis period and baseline period. The React frontend calls the FastAPI backend.
3. The backend checks MongoDB for cached weather records using a key based on latitude, longitude, and the requested date range.
4. On a cache miss, the backend requests daily maximum temperature data from Open-Meteo, normalizes the response, and stores it in MongoDB. On a cache hit, it reuses saved records.
5. The backend calculates the baseline percentile, detects qualifying heatwave events, aggregates yearly event counts and heatwave days, and calculates linear-regression and Mann–Kendall trend results.
6. The dashboard presents summary cards, charts, temperature statistics, and a detected-events table. Users can export temperature history or events to CSV, or download a PDF report of the analysis.

## Heatwave definition and assumptions

For this application, a detected heatwave event is defined as:

> Three or more consecutive calendar days with daily maximum temperatures strictly above the 95th percentile of daily maximum temperatures in the selected baseline period.

Implementation details and limitations:

- The threshold is a **pooled percentile** calculated from available daily maximum temperatures across the full baseline period. It is not calculated separately for each day of the year and does not adjust the threshold for seasonal differences.
- This is a project-specific analytical definition, not an official IMD heatwave-declaration method. Results should not be presented as official warnings or declarations.
- The application uses historical weather data provided by Open-Meteo. Values may differ from observations recorded at an individual local weather station.
- Missing or invalid temperatures do not count as qualifying hot days and break an event. Gaps in calendar dates also break a streak.
- Each event is assigned to the calendar year in which it starts. Its full duration is attributed to that year in the yearly heatwave-days series.
- The first and last years can be partial years if the selected analysis range does not cover full calendar years; interpret trend results with this in mind.

## Trend analysis

### Linear regression

The backend fits a simple linear trend to yearly heatwave event counts and yearly heatwave-day totals. The API returns the direction and slope per year. A slope describes the fitted rate of change; it does not by itself show that a trend is statistically significant.

### Mann–Kendall test

The backend also runs the Mann–Kendall test on yearly event counts and yearly heatwave days. Results include:

- `direction`: increasing, decreasing, or stable based on the Mann–Kendall S statistic.
- `s`: the Mann–Kendall statistic.
- `variance_s` and `z_score`.
- `p_value` and `alpha` (default `0.05`).
- `significant`: whether the calculated p-value is below alpha.

The current implementation uses tie correction and a continuity-corrected normal approximation for the p-value. Use caution when only a few yearly observations are available: the approximation may be less reliable for small samples, and yearly climate observations may also have temporal dependence. A result marked not statistically significant does not prove that no trend exists. For fewer than two yearly observations, the API returns `insufficient_data` rather than running the test.

## Example output

For Pune with an analysis period of 1 January 2019 to 31 December 2024 and a baseline period of 1 January 1991 to 31 December 2020, the deployed dashboard/API returned a threshold of **38.1 °C**, **17 detected events**, and **120 heatwave days**. For that six-year series, the linear-regression slopes were approximately **+0.1429 events/year** and **+4.1714 heatwave days/year**. The API's Mann–Kendall results were not statistically significant at the 5% level for either series. These describe the selected source data and this project's definition; they are not independent verification of official heatwave records.

## Project structure

```text
climate_hazard_trend_analyzer/
├── backend/
│   ├── app/
│   │   ├── database.py
│   │   ├── heatwave.py
│   │   ├── main.py
│   │   ├── trends.py
│   │   └── weather_cache.py
│   ├── tests/
│   │   ├── test_heatwave.py
│   │   └── test_trends.py
│   ├── index.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HeatwaveEvents.jsx
│   │   │   ├── HeatwaveTrendChart.jsx
│   │   │   ├── LocationMap.jsx
│   │   │   └── TemperatureHistoryChart.jsx
│   │   ├── utils/
│   │   │   ├── exportCsv.js
│   │   │   └── exportPdf.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
└── README.md
```

## Prerequisites

- Python 3.12 or a compatible Python version supported by the dependencies.
- Node.js and npm.
- A reachable MongoDB deployment, such as MongoDB Atlas.
- Internet access to reach MongoDB and Open-Meteo services. The interactive map also loads OpenStreetMap tiles over the internet.

## Run locally

### 1. Configure the backend

From the repository root in PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` with your MongoDB connection details:

```dotenv
MONGODB_URI="mongodb+srv://<username>:<password>@<your-cluster-host>/"
MONGODB_DATABASE="climate_hazard_db"
```

Replace the placeholders with your own values. Do not commit `.env` or publish credentials. Keep `.env.example` limited to placeholder values.

Start the backend from the `backend` directory:

```powershell
python -m uvicorn app.main:app --reload
```

The local API is available at `http://127.0.0.1:8000`. Interactive API documentation is at `http://127.0.0.1:8000/docs`, and the health endpoint is at `http://127.0.0.1:8000/health`.

### 2. Configure and start the frontend

Open a second terminal from the repository root:

```powershell
cd frontend
npm install
```

The frontend reads `VITE_API_BASE_URL` if set and otherwise falls back to `http://127.0.0.1:8000`. You can create `frontend/.env.local` with:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start Vite:

```powershell
npm run dev
```

Vite normally serves the application at `http://localhost:5173`. Restart the development server after changing frontend environment variables.

### 3. Run an analysis

1. Ensure MongoDB is reachable and the backend is running.
2. Open `http://localhost:5173`.
3. Search for a city and select a result, or click the map to set coordinates.
4. Choose the analysis and baseline date ranges.
5. Click **Run Heatwave Analysis**.
6. Review the charts, event table, regression and Mann–Kendall results. Use the CSV buttons or **Download PDF Report** to export the results.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Basic API welcome response |
| `GET` | `/health` | Check whether the API responds |
| `GET` | `/locations/search?name=Pune&count=5` | Search for locations and return coordinates |
| `GET` | `/weather/history?latitude=18.5204&longitude=73.8567&start_date=2024-01-01&end_date=2024-01-07` | Return daily historical maximum temperatures |
| `GET` | `/analysis/heatwaves?latitude=18.5204&longitude=73.8567&start_date=2019-01-01&end_date=2024-12-31&baseline_start_date=1991-01-01&baseline_end_date=2020-12-31` | Return detected events, summary metrics, yearly values, regression trends, and Mann–Kendall statistics |

The analysis response includes `yearly_trend.trend` for event frequency and `yearly_trend.duration_trend` for heatwave days. Each includes linear-regression output and a `mann_kendall` object when at least two yearly observations are available.

FastAPI validates coordinate ranges and query values. Reversed date ranges are rejected. SlowAPI applies client-address rate limits: 20 requests/minute for location search, 30 requests/minute for historical weather, and 10 requests/minute for heatwave analysis.

## MongoDB cache

Weather responses are stored in the `weather_records` collection. The cache key includes latitude and longitude rounded to six decimal places, plus the start and end dates. A unique index is created on `cache_key`. Cache hits reuse saved location and daily records; cache misses request data from Open-Meteo and save the response.

Cached records do not currently expire automatically. Consider adding a cache freshness policy and monitoring for longer-term use. Shared rate-limit storage and careful client-IP configuration should also be considered when running multiple instances.

## Tests and build

Run the backend tests from the `backend` directory:

```powershell
python -m pytest tests -q
```

The backend suite was run locally with **22 passing tests** after adding the Mann–Kendall calculation tests.

Run frontend linting and build checks from the `frontend` directory:

```powershell
npm run lint
npm run build
```

Both commands have been run successfully during development.

## Deployment configuration

The public application is deployed on Vercel as separate frontend and backend projects connected to this GitHub repository.

### Backend project

- **Root directory:** `backend`
- **Entry point:** `index.py`, which imports the FastAPI app from `app.main`.
- **Environment variables:**
  - `MONGODB_URI` — MongoDB Atlas connection string. Keep it secret.
  - `MONGODB_DATABASE` — currently `climate_hazard_db`.
  - `FRONTEND_ORIGIN` — the exact deployed frontend origin, currently `https://climate-hazard-trend-analyzer-daol.vercel.app`.

### Frontend project

- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `VITE_API_BASE_URL=https://climate-hazard-trend-analyzer-lyart.vercel.app`

Vite embeds `VITE_` variables during the build. If the backend URL changes, update the frontend environment variable and redeploy the frontend. If the frontend domain changes, update `FRONTEND_ORIGIN` in the backend environment settings and redeploy the backend.

After deployment, check `/health`, city search, map tile loading and coordinate selection, historical weather, heatwave analysis, both CSV exports, and PDF export from the live dashboard.

## Known limitations and future improvements

- Use a seasonally aware or day-of-year baseline method if needed for the analysis goals.
- Evaluate an exact Mann–Kendall p-value method for small samples and consider whether serial correlation adjustment is appropriate for the yearly series.
- Add automated cache expiry or another cache freshness policy.
- Add more API-level tests for cache hits and misses, endpoint validation, rate-limit behavior, and malformed or unavailable external weather data.
- Add other hazard types and improve production logging, monitoring, and user-facing error handling.

## AI tool disclosure

I wrote and implemented the project code myself. I used ChatGPT as a support tool when needed to clarify implementation steps, understand concepts, troubleshoot errors, review logic, and prepare project documentation. I ran the application, checked API responses, and executed the backend test suite during development.
