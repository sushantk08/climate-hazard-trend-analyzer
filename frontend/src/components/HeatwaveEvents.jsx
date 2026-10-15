
function HeatwaveEvents({ events }) {
  return (
    <section className="panel events-panel" id="events">
      <div className="panel-heading">
        <div>
          <h2>Detected heatwave events</h2>
          <p>
            Individual events found during the selected period
          </p>
        </div>

        <span className="events-count">
          {events.length} {events.length === 1 ? "EVENT" : "EVENTS"}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="events-empty">
          <div className="empty-chart-icon">✓</div>
          <h3>No heatwave events detected</h3>
          <p>
            No period met the selected heatwave definition
            for the chosen location and dates.
          </p>
        </div>
      ) : (
        <div className="events-table-wrapper">
          <table className="events-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Start date</th>
                <th>End date</th>
                <th>Duration</th>
                <th>Peak temperature</th>
              </tr>
            </thead>

            <tbody>
              {events.map((event, index) => (
                <tr
                  key={`${event.start_date}-${event.end_date}`}
                >
                  <td>
                    <span className="event-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </td>

                  <td>{event.start_date}</td>

                  <td>{event.end_date}</td>

                  <td>
                    <span className="duration-badge">
                      {event.duration_days}{" "}
                      {event.duration_days === 1 ? "day" : "days"}
                    </span>
                  </td>

                  <td className="peak-temperature">
                    {event.peak_temperature_c.toFixed(2)} °C
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default HeatwaveEvents;
