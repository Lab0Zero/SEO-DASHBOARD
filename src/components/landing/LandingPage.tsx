"use client";

import React, { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import { SEOHeroEffect } from "./SEOHeroEffect";
import { Search, BarChart3, Zap, Shield, FileText, TrendingUp } from "lucide-react";

export default function LandingPage({
  onAnalyze,
}: {
  onAnalyze: (url: string) => void;
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.8], [0.2, 1.2]);
  const pathLengthSecond = useTransform(scrollYProgress, [0, 0.8], [0.15, 1.2]);
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.8], [0.1, 1.2]);
  const pathLengthFourth = useTransform(scrollYProgress, [0, 0.8], [0.05, 1.2]);
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Hero Section with scroll-driven SVG */}
      <div
        ref={ref}
        className="h-[400vh] bg-black w-full relative pt-20 md:pt-40 overflow-clip"
      >
        <SEOHeroEffect
          pathLengths={[
            pathLengthFirst,
            pathLengthSecond,
            pathLengthThird,
            pathLengthFourth,
            pathLengthFifth,
          ]}
          onAnalyze={onAnalyze}
        />
      </div>

      {/* Features Section */}
      <div className="relative bg-black pb-20 md:pb-32">
        {/* Top gradient fade */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black to-transparent z-10" />

        <div className="max-w-5xl mx-auto px-5 md:px-8 relative z-20">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-16 md:mb-24"
          >
            <p className="text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-neutral-500 mb-4">
              Everything you need
            </p>
            <h2 className="text-2xl md:text-5xl font-normal bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-400">
              Comprehensive SEO Analysis
            </h2>
            <p className="text-sm md:text-lg text-neutral-500 mt-4 max-w-xl mx-auto">
              40+ real signals analyzed across 7 categories, from performance metrics to technical SEO.
            </p>
          </motion.div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {[
              {
                icon: <Search size={20} />,
                title: "On-Page SEO",
                description:
                  "Title tags, meta descriptions, heading structure, alt texts, canonical tags, hreflang analysis.",
                color: "#FFB7C5",
              },
              {
                icon: <Zap size={20} />,
                title: "Performance Metrics",
                description:
                  "Core Web Vitals (LCP, CLS, TBT), Speed Index, image optimization via PageSpeed Insights.",
                color: "#4FABFF",
              },
              {
                icon: <Shield size={20} />,
                title: "Technical SEO",
                description:
                  "HTTPS, robots.txt, sitemap.xml, structured data, security headers, render-blocking resources.",
                color: "#076EFF",
              },
              {
                icon: <BarChart3 size={20} />,
                title: "Content Quality",
                description:
                  "Word count, content-to-HTML ratio, readability score, heading density analysis.",
                color: "#FFDDB7",
              },
              {
                icon: <FileText size={20} />,
                title: "Social & Metadata",
                description:
                  "Open Graph tags, Twitter Cards, favicon detection, complete social sharing validation.",
                color: "#B1C5FF",
              },
              {
                icon: <TrendingUp size={20} />,
                title: "Action Plan",
                description:
                  "Prioritized fixes with expected score gains. Export as PDF. Critical issues flagged first.",
                color: "#FFB7C5",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-7 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.12]"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: `${feature.color}10`,
                    color: feature.color,
                  }}
                >
                  {feature.icon}
                </div>
                <h3 className="text-sm md:text-base font-medium text-neutral-200 mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs md:text-sm text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mt-16 md:mt-24"
          >
            <p className="text-neutral-500 text-sm mb-6">
              Scroll back up to analyze any website
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-sm font-medium text-white/70 hover:text-white px-6 py-3 rounded-full border border-white/[0.1] hover:border-white/[0.25] transition-all duration-200 hover:bg-white/[0.04]"
            >
              Back to top
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
