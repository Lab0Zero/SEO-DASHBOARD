import type { ActionPlan } from "../dashboard/actionPlanBuilder";

// ─── Types (mirrored from SEODashboard to avoid circular deps) ───────────────

interface CriterionResult {
  label: string;
  status: "pass" | "warning" | "fail" | "estimated" | "na";
  value?: string;
  fix?: string;
}

interface CategoryResult {
  name: string;
  score: number;
  status: "good" | "warning" | "critical";
  criteria: CriterionResult[];
  isReal: boolean;
}

interface AuditData {
  url: string;
  globalScore: number;
  categories: CategoryResult[];
  recommendations: { priority: string; category: string; description: string; fix: string }[];
  realSignals: number;
  estimatedSignals: number;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const COLORS = {
  black: "#1D1D1F",
  gray: "#86868B",
  lightGray: "#F5F5F7",
  border: "#E5E5EA",
  blue: "#0071E3",
  green: "#34C759",
  orange: "#FF9F0A",
  red: "#FF3B30",
  white: "#FFFFFF",
};

function scoreColor(score: number): string {
  if (score >= 75) return COLORS.green;
  if (score >= 50) return COLORS.orange;
  return COLORS.red;
}

function statusText(status: string): string {
  if (status === "good" || status === "pass") return "Pass";
  if (status === "warning") return "Warning";
  if (status === "critical" || status === "fail") return "Fail";
  if (status === "estimated") return "Estimated";
  return "N/A";
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ─── PDF Generator ───────────────────────────────────────────────────────────

export async function generatePDF(audit: AuditData, actionPlan: ActionPlan): Promise<void> {
  const jspdfModule = await import("jspdf");
  const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTableDefault = autoTableModule.default || autoTableModule;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Attach autoTable to doc instance if the side-effect import didn't work
  const autoTable = (opts: Record<string, unknown>) => {
    if (typeof (doc as any).autoTable === "function") {
      (doc as any).autoTable(opts);
    } else {
      autoTableDefault(doc, opts);
    }
  };
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  let hostname = "";
  try {
    hostname = new URL(audit.url).hostname;
  } catch {
    hostname = audit.url;
  }

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Helper: add footer to current page
  function addFooter() {
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(COLORS.gray));
    doc.text(hostname, margin, pageH - 10);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 10, { align: "right" });
  }

  // Helper: add page header line
  function addHeaderLine(y: number): number {
    doc.setDrawColor(...hexToRgb(COLORS.border));
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    return y + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1: Cover
  // ═══════════════════════════════════════════════════════════════════════════

  // Background accent bar
  doc.setFillColor(...hexToRgb(COLORS.black));
  doc.rect(0, 0, pageW, 4, "F");

  // Title
  doc.setFontSize(32);
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.setFont("helvetica", "bold");
  doc.text("SEO Audit Report", margin, 50);

  // URL
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb(COLORS.blue));
  doc.text(audit.url, margin, 62);

  // Date
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(COLORS.gray));
  doc.text(dateStr, margin, 72);

  // Divider
  doc.setDrawColor(...hexToRgb(COLORS.border));
  doc.setLineWidth(0.5);
  doc.line(margin, 82, pageW - margin, 82);

  // Overall Score
  doc.setFontSize(12);
  doc.setTextColor(...hexToRgb(COLORS.gray));
  doc.setFont("helvetica", "normal");
  doc.text("OVERALL SEO SCORE", margin, 100);

  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  const sc = scoreColor(audit.globalScore);
  doc.setTextColor(...hexToRgb(sc));
  doc.text(String(audit.globalScore), margin, 140);

  doc.setFontSize(18);
  doc.setTextColor(...hexToRgb(COLORS.gray));
  doc.setFont("helvetica", "normal");
  doc.text("/ 100", margin + doc.getTextWidth(String(audit.globalScore)) * (72 / 18) * 0.28 + 4, 140);

  // Status
  const statusLabel = audit.globalScore >= 75 ? "Good" : audit.globalScore >= 50 ? "Needs Work" : "Critical";
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(sc));
  doc.text(statusLabel, margin, 152);

  // Signal counts
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(COLORS.gray));
  doc.text(`Based on ${audit.realSignals} real signals and ${audit.estimatedSignals} estimated signals`, margin, 164);

  // Projected improvement
  if (actionPlan.totalPotentialGain > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...hexToRgb(COLORS.green));
    doc.text(
      `Potential improvement: +${actionPlan.totalPotentialGain} points (${actionPlan.currentScore} → ${actionPlan.projectedScore})`,
      margin,
      176
    );
  }

  // Category quick overview
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(COLORS.gray));
  doc.text("CATEGORY OVERVIEW", margin, 196);

  const catTableBody = audit.categories.map((cat) => [
    cat.name,
    `${cat.score}/100`,
    cat.status === "good" ? "Good" : cat.status === "warning" ? "Needs Work" : "Critical",
    cat.isReal ? "Real Data" : "Estimated",
  ]);

  autoTable({
    startY: 200,
    margin: { left: margin, right: margin },
    head: [["Category", "Score", "Status", "Data Source"]],
    body: catTableBody,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: hexToRgb(COLORS.black),
      lineColor: hexToRgb(COLORS.border),
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: hexToRgb(COLORS.lightGray),
      textColor: hexToRgb(COLORS.gray),
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      1: { halign: "center" as const, fontStyle: "bold" },
      2: { halign: "center" as const },
      3: { halign: "center" as const, fontSize: 8, textColor: hexToRgb(COLORS.gray) },
    },
    didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
      if (data.section === "body" && data.column.index === 1) {
        const scoreVal = parseInt(data.row.raw[1]);
        data.cell.styles.textColor = hexToRgb(scoreColor(scoreVal)) as unknown as number[];
      }
      if (data.section === "body" && data.column.index === 2) {
        const st = data.row.raw[2];
        if (st === "Good") data.cell.styles.textColor = hexToRgb(COLORS.green) as unknown as number[];
        else if (st === "Needs Work") data.cell.styles.textColor = hexToRgb(COLORS.orange) as unknown as number[];
        else data.cell.styles.textColor = hexToRgb(COLORS.red) as unknown as number[];
      }
    },
  });

  addFooter();

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGES: Category Details
  // ═══════════════════════════════════════════════════════════════════════════

  for (const cat of audit.categories) {
    doc.addPage();

    // Category header
    doc.setFillColor(...hexToRgb(COLORS.black));
    doc.rect(0, 0, pageW, 4, "F");

    let y = 24;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(COLORS.black));
    doc.text(cat.name, margin, y);

    // Score and status on same line
    const scoreStr = `${cat.score}/100`;
    doc.setFontSize(18);
    doc.setTextColor(...hexToRgb(scoreColor(cat.score)));
    doc.text(scoreStr, pageW - margin, y, { align: "right" });

    y += 6;
    const catStatusLabel = cat.status === "good" ? "Good" : cat.status === "warning" ? "Needs Work" : "Critical";
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(COLORS.gray));
    doc.text(`${catStatusLabel} · ${cat.isReal ? "Real Data" : "Estimated Data"}`, margin, y);

    y = addHeaderLine(y + 4);

    // Criteria table
    if (cat.criteria.length > 0) {
      const criteriaBody = cat.criteria.map((c) => [
        c.label,
        statusText(c.status),
        c.value || "-",
        c.fix || "-",
      ]);

      autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Criterion", "Status", "Value", "Recommendation"]],
        body: criteriaBody,
        theme: "plain",
        styles: {
          fontSize: 8.5,
          cellPadding: 3.5,
          textColor: hexToRgb(COLORS.black),
          lineColor: hexToRgb(COLORS.border),
          lineWidth: 0.15,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: hexToRgb(COLORS.lightGray),
          textColor: hexToRgb(COLORS.gray),
          fontStyle: "bold",
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: contentW * 0.25 },
          1: { cellWidth: contentW * 0.12, halign: "center" as const },
          2: { cellWidth: contentW * 0.23 },
          3: { cellWidth: contentW * 0.40, fontSize: 8, textColor: hexToRgb(COLORS.gray) },
        },
        didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
          if (data.section === "body" && data.column.index === 1) {
            const st = data.row.raw[1];
            if (st === "Pass") data.cell.styles.textColor = hexToRgb(COLORS.green) as unknown as number[];
            else if (st === "Warning") data.cell.styles.textColor = hexToRgb(COLORS.orange) as unknown as number[];
            else if (st === "Fail") data.cell.styles.textColor = hexToRgb(COLORS.red) as unknown as number[];
            else data.cell.styles.textColor = hexToRgb(COLORS.gray) as unknown as number[];
          }
        },
      });
    }

    addFooter();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGES: Action Plan
  // ═══════════════════════════════════════════════════════════════════════════

  if (actionPlan.items.length > 0) {
    doc.addPage();
    doc.setFillColor(...hexToRgb(COLORS.black));
    doc.rect(0, 0, pageW, 4, "F");

    let y = 24;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(COLORS.black));
    doc.text("SEO Action Plan", margin, y);

    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(COLORS.gray));
    doc.text(
      `${actionPlan.items.length} actions · Potential improvement: +${actionPlan.totalPotentialGain} points (${actionPlan.currentScore} → ${actionPlan.projectedScore})`,
      margin,
      y
    );

    y = addHeaderLine(y + 4);

    // Group items by priority
    const priorities = ["critical", "high", "medium", "low"] as const;
    const priorityLabels = { critical: "Critical", high: "High Priority", medium: "Medium Priority", low: "Low Priority" };
    const priorityColors = { critical: COLORS.red, high: COLORS.orange, medium: COLORS.blue, low: COLORS.green };

    for (const priority of priorities) {
      const groupItems = actionPlan.items.filter((i) => i.priority === priority);
      if (groupItems.length === 0) continue;

      // Check if we need a new page
      const currentY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
      if (currentY > pageH - 60) {
        doc.addPage();
        doc.setFillColor(...hexToRgb(COLORS.black));
        doc.rect(0, 0, pageW, 4, "F");
        y = 24;
      } else {
        y = currentY + 8;
      }

      // Priority section header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...hexToRgb(priorityColors[priority]));
      doc.text(priorityLabels[priority], margin, y);
      y += 4;

      // Action items table
      const actionBody = groupItems.map((item) => [
        item.title,
        item.description,
        item.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
        `+${item.expectedScoreGain} pts`,
        item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1),
        item.automatable ? "Yes" : "No",
      ]);

      autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Action", "Issue", "Implementation Steps", "Impact", "Difficulty", "Auto"]],
        body: actionBody,
        theme: "plain",
        styles: {
          fontSize: 7.5,
          cellPadding: 3,
          textColor: hexToRgb(COLORS.black),
          lineColor: hexToRgb(COLORS.border),
          lineWidth: 0.15,
          overflow: "linebreak",
          valign: "top" as const,
        },
        headStyles: {
          fillColor: hexToRgb(COLORS.lightGray),
          textColor: hexToRgb(COLORS.gray),
          fontStyle: "bold",
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: contentW * 0.15, fontStyle: "bold" },
          1: { cellWidth: contentW * 0.18, fontSize: 7, textColor: hexToRgb(COLORS.gray) },
          2: { cellWidth: contentW * 0.37 },
          3: { cellWidth: contentW * 0.08, halign: "center" as const, fontStyle: "bold", textColor: hexToRgb(COLORS.green) },
          4: { cellWidth: contentW * 0.10, halign: "center" as const },
          5: { cellWidth: contentW * 0.07, halign: "center" as const },
        },
        didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
          if (data.section === "body" && data.column.index === 4) {
            const d = data.row.raw[4];
            if (d === "Easy") data.cell.styles.textColor = hexToRgb(COLORS.green) as unknown as number[];
            else if (d === "Medium") data.cell.styles.textColor = hexToRgb(COLORS.orange) as unknown as number[];
            else data.cell.styles.textColor = hexToRgb(COLORS.red) as unknown as number[];
          }
          if (data.section === "body" && data.column.index === 5) {
            const a = data.row.raw[5];
            data.cell.styles.textColor = (a === "Yes" ? hexToRgb(COLORS.blue) : hexToRgb(COLORS.gray)) as unknown as number[];
          }
        },
        didDrawPage: () => {
          addFooter();
        },
      });
    }

    addFooter();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAST PAGE: Disclaimer
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  doc.setFillColor(...hexToRgb(COLORS.black));
  doc.rect(0, 0, pageW, 4, "F");

  let y = 30;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Methodology & Disclaimer", margin, y);

  y += 10;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb(COLORS.gray));

  const disclaimerLines = [
    "Data Sources",
    "",
    "Performance metrics are obtained from Google PageSpeed Insights API (Lighthouse),",
    "which analyzes real-world and lab performance data. On-page SEO, technical SEO,",
    "social metadata, and mobile/accessibility signals are extracted from live HTML analysis",
    "of the page source code.",
    "",
    "Content Quality (readability, freshness, duplicate risk) and Backlinks & Authority",
    "(domain authority, backlink count) are estimated using heuristic models and do not",
    "reflect real data. For accurate backlink data, integrate Ahrefs, Moz, or SEMrush APIs.",
    "",
    "Scoring Methodology",
    "",
    "The overall score is a weighted average of 7 categories:",
    "  • Performance: 25%       • On-Page SEO: 20%       • Technical SEO: 20%",
    "  • Social & Metadata: 10% • Mobile & Accessibility: 10%",
    "  • Content Quality: 10%   • Backlinks & Authority: 5%",
    "",
    "Each category score (0-100) is calculated from individual criterion pass/fail/warning",
    "results. The action plan score projections are estimates based on typical improvements",
    "when issues are resolved and may vary based on actual implementation.",
    "",
    "Limitations",
    "",
    "This audit analyzes a single page URL at a point in time. Results may vary based on",
    "server load, geographic location, and network conditions. For comprehensive site-wide",
    "SEO analysis, consider auditing multiple pages and monitoring changes over time.",
    "",
    `Report generated on ${dateStr} for ${audit.url}`,
  ];

  for (const line of disclaimerLines) {
    if (line === "Data Sources" || line === "Scoring Methodology" || line === "Limitations") {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...hexToRgb(COLORS.black));
      doc.setFontSize(10);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hexToRgb(COLORS.gray));
      doc.setFontSize(9);
    }
    doc.text(line, margin, y);
    y += line === "" ? 3 : 5;
  }

  addFooter();

  // ─── Save ──────────────────────────────────────────────────────────────────

  const dateFile = new Date().toISOString().split("T")[0];
  doc.save(`SEO-Audit-${hostname}-${dateFile}.pdf`);
}
