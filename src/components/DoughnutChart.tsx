"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutChartProps {
  genre: number;
  comic: number;
  habit: number;
  score: number;
  isRival?: boolean;
}

export default function DoughnutChart({
  genre,
  comic,
  habit,
  score,
  isRival = false,
}: DoughnutChartProps) {
  const accentColor = isRival ? "#ef4444" : "#a855f7";

  const data = {
    labels: ["Genre", "Judul", "Habit"],
    datasets: [
      {
        data: [genre, comic, habit],
        backgroundColor: [
          `${accentColor}CC`,
          "#10b981CC",
          "#3b82f6CC",
        ],
        borderColor: [accentColor, "#10b981", "#3b82f6"],
        borderWidth: 2,
        hoverBackgroundColor: [accentColor, "#10b981", "#3b82f6"],
        hoverBorderWidth: 3,
        borderRadius: 4,
        spacing: 2,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "72%",
    animation: {
      animateRotate: true,
      duration: 1500,
      easing: "easeInOutQuart",
    },
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
          label: (ctx: any) => ` ${ctx.label}: ${ctx.raw}%`,
        },
      },
    },
  };

  return (
    <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex-shrink-0">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className={`text-4xl sm:text-5xl font-black ${
            isRival ? "text-red-400" : "text-white"
          }`}
        >
          {score}%
        </span>
      </div>
    </div>
  );
}
