
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

  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    setMessage(
      "Your selections are ready. Weather analysis will be connected in the next step."
    );
  }

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
              <p>Select a region and historical period to investigate.</p>
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
                <small>Enter a descriptive name for your region.</small>
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

              <button type="submit" className="primary-button">
                Prepare analysis <span>→</span>
              </button>
            </div>

            {message && (
              <p className="form-message" role="status">
                {message}
              </p>
            )}
          </form>
        </section>

        <section className="metrics-section" id="trends">
          <div className="section-heading compact-heading">
            <div>
              <h2>Analysis overview</h2>
              <p>Your climate indicators will appear here.</p>
            </div>

            <span className="placeholder-tag">AWAITING DATA</span>
          </div>

          <div className="metrics-grid">
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon orange">⌁</span>
                <span className="metric-label">HEATWAVE EVENTS</span>
              </div>
              <div className="metric-value">—</div>
              <p>Total events detected</p>
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon green">◷</span>
                <span className="metric-label">HEATWAVE DAYS</span>
              </div>
              <div className="metric-value">—</div>
              <p>Total days in detected events</p>
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon blue">↗</span>
                <span className="metric-label">YEARLY TREND</span>
              </div>
              <div className="metric-value metric-text">—</div>
              <p>Change in annual event frequency</p>
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

            <div className="empty-chart">
              <div className="empty-chart-icon">⌁</div>
              <h3>Trend chart coming next</h3>
              <p>
                Yearly counts and climate trends will be displayed
                here after connecting the analysis API.
              </p>
            </div>
          </article>

          <article className="panel methodology-panel" id="methodology">
            <div className="panel-heading">
              <div>
                <h2>Detection method</h2>
                <p>How a heatwave is identified</p>
              </div>
            </div>

            <div className="method-number">95th</div>
            <div className="method-title">Percentile threshold</div>

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
          </article>
        </section>

        <footer className="page-footer">
          <span>CLIMATE INSIGHTS LAB</span>
          <span>Historical weather analysis · Data-driven insights</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
