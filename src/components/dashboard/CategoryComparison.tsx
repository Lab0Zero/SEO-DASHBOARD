"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface CategoryComparisonProps {
  categories: Array<{
    name: string;
    score: number;
    status: string;
  }>;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

export default function CategoryComparison({ categories }: CategoryComparisonProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-center mb-4">
        <span className="section-label">CATEGORY SCORES</span>
        <button className="flex items-center gap-1 text-[13px] text-[#6b7280] hover:text-[#374151] transition-colors">
          See all &gt;
        </button>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_80px] px-2 py-2">
        <span className="text-[11px] uppercase tracking-[0.1em] text-[#9ca3af]">
          Category
        </span>
        <span className="text-[11px] uppercase tracking-[0.1em] text-[#9ca3af] text-right">
          Score
        </span>
        <span className="text-[11px] uppercase tracking-[0.1em] text-[#9ca3af] text-right">
          Status
        </span>
      </div>

      {/* Data rows */}
      {categories.slice(0, 7).map((category, i) => (
        <div key={i} className="glass-table-row grid grid-cols-[1fr_80px_80px] px-2 py-2.5">
          <span className="text-[13px] text-[#374151]">{category.name}</span>
          <span
            className="text-[13px] font-mono font-semibold text-right"
            style={{ color: getScoreColor(category.score) }}
          >
            {category.score}
          </span>
          <div className="flex items-center justify-end gap-1">
            {category.score >= 70 ? (
              <>
                <TrendingUp size={12} color="#22c55e" />
                <span className="text-[12px] font-medium text-[#22c55e]">
                  {category.score - 50}%
                </span>
              </>
            ) : category.score >= 40 ? (
              <span className="text-[12px] font-medium text-[#f97316]">
                {category.score}
              </span>
            ) : (
              <>
                <TrendingDown size={12} color="#ef4444" />
                <span className="text-[12px] font-medium text-[#ef4444]">
                  {50 - category.score}%
                </span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
