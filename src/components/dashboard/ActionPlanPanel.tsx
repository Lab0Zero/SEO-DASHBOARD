"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Download,
  Zap,
  Wrench,
  TrendingUp,
  Bot,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { ActionPlan, ActionItem } from "./actionPlanBuilder";

// ─── Priority config ─────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#FF3B30", bg: "#FFF5F5" },
  high: { label: "High", color: "#FF9F0A", bg: "#FFFBF0" },
  medium: { label: "Medium", color: "#0071E3", bg: "#F0F5FF" },
  low: { label: "Low", color: "#34C759", bg: "#F0FFF4" },
};

const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "#34C759" },
  medium: { label: "Medium", color: "#FF9F0A" },
  hard: { label: "Hard", color: "#FF3B30" },
};

// ─── Action Item Component ───────────────────────────────────────────────────

function ActionItemCard({ item, index }: { item: ActionItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const pc = PRIORITY_CONFIG[item.priority];
  const dc = DIFFICULTY_CONFIG[item.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.03 * index, duration: 0.3 }}
      className="border border-[#F2F2F7] rounded-xl overflow-hidden hover:bg-[#FAFAFA] transition-colors duration-200"
    >
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 sm:p-5 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md"
              style={{ background: pc.bg, color: pc.color }}
            >
              {pc.label}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F5F5F7] text-[#86868B]">
              {item.category}
            </span>
            <span className="text-[10px] font-medium text-[#86868B]">
              +{item.expectedScoreGain} pts
            </span>
            <span
              className="text-[10px] font-medium"
              style={{ color: dc.color }}
            >
              {dc.label}
            </span>
          </div>
          <p className="text-[14px] font-medium text-[#1D1D1F] leading-snug">{item.title}</p>
          <p className="text-[12px] text-[#86868B] mt-0.5 truncate">{item.description}</p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown size={16} className="text-[#C7C7CC]" />
        </motion.div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-[#F2F2F7] pt-4">
              {/* Impact */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertCircle size={12} className="text-[#86868B]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#86868B]">Why it matters</span>
                </div>
                <p className="text-[13px] text-[#424245] leading-relaxed">{item.impact}</p>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Wrench size={12} className="text-[#86868B]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#86868B]">Implementation steps</span>
                </div>
                <ol className="space-y-1.5">
                  {item.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#F5F5F7] text-[#86868B] text-[11px] font-medium flex items-center justify-center mt-px">
                        {i + 1}
                      </span>
                      <span className="text-[13px] text-[#424245] leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Automatable */}
              {item.automatable && item.automatableNote && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F0F5FF] border border-[#E0EAFF]">
                  <Bot size={14} className="text-[#0071E3] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-semibold text-[#0071E3]">Automatable with Claude Code</span>
                    <p className="text-[12px] text-[#424245] mt-0.5 leading-relaxed">{item.automatableNote}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface ActionPlanPanelProps {
  actionPlan: ActionPlan;
  onDownloadPDF: () => void;
  pdfLoading?: boolean;
}

export default function ActionPlanPanel({ actionPlan, onDownloadPDF, pdfLoading }: ActionPlanPanelProps) {
  const { items, currentScore, projectedScore, totalPotentialGain } = actionPlan;

  if (items.length === 0) return null;

  // Group by priority
  const groups: { priority: ActionItem["priority"]; items: ActionItem[] }[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!seen.has(item.priority)) {
      seen.add(item.priority);
      groups.push({ priority: item.priority, items: [] });
    }
    groups.find((g) => g.priority === item.priority)!.items.push(item);
  }

  // Counts per priority
  const counts = {
    critical: items.filter((i) => i.priority === "critical").length,
    high: items.filter((i) => i.priority === "high").length,
    medium: items.filter((i) => i.priority === "medium").length,
    low: items.filter((i) => i.priority === "low").length,
  };

  let globalIndex = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="mt-6 bg-white rounded-2xl"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F5F5F7]">
              <Zap size={18} className="text-[#1D1D1F]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1D1D1F] tracking-tight">SEO Action Plan</h3>
              <span className="text-[12px] text-[#86868B]">
                {items.length} actions · Potential: +{totalPotentialGain} points
              </span>
            </div>
          </div>
        </div>

        {/* Score projection */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F5F5F7] mb-6">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-[24px] font-medium text-[#1D1D1F]" style={{ fontFamily: "var(--font-dm-mono), monospace" }}>
                {currentScore}
              </p>
              <p className="text-[10px] text-[#86868B] uppercase tracking-wide">Current</p>
            </div>
            <ArrowRight size={16} className="text-[#C7C7CC]" />
            <div className="text-center">
              <p className="text-[24px] font-medium text-[#34C759]" style={{ fontFamily: "var(--font-dm-mono), monospace" }}>
                {projectedScore}
              </p>
              <p className="text-[10px] text-[#86868B] uppercase tracking-wide">Projected</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2 justify-end flex-wrap">
            <TrendingUp size={14} className="text-[#34C759]" />
            <span className="text-[13px] font-medium text-[#34C759]">
              +{totalPotentialGain} points potential improvement
            </span>
          </div>
        </div>

        {/* Priority summary bar */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {(["critical", "high", "medium", "low"] as const).map((p) => {
            if (counts[p] === 0) return null;
            const pc = PRIORITY_CONFIG[p];
            return (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: pc.bg, color: pc.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: pc.color }} />
                {counts[p]} {pc.label}
              </span>
            );
          })}
        </div>

        {/* Action items grouped by priority */}
        <div className="space-y-6">
          {groups.map((group) => {
            const pc = PRIORITY_CONFIG[group.priority];
            return (
              <div key={group.priority}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: pc.color }} />
                  <h4 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: pc.color }}>
                    {pc.label} Priority
                  </h4>
                  <div className="flex-1 h-px bg-[#F2F2F7]" />
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <ActionItemCard key={item.id} item={item} index={globalIndex++} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Download PDF button */}
        <div className="mt-8 pt-6 border-t border-[#F2F2F7]">
          <button
            onClick={onDownloadPDF}
            disabled={pdfLoading}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-[14px] font-medium text-white bg-[#1D1D1F] hover:bg-[#424245] transition-colors duration-200 disabled:opacity-50"
          >
            {pdfLoading ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1.5s linear infinite" }} />
                Generating PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Download Full PDF Report
              </>
            )}
          </button>
          <p className="text-[11px] text-[#86868B] text-center mt-2">
            Includes complete audit report, category breakdown, and action plan
          </p>
        </div>
      </div>
    </motion.div>
  );
}
