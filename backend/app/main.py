
from datetime import date

import httpx
from fastapi import FastAPI, HTTPException, Query

app = FastAPI(
    title="Climate Hazard Trend Analyzer API",
    description="API for exploring historical weather and heatwave trends.",
    version="0.1.0",
)


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
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            weather_data = response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="The weather service took too long to respond.",
        )

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve data from the weather service.",
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

    return {
        "source": "Open-Meteo Historical Weather API",
        "location": {
            "latitude": weather_data.get("latitude"),
            "longitude": weather_data.get("longitude"),
            "timezone": weather_data.get("timezone"),
        },
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "unit": "Celsius",
        "daily": records,
    }
