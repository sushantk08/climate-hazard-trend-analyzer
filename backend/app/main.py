import os
from datetime import date, datetime, timezone

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from starlette.concurrency import run_in_threadpool

from app.heatwave import calculate_percentile, detect_heatwaves
from app.trends import calculate_linear_trend
from app.weather_cache import get_weather_records_collection
from fastapi.middleware.cors import CORSMiddleware

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

app = FastAPI(
    title="Climate Hazard Trend Analyzer API",
    description="API for exploring historical weather and heatwave trends.",
    version="0.1.0",
)

limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)

frontend_origin = os.getenv("FRONTEND_ORIGIN")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if frontend_origin:
    allowed_origins.append(frontend_origin.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


async def fetch_daily_temperatures(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> tuple[dict, list[dict]]:
    """Fetch daily temperatures, using MongoDB as a cache."""

    cache_key = (
        f"{latitude:.6f}:{longitude:.6f}:"
        f"{start_date.isoformat()}:{end_date.isoformat()}"
    )

    # Check MongoDB for previously saved weather data.
    try:
        collection = await run_in_threadpool(
            get_weather_records_collection
        )

        cached_record = await run_in_threadpool(
            collection.find_one,
            {"cache_key": cache_key},
        )

    except Exception as exc:
        print(
            f"Weather database access failed: "
            f"{type(exc).__name__}: {exc}"
        )
        raise HTTPException(
            status_code=503,
            detail="Could not access the weather database.",
        )

    # Reuse cached data when the same request already exists.
    if cached_record:
        return cached_record["location"], cached_record["records"]

    

    # Fetch weather data from Open-Meteo when the cache is empty.
    url = "https://archive-api.open-meteo.com/v1/archive"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "daily": "temperature_2m_max",
        "timezone": "auto",
        "temperature_unit": "celsius",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            weather_data = response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="The weather service took too long to respond.",
        )

    except (httpx.HTTPError, ValueError):
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve valid data from the weather service.",
        )

    if not isinstance(weather_data, dict):
        raise HTTPException(
            status_code=502,
            detail="The weather service returned an invalid response.",
        )

    daily_data = weather_data.get("daily", {})
    dates = daily_data.get("time", [])
    temperatures = daily_data.get("temperature_2m_max", [])

    if (
        not isinstance(dates, list)
        or not isinstance(temperatures, list)
        or not dates
        or len(dates) != len(temperatures)
    ):
        raise HTTPException(
            status_code=502,
            detail="The weather service returned incomplete data.",
        )

    records = [
        {
            "date": weather_date,
            "temperature_max_c": temperature,
        }
        for weather_date, temperature in zip(dates, temperatures)
    ]

    location = {
        "latitude": weather_data.get("latitude"),
        "longitude": weather_data.get("longitude"),
        "timezone": weather_data.get("timezone"),
    }

    # Save the newly fetched data in MongoDB.
    cache_document = {
        "cache_key": cache_key,
        "source": "Open-Meteo Historical Weather API",
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "location": location,
        "records": records,
        "cached_at": datetime.now(timezone.utc),
    }

    try:
        await run_in_threadpool(
            collection.update_one,
            {"cache_key": cache_key},
            {"$set": cache_document},
            upsert=True,
        )

    except Exception as exc:
        print(
            f"Weather database save failed: "
            f"{type(exc).__name__}: {exc}"
        )
        raise HTTPException(
            status_code=503,
            detail="Could not save weather data to the database.",
        )

    return location, records


@app.get("/")
def read_root():
    return {
        "message": "Climate Hazard Trend Analyzer API is running"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}




@app.get("/locations/search")
@limiter.limit("20/minute")
async def search_locations(
    request: Request,
    name: str = Query(min_length=2, max_length=100),
    count: int = Query(default=5, ge=1, le=10),
):
    """Search for cities and return their coordinates."""

    name = name.strip()

    if len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Enter at least two characters to search for a location.",
        )

    url = "https://geocoding-api.open-meteo.com/v1/search"

    params = {
        "name": name,
        "count": count,
        "language": "en",
        "format": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="The location search took too long. Please try again.",
        )

    except (httpx.HTTPError, ValueError):
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve locations from the search service.",
        )

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=502,
            detail="The location service returned an invalid response.",
        )

    results = data.get("results", [])

    locations = [
        {
            "name": item.get("name"),
            "region": item.get("admin1"),
            "country": item.get("country"),
            "country_code": item.get("country_code"),
            "latitude": item.get("latitude"),
            "longitude": item.get("longitude"),
            "timezone": item.get("timezone"),
        }
        for item in results
        if isinstance(item, dict)
        and item.get("latitude") is not None
        and item.get("longitude") is not None
    ]

    return {
        "query": name,
        "count": len(locations),
        "locations": locations,
    }



@app.get("/weather/history")
@limiter.limit("30/minute")
async def get_historical_weather(
    request: Request,
    latitude: float = Query(default=18.5204, ge=-90, le=90),
    longitude: float = Query(default=73.8567, ge=-180, le=180),
    start_date: date = Query(default=date(2024, 1, 1)),
    end_date: date = Query(default=date(2024, 1, 7)),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date must be before or equal to end date.",
        )

    location, records = await fetch_daily_temperatures(
        latitude,
        longitude,
        start_date,
        end_date,
    )

    return {
        "source": "Open-Meteo Historical Weather API",
        "location": location,
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "unit": "Celsius",
        "daily": records,
    }


@app.get("/analysis/heatwaves")
@limiter.limit("10/minute")
async def analyze_heatwaves(
    request: Request,
    latitude: float = Query(default=18.5204, ge=-90, le=90),
    longitude: float = Query(default=73.8567, ge=-180, le=180),
    start_date: date = Query(default=date(2024, 1, 1)),
    end_date: date = Query(default=date(2024, 12, 31)),
    baseline_start_date: date = Query(default=date(1991, 1, 1)),
    baseline_end_date: date = Query(default=date(2020, 12, 31)),
):
    # Validate the requested dates.
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Analysis start date must not be after its end date.",
        )

    if baseline_start_date > baseline_end_date:
        raise HTTPException(
            status_code=400,
            detail="Baseline start date must not be after its end date.",
        )

    # Fetch baseline and analysis temperatures.
    location, baseline_records = await fetch_daily_temperatures(
        latitude,
        longitude,
        baseline_start_date,
        baseline_end_date,
    )

    _, analysis_records = await fetch_daily_temperatures(
        latitude,
        longitude,
        start_date,
        end_date,
    )

    # Calculate the 95th-percentile baseline temperature.
    baseline_temperatures = [
        record["temperature_max_c"]
        for record in baseline_records
    ]

    try:
        threshold = calculate_percentile(
            baseline_temperatures,
            percentile=95,
        )
    except ValueError:
        raise HTTPException(
            status_code=502,
            detail="No valid baseline temperatures are available.",
        )

    # Detect heatwaves lasting at least three consecutive days.
    events = detect_heatwaves(
        analysis_records,
        threshold_c=threshold,
        min_duration=3,
    )

    # Calculate the total number of days classified as heatwave days.
    total_heatwave_days = sum(
        event["duration_days"] for event in events
    )

    average_duration = (
        round(total_heatwave_days / len(events), 2)
        if events
        else 0
    )

    longest_duration = max(
        (event["duration_days"] for event in events),
        default=0,
    )

    
    
    # Prepare yearly counts and heatwave duration totals.
    first_year = start_date.year
    last_year = end_date.year

    yearly_counts = {
        year: 0
        for year in range(first_year, last_year + 1)
    }

    yearly_heatwave_days = {
        year: 0
        for year in range(first_year, last_year + 1)
    }

    # Assign each event to the year in which it started.
    for event in events:
        event_year = date.fromisoformat(
            event["start_date"]
        ).year

        if event_year in yearly_counts:
            yearly_counts[event_year] += 1
            yearly_heatwave_days[event_year] += (
                event["duration_days"]
            )

    yearly_data = [
        {
            "year": year,
            "heatwave_count": yearly_counts[year],
            "heatwave_days": yearly_heatwave_days[year],
        }
        for year in range(first_year, last_year + 1)
    ]

    # Calculate frequency and duration trends.
    if len(yearly_data) >= 2:
        frequency_result = calculate_linear_trend(
            [item["year"] for item in yearly_data],
            [item["heatwave_count"] for item in yearly_data],
        )

        duration_result = calculate_linear_trend(
            [item["year"] for item in yearly_data],
            [item["heatwave_days"] for item in yearly_data],
        )

        yearly_trend = {
            "direction": frequency_result["direction"],
            "slope_heatwaves_per_year": (
                frequency_result["slope_per_year"]
            ),
        }

        duration_trend = {
            "direction": duration_result["direction"],
            "slope_heatwave_days_per_year": (
                duration_result["slope_per_year"]
            ),
        }

    else:
        yearly_trend = {
            "direction": "insufficient_data",
            "slope_heatwaves_per_year": None,
        }

        duration_trend = {
            "direction": "insufficient_data",
            "slope_heatwave_days_per_year": None,
        }


    return {
        "source": "Open-Meteo Historical Weather API",
        "hazard": "Heatwave",
        "location": location,
        "definition": (
            "Three or more consecutive calendar days with daily "
            "maximum temperatures strictly above the 95th percentile "
            "of daily maximum temperatures in the baseline period."
        ),
        "baseline": {
            "start_date": baseline_start_date.isoformat(),
            "end_date": baseline_end_date.isoformat(),
            "percentile": 95,
            "threshold_c": round(threshold, 2),
        },
        "analysis_period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "summary": {
            "heatwave_count": len(events),
            "total_heatwave_days": total_heatwave_days,
            "average_duration_days": average_duration,
            "longest_heatwave_days": longest_duration,
        },
        "yearly_trend": {
            "yearly_counts": yearly_data,
            "trend": yearly_trend,
            "duration_trend": duration_trend,
            "note": (
                "Each heatwave is counted in the year it starts. "
                "The first and last years may be partial years "
                "if the selected dates do not cover full calendar years."
            ),
        },
        "events": events,
    }
