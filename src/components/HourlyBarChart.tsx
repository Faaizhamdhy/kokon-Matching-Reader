"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface HourlyBarChartProps {
  /** Array of 24 numbers, index = hour (0–23) */
  timeDistribution: number[];
}

export default function HourlyBarChart({ timeDistribution }: HourlyBarChartProps) {
  const maxVal = Math.max(...timeDistribution, 1);

  const labels = Array.from({ length: 24 }, (_, i) =>
    i % 6 === 0 ? `${String(i).padStart(2, "0")}:00` : ""
  );

  // Colour each bar: warm amber for daytime (6-18), cool blue for night
  const backgroundColors = timeDistribution.map((_, h) =>
    h >= 6 && h < 18
      ? `rgba(251,191,36,${0.35 + (timeDistribution[h] / maxVal) * 0.55})`
      : `rgba(99,102,241,${0.35 + (timeDistribution[h] / maxVal) * 0.55})`
  );
  const borderColors = timeDistribution.map((_, h) =>
    h >= 6 && h < 18 ? "rgba(251,191,36,0.9)" : "rgba(99,102,241,0.9)"
  );

  const data = {
    labels,
    datasets: [
      {
        label: "Komik Dibaca",
        data: timeDistribution,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: "easeInOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,17,23,0.95)",
        titleColor: "#fff",
        bodyColor: "#9ca3af",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          title: (items: any[]) => {
            const hour = items[0].dataIndex;
            return `${String(hour).padStart(2, "0")}:00 – ${String(hour + 1).padStart(2, "0")}:00`;
          },
          label: (ctx: any) => ` ${ctx.raw} komik dibaca`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: {
          color: "#6b7280",
          font: { size: 10, family: "'Inter', sans-serif" },
          maxRotation: 0,
        },
        border: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: {
          color: "#6b7280",
          font: { size: 10 },
          stepSize: 1,
          precision: 0,
        },
        border: { color: "rgba(255,255,255,0.06)" },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-40 w-full">
      <Bar data={data} options={options} />
    </div>
  );
}
