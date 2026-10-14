from datetime import date

import httpx
from fastapi import FastAPI, HTTPException, Query

from app.heatwave import calculate_percentile, detect_heatwaves


app = FastAPI(
    title="Climate Hazard Trend Analyzer API",
    description="API for exploring historical weather and heatwave trends.",
    version="0.1.0",
)


async def fetch_daily_temperatures(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> tuple[dict, list[dict]]:
    # Fetch daily maximum temperatures from Open-Meteo.

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

    if not dates or len(dates) != len(temperatures):
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

    return location, records


@app.get("/")
def read_root():
    return {
        "message": "Climate Hazard Trend Analyzer API is running"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/weather/history")
async def get_historical_weather(
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
        latitude, longitude, start_date, end_date
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
async def analyze_heatwaves(
    latitude: float = Query(default=18.5204, ge=-90, le=90),
    longitude: float = Query(default=73.8567, ge=-180, le=180),
    start_date: date = Query(default=date(2024, 1, 1)),
    end_date: date = Query(default=date(2024, 12, 31)),
    baseline_start_date: date = Query(default=date(1991, 1, 1)),
    baseline_end_date: date = Query(default=date(2020, 12, 31)),
):
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

    events = detect_heatwaves(
        analysis_records,
        threshold_c=threshold,
        min_duration=3,
    )

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
        "events": events,
    }
