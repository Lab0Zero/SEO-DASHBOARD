"use client";

interface TopIssuesProps {
  items: Array<{
    title: string;
    description: string;
    priority: "critical" | "high" | "medium" | "low";
    expectedScoreGain: number;
    category: string;
  }>;
  onSeeAll?: () => void;
}

const priorityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
};

export default function TopIssues({ items, onSeeAll }: TopIssuesProps) {
  const filtered = items
    .filter((item) => item.priority === "critical" || item.priority === "high")
    .slice(0, 4);

  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-center mb-4">
        <span className="section-label">TOP ISSUES</span>
        <button
          onClick={onSeeAll}
          className="flex items-center gap-1 text-[13px] text-[#6b7280] hover:text-[#374151] transition-colors"
        >
          See all &gt;
        </button>
      </div>

      <div>
        {filtered.map((item, i) => (
          <div
            key={i}
            className={`py-3 ${i < filtered.length - 1 ? "border-b border-white/10" : ""}`}
          >
            <p className="text-[13px] font-semibold text-[#374151]">{item.title}</p>
            <p className="text-[12px] text-[#9ca3af] truncate max-w-full mt-0.5">
              {item.description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-medium text-[#3b82f6]">
                +{item.expectedScoreGain} pts
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: priorityColors[item.priority] }}
                />
                <span
                  className="text-[11px] font-medium capitalize"
                  style={{ color: priorityColors[item.priority] }}
                >
                  {item.priority}
                </span>
              </span>
              {item.priority === "critical" && (
                <span className="inline-block w-2 h-2 rounded-full bg-[#f97316] ml-auto" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
