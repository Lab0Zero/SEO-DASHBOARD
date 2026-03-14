"use client";

import { ChevronRight } from "lucide-react";

interface ScoreChartProps {
  categories: Array<{
    name: string;
    score: number;
    status: string;
  }>;
}

const barColors = [
  "#3b82f6", // Performance
  "#ef4444", // On-Page
  "#8b5cf6", // Technical
  "#f97316", // Social
  "#22c55e", // Mobile
  "#06b6d4", // Content
  "#6b7280", // Backlinks
];

const chartHeight = 140;
const barWidth = 24;
const yLabels = [100, 75, 50, 25, 0];
const leftPadding = 30;
const topPadding = 5;
const bottomPadding = 10;

export default function ScoreChart({ categories }: ScoreChartProps) {
  const totalBars = categories.length;
  const chartWidth = leftPadding + totalBars * (barWidth + 20) + 20;

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#9ca3af",
          }}
        >
          SCORE DISTRIBUTION
        </p>
        <button
          className="flex items-center gap-1 hover:text-[#374151] transition-colors"
          style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}
        >
          Full Report
          <ChevronRight size={14} />
        </button>
      </div>

      {/* SVG Chart */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          width="100%"
          height={160}
          viewBox={`0 0 ${chartWidth} ${
            chartHeight + topPadding + bottomPadding
          }`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines and Y-axis labels */}
          {yLabels.map((label) => {
            const y =
              topPadding + chartHeight - (label / 100) * chartHeight;
            return (
              <g key={label}>
                <line
                  x1={leftPadding}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="rgba(0,0,0,0.05)"
                  strokeWidth={1}
                />
                <text
                  x={leftPadding - 6}
                  y={y + 3}
                  textAnchor="end"
                  style={{
                    fontSize: 10,
                    fill: "#9ca3af",
                  }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {categories.map((cat, i) => {
            const barHeight = (cat.score / 100) * chartHeight;
            const x = leftPadding + 20 + i * (barWidth + 20);
            const y = topPadding + chartHeight - barHeight;
            const color = barColors[i % barColors.length];

            return (
              <rect
                key={cat.name}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={color}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
        {categories.map((cat, i) => {
          const color = barColors[i % barColors.length];
          return (
            <div key={cat.name} className="flex items-center gap-1.5">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: "#374151" }}>
                {cat.name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  fontFamily: "var(--font-dm-mono)",
                }}
              >
                {cat.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
