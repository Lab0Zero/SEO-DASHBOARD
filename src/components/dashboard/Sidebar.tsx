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
}

const contacts = [
  { name: "Erik Gunsel", initials: "EG", color: "bg-emerald-400" },
  { name: "Emily Smith", initials: "ES", color: "bg-violet-400" },
  { name: "Arthur Adelk", initials: "AA", color: "bg-orange-400" },
];

export default function Sidebar({
  audit,
  actionPlanCount,
  activeView,
  onViewChange,
}: SidebarProps) {
  const [messagesOpen, setMessagesOpen] = useState(true);

  return (
    <aside className="dashboard-sidebar flex flex-col gap-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-1 mb-2">
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
        <span className="font-semibold text-[15px] text-[#111827]">
          SEO Audit
        </span>
      </div>

      {/* MAIN section */}
      <div>
        <p className="section-label px-3 mb-2">MAIN</p>
        <nav className="flex flex-col gap-0.5">
          {/* Dashboard */}
          <button
            onClick={() => onViewChange("dashboard")}
            className={`nav-item w-full ${
              activeView === "dashboard" ? "nav-item-active" : ""
            }`}
          >
            <LayoutDashboard size={17} />
            <span className="flex-1 text-left">Dashboard</span>
          </button>

          {/* Dashboard submenu */}
          {activeView === "dashboard" && (
            <div className="ml-[39px] flex flex-col gap-0.5 mt-0.5">
              {["Activity", "Statistic", "Performance Cases"].map((item) => (
                <button
                  key={item}
                  className={`text-left text-[12px] py-1.5 px-2.5 rounded-lg transition-all duration-150 ${
                    item === "Performance Cases"
                      ? "text-[#6b7280] bg-white/30"
                      : "text-[#9ca3af] hover:text-[#6b7280]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* Tasks */}
          <button
            onClick={() => onViewChange("tasks")}
            className={`nav-item w-full ${
              activeView === "tasks" ? "nav-item-active" : ""
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
            onClick={() => onViewChange("libraries")}
            className={`nav-item w-full ${
              activeView === "libraries" ? "nav-item-active" : ""
            }`}
          >
            <BookOpen size={17} />
            <span className="flex-1 text-left">Libraries</span>
          </button>

          {/* Saved */}
          <button
            onClick={() => onViewChange("saved")}
            className={`nav-item w-full ${
              activeView === "saved" ? "nav-item-active" : ""
            }`}
          >
            <Heart size={17} />
            <span className="flex-1 text-left">Saved</span>
          </button>
        </nav>
      </div>

      {/* RECENT MESSAGES section */}
      <div>
        <button
          onClick={() => setMessagesOpen(!messagesOpen)}
          className="section-label px-3 mb-2 flex items-center gap-1.5 w-full hover:text-[#6b7280] transition-colors"
        >
          {messagesOpen ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
          RECENT MESSAGES
        </button>

        {messagesOpen && audit && (
          <div className="flex flex-col gap-1 mt-1">
            {contacts.map((contact) => (
              <button
                key={contact.name}
                className="flex items-center gap-3 px-3 py-2 rounded-[10px] transition-all duration-150 hover:bg-white/25 w-full"
              >
                <div
                  className={`w-[36px] h-[36px] rounded-full ${contact.color} flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white text-[11px] font-semibold">
                    {contact.initials}
                  </span>
                </div>
                <span className="text-[13px] text-[#374151] truncate">
                  {contact.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
