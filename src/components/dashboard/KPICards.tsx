"use client";

import { useEffect, useState, useRef } from "react";
import { TrendingUp, Globe, Target, Zap } from "lucide-react";

interface KPICardsProps {
  audit: {
    url: string;
    globalScore: number;
    realSignals: number;
    estimatedSignals: number;
    categories: Array<{ score: number }>;
  };
  actionPlan: {
    items: Array<{ priority: string; expectedScoreGain: number }>;
    totalPotentialGain: number;
  };
}

function AnimatedNumber({ value, color, size = 36 }: { value: number; color: string; size?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    function frame(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(value * eased));
      if (progress < 1) ref.current = requestAnimationFrame(frame);
    }
    ref.current = requestAnimationFrame(frame);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);

  return (
    <span
      style={{
        fontFamily: "var(--font-dm-mono)",
        fontSize: size,
        fontWeight: 700,
        color,
        lineHeight: 1,
      }}
    >
      {display}
    </span>
  );
}

function Sparkline({
  dataPoints,
  color,
  width = 80,
  height = 32,
}: {
  dataPoints: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start: number;
    let raf: number;
    function animate(now: number) {
      if (!start) start = now;
      const elapsed = now - start;
      const p = Math.min(elapsed / 800, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (dataPoints.length < 2) return null;

  const max = Math.max(...dataPoints);
  const min = Math.min(...dataPoints);
  const range = max - min || 1;
  const padding = 2;

  const points = dataPoints
    .map((val, i) => {
      const x = (i / (dataPoints.length - 1)) * width;
      const y = padding + (1 - (val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  // Gradient fill area
  const lastPoint = dataPoints[dataPoints.length - 1];
  const lastY = padding + (1 - (lastPoint - min) / range) * (height - padding * 2);
  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sparkGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <clipPath id={`sparkClip-${color.replace("#", "")}`}>
          <rect x="0" y="0" width={width * progress} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#sparkClip-${color.replace("#", "")})`}>
        <polygon
          points={areaPoints}
          fill={`url(#sparkGrad-${color.replace("#", "")})`}
        />
        <polyline
          points={points}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      {/* Dot at the end */}
      {progress >= 0.95 && (
        <circle cx={width} cy={lastY} r={3} fill={color}>
          <animate attributeName="r" values="0;3;2.5;3" dur="0.4s" fill="freeze" />
        </circle>
      )}
    </svg>
  );
}

function MiniDonut({ score, size = 44 }: { score: number; size?: number }) {
  const strokeW = 4;
  const radius = (size - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f97316" : "#ef4444";
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 200);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={strokeW} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
      />
    </svg>
  );
}

export default function KPICards({ audit, actionPlan }: KPICardsProps) {
  const score = audit.globalScore;
  const scoreColor = score >= 75 ? "#22c55e" : score >= 50 ? "#f97316" : "#ef4444";
  const scoreLabel = score >= 75 ? "Good" : score >= 50 ? "Needs Work" : "Critical";

  const criticalCount = actionPlan.items.filter((i) => i.priority === "critical").length;
  const highCount = actionPlan.items.filter((i) => i.priority === "high").length;

  // Generate sparkline data from category scores
  const categoryScores = audit.categories.map((c) => c.score);
  // Simulated trend from category scores (ascending sort to show improvement)
  const trendPoints = [...categoryScores].sort((a, b) => a - b);

  // Action items sparkline - show cumulative gain
  const sortedGains = actionPlan.items
    .map((i) => i.expectedScoreGain)
    .sort((a, b) => b - a);
  let cumulative = 0;
  const gainPoints = sortedGains.slice(0, 8).map((g) => {
    cumulative += g;
    return cumulative;
  });

  let hostname = "";
  try { hostname = new URL(audit.url).hostname; } catch { hostname = audit.url; }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Site Info */}
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="flex-shrink-0">
          <MiniDonut score={score} size={52} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={14} className="text-[#3b82f6] flex-shrink-0" />
            <p className="text-[13px] font-semibold text-[#374151] truncate">{hostname}</p>
          </div>
          <p className="text-[12px] text-[#9ca3af]">
            {audit.realSignals} real signals · {audit.estimatedSignals} estimated
          </p>
          <p className="text-[11px] text-[#9ca3af] mt-0.5">Audit complete</p>
        </div>
      </div>

      {/* Card 2: Overall Score */}
      <div className="glass-card p-5">
        <p className="section-label mb-2">OVERALL SCORE</p>
        <div className="flex items-center gap-3">
          <AnimatedNumber value={score} color={scoreColor} />
          <Sparkline dataPoints={trendPoints} color={scoreColor} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{
              backgroundColor: score >= 75 ? "rgba(34,197,94,0.1)" : score >= 50 ? "rgba(249,115,22,0.1)" : "rgba(239,68,68,0.1)",
              color: scoreColor,
            }}
          >
            {scoreLabel}
          </span>
          <span className="text-[11px] text-[#9ca3af]">out of 100</span>
        </div>
      </div>

      {/* Card 3: Action Items */}
      <div className="glass-card p-5">
        <p className="section-label mb-2">ACTION ITEMS</p>
        <div className="flex items-center gap-3">
          <AnimatedNumber value={actionPlan.items.length} color="#3b82f6" />
          <Sparkline dataPoints={gainPoints.length >= 2 ? gainPoints : [0, actionPlan.totalPotentialGain]} color="#3b82f6" />
        </div>
        <p className="flex items-center gap-1 mt-2" style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>
          <TrendingUp size={12} />+{actionPlan.totalPotentialGain} pts potential
        </p>
        <div className="flex items-center gap-2 mt-1">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#ef4444] font-medium">
              <Zap size={10} />{criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#f97316] font-medium">
              <Target size={10} />{highCount} high
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
