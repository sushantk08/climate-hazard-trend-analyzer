# ClimateScope — Climate Hazard Trend Analyzer

ClimateScope is a full-stack web application for exploring historical daily maximum temperatures and detecting heatwave-like events for a selected location. It uses a custom percentile-based definition for analysis; its events are **not official heatwave declarations from the India Meteorological Department (IMD)**.

## Live application

- **Frontend dashboard:** https://climate-hazard-trend-analyzer-daol.vercel.app/
- **Backend API:** https://climate-hazard-trend-analyzer-lyart.vercel.app/
- **API health check:** https://climate-hazard-trend-analyzer-lyart.vercel.app/health
- **Interactive API documentation:** https://climate-hazard-trend-analyzer-lyart.vercel.app/docs

## Features

- Search for cities and select their coordinates using Open-Meteo's geocoding service.
- Choose an analysis period and a historical baseline period.
- Calculate a 95th-percentile temperature threshold from daily maximum temperatures in the selected baseline period.
- Detect events with at least three consecutive calendar days whose maximum temperatures are strictly above the threshold.
- Summarize event count, total heatwave days, average event duration, longest event, and threshold temperature.
- Plot yearly event counts and daily maximum temperature history.
- Calculate linear-regression trends for yearly event counts and yearly heatwave days.
- Show average, hottest, and coolest daily maximum temperatures for the selected period.
- Export detected events and daily temperature history to CSV.
- Cache historical weather records in MongoDB to reduce repeated requests for the same coordinates and date range.
- Validate key inputs and apply rate limits to the main API endpoints.

## Technology stack

- **Frontend:** React, Vite, Chart.js, `react-chartjs-2`
- **Backend:** Python, FastAPI, Uvicorn, HTTPX, SlowAPI
- **Database/cache:** MongoDB Atlas with PyMongo
- **Weather data:** Open-Meteo Historical Weather API and Open-Meteo Geocoding API
- **Testing:** pytest
- **Deployment:** Vercel

## How it works

1. The user searches for a city and selects a location, analysis period, and baseline period.
2. The React frontend calls the FastAPI backend.
3. The backend checks MongoDB for cached records using a key built from latitude, longitude, and the requested date range.
4. On a cache miss, the backend fetches daily maximum temperature data from Open-Meteo, normalizes the response, and stores it in MongoDB.
5. The backend calculates the baseline percentile, detects qualifying events, prepares yearly totals, and calculates linear-regression trends.
6. The frontend presents summary cards, charts, an event table, and CSV exports.

## Heatwave definition and assumptions

For this application, a detected heatwave event is defined as:

> Three or more consecutive calendar days with daily maximum temperatures strictly above the 95th percentile of daily maximum temperatures in the selected baseline period.

Important assumptions and limitations:

- The threshold is a **pooled percentile** calculated from available daily maximum temperatures across the full baseline period. It is not calculated separately for each day of the year and does not adjust the threshold for seasonal differences.
- This is a project-specific analytical definition, not an official IMD heatwave-declaration method. Results should not be presented as official warnings or declarations.
- The application uses data provided by Open-Meteo. These values may differ from observations recorded at an individual local weather station.
- Missing or invalid temperatures do not count as qualifying hot days and break a heatwave streak. A gap in calendar dates also breaks the streak.
- An event is assigned to the year in which it starts. Its full duration is attributed to that year in the yearly heatwave-days trend.
- The first and last years may be partial years if the selected analysis period does not cover full calendar years.
- Linear-regression trends describe the selected historical data; they do not establish causation or guarantee future conditions.

### Example output

For Pune with an analysis period of 1 January 2019 to 31 December 2024 and a baseline period of 1 January 1991 to 31 December 2020, the deployed dashboard displayed a 38.1 °C threshold, 17 detected events, and 120 heatwave days. These are results under the project's definition and selected data source, not independent verification of official heatwave records.

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
│   │   ├── utils/
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
- Internet access to reach MongoDB and the Open-Meteo services.

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

Edit `backend/.env` with your own MongoDB connection details:

```dotenv
MONGODB_URI="mongodb+srv://<username>:<password>@<your-cluster-host>/"
MONGODB_DATABASE="climate_hazard_db"
```

Replace the placeholders with your own values. Do not commit `.env` or publish credentials. Keep `.env.example` limited to placeholder values.

Start the backend from the `backend` directory:

```powershell
python -m uvicorn app.main:app --reload
```

The local API is available at `http://127.0.0.1:8000`; interactive documentation is at `http://127.0.0.1:8000/docs`, and the health endpoint is `http://127.0.0.1:8000/health`.

### 2. Configure the frontend

Open a second terminal from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`. The frontend uses `VITE_API_BASE_URL` when it is set and falls back to `http://127.0.0.1:8000` for local development.

To set a different API URL locally, create `frontend/.env.local` with:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart the Vite development server after changing frontend environment variables.

### 3. Open the application

1. Make sure MongoDB is reachable and the backend is running.
2. Run the frontend in its own terminal.
3. Open `http://localhost:5173`.
4. Search for a city, select it, set the analysis and baseline periods, and run the analysis.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Basic API welcome response |
| `GET` | `/health` | Check whether the API responds |
| `GET` | `/locations/search?name=Pune&count=5` | Search for locations and return coordinates |
| `GET` | `/weather/history?latitude=18.5204&longitude=73.8567&start_date=2024-01-01&end_date=2024-01-07` | Return daily historical maximum temperatures |
| `GET` | `/analysis/heatwaves?latitude=18.5204&longitude=73.8567&start_date=2019-01-01&end_date=2024-12-31&baseline_start_date=1991-01-01&baseline_end_date=2020-12-31` | Return detected events, summary metrics, yearly values, and trends |

FastAPI validates coordinate ranges and query values. The endpoints reject reversed date ranges. SlowAPI applies client-address rate limits: 20 requests/minute for location search, 30 requests/minute for historical weather, and 10 requests/minute for heatwave analysis.

## MongoDB cache

Weather responses are stored in the `weather_records` collection. The cache key includes latitude and longitude rounded to six decimal places, plus the start and end dates. A unique index is created on `cache_key`. Cache hits reuse saved location and daily records; cache misses request data from Open-Meteo and save the response.

Cached records do not currently expire automatically. A production version should add a cache freshness policy and monitoring. Shared rate-limit storage and careful client-IP configuration should also be considered when running multiple instances.

## Tests and build

Run backend tests from the `backend` directory:

```powershell
python -m pytest tests -q
```

The heatwave and trend test suite has been run locally with 15 passing tests.

Build the frontend:

```powershell
cd frontend
npm run build
```

## Deployment configuration

The public application is deployed on Vercel, with separate projects for the backend and frontend.

### Backend project

- **Root directory:** `backend`
- **Entry point:** `index.py` (imports the FastAPI app from `app.main`)
- **Required environment variables:**
  - `MONGODB_URI` — MongoDB Atlas connection string; keep this secret.
  - `MONGODB_DATABASE` — database name, currently `climate_hazard_db`.
  - `FRONTEND_ORIGIN` — exact deployed frontend origin, currently `https://climate-hazard-trend-analyzer-daol.vercel.app`.

### Frontend project

- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `VITE_API_BASE_URL=https://climate-hazard-trend-analyzer-lyart.vercel.app`

Vite reads `VITE_` variables during the build. If the API URL changes, update the frontend environment variable and redeploy the frontend. If the frontend domain changes, update `FRONTEND_ORIGIN` in the backend project and redeploy the backend.

After deployment, check the backend `/health` endpoint, city search, historical weather, heatwave analysis, and CSV exports in the live dashboard.

## Known limitations and future improvements

- Use a seasonally aware or day-of-year baseline method if required by the analytical objective.
- Add automatic cache expiry or another cache freshness policy.
- Add tests for API endpoints, cache hits and misses, date validation, rate-limit behavior, and missing or malformed external weather responses.
- Consider additional hazard types, map-based region selection, and PDF report export.
- Improve production logging, monitoring, and user-facing error handling.

## AI tool disclosure

I wrote and implemented the project code myself. I used ChatGPT as a support tool when needed to clarify implementation steps, understand concepts, troubleshoot errors, review logic, and prepare project documentation. I ran the application, checked API responses, and executed the backend test suite during development.
