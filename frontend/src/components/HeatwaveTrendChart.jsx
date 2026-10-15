
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

function HeatwaveTrendChart({ yearlyCounts }) {
  const chartData = {
    labels: yearlyCounts.map((item) => item.year),
    datasets: [
      {
        label: "Heatwave events",
        data: yearlyCounts.map((item) => item.heatwave_count),
        backgroundColor: "#3f8968",
        hoverBackgroundColor: "#18563e",
        borderRadius: 5,
        maxBarThickness: 42,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) =>
            `Heatwave events: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Year",
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        title: {
          display: true,
          text: "Number of heatwaves",
        },
      },
    },
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "280px",
      }}
    >
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}

export default HeatwaveTrendChart;
