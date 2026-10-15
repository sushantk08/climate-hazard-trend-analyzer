
import { useState } from "react";
import "./App.css";

function App() {
  const [form, setForm] = useState({
    location: "Pune, Maharashtra",
    latitude: "18.5204",
    longitude: "73.8567",
    startDate: "2019-01-01",
    endDate: "2024-12-31",
    hazard: "heatwave",
  });

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setError("");
    setAnalysis(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setAnalysis(null);

    if (form.startDate > form.endDate) {
      setError("Start date must be before or equal to end date.");
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Please enter valid latitude and longitude values.");
      return;
    }

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      start_date: form.startDate,
      end_date: form.endDate,
      baseline_start_date: "1991-01-01",
      baseline_end_date: "2020-12-31",
    });

    setLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/analysis/heatwaves?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not complete the heatwave analysis."
        );
      }

      setAnalysis(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the backend. Check that it is running."
      );
    } finally {
      setLoading(false);
    }
  }

  const trendDirection =
    analysis?.yearly_trend?.trend?.direction;

  const trendSlope =
    analysis?.yearly_trend?.trend?.slope_heatwaves_per_year;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview">
          <div className="brand-mark">C</div>

          <div className="brand-name">
            <strong>CLIMATE</strong>
            <span>INSIGHTS LAB</span>
          </div>
        </a>

        <div className="nav-heading">WORKSPACE</div>

        <nav className="sidebar-nav">
          <a className="nav-link active" href="#overview">
            <span className="nav-icon">◈</span>
            Overview
          </a>

          <a className="nav-link" href="#analysis">
            <span className="nav-icon">⌁</span>
            Hazard analysis
          </a>

          <a className="nav-link" href="#trends">
            <span className="nav-icon">↗</span>
            Climate trends
          </a>

          <a className="nav-link" href="#methodology">
            <span className="nav-icon">ⓘ</span>
            Methodology
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <strong>Historical explorer</strong>
            <span>Weather insights workspace</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> Climate analysis
          </div>

          <div className="topbar-tag">
            <span className="status-dot" />
            Historical analysis
          </div>
        </header>

        <section className="page-heading">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            CLIMATE HAZARD MONITORING
          </div>

          <h1>
            Climate Hazard
            <br />
            <span>Trend Analyzer</span>
          </h1>

          <p>
            Explore historical weather patterns, identify heatwaves,
            and understand how climate hazards change over time.
          </p>
        </section>

        <section className="analysis-card" id="analysis">
          <div className="section-heading">
            <div className="section-icon">⌖</div>

            <div>
              <h2>Configure your analysis</h2>
              <p>
                Select a region and historical period to investigate.
              </p>
            </div>

            <span className="step-label">01 / CONFIGURE</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field full-width">
                <label htmlFor="location">Region name</label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="For example, Pune, Maharashtra"
                  required
                />

                <small>
                  Enter a descriptive name for your region.
                </small>
              </div>

              <div className="field">
                <label htmlFor="latitude">Latitude</label>

                <input
                  id="latitude"
                  name="latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={form.latitude}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="longitude">Longitude</label>

                <input
                  id="longitude"
                  name="longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={form.longitude}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
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

              <div className="field">
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

              <div className="field full-width">
                <label htmlFor="hazard">Hazard type</label>

                <select
                  id="hazard"
                  name="hazard"
                  value={form.hazard}
                  onChange={handleChange}
                >
                  <option value="heatwave">Heatwave</option>
                </select>

                <small>
                  Heatwave analysis is the first supported hazard.
                </small>
              </div>
            </div>

            <div className="form-footer">
              <p>
                <span className="info-mark">i</span>
                Historical baseline: 1991–2020
              </p>

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Analyze heatwaves"}
                <span>→</span>
              </button>
            </div>

            {loading && (
              <p className="form-message" role="status">
                Fetching weather data and calculating heatwave trends.
                This may take a little time for the first request.
              </p>
            )}

            {error && (
              <p
                className="form-message error-message"
                role="alert"
              >
                {error}
              </p>
            )}

            {analysis && (
              <p className="form-message" role="status">
                Analysis completed. The baseline temperature threshold
                is {analysis.baseline.threshold_c} °C.
              </p>
            )}
          </form>
        </section>

        <section className="metrics-section" id="trends">
          <div className="section-heading compact-heading">
            <div>
              <h2>Analysis overview</h2>
              <p>Your climate indicators and results.</p>
            </div>

            <span className="placeholder-tag">
              {analysis ? "ANALYSIS COMPLETE" : "AWAITING DATA"}
            </span>
          </div>

          <div className="metrics-grid">
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon orange">⌁</span>
                <span className="metric-label">HEATWAVE EVENTS</span>
              </div>

              <div className="metric-value">
                {analysis
                  ? analysis.summary.heatwave_count
                  : "—"}
              </div>

              <p>Total events detected</p>
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon green">◷</span>
                <span className="metric-label">HEATWAVE DAYS</span>
              </div>

              <div className="metric-value">
                {analysis
                  ? analysis.summary.total_heatwave_days
                  : "—"}
              </div>

              <p>Total days in detected events</p>
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon blue">↗</span>
                <span className="metric-label">YEARLY TREND</span>
              </div>

              <div className="metric-value metric-text">
                {analysis && trendDirection
                  ? trendDirection.replaceAll("_", " ")
                  : "—"}
              </div>

              <p>
                {analysis && trendSlope !== null &&
                trendSlope !== undefined
                  ? `${trendSlope} heatwaves per year`
                  : "Change in annual event frequency"}
              </p>
            </article>
          </div>
        </section>

        <section className="visualization-grid">
          <article className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Heatwave frequency</h2>
                <p>Year-by-year historical comparison</p>
              </div>

              <span className="chart-symbol">▥</span>
            </div>

            {analysis ? (
              <div className="yearly-results">
                {analysis.yearly_trend.yearly_counts.map((item) => (
                  <div className="year-row" key={item.year}>
                    <span className="year-label">{item.year}</span>

                    <div
                      className="year-bar-track"
                      aria-label={`${item.heatwave_count} heatwaves in ${item.year}`}
                    >
                      <div
                        className="year-bar"
                        style={{
                          width: `${
                            Math.max(
                              ...analysis.yearly_trend.yearly_counts.map(
                                (entry) => entry.heatwave_count
                              ),
                              1
                            ) === 0
                              ? 0
                              : (item.heatwave_count /
                                  Math.max(
                                    ...analysis.yearly_trend.yearly_counts.map(
                                      (entry) => entry.heatwave_count
                                    ),
                                    1
                                  )) *
                                100
                          }%`,
                        }}
                      />
                    </div>

                    <strong className="year-count">
                      {item.heatwave_count}
                    </strong>
                  </div>
                ))}

                <p className="chart-footnote">
                  {analysis.yearly_trend.note}
                </p>
              </div>
            ) : (
              <div className="empty-chart">
                <div className="empty-chart-icon">⌁</div>

                <h3>Trend chart coming next</h3>

                <p>
                  Run an analysis to display yearly heatwave counts
                  and compare historical trends.
                </p>
              </div>
            )}
          </article>

          <article className="panel methodology-panel" id="methodology">
            <div className="panel-heading">
              <div>
                <h2>Detection method</h2>
                <p>How a heatwave is identified</p>
              </div>
            </div>

            <div className="method-number">95th</div>

            <div className="method-title">
              Percentile threshold
            </div>

            <p className="method-description">
              A heatwave is identified when daily maximum temperature
              stays above the historical threshold for at least
              three consecutive calendar days.
            </p>

            <div className="method-rule">
              <span>Minimum duration</span>
              <strong>3 consecutive days</strong>
            </div>

            <div className="method-rule">
              <span>Reference period</span>
              <strong>1991–2020</strong>
            </div>

            {analysis && (
              <div className="method-rule">
                <span>Calculated threshold</span>
                <strong>
                  {analysis.baseline.threshold_c} °C
                </strong>
              </div>
            )}
          </article>
        </section>

        <footer className="page-footer">
          <span>CLIMATE INSIGHTS LAB</span>
          <span>
            Historical weather analysis · Data-driven insights
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
