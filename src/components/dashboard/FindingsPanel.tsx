"use client";

interface FindingsPanelProps {
  categories: Array<{
    name: string;
    criteria: Array<{
      label: string;
      status: "pass" | "warning" | "fail" | "estimated" | "na";
      value?: string;
      fix?: string;
    }>;
  }>;
}

export default function FindingsPanel({ categories, onSeeAll }: FindingsPanelProps & { onSeeAll?: () => void }) {
  const findings: Array<{
    categoryName: string;
    label: string;
    status: "fail" | "warning";
    detail: string;
  }> = [];

  for (const category of categories) {
    for (const criterion of category.criteria) {
      if (criterion.status === "fail" || criterion.status === "warning") {
        findings.push({
          categoryName: category.name,
          label: criterion.label,
          status: criterion.status,
          detail: criterion.value || criterion.fix || "",
        });
      }
    }
  }

  const displayed = findings.slice(0, 4);

  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-center mb-4">
        <span className="section-label">RECENT FINDINGS</span>
        <button
          onClick={onSeeAll}
          className="flex items-center gap-1 text-[13px] text-[#6b7280] hover:text-[#374151] transition-colors"
        >
          See all &gt;
        </button>
      </div>

      <div>
        {displayed.map((finding, i) => (
          <div
            key={i}
            className={`py-3 ${i < displayed.length - 1 ? "border-b border-white/10" : ""}`}
          >
            <p className="text-[13px] font-semibold text-[#374151]">
              {finding.categoryName}
            </p>
            <p className="text-[12px] text-[#9ca3af] line-clamp-1 mt-0.5">
              {finding.label}
              {finding.detail ? ` — ${finding.detail}` : ""}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              {finding.status === "fail" ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                  <span className="text-[11px] text-[#ef4444] font-medium">Failed</span>
                </>
              ) : (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                  <span className="text-[11px] text-[#f97316] font-medium">Warning</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
