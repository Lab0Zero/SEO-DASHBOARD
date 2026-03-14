import type { ActionPlan, ActionItem } from "../dashboard/actionPlanBuilder";

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

// ─── Category Descriptions ──────────────────────────────────────────────────

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Performance": "Page speed is a confirmed Google ranking factor. Sites loading under 3 seconds see 32% lower bounce rates. Google uses Core Web Vitals (LCP, CLS, INP) as direct ranking signals in search results.",
  "On-Page SEO": "On-page signals help search engines understand your content and its relevance. Proper title tags, meta descriptions, and heading structure are the foundation of search visibility.",
  "Technical SEO": "Technical SEO ensures search engines can discover, crawl, and index your pages effectively. Issues like missing robots.txt, broken sitemaps, or missing HTTPS can prevent pages from appearing in search results entirely.",
  "Social & Metadata": "Open Graph and Twitter Card metadata control how your pages appear when shared on social media. Well-optimized social metadata increases click-through rates from social platforms by up to 30%.",
  "Mobile & Accessibility": "Google uses mobile-first indexing, meaning it primarily uses the mobile version of your site for ranking. Accessibility improvements also benefit SEO as they improve content structure and usability.",
  "Content Quality": "Content quality directly impacts rankings, engagement, and conversion. Google's Helpful Content Update specifically targets thin, unhelpful content. Pages with 1,000+ words rank significantly better for competitive terms.",
  "Backlinks & Authority": "Domain authority and backlinks remain among the strongest ranking factors. Sites with higher authority consistently outrank competitors, and quality backlinks signal trust to search engines.",
};

// ─── Category Weights ───────────────────────────────────────────────────────

const CATEGORY_WEIGHTS: Record<string, number> = {
  "Performance": 25,
  "On-Page SEO": 20,
  "Technical SEO": 20,
  "Social & Metadata": 10,
  "Mobile & Accessibility": 10,
  "Content Quality": 10,
  "Backlinks & Authority": 5,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function priorityOrder(p: string): number {
  if (p === "critical") return 0;
  if (p === "high") return 1;
  if (p === "medium") return 2;
  return 3;
}

function estimateTotalTime(items: ActionItem[]): string {
  let totalMinutes = 0;
  for (const item of items) {
    const t = item.estimatedTime.toLowerCase();
    const numMatch = t.match(/(\d+)/);
    if (!numMatch) continue;
    const num = parseInt(numMatch[1]);
    if (t.includes("min")) totalMinutes += num;
    else if (t.includes("hour") || t.includes("hr") || t.includes("h")) totalMinutes += num * 60;
    else if (t.includes("day")) totalMinutes += num * 480;
    else totalMinutes += num * 60; // default assume hours
  }
  if (totalMinutes < 60) return `${totalMinutes} minutes`;
  const hours = Math.round(totalMinutes / 60);
  if (hours < 8) return `${hours} hours`;
  const days = Math.round(hours / 8);
  return `${days} day${days > 1 ? "s" : ""} (~${hours} hours)`;
}

function competitiveLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Above Average";
  if (score >= 50) return "Average Competitive Position";
  if (score >= 30) return "Below Average";
  return "Significant Work Needed";
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

  // Helper: add top accent bar (used on every page)
  function addAccentBar() {
    doc.setFillColor(...hexToRgb(COLORS.black));
    doc.rect(0, 0, pageW, 4, "F");
  }

  // Helper: get finalY from last autoTable
  function getLastTableY(fallback: number): number {
    return (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? fallback;
  }

  // Count issues by priority
  const criticalCount = actionPlan.items.filter((i) => i.priority === "critical").length;
  const highCount = actionPlan.items.filter((i) => i.priority === "high").length;
  const mediumCount = actionPlan.items.filter((i) => i.priority === "medium").length;
  const lowCount = actionPlan.items.filter((i) => i.priority === "low").length;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1: Cover
  // ═══════════════════════════════════════════════════════════════════════════

  addAccentBar();

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
  // PAGE 2: Executive Summary
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  addAccentBar();

  let y = 24;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Executive Summary", margin, y);

  y += 6;
  y = addHeaderLine(y);

  // Key findings
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Key Findings", margin, y);
  y += 6;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb(COLORS.gray));
  const totalIssues = actionPlan.items.length;
  doc.text(
    `This audit identified ${totalIssues} issue${totalIssues !== 1 ? "s" : ""}: ${criticalCount} critical, ${highCount} high priority, ${mediumCount} medium, ${lowCount} low.`,
    margin,
    y,
    { maxWidth: contentW }
  );
  y += 10;

  // Top 3 most impactful issues
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Top 3 Most Impactful Issues", margin, y);
  y += 6;

  const sortedItems = [...actionPlan.items].sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
  const top3 = sortedItems.slice(0, 3);

  for (let i = 0; i < top3.length; i++) {
    const item = top3[i];
    const priorityColor =
      item.priority === "critical" ? COLORS.red :
      item.priority === "high" ? COLORS.orange :
      item.priority === "medium" ? COLORS.blue : COLORS.green;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(priorityColor));
    doc.text(`${i + 1}. [${item.priority.toUpperCase()}]`, margin, y);
    doc.setTextColor(...hexToRgb(COLORS.black));
    doc.text(item.title, margin + 28, y);

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(COLORS.gray));
    doc.setFontSize(8.5);
    const descLines = doc.splitTextToSize(item.description, contentW - 5);
    doc.text(descLines, margin + 5, y);
    y += descLines.length * 4 + 3;
  }

  y += 4;

  // Category score summary table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Category Score Summary", margin, y);
  y += 5;

  const summaryBody = audit.categories.map((cat) => {
    const statusStr = cat.status === "good" ? "Good" : cat.status === "warning" ? "Needs Work" : "Critical";
    return [cat.name, `${cat.score}/100`, statusStr];
  });

  autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Category", "Score", "Status"]],
    body: summaryBody,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      textColor: hexToRgb(COLORS.black),
      lineColor: hexToRgb(COLORS.border),
      lineWidth: 0.15,
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

  y = getLastTableY(y) + 10;

  // Projected improvement
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Projected Improvement", margin, y);
  y += 6;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb(COLORS.gray));
  doc.text(
    `Implementing all recommendations could improve your score from ${actionPlan.currentScore} to ${actionPlan.projectedScore} (+${actionPlan.totalPotentialGain} points).`,
    margin,
    y,
    { maxWidth: contentW }
  );
  y += 8;

  // Total estimated fix time
  const totalTime = estimateTotalTime(actionPlan.items);
  doc.text(`Total estimated implementation time: ${totalTime}.`, margin, y, { maxWidth: contentW });

  addFooter();

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3: Quick Wins
  // ═══════════════════════════════════════════════════════════════════════════

  const quickWins = actionPlan.items.filter(
    (item) => item.difficulty === "easy" && item.expectedScoreGain >= 2
  );

  if (quickWins.length > 0) {
    doc.addPage();
    addAccentBar();

    y = 24;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(COLORS.black));
    doc.text("Quick Wins", margin, y);

    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(COLORS.gray));
    doc.text("Easy Fixes with High Impact", margin, y);

    y += 4;
    y = addHeaderLine(y);

    doc.setFontSize(9);
    doc.text(
      "These items require minimal effort but deliver significant SEO improvements. Prioritize these for immediate gains.",
      margin,
      y,
      { maxWidth: contentW }
    );
    y += 10;

    const quickWinBody = quickWins.map((item) => [
      item.title,
      item.category,
      `+${item.expectedScoreGain} pts`,
      item.estimatedTime,
    ]);

    autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Action", "Category", "Impact", "Est. Time"]],
      body: quickWinBody,
      theme: "plain",
      styles: {
        fontSize: 9,
        cellPadding: 4,
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
        0: { cellWidth: contentW * 0.40, fontStyle: "bold" },
        1: { cellWidth: contentW * 0.25 },
        2: { cellWidth: contentW * 0.15, halign: "center" as const, fontStyle: "bold", textColor: hexToRgb(COLORS.green) },
        3: { cellWidth: contentW * 0.20, halign: "center" as const, textColor: hexToRgb(COLORS.gray) },
      },
    });

    y = getLastTableY(y) + 10;

    // Summary note
    const totalQuickGain = quickWins.reduce((sum, i) => sum + i.expectedScoreGain, 0);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(COLORS.green));
    doc.text(
      `Completing all ${quickWins.length} quick wins could improve your score by +${totalQuickGain} points.`,
      margin,
      y,
      { maxWidth: contentW }
    );

    addFooter();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGES: Category Details
  // ═══════════════════════════════════════════════════════════════════════════

  for (const cat of audit.categories) {
    doc.addPage();
    addAccentBar();

    y = 24;
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

    // Category importance description
    const catDesc = CATEGORY_DESCRIPTIONS[cat.name];
    if (catDesc) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...hexToRgb(COLORS.gray));
      const descLines = doc.splitTextToSize(catDesc, contentW);
      doc.text(descLines, margin, y);
      y += descLines.length * 4 + 6;
      doc.setFont("helvetica", "normal");
    }

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
    addAccentBar();

    y = 24;
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
      const currentY = getLastTableY(y);
      if (currentY > pageH - 60) {
        doc.addPage();
        addAccentBar();
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

      // Action items table — now includes estimatedTime column
      const actionBody = groupItems.map((item) => [
        item.title,
        item.description,
        item.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
        `+${item.expectedScoreGain} pts`,
        item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1),
        item.estimatedTime,
        item.automatable ? "Yes" : "No",
      ]);

      autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Action", "Issue", "Implementation Steps", "Impact", "Difficulty", "Est. Time", "Auto"]],
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
          0: { cellWidth: contentW * 0.13, fontStyle: "bold" },
          1: { cellWidth: contentW * 0.15, fontSize: 7, textColor: hexToRgb(COLORS.gray) },
          2: { cellWidth: contentW * 0.32 },
          3: { cellWidth: contentW * 0.08, halign: "center" as const, fontStyle: "bold", textColor: hexToRgb(COLORS.green) },
          4: { cellWidth: contentW * 0.10, halign: "center" as const },
          5: { cellWidth: contentW * 0.12, halign: "center" as const, fontSize: 7, textColor: hexToRgb(COLORS.gray) },
          6: { cellWidth: contentW * 0.07, halign: "center" as const },
        },
        didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
          if (data.section === "body" && data.column.index === 4) {
            const d = data.row.raw[4];
            if (d === "Easy") data.cell.styles.textColor = hexToRgb(COLORS.green) as unknown as number[];
            else if (d === "Medium") data.cell.styles.textColor = hexToRgb(COLORS.orange) as unknown as number[];
            else data.cell.styles.textColor = hexToRgb(COLORS.red) as unknown as number[];
          }
          if (data.section === "body" && data.column.index === 6) {
            const a = data.row.raw[6];
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
  // PAGE: Competitive Analysis Notes
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  addAccentBar();

  y = 24;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Competitive Analysis Notes", margin, y);

  y += 6;
  y = addHeaderLine(y);

  // Competitive position assessment
  const compLabel = competitiveLabel(audit.globalScore);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Your Competitive Position", margin, y);
  y += 6;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb(scoreColor(audit.globalScore)));
  doc.text(`${compLabel} (Score: ${audit.globalScore}/100)`, margin, y);
  y += 8;

  doc.setTextColor(...hexToRgb(COLORS.gray));

  // Competitive recommendations based on score range
  const compRecommendations: string[] = [];
  if (audit.globalScore < 30) {
    compRecommendations.push(
      "Your site has significant SEO gaps that are likely causing it to underperform against competitors.",
      "Focus on critical and high-priority fixes first — especially technical SEO and on-page fundamentals.",
      "Consider a phased approach: fix critical issues within 1-2 weeks, then tackle high-priority items."
    );
  } else if (audit.globalScore < 50) {
    compRecommendations.push(
      "Your site is below the competitive average. Most competitors in your space likely score higher.",
      "Prioritize the quick wins identified in this report for immediate improvement.",
      "Focus on Performance and Technical SEO categories — these have the highest impact on rankings."
    );
  } else if (audit.globalScore < 70) {
    compRecommendations.push(
      "Your site is in an average competitive position. Targeted improvements can push you ahead.",
      "Focus on categories where you scored below 50 — these represent the biggest opportunities.",
      "Content quality and backlink building will differentiate you from competitors at this level."
    );
  } else if (audit.globalScore < 85) {
    compRecommendations.push(
      "Your site is above average. Fine-tuning will help you compete for top positions.",
      "Focus on the remaining medium and low-priority items for incremental gains.",
      "Consider advanced strategies: structured data, international SEO, and content clustering."
    );
  } else {
    compRecommendations.push(
      "Your site is in excellent shape. Maintain your current practices and monitor for regressions.",
      "Focus on content freshness and continuous performance optimization.",
      "Consider expanding to new keyword opportunities and building topical authority."
    );
  }

  for (const rec of compRecommendations) {
    doc.setFontSize(9);
    doc.text(`• ${rec}`, margin + 2, y, { maxWidth: contentW - 4 });
    const lines = doc.splitTextToSize(`• ${rec}`, contentW - 4);
    y += lines.length * 4 + 3;
  }

  y += 6;

  // Category-level competitive insights
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Category-Level Insights", margin, y);
  y += 6;

  const weakCategories = audit.categories.filter((c) => c.score < 50);
  const strongCategories = audit.categories.filter((c) => c.score >= 75);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb(COLORS.gray));

  if (strongCategories.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(COLORS.green));
    doc.text("Strengths:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(COLORS.gray));
    for (const cat of strongCategories) {
      doc.text(`• ${cat.name} (${cat.score}/100)`, margin + 4, y);
      y += 5;
    }
    y += 3;
  }

  if (weakCategories.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(COLORS.red));
    doc.text("Areas for Improvement:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(COLORS.gray));
    for (const cat of weakCategories) {
      doc.text(`• ${cat.name} (${cat.score}/100)`, margin + 4, y);
      y += 5;
    }
    y += 3;
  }

  y += 6;

  // Suggested tools
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Suggested Tools for Deeper Analysis", margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb(COLORS.gray));
  const tools = [
    "Ahrefs — Backlink analysis, keyword research, competitor monitoring",
    "SEMrush — Position tracking, site audit, content gap analysis",
    "Moz Pro — Domain authority tracking, link building opportunities",
    "Google Search Console — Real search performance data, index coverage, Core Web Vitals",
    "Google Analytics — User behavior, conversion tracking, traffic sources",
    "Screaming Frog — Technical crawl analysis, redirect mapping, structured data validation",
  ];

  for (const tool of tools) {
    doc.text(`• ${tool}`, margin + 2, y, { maxWidth: contentW - 4 });
    const lines = doc.splitTextToSize(`• ${tool}`, contentW - 4);
    y += lines.length * 4 + 2;
  }

  addFooter();

  // ═══════════════════════════════════════════════════════════════════════════
  // LAST PAGE: Methodology & Data Sources
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  addAccentBar();

  y = 24;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Methodology & Data Sources", margin, y);

  y += 6;
  y = addHeaderLine(y);

  // Category Weights Table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text("Category Weights", margin, y);
  y += 5;

  const weightsBody = Object.entries(CATEGORY_WEIGHTS).map(([name, weight]) => [
    name,
    `${weight}%`,
  ]);

  autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Category", "Weight"]],
    body: weightsBody,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: hexToRgb(COLORS.black),
      lineColor: hexToRgb(COLORS.border),
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: hexToRgb(COLORS.lightGray),
      textColor: hexToRgb(COLORS.gray),
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.70 },
      1: { cellWidth: contentW * 0.30, halign: "center" as const, fontStyle: "bold" },
    },
  });

  y = getLastTableY(y) + 10;

  // Scoring Methodology
  const methodSections: { heading: string; lines: string[] }[] = [
    {
      heading: "Scoring Methodology",
      lines: [
        "The overall score is a weighted average of 7 categories, each scored from 0 to 100.",
        "Each category score is calculated from individual criterion pass/fail/warning results.",
        "Passing criteria contribute full points, warnings contribute partial points, and failures contribute zero.",
        "The action plan score projections are estimates based on typical improvements when issues are resolved and may vary based on actual implementation.",
      ],
    },
    {
      heading: "Real vs Estimated Signals",
      lines: [
        `This audit used ${audit.realSignals} real signal${audit.realSignals !== 1 ? "s" : ""} and ${audit.estimatedSignals} estimated signal${audit.estimatedSignals !== 1 ? "s" : ""}.`,
        "Real signals: Performance metrics from Google PageSpeed Insights API (Lighthouse), on-page SEO, technical SEO, social metadata, and mobile/accessibility data from live HTML analysis.",
        "Estimated signals: Content Quality (readability, freshness, duplicate risk) and Backlinks & Authority (domain authority, backlink count) are estimated using heuristic models.",
        "For accurate backlink and content data, integrate Ahrefs, Moz, or SEMrush APIs.",
      ],
    },
    {
      heading: "Confidence Levels",
      lines: [
        "High confidence: Performance, On-Page SEO, Technical SEO, Social & Metadata, Mobile & Accessibility — based on direct page analysis and Lighthouse data.",
        "Medium confidence: Content Quality — estimated from page structure, word count, and readability heuristics.",
        "Low confidence: Backlinks & Authority — estimated without access to backlink databases. Integrate third-party APIs for accurate data.",
      ],
    },
    {
      heading: "Data Sources",
      lines: [
        "• Google PageSpeed Insights API (Lighthouse v11+) — Core Web Vitals, performance scores, accessibility",
        "• Live HTML analysis — DOM structure, meta tags, heading hierarchy, structured data",
        "• HTTP header analysis — Security headers, caching, compression, redirects",
        "• Heuristic models — Content quality estimation, authority scoring",
      ],
    },
    {
      heading: "Limitations",
      lines: [
        "This audit analyzes a single page URL at a point in time. Results may vary based on server load, geographic location, and network conditions.",
        "For comprehensive site-wide SEO analysis, consider auditing multiple pages and monitoring changes over time.",
        "Search engine algorithms are proprietary and change frequently. Recommendations are based on published best practices and industry research.",
      ],
    },
  ];

  for (const section of methodSections) {
    // Check if we need a new page
    if (y > pageH - 50) {
      addFooter();
      doc.addPage();
      addAccentBar();
      y = 24;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(COLORS.black));
    doc.text(section.heading, margin, y);
    y += 5;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(COLORS.gray));

    for (const line of section.lines) {
      const splitLines = doc.splitTextToSize(line, contentW);
      doc.text(splitLines, margin, y);
      y += splitLines.length * 3.8 + 2;
    }

    y += 4;
  }

  // Timestamp
  y += 2;
  doc.setDrawColor(...hexToRgb(COLORS.border));
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb(COLORS.gray));
  doc.text(`Report generated on ${dateStr} for ${audit.url}`, margin, y);
  y += 5;
  doc.text(`Generated at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}`, margin, y);

  addFooter();

  // ─── Save ──────────────────────────────────────────────────────────────────

  const dateFile = new Date().toISOString().split("T")[0];
  doc.save(`SEO-Audit-${hostname}-${dateFile}.pdf`);
}
