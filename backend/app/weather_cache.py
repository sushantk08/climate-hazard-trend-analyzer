
from functools import lru_cache

from pymongo.collection import Collection

from app.database import get_database


@lru_cache(maxsize=1)
def get_weather_records_collection() -> Collection:
    """Return the MongoDB collection used to cache weather data."""

    collection = get_database()["weather_records"]

    # Prevent duplicate cache entries for the same request.
    collection.create_index("cache_key", unique=True)

    return collection
