"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

interface ScoreChartProps {
  categories: Array<{
    name: string;
    score: number;
    status: string;
  }>;
  onFullReport?: () => void;
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

function AnimatedBar({
  x,
  targetHeight,
  color,
  delay,
  chartH,
  topPad,
}: {
  x: number;
  targetHeight: number;
  color: string;
  delay: number;
  chartH: number;
  topPad: number;
}) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setHeight(targetHeight), delay);
    return () => clearTimeout(timer);
  }, [targetHeight, delay]);

  const y = topPad + chartH - height;

  return (
    <rect
      x={x}
      y={y}
      width={barWidth}
      height={height}
      rx={4}
      fill={color}
      style={{
        transition: "height 0.8s cubic-bezier(0.16, 1, 0.3, 1), y 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    />
  );
}

export default function ScoreChart({ categories, onFullReport }: ScoreChartProps) {
  const totalBars = categories.length;
  const chartWidth = leftPadding + totalBars * (barWidth + 20) + 20;
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <p className="section-label">SCORE DISTRIBUTION</p>
        <button
          onClick={onFullReport}
          className="group flex items-center gap-1 hover:text-[#374151] transition-colors"
          style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}
        >
          Full Report
          <ChevronRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* SVG Chart */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          width="100%"
          height={160}
          viewBox={`0 0 ${chartWidth} ${chartHeight + topPadding + bottomPadding}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines and Y-axis labels */}
          {yLabels.map((label) => {
            const y = topPadding + chartHeight - (label / 100) * chartHeight;
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
                  style={{ fontSize: 10, fill: "#9ca3af" }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Animated Bars */}
          {categories.map((cat, i) => {
            const barHeight = (cat.score / 100) * chartHeight;
            const x = leftPadding + 20 + i * (barWidth + 20);
            const color = barColors[i % barColors.length];
            const isHovered = hoveredBar === i;

            return (
              <g
                key={cat.name}
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Invisible hit area */}
                <rect
                  x={x - 4}
                  y={topPadding}
                  width={barWidth + 8}
                  height={chartHeight}
                  fill="transparent"
                />
                <AnimatedBar
                  x={x}
                  targetHeight={barHeight}
                  color={color}
                  delay={100 + i * 80}
                  chartH={chartHeight}
                  topPad={topPadding}
                />
                {/* Hover tooltip */}
                {isHovered && (
                  <>
                    <rect
                      x={x - 10}
                      y={topPadding + chartHeight - barHeight - 22}
                      width={barWidth + 20}
                      height={18}
                      rx={6}
                      fill="rgba(0,0,0,0.75)"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={topPadding + chartHeight - barHeight - 10}
                      textAnchor="middle"
                      style={{ fontSize: 10, fill: "white", fontWeight: 600 }}
                    >
                      {cat.score}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
        {categories.map((cat, i) => {
          const color = barColors[i % barColors.length];
          return (
            <div
              key={cat.name}
              className="flex items-center gap-1.5 cursor-pointer transition-opacity duration-200"
              style={{ opacity: hoveredBar !== null && hoveredBar !== i ? 0.4 : 1 }}
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
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
              <span style={{ fontSize: 12, color: "#374151" }}>{cat.name}</span>
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
