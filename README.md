# ClimateScope — Climate Hazard Trend Analyzer

A full-stack web application for exploring historical heatwave events and daily maximum temperatures for a selected location.

## Features

- Search for a city and select its coordinates using the Open-Meteo geocoding service.
- Select an analysis date range and a historical baseline date range.
- Calculate a 95th-percentile temperature threshold from daily maximum temperatures in the selected baseline period.
- Detect a heatwave when daily maximum temperature is strictly above that threshold for at least three consecutive calendar days.
- Summarize the number of heatwave events, total heatwave days, average event duration, longest event, and threshold temperature.
- Plot yearly heatwave frequency and daily maximum temperature history.
- Calculate linear-regression trends for yearly heatwave count and yearly heatwave days.
- Show average, hottest, and coolest daily maximum temperatures in the selected period.
- Export heatwave events and daily temperature history to CSV.
- Cache historical weather records in MongoDB to avoid repeatedly requesting the same location and date range.
- Validate key inputs and apply request rate limits to the main endpoints.

## Technology stack

**Frontend:** React, Vite, Chart.js, `react-chartjs-2`  
**Backend:** Python, FastAPI, Uvicorn, HTTPX, SlowAPI  
**Database/cache:** MongoDB with PyMongo  
**Weather data:** Open-Meteo Historical Weather API and Open-Meteo Geocoding API  
**Testing:** pytest

## Architecture

1. The React frontend lets a user select a city, coordinates, analysis period, and baseline period.
2. The frontend calls the FastAPI backend over HTTP.
3. The backend checks MongoDB for cached weather records using a key built from the latitude, longitude, and requested date range.
4. When cached records are found, the backend reuses them. Otherwise, it fetches daily maximum temperatures from Open-Meteo and saves the normalized records to MongoDB.
5. The backend calculates the baseline percentile, detects heatwave events, prepares yearly values, and calculates linear-regression trends.
6. The frontend displays the JSON results in summary cards, charts, and a table, and offers CSV downloads.

## Heatwave definition and assumptions

This project uses the following operational definition:

> A heatwave is three or more consecutive calendar days with daily maximum temperatures strictly above the 95th percentile of daily maximum temperatures in the selected baseline period.

Implementation notes and assumptions:

- The threshold is calculated from the available daily maximum temperature observations across the selected baseline date range. It is a pooled percentile, not a separate percentile for each calendar day of the year.
- Missing or invalid temperatures do not count as hot days and break a heatwave streak. A gap in calendar dates also breaks the streak.
- An event is assigned to the calendar year in which it starts. The event's full duration is attributed to that start year for the yearly heatwave-days series.
- If a selected analysis period starts or ends partway through a calendar year, the first or last year can be partial. Interpret its trend accordingly.
- A linear-regression trend is reported as insufficient when fewer than two yearly observations are available.
- Results describe the selected historical period and location; a trend alone does not establish causation or guarantee future conditions.

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

- Python 3.12 or a compatible Python version supported by the installed dependencies.
- Node.js and npm.
- A reachable MongoDB deployment, such as MongoDB Atlas.
- Internet access for the Open-Meteo services and MongoDB connection.

## Local setup

### 1. Configure the backend

From the repository root in PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set your MongoDB connection details:

```dotenv
MONGODB_URI="mongodb+srv://<username>:<password>@<your-cluster-host>/"
MONGODB_DATABASE="climate_hazard_db"
```

Replace the placeholders with your own MongoDB connection information. Do not commit `.env` or publish credentials. Keep `.env.example` limited to placeholder values.

Start the API from the `backend` directory:

```powershell
python -m uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. Interactive endpoint documentation is at `http://127.0.0.1:8000/docs`, and the health endpoint is `http://127.0.0.1:8000/health`.

### 2. Configure the frontend

Open a second terminal and run:

```powershell
cd frontend
npm install
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`. The current frontend API base URL in `frontend/src/App.jsx` is set to `http://127.0.0.1:8000` for local development.

### 3. Run the application

1. Ensure MongoDB is reachable and the backend is running.
2. Ensure the frontend is running in its own terminal.
3. Open `http://localhost:5173` in a browser.
4. Search for a city, select it, choose an analysis period and baseline, and run the heatwave analysis.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Basic API welcome response |
| `GET` | `/health` | Check whether the API responds |
| `GET` | `/locations/search?name=Pune&count=5` | Search for locations and return coordinates |
| `GET` | `/weather/history?latitude=18.5204&longitude=73.8567&start_date=2024-01-01&end_date=2024-01-07` | Return daily historical maximum temperatures |
| `GET` | `/analysis/heatwaves?latitude=18.5204&longitude=73.8567&start_date=2019-01-01&end_date=2024-12-31&baseline_start_date=1991-01-01&baseline_end_date=2020-12-31` | Return heatwave events, summaries, yearly values, and trends |

FastAPI validates coordinate ranges and query types. The endpoints reject reversed date ranges. SlowAPI limits requests by client address to 20 requests/minute for location search, 30 requests/minute for weather history, and 10 requests/minute for heatwave analysis.

## MongoDB cache

Weather responses are stored in the `weather_records` collection. The cache key includes latitude and longitude rounded to six decimal places, plus the start and end dates. A unique index is created on `cache_key`. On a cache hit, saved location and daily records are reused; on a cache miss, the backend requests data from Open-Meteo and saves the result.

The current implementation does not expire cached records automatically. For a production deployment, consider adding a cache freshness policy and monitoring, and use shared rate-limit storage if the API runs in multiple processes or instances.

## Tests

Run backend tests from the `backend` directory so that the `app` package imports resolve:

```powershell
python -m pytest tests -q
```

The heatwave and trend test suite has been run locally with 15 passing tests.

Build the frontend to check that Vite can produce a production bundle:

```powershell
cd frontend
npm run build
```

## Deployment notes

Before deploying, update the frontend API base URL in `frontend/src/App.jsx` to point to the deployed backend instead of `http://127.0.0.1:8000`. Also update the backend CORS allowed origins in `backend/app/main.py` to include the deployed frontend's exact origin. Configure `MONGODB_URI` and `MONGODB_DATABASE` in the hosting provider's environment settings; do not put secrets in source code.

After deployment, test the frontend, `/health`, city search, historical weather, heatwave analysis, and CSV downloads using the deployed URLs.

## Known limitations and future improvements

- Add automated cache expiry or a cache freshness policy.
- Use shared storage for rate limiting when deployed across multiple workers or instances, and configure proxy/client IP handling carefully.
- Add tests for API endpoints, cache hits and misses, date validation, rate-limit behavior, and missing or malformed external weather data.
- Consider a day-of-year baseline method if the scientific requirements call for seasonal thresholds.
- Add further hazard types, optional map-based region selection, and PDF report export only after the core heatwave workflow is reliable.
- Improve production deployment configuration, logging, monitoring, and user-facing error handling.

## AI tool disclosure

I wrote and implemented the project code myself. I used ChatGPT as a support tool when needed to clarify implementation steps, understand concepts, troubleshoot errors, review logic, and prepare project documentation. I ran the application, checked API responses, and executed the backend test suite during development.

