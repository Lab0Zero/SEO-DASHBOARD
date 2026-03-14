"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  ListTodo,
  BookOpen,
  Heart,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
} from "lucide-react";

interface SidebarProps {
  audit: {
    url: string;
    globalScore: number;
    categories: { name: string; score: number; status: string }[];
  } | null;
  actionPlanCount: number;
  activeView: string;
  onViewChange: (view: string) => void;
  recentAudits?: string[];
  onBackToLanding?: () => void;
}

const subMenuItems = [
  { label: "Activity", view: "action-plan" },
  { label: "Statistic", view: "category-details" },
  { label: "Performance Cases", view: "dashboard" },
];

export default function Sidebar({
  audit,
  actionPlanCount,
  activeView,
  onViewChange,
  recentAudits = [],
  onBackToLanding,
}: SidebarProps) {
  const [auditsOpen, setAuditsOpen] = useState(true);

  return (
    <aside className="dashboard-sidebar flex flex-col gap-6">
      {/* Logo */}
      <button
        onClick={onBackToLanding}
        className="flex items-center gap-2.5 px-1 mb-2 group cursor-pointer"
        title="Back to home"
      >
        <div className="relative w-7 h-7 flex items-center justify-center">
          <Check
            size={18}
            strokeWidth={3}
            className="text-[#3b82f6] absolute -translate-x-[2px] -translate-y-[1px]"
          />
          <Check
            size={18}
            strokeWidth={3}
            className="text-[#3b82f6] absolute translate-x-[2px] translate-y-[1px] opacity-60"
          />
        </div>
        <span className="font-semibold text-[15px] text-[#111827] group-hover:text-[#3b82f6] transition-colors">
          SEO Audit
        </span>
      </button>

      {/* MAIN section */}
      <div>
        <p className="section-label px-3 mb-2">MAIN</p>
        <nav className="flex flex-col gap-0.5">
          {/* Dashboard */}
          <button
            onClick={() => onViewChange("dashboard")}
            className={`nav-item w-full ${
              activeView === "dashboard" || activeView === "action-plan" || activeView.startsWith("category-")
                ? "nav-item-active"
                : ""
            }`}
          >
            <LayoutDashboard size={17} />
            <span className="flex-1 text-left">Dashboard</span>
          </button>

          {/* Dashboard submenu */}
          {(activeView === "dashboard" || activeView === "action-plan" || activeView.startsWith("category-")) && (
            <div className="ml-[39px] flex flex-col gap-0.5 mt-0.5">
              {subMenuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onViewChange(item.view)}
                  className={`text-left text-[12px] py-1.5 px-2.5 rounded-lg transition-all duration-150 ${
                    (item.view === activeView) ||
                    (item.view === "category-details" && activeView.startsWith("category-"))
                      ? "text-[#374151] bg-white/30 font-medium"
                      : "text-[#9ca3af] hover:text-[#6b7280] hover:bg-white/15"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Tasks */}
          <button
            onClick={() => onViewChange("action-plan")}
            className={`nav-item w-full ${
              activeView === "action-plan" ? "nav-item-active" : ""
            }`}
          >
            <ListTodo size={17} />
            <span className="flex-1 text-left">Tasks</span>
            {actionPlanCount > 0 && (
              <span className="rounded-full bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center font-semibold leading-none">
                {actionPlanCount}
              </span>
            )}
          </button>

          {/* Libraries */}
          <button
            onClick={() => onViewChange("category-details")}
            className={`nav-item w-full ${
              activeView.startsWith("category-") ? "nav-item-active" : ""
            }`}
          >
            <BookOpen size={17} />
            <span className="flex-1 text-left">Libraries</span>
          </button>

          {/* Saved */}
          <button
            onClick={() => onViewChange("dashboard")}
            className={`nav-item w-full ${
              activeView === "saved" ? "nav-item-active" : ""
            }`}
          >
            <Heart size={17} />
            <span className="flex-1 text-left">Saved</span>
          </button>
        </nav>
      </div>

      {/* RECENT AUDITS section */}
      <div>
        <button
          onClick={() => setAuditsOpen(!auditsOpen)}
          className="section-label px-3 mb-2 flex items-center gap-1.5 w-full hover:text-[#6b7280] transition-colors"
        >
          {auditsOpen ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
          RECENT AUDITS
        </button>

        {auditsOpen && recentAudits.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {recentAudits.slice(0, 5).map((auditUrl, i) => (
              <button
                key={`${auditUrl}-${i}`}
                onClick={() => onViewChange("dashboard")}
                className="flex items-center gap-3 px-3 py-2 rounded-[10px] transition-all duration-150 hover:bg-white/25 w-full group"
              >
                <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-blue-400/20 to-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Globe size={14} className="text-[#3b82f6]" />
                </div>
                <span className="text-[12px] text-[#374151] truncate group-hover:text-[#111827] transition-colors">
                  {auditUrl}
                </span>
              </button>
            ))}
          </div>
        )}

        {auditsOpen && recentAudits.length === 0 && (
          <p className="px-3 text-[11px] text-[#9ca3af] italic">
            No audits yet
          </p>
        )}
      </div>
    </aside>
  );
}
