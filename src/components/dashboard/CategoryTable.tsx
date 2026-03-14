"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import React from "react";

interface CategoryTableProps {
  categories: Array<{
    name: string;
    icon: React.ReactNode;
    score: number;
    status: "good" | "warning" | "critical";
    criteria: Array<{ label: string }>;
    isReal: boolean;
  }>;
  onFullReport: () => void;
}

const statusConfig = {
  good: {
    label: "Good",
    border: "border-[#22c55e]/30",
    text: "text-[#22c55e]",
    bg: "bg-[#22c55e]/5",
  },
  warning: {
    label: "Needs Work",
    border: "border-[#f97316]/30",
    text: "text-[#f97316]",
    bg: "bg-[#f97316]/5",
  },
  critical: {
    label: "Critical",
    border: "border-[#ef4444]/30",
    text: "text-[#ef4444]",
    bg: "bg-[#ef4444]/5",
  },
};

function getScoreColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f97316";
  return "#ef4444";
}

export default function CategoryTable({
  categories,
  onFullReport,
}: CategoryTableProps) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set([0]));

  const toggleCheck = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

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
          LIST OF CATEGORIES TO ANALYZE
        </p>
        <button
          onClick={onFullReport}
          className="flex items-center gap-1 hover:text-[#374151] transition-colors"
          style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}
        >
          Full list
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Table Header */}
      <div
        className="grid items-center px-3 py-2"
        style={{
          gridTemplateColumns: "20px 1fr 60px 90px 70px",
          gap: 12,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#9ca3af",
          fontWeight: 500,
        }}
      >
        <span />
        <span>Name</span>
        <span>Score</span>
        <span>Status</span>
        <span>Criteria</span>
      </div>

      {/* Data Rows */}
      {categories.map((cat, i) => {
        const status = statusConfig[cat.status];
        const isChecked = checked.has(i);
        return (
          <div
            key={cat.name}
            className="glass-table-row grid items-center px-3 py-3"
            style={{
              gridTemplateColumns: "20px 1fr 60px 90px 70px",
              gap: 12,
            }}
          >
            {/* Checkbox */}
            <button onClick={() => toggleCheck(i)} className="flex items-center justify-center">
              {isChecked ? (
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: "#3b82f6",
                  }}
                >
                  <svg
                    width={10}
                    height={8}
                    viewBox="0 0 10 8"
                    fill="none"
                  >
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : (
                <div
                  className="hover:border-[#3b82f6] transition-colors"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: "1px solid #d1d5db",
                  }}
                />
              )}
            </button>

            {/* Name */}
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: "rgba(255,255,255,0.4)",
                }}
              >
                {React.isValidElement(cat.icon)
                  ? React.cloneElement(
                      cat.icon as React.ReactElement<{ size?: number }>,
                      { size: 16 }
                    )
                  : cat.icon}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                {cat.name}
              </span>
              {!cat.isReal && (
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    marginLeft: 2,
                  }}
                >
                  Est.
                </span>
              )}
            </div>

            {/* Score */}
            <span
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontSize: 14,
                fontWeight: 600,
                color: getScoreColor(cat.score),
              }}
            >
              {cat.score}
            </span>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center justify-center border ${status.border} ${status.text} ${status.bg}`}
              style={{
                fontSize: 11,
                fontWeight: 500,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 2,
                paddingBottom: 2,
                borderRadius: 9999,
                width: "fit-content",
              }}
            >
              {status.label}
            </span>

            {/* Criteria */}
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {cat.criteria.length} criteria
            </span>
          </div>
        );
      })}
    </div>
  );
}
