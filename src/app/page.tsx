"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SEODashboard from "@/components/SEODashboard";
import LandingPage from "@/components/landing/LandingPage";

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [initialUrl, setInitialUrl] = useState("");

  const handleAnalyze = (url: string) => {
    setInitialUrl(url);
    setShowDashboard(true);
  };

  const handleBackToLanding = () => {
    setShowDashboard(false);
    setInitialUrl("");
  };

  return (
    <AnimatePresence mode="wait">
      {!showDashboard ? (
        <motion.div
          key="landing"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <LandingPage onAnalyze={handleAnalyze} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <SEODashboard
            initialUrl={initialUrl}
            onBackToLanding={handleBackToLanding}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
