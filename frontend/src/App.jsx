
import { useState } from "react";
import "./App.css";

import HeatwaveTrendChart from "./components/HeatwaveTrendChart";
import HeatwaveEvents from "./components/HeatwaveEvents";
import TemperatureHistoryChart from "./components/TemperatureHistoryChart";
import exportToCsv from "./utils/exportCsv";

const API_BASE_URL = "http://127.0.0.1:8000";

function App() {
  const [form, setForm] = useState({
    location: "Pune, Maharashtra, India",
    latitude: "18.5204",
    longitude: "73.8567",
    startDate: "2019-01-01",
    endDate: "2024-12-31",
    hazard: "heatwave",
  });

  const [locationQuery, setLocationQuery] = useState("Pune");
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [temperatureHistory, setTemperatureHistory] = useState(null);
  const [temperatureHistoryError, setTemperatureHistoryError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    setError("");
    setTemperatureHistoryError("");
  }

  async function handleLocationSearch(event) {
    event.preventDefault();

    const query = locationQuery.trim();

    if (!query) {
      setLocationSearchError("Please enter a city name.");
      setLocationResults([]);
      return;
    }

    setSearchingLocations(true);
    setLocationSearchError("");
    setLocationResults([]);

    try {
      const params = new URLSearchParams({
        name: query,
        count: "5",
      });

      const response = await fetch(
        `${API_BASE_URL}/locations/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Unable to search for locations.");
      }

      const data = await response.json();

      setLocationResults(data.locations || []);

      if (!data.locations || data.locations.length === 0) {
        setLocationSearchError("No matching locations were found.");
      }
    } catch (err) {
      setLocationSearchError(
        err.message || "Unable to search for locations. Please try again."
      );
    } finally {
      setSearchingLocations(false);
    }
  }

  function handleLocationSelect(location) {
    const locationName = [
      location.name,
      location.region,
      location.country,
    ]
      .filter(Boolean)
      .join(", ");

    setForm((previousForm) => ({
      ...previousForm,
      location: locationName,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
    }));

    setLocationResults([]);
    setLocationSearchError("");
    setAnalysis(null);
    setTemperatureHistory(null);
    setTemperatureHistoryError("");
    setError("");
  }

  function handleExportHeatwaveEvents() {
    const events = analysis?.events || [];

    const headers = [
      "Event",
      "Start Date",
      "End Date",
      "Duration (days)",
      "Peak Temperature (°C)",
    ];

    const rows = events.map((event, index) => [
      index + 1,
      event.start_date ?? "",
      event.end_date ?? "",
      event.duration_days ?? "",
      event.peak_temperature_c ?? "",
    ]);

    const safeLocation = form.location
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const filename =
      `heatwave-events-${safeLocation || "location"}-` +
      `${form.startDate}-to-${form.endDate}.csv`;

    exportToCsv(filename, headers, rows);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setTemperatureHistoryError("");

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      form.latitude.trim() === "" ||
      form.longitude.trim() === "" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError(
        "Please enter a valid latitude between -90 and 90 and longitude between -180 and 180."
      );
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Please select both a start date and an end date.");
      return;
    }

    if (form.startDate > form.endDate) {
      setError("The start date must be before or equal to the end date.");
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setTemperatureHistory(null);

    try {
      const analysisParams = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        start_date: form.startDate,
        end_date: form.endDate,
        baseline_start_date: "1991-01-01",
        baseline_end_date: "2020-12-31",
      });

      const analysisResponse = await fetch(
        `${API_BASE_URL}/analysis/heatwaves?${analysisParams.toString()}`
      );

      if (!analysisResponse.ok) {
        const responseData = await analysisResponse
          .json()
          .catch(() => null);

        throw new Error(
          responseData?.detail || "Unable to complete heatwave analysis."
        );
      }

      const analysisData = await analysisResponse.json();
      setAnalysis(analysisData);

      // Load daily temperatures separately so heatwave results
      // remain available even if this request fails.
      try {
        const historyParams = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          start_date: form.startDate,
          end_date: form.endDate,
        });

        const historyResponse = await fetch(
          `${API_BASE_URL}/weather/history?${historyParams.toString()}`
        );

        if (!historyResponse.ok) {
          throw new Error("Unable to load temperature history.");
        }

        const historyData = await historyResponse.json();
        setTemperatureHistory(historyData.daily || []);
      } catch (historyError) {
        setTemperatureHistoryError(
          historyError.message ||
            "Unable to load temperature history. Please try again."
        );
      }
    } catch (err) {
      setError(
        err.message || "Something went wrong while running the analysis."
      );
    } finally {
      setLoading(false);
    }
  }

  const summary = analysis?.summary;
  const trend = analysis?.yearly_trend?.trend;
  const baseline = analysis?.baseline;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">C</div>
          <div>
            <h2>ClimateScope</h2>
            <p>Hazard Trend Analyzer</p>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-label">WORKSPACE</p>
          <div className="sidebar-link active">
            <span>◈</span>
            Climate Dashboard
          </div>
        </div>

        <div className="sidebar-footer">
          <p>Climate data analysis</p>
          <span>Powered by historical weather data</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">CLIMATE INTELLIGENCE</p>
            <h1>Climate Hazard Dashboard</h1>
            <p className="header-description">
              Explore heatwave patterns and historical temperatures for
              your selected location.
            </p>
          </div>

          <div className="status-indicator">
            <span className="status-dot"></span>
            Analysis workspace
          </div>
        </header>

        <section className="configuration-card">
          
        <div className="section-heading">
           <div>
              <h2>Daily Temperature History</h2>
              <p>
                 Daily maximum temperatures for the selected location and date range.
              </p>
           </div>

        <button
            type="button"
            className="secondary-button"
            onClick={handleExportTemperatureHistory}
            disabled={!temperatureHistory || temperatureHistory.length === 0}
         >
           Export CSV
        </button>
       </div>


          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="locationQuery">Search for a city</label>

              <div className="location-search-row">
                <input
                  id="locationQuery"
                  type="text"
                  value={locationQuery}
                  onChange={(event) =>
                    setLocationQuery(event.target.value)
                  }
                  placeholder="Enter a city, such as Pune"
                />

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleLocationSearch}
                  disabled={searchingLocations}
                >
                  {searchingLocations ? "Searching..." : "Search"}
                </button>
              </div>

              {locationSearchError && (
                <p className="location-search-error" role="alert">
                  {locationSearchError}
                </p>
              )}

              {locationResults.length > 0 && (
                <div className="location-results">
                  {locationResults.map((location, index) => (
                    <button
                      key={`${location.latitude}-${location.longitude}-${index}`}
                      type="button"
                      className="location-result"
                      onClick={() => handleLocationSelect(location)}
                    >
                      <span className="location-result-details">
                        <strong>
                          {[
                            location.name,
                            location.region,
                            location.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </strong>
                        <span className="location-coordinates">
                          {location.latitude}, {location.longitude}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="location">Selected location</label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={form.location}
                  readOnly
                />
              </div>

              <div className="form-group">
                <label htmlFor="latitude">Latitude</label>
                <input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="longitude">Longitude</label>
                <input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="hazard">Climate hazard</label>
                <select
                  id="hazard"
                  name="hazard"
                  value={form.hazard}
                  onChange={handleChange}
                >
                  <option value="heatwave">Heatwave</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="startDate">Start date</label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDate">End date</label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Run Heatwave Analysis"}
              </button>
            </div>
          </form>
        </section>

        {loading && (
          <div className="loading-message">
            <p>Analyzing climate data. Please wait...</p>
          </div>
        )}

        {analysis && (
          <>
            <section className="results-heading">
              <div>
                <p className="eyebrow">ANALYSIS RESULTS</p>
                <h2>{form.location}</h2>
                <p>
                  {form.startDate} to {form.endDate}
                </p>
              </div>
              <span className="result-badge">Analysis complete</span>
            </section>

            <section className="metrics-grid">
              <article className="metric-card">
                <p>Total Heatwave Events</p>
                <h3>{summary?.heatwave_count ?? 0}</h3>
                <span>Events detected in the selected period</span>
              </article>

              <article className="metric-card">
                <p>Total Heatwave Days</p>
                <h3>{summary?.total_heatwave_days ?? 0}</h3>
                <span>Days classified as part of heatwaves</span>
              </article>

              <article className="metric-card">
                <p>Yearly Trend</p>
                <h3>
                  {trend?.direction
                    ? trend.direction.charAt(0).toUpperCase() +
                      trend.direction.slice(1)
                    : "Unavailable"}
                </h3>
                <span>
                  {trend?.slope_heatwaves_per_year != null
                    ? `${Number(
                        trend.slope_heatwaves_per_year
                      ).toFixed(2)} events per year`
                    : "Trend information unavailable"}
                </span>
              </article>
            </section>

            <section className="chart-card">
              <div className="section-heading">
                <div>
                  <h2>Yearly Heatwave Trend</h2>
                  <p>
                    Number of detected heatwave events in each year.
                  </p>
                </div>
              </div>

              <HeatwaveTrendChart
                yearlyCounts={
                  analysis.yearly_trend?.yearly_counts || []
                }
              />
            </section>

            <section className="chart-card">
              <div className="section-heading">
                <div>
                  <h2>Daily Temperature History</h2>
                  <p>
                    Daily maximum temperatures for the selected location
                    and date range.
                  </p>
                </div>
              </div>

              {temperatureHistoryError ? (
                <p className="error-message" role="alert">
                  {temperatureHistoryError}
                </p>
              ) : temperatureHistory ? (
                <>
                  <TemperatureHistoryChart daily={temperatureHistory} />
                  <p className="chart-footnote">
                    Source: Open-Meteo Historical Weather API. Temperature
                    values are shown in degrees Celsius.
                  </p>
                </>
              ) : (
                <p>Loading temperature history...</p>
              )}
            </section>

            <section className="details-grid">
              <article className="detail-card">
                <h2>Detection Method</h2>
                <p>
                  Heatwaves are detected by comparing daily maximum
                  temperatures against a threshold calculated from
                  historical baseline data.
                </p>
                <p>
                  Consecutive qualifying hot days are grouped into
                  heatwave events.
                </p>
              </article>

              <article className="detail-card">
                <h2>Historical Baseline</h2>
                <p>
                  The configured baseline period is January 1, 1991,
                  to December 31, 2020.
                </p>

                {baseline?.threshold_c != null && (
                  <div className="threshold-value">
                    <span>Temperature threshold</span>
                    <strong>
                      {Number(baseline.threshold_c).toFixed(1)} °C
                    </strong>
                  </div>
                )}
              </article>
            </section>

            <section className="chart-card events-section">
              <div className="section-heading">
                <div>
                  <h2>Detected Heatwave Events</h2>
                  <p>
                    Details of the heatwave events identified during
                    this analysis.
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleExportHeatwaveEvents}
                  title="Download heatwave events as a CSV file"
                >
                  Export CSV
                </button>
              </div>

              <HeatwaveEvents events={analysis.events || []} />
            </section>
          </>
        )}

        {!analysis && !loading && !error && (
          <section className="empty-state">
            <div className="empty-state-icon">↗</div>
            <h2>Your climate analysis starts here</h2>
            <p>
              Choose a location and date range, then run the analysis
              to explore yearly heatwave trends and daily temperatures.
            </p>
          </section>
        )}

        <footer className="dashboard-footer">
          <p>ClimateScope — Climate Hazard Trend Analyzer</p>
          <span>Historical data analysis for climate awareness</span>
        </footer>
      </main>
    </div>
  );
}


function handleExportTemperatureHistory() {
  if (!temperatureHistory || temperatureHistory.length === 0) {
    return;
  }

  const headers = ["Date", "Daily Maximum Temperature (°C)"];

  const rows = temperatureHistory.map((day) => [
    day.date,
    day.temperature_max_c,
  ]);

  const safeLocation = form.location
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const filename =
    `temperature-history-${safeLocation || "location"}-` +
    `${form.startDate}-to-${form.endDate}.csv`;

  exportToCsv(filename, headers, rows);
}


export default App;
