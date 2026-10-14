import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database


# Load environment settings from backend/.env
ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE)

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv(
    "MONGODB_DATABASE",
    "climate_hazard_db",
)

_client: MongoClient | None = None


def get_database() -> Database:
    """Connect to MongoDB and return the project database."""
    global _client

    if not MONGODB_URI:
        raise RuntimeError(
            "MONGODB_URI is missing. Check the backend/.env file."
        )

    if _client is None:
        _client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=10000,
        )

    # Check that MongoDB is reachable.
    _client.admin.command("ping")

    return _client[MONGODB_DATABASE]
