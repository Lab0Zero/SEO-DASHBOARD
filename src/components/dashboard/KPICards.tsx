"use client";

import { TrendingUp } from "lucide-react";

interface KPICardsProps {
  audit: {
    url: string;
    globalScore: number;
    realSignals: number;
    estimatedSignals: number;
  };
  actionPlan: {
    items: Array<{ priority: string }>;
    totalPotentialGain: number;
  };
}

export default function KPICards({ audit, actionPlan }: KPICardsProps) {
  const score = audit.globalScore;
  const scoreColor =
    score >= 75 ? "#22c55e" : score >= 50 ? "#f97316" : "#ef4444";
  const scoreLabel =
    score >= 75 ? "+Good" : score >= 50 ? "Needs Work" : "Critical";

  const criticalCount = actionPlan.items.filter(
    (i) => i.priority === "critical"
  ).length;
  const highCount = actionPlan.items.filter(
    (i) => i.priority === "high"
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Welcome */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              backgroundColor: "#3b82f6",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            SA
          </div>
          <div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Hello User
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Audit complete</p>
          </div>
        </div>
      </div>

      {/* Card 2: Overall Score */}
      <div className="glass-card p-5">
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#9ca3af",
            marginBottom: 8,
          }}
        >
          OVERALL SCORE
        </p>
        <div className="flex items-center gap-3">
          <span
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: 36,
              fontWeight: 700,
              color: scoreColor,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <svg
            width={80}
            height={32}
            viewBox="0 0 80 32"
            fill="none"
          >
            <polyline
              points={
                score >= 50
                  ? "0,28 12,24 24,20 36,16 48,18 60,12 72,8 80,4"
                  : "0,4 12,8 24,6 36,12 48,16 60,20 72,26 80,28"
              }
              stroke={score >= 50 ? "#22c55e" : "#ef4444"}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: scoreColor,
            marginTop: 4,
          }}
        >
          {scoreLabel}
        </p>
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          Trends last month
        </p>
      </div>

      {/* Card 3: Action Items */}
      <div className="glass-card p-5">
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#9ca3af",
            marginBottom: 8,
          }}
        >
          ACTION ITEMS
        </p>
        <div className="flex items-center gap-3">
          <span
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: 36,
              fontWeight: 700,
              color: "#3b82f6",
              lineHeight: 1,
            }}
          >
            {actionPlan.items.length}
          </span>
          <svg
            width={80}
            height={32}
            viewBox="0 0 80 32"
            fill="none"
          >
            <polyline
              points="0,28 12,22 24,24 36,18 48,14 60,10 72,6 80,4"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <p
          className="flex items-center gap-1"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#22c55e",
            marginTop: 4,
          }}
        >
          <TrendingUp size={12} />+{actionPlan.totalPotentialGain} pts potential
        </p>
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          {criticalCount} critical · {highCount} high
        </p>
      </div>
    </div>
  );
}
