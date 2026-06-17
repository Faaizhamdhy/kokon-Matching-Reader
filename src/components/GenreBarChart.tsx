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

interface GenreBarChartProps {
  genres: { name: string; count: number; percentage: number }[];
}

const PALETTE = [
  ["rgba(179,136,255,0.85)", "rgba(179,136,255,1)"],   // purple
  ["rgba(99,102,241,0.85)",  "rgba(99,102,241,1)"],    // indigo
  ["rgba(0,229,255,0.85)",   "rgba(0,229,255,1)"],     // cyan
  ["rgba(251,191,36,0.85)",  "rgba(251,191,36,1)"],    // amber
  ["rgba(16,185,129,0.85)",  "rgba(16,185,129,1)"],    // emerald
];

export default function GenreBarChart({ genres }: GenreBarChartProps) {
  const data = {
    labels: genres.map((g) => g.name),
    datasets: [
      {
        label: "Persentase",
        data: genres.map((g) => g.percentage),
        backgroundColor: genres.map((_, i) => PALETTE[i % PALETTE.length][0]),
        borderColor: genres.map((_, i) => PALETTE[i % PALETTE.length][1]),
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options: any = {
    indexAxis: "y" as const,  // horizontal bars
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeInOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,17,23,0.95)",
        titleColor: "#fff",
        bodyColor: "#9ca3af",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx: any) => {
            const g = genres[ctx.dataIndex];
            return ` ${g.percentage}%  (${g.count} komik)`;
          },
        },
      },
    },
    scales: {
      x: {
        max: 100,
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: {
          color: "#6b7280",
          font: { size: 10 },
          callback: (v: any) => `${v}%`,
        },
        border: { color: "rgba(255,255,255,0.06)" },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#d1d5db",
          font: { size: 12, weight: "600" as const, family: "'Outfit', sans-serif" },
        },
        border: { color: "rgba(255,255,255,0.06)" },
      },
    },
  };

  return (
    <div style={{ height: `${Math.max(genres.length * 44, 120)}px` }} className="w-full">
      <Bar data={data} options={options} />
    </div>
  );
}
