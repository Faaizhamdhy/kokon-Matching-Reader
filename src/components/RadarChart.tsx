"use client";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartProps {
  selfData: number[];
  targetData?: number[];
  selfLabel?: string;
  targetLabel?: string;
  labels?: string[];
}

export default function RadarChart({
  selfData,
  targetData,
  selfLabel = "Kamu",
  targetLabel = "Teman",
  labels = ["Pagi", "Siang", "Sore", "Malam", "Dini Hari"],
}: RadarChartProps) {
  const datasets: any[] = [
    {
      label: selfLabel,
      data: selfData,
      backgroundColor: "rgba(179, 136, 255, 0.25)",
      borderColor: "#B388FF",
      borderWidth: 2,
      pointBackgroundColor: "#B388FF",
      pointBorderColor: "#1a1d2e",
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ];

  if (targetData) {
    datasets.push({
      label: targetLabel,
      data: targetData,
      backgroundColor: "rgba(236, 72, 153, 0.2)",
      borderColor: "#ec4899",
      borderWidth: 2,
      pointBackgroundColor: "#ec4899",
      pointBorderColor: "#1a1d2e",
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    });
  }

  const data = { labels, datasets };

  const options: any = {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 1200,
      easing: "easeInOutQuart",
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          display: false,
          stepSize: 25,
        },
        grid: {
          color: "rgba(255,255,255,0.07)",
          circular: true,
        },
        angleLines: {
          color: "rgba(255,255,255,0.07)",
        },
        pointLabels: {
          color: "#9ca3af",
          font: {
            size: 12,
            weight: "bold" as const,
            family: "'Outfit', sans-serif",
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#9ca3af",
          font: { size: 11, family: "'Outfit', sans-serif" },
          boxWidth: 12,
          boxHeight: 12,
          borderRadius: 3,
          padding: 16,
          usePointStyle: true,
          pointStyle: "rectRounded",
        },
      },
      tooltip: {
        backgroundColor: "rgba(15,17,23,0.95)",
        titleColor: "#fff",
        bodyColor: "#9ca3af",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw}%`,
        },
      },
    },
  };

  return <Radar data={data} options={options} />;
}
