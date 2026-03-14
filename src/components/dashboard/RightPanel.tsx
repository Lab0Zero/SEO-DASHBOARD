"use client";

import { Calendar, Plus } from "lucide-react";

interface ActionItem {
  id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  difficulty: "easy" | "medium" | "hard";
  expectedScoreGain: number;
  estimatedTime: string;
}

interface RightPanelProps {
  actionPlan: {
    items: ActionItem[];
    totalPotentialGain: number;
    currentScore: number;
    projectedScore: number;
  };
  audit: {
    globalScore: number;
  };
}

const priorityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#22c55e",
};

const groupBorderColors = ["#22c55e", "#3b82f6", "#f97316", "#ef4444"];

function PlusButton() {
  return (
    <button className="bg-[#3b82f6] w-7 h-7 rounded-full flex items-center justify-center text-white hover:bg-[#2563eb] transition-colors flex-shrink-0">
      <Plus size={14} strokeWidth={2.5} />
    </button>
  );
}

export default function RightPanel({ actionPlan, audit }: RightPanelProps) {
  const { items } = actionPlan;

  // Group items by priority
  const grouped: Record<string, ActionItem[]> = {};
  items.forEach((item) => {
    if (!grouped[item.priority]) grouped[item.priority] = [];
    grouped[item.priority].push(item);
  });

  const priorityOrder: Array<"critical" | "high" | "medium" | "low"> = [
    "critical",
    "high",
    "medium",
    "low",
  ];
  const activeGroups = priorityOrder.filter(
    (p) => grouped[p] && grouped[p].length > 0
  );

  // Get first 6 items total across groups
  let totalShown = 0;
  const maxTotal = 6;
  const maxPerGroup = 3;

  // Quick wins: easy difficulty + critical or high priority
  const quickWins = items
    .filter(
      (item) =>
        item.difficulty === "easy" &&
        (item.priority === "critical" || item.priority === "high")
    )
    .slice(0, 4);

  // Priority breakdown counts
  const breakdownRows = priorityOrder
    .filter((p) => grouped[p])
    .map((p) => ({
      priority: p,
      count: grouped[p].length,
      totalGain: grouped[p].reduce((sum, i) => sum + i.expectedScoreGain, 0),
      color: priorityColors[p],
    }));

  return (
    <aside className="dashboard-right flex flex-col gap-4">
      {/* Card 1: MY ACTION PLAN */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">MY ACTION PLAN</p>
          <PlusButton />
        </div>

        <div className="flex flex-col gap-3">
          {activeGroups.map((priority, groupIdx) => {
            if (totalShown >= maxTotal) return null;
            const groupItems = grouped[priority].slice(
              0,
              Math.min(maxPerGroup, maxTotal - totalShown)
            );
            totalShown += groupItems.length;
            const borderColor =
              groupBorderColors[groupIdx % groupBorderColors.length];

            return (
              <div key={priority}>
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#9ca3af] font-semibold mb-1.5">
                  {priority.toUpperCase()}
                </p>
                <div className="flex flex-col gap-1.5">
                  {groupItems.map((item) => (
                    <div
                      key={item.id}
                      className="pl-3 py-2 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                      style={{ borderLeft: `3px solid ${borderColor}` }}
                    >
                      <p className="text-[13px] text-[#374151] truncate leading-tight">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#9ca3af] mt-0.5">
                        +{item.expectedScoreGain} pts &middot;{" "}
                        {item.estimatedTime}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 2: PRIORITY BREAKDOWN */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">PRIORITY BREAKDOWN</p>
          <PlusButton />
        </div>

        <div className="flex flex-col gap-2">
          {breakdownRows.map((row) => (
            <div
              key={row.priority}
              className="flex items-center gap-2.5 py-1.5"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: row.color }}
              />
              <span className="text-[13px] text-[#374151] flex-1 capitalize">
                {row.priority} ({row.count})
              </span>
              <span className="text-[11px] text-[#9ca3af] font-mono">
                +{row.totalGain} pts
              </span>
            </div>
          ))}
          {/* Summary row */}
          <div className="flex items-center gap-2.5 py-1.5 mt-1 pt-2 border-t border-white/20">
            <Calendar size={14} className="text-[#9ca3af] flex-shrink-0" />
            <span className="text-[13px] text-[#374151] flex-1 font-medium">
              Total potential
            </span>
            <span className="text-[11px] text-[#3b82f6] font-semibold font-mono">
              +{actionPlan.totalPotentialGain} pts
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: QUICK WINS */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">QUICK WINS</p>
          <PlusButton />
        </div>

        {quickWins.length > 0 ? (
          <div className="flex flex-col gap-2">
            {quickWins.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 py-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer px-1"
              >
                <span className="w-2 h-2 rounded-full bg-[#f97316] flex-shrink-0" />
                <span className="text-[13px] text-[#374151] flex-1 truncate">
                  {item.title}
                </span>
                <span className="text-[11px] text-[#9ca3af] font-mono flex-shrink-0">
                  +{item.expectedScoreGain} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[#9ca3af] italic">
            No quick wins available yet. Run an audit to discover easy
            improvements.
          </p>
        )}
      </div>
    </aside>
  );
}
