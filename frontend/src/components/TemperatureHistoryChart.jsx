
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

function TemperatureHistoryChart({ daily }) {
  if (!daily || daily.length === 0) {
    return <p>No temperature history is available for this period.</p>;
  }

  const chartData = {
    labels: daily.map((item) => item.date),
    datasets: [
      {
        label: "Daily Maximum Temperature (°C)",
        data: daily.map((item) => item.temperature_max_c),
        borderColor: "#e76f51",
        backgroundColor: "rgba(231, 111, 81, 0.15)",
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.25,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} °C`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        title: {
          display: true,
          text: "Temperature (°C)",
        },
      },
    },
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}

export default TemperatureHistoryChart;
