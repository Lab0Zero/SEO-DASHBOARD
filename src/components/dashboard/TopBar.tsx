"use client";

import { useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  Key,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TopBarProps {
  url: string;
  setUrl: (url: string) => void;
  onRunAudit: () => void;
  urlError: string;
  loading: boolean;
  apiKey: string;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  setApiKey: (key: string) => void;
  hasCritical: boolean;
  onMobileMenuToggle?: () => void;
}

export default function TopBar({
  url,
  setUrl,
  onRunAudit,
  urlError,
  loading,
  apiKey,
  showApiKey,
  setShowApiKey,
  setApiKey,
  hasCritical,
  onMobileMenuToggle,
}: TopBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onRunAudit();
    }
  };

  return (
    <div className="dashboard-topbar">
      <div className="glass-header rounded-2xl px-4 sm:px-5 py-3">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile hamburger */}
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-xl hover:bg-white/20 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={20} className="text-[#6b7280]" />
            </button>
          )}

          {/* Search bar */}
          <div className="flex-1 flex items-center">
            <div className="glass-input rounded-full h-12 flex items-center px-5 gap-3 w-full max-w-2xl">
              <Search size={17} className="text-[#9ca3af] flex-shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="flex-1 bg-transparent text-[14px] text-[#374151] placeholder:text-[#9ca3af] outline-none font-[var(--font-jakarta)]"
              />
              <AnimatePresence>
                {url.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    onClick={onRunAudit}
                    disabled={loading}
                    className="bg-[#3b82f6] text-white rounded-full px-5 py-2 text-[13px] font-medium hover:bg-[#2563eb] transition-colors disabled:opacity-60 flex-shrink-0 whitespace-nowrap"
                  >
                    {loading ? "Analyzing..." : "Analyze →"}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right side */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Bell */}
            <button className="relative p-2 rounded-xl hover:bg-white/20 transition-colors">
              <Bell size={20} className="text-[#6b7280]" />
              {hasCritical && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200/50" />

            {/* User area */}
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="text-right hidden md:block">
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#9ca3af] leading-none">
                  DELL LAWYER
                </p>
                <p className="text-[13px] font-semibold text-[#374151] leading-tight mt-0.5">
                  Peter Furby
                </p>
              </div>
              <div className="w-[36px] h-[36px] rounded-full bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[12px] font-semibold">PF</span>
              </div>
              <ChevronDown
                size={14}
                className="text-[#9ca3af] group-hover:text-[#6b7280] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* URL error */}
        <AnimatePresence>
          {urlError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-red-500 text-[12px] mt-2 ml-5"
            >
              {urlError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* API Key panel */}
        <AnimatePresence>
          {showApiKey && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center gap-3">
                  <div className="glass-input rounded-xl h-10 flex items-center px-4 gap-2.5 flex-1 max-w-md">
                    <Key size={14} className="text-[#9ca3af] flex-shrink-0" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="PageSpeed API Key (optional)"
                      className="flex-1 bg-transparent text-[13px] text-[#374151] placeholder:text-[#9ca3af] outline-none"
                    />
                  </div>
                  <a
                    href="https://developers.google.com/speed/docs/insights/v5/get-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[#3b82f6] hover:text-[#2563eb] transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    Get free key
                    <ExternalLink size={11} />
                  </a>
                  <button
                    onClick={() => setShowApiKey(false)}
                    className="text-[12px] text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
