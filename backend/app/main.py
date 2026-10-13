from fastapi import FastAPI

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
