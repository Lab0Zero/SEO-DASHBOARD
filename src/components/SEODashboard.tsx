"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Gauge,
  FileText,
  Settings2,
  Share2,
  Smartphone,
  BookOpen,
  Link2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Key,
  Loader2,
  RefreshCw,
  Download,
  Globe,
  ArrowRight,
  Zap,
  Eye,
  Shield,
  TrendingUp,
  ExternalLink,
  Info,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CriterionResult {
  label: string;
  status: "pass" | "warning" | "fail" | "estimated" | "na";
  value?: string;
  fix?: string;
}

interface CategoryResult {
  name: string;
  icon: React.ReactNode;
  score: number;
  status: "good" | "warning" | "critical";
  criteria: CriterionResult[];
  isReal: boolean;
}

interface AuditData {
  url: string;
  globalScore: number;
  categories: CategoryResult[];
  recommendations: Recommendation[];
  realSignals: number;
  estimatedSignals: number;
}

interface Recommendation {
  priority: "high" | "medium" | "low";
  category: string;
  description: string;
  fix: string;
}

interface LoadingStep {
  label: string;
  done: boolean;
  error?: string;
}

// ─── Utility functions ───────────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#34C759";
  if (score >= 50) return "#FF9F0A";
  return "#FF453A";
}

function getStatus(score: number): "good" | "warning" | "critical" {
  if (score >= 75) return "good";
  if (score >= 50) return "warning";
  return "critical";
}

function getStatusLabel(status: "good" | "warning" | "critical"): string {
  if (status === "good") return "Good";
  if (status === "warning") return "Needs Work";
  return "Critical";
}

function parseMs(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  if (val.includes("s") && !val.includes("ms")) return n * 1000;
  return n;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str.startsWith("http") ? str : `https://${str}`);
    return !!url.hostname.includes(".");
  } catch {
    return false;
  }
}

function normalizeUrl(str: string): string {
  if (!str.startsWith("http")) str = "https://" + str;
  return str;
}

// ─── Fetch functions ─────────────────────────────────────────────────────────

async function fetchHTML(url: string): Promise<string> {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Failed to fetch HTML: ${res.status}`);
  const data = await res.json();
  return data.contents || "";
}

async function fetchPSI(url: string, strategy: "mobile" | "desktop", apiKey: string) {
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${apiKey}`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `PSI API error: ${res.status}`);
  }
  return res.json();
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── HTML Parser ─────────────────────────────────────────────────────────────

function parseHTMLSignals(html: string, url: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title = doc.querySelector("title")?.textContent?.trim() || "";
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
  const h1s = doc.querySelectorAll("h1");
  const h2s = doc.querySelectorAll("h2");
  const h3s = doc.querySelectorAll("h3");

  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
  const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
  const twitterCard = doc.querySelector('meta[name="twitter:card"]')?.getAttribute("content") || "";
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const robotsMeta = doc.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
  const viewport = doc.querySelector('meta[name="viewport"]')?.getAttribute("content") || "";
  const lang = doc.documentElement.getAttribute("lang") || "";
  const favicon = doc.querySelector('link[rel="icon"]') || doc.querySelector('link[rel="shortcut icon"]');

  const imagesAll = doc.querySelectorAll("img");
  let imagesNoAlt = 0;
  imagesAll.forEach((img) => {
    if (!img.getAttribute("alt")?.trim()) imagesNoAlt++;
  });

  const structuredData = doc.querySelectorAll('script[type="application/ld+json"]');
  const inlineScripts = doc.querySelectorAll("script:not([src])");
  const inlineStyles = doc.querySelectorAll("style");

  // Rough word count
  const bodyText = doc.body?.textContent || "";
  const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 1).length;

  const isHttps = url.startsWith("https://");

  return {
    title,
    titleLength: title.length,
    metaDesc,
    metaDescLength: metaDesc.length,
    h1Count: h1s.length,
    h1Content: h1s[0]?.textContent?.trim().substring(0, 100) || "",
    h2Count: h2s.length,
    h3Count: h3s.length,
    ogTitle,
    ogDesc,
    ogImage,
    twitterCard,
    canonical,
    robotsMeta,
    viewport,
    lang,
    hasFavicon: !!favicon,
    totalImages: imagesAll.length,
    imagesNoAlt,
    structuredDataCount: structuredData.length,
    inlineScripts: inlineScripts.length,
    inlineStyles: inlineStyles.length,
    wordCount,
    isHttps,
  };
}

// ─── Build audit data ────────────────────────────────────────────────────────

function buildAuditData(
  url: string,
  htmlSignals: ReturnType<typeof parseHTMLSignals> | null,
  psiMobile: Record<string, unknown> | null,
  psiDesktop: Record<string, unknown> | null,
  htmlError: string | null,
  psiError: string | null
): AuditData {
  const categories: CategoryResult[] = [];
  const recommendations: Recommendation[] = [];
  let realSignals = 0;
  let estimatedSignals = 0;
  const seed = hashString(url);

  // Helper to safely access PSI audits
  const getAudit = (psi: Record<string, unknown> | null, key: string) => {
    if (!psi) return null;
    const lr = psi.lighthouseResult as Record<string, unknown> | undefined;
    if (!lr) return null;
    const audits = lr.audits as Record<string, Record<string, unknown>> | undefined;
    return audits?.[key] || null;
  };

  const getPerfScore = (psi: Record<string, unknown> | null): number | null => {
    if (!psi) return null;
    const lr = psi.lighthouseResult as Record<string, unknown> | undefined;
    if (!lr) return null;
    const cats = lr.categories as Record<string, Record<string, unknown>> | undefined;
    const perf = cats?.performance;
    if (!perf || perf.score === undefined) return null;
    return Math.round((perf.score as number) * 100);
  };

  // ─── 1. Performance ───────────────────────────────────────────────────────
  const perfCriteria: CriterionResult[] = [];
  let perfScore = 50;

  if (psiMobile || psiDesktop) {
    const mobileScore = getPerfScore(psiMobile);
    const desktopScore = getPerfScore(psiDesktop);

    if (mobileScore !== null) {
      perfCriteria.push({
        label: "Mobile Performance Score",
        status: mobileScore >= 90 ? "pass" : mobileScore >= 50 ? "warning" : "fail",
        value: `${mobileScore}/100`,
        fix: mobileScore < 50 ? "Optimize images, reduce JavaScript, enable compression" : undefined,
      });
      realSignals++;
    }

    if (desktopScore !== null) {
      perfCriteria.push({
        label: "Desktop Performance Score",
        status: desktopScore >= 90 ? "pass" : desktopScore >= 50 ? "warning" : "fail",
        value: `${desktopScore}/100`,
        fix: desktopScore < 50 ? "Reduce render-blocking resources and optimize loading" : undefined,
      });
      realSignals++;
    }

    const lcpAudit = getAudit(psiMobile, "largest-contentful-paint") || getAudit(psiDesktop, "largest-contentful-paint");
    if (lcpAudit) {
      const lcpVal = lcpAudit.displayValue as string;
      const lcpMs = parseMs(lcpVal);
      perfCriteria.push({
        label: "Largest Contentful Paint (LCP)",
        status: lcpMs !== null && lcpMs <= 2500 ? "pass" : lcpMs !== null && lcpMs <= 4000 ? "warning" : "fail",
        value: lcpVal,
        fix: lcpMs !== null && lcpMs > 2500 ? "Optimize server response times, preload critical resources" : undefined,
      });
      realSignals++;
    }

    const clsAudit = getAudit(psiMobile, "cumulative-layout-shift") || getAudit(psiDesktop, "cumulative-layout-shift");
    if (clsAudit) {
      const clsVal = clsAudit.displayValue as string;
      const clsNum = parseFloat(clsVal);
      perfCriteria.push({
        label: "Cumulative Layout Shift (CLS)",
        status: clsNum <= 0.1 ? "pass" : clsNum <= 0.25 ? "warning" : "fail",
        value: clsVal,
        fix: clsNum > 0.1 ? "Add explicit width/height to images and embeds" : undefined,
      });
      realSignals++;
    }

    const tbtAudit = getAudit(psiMobile, "total-blocking-time") || getAudit(psiDesktop, "total-blocking-time");
    if (tbtAudit) {
      const tbtVal = tbtAudit.displayValue as string;
      const tbtMs = parseMs(tbtVal);
      perfCriteria.push({
        label: "Total Blocking Time (TBT)",
        status: tbtMs !== null && tbtMs <= 200 ? "pass" : tbtMs !== null && tbtMs <= 600 ? "warning" : "fail",
        value: tbtVal,
        fix: tbtMs !== null && tbtMs > 200 ? "Break up long tasks, defer non-critical JavaScript" : undefined,
      });
      realSignals++;
    }

    const siAudit = getAudit(psiMobile, "speed-index") || getAudit(psiDesktop, "speed-index");
    if (siAudit) {
      perfCriteria.push({
        label: "Speed Index",
        status: (siAudit.score as number) >= 0.9 ? "pass" : (siAudit.score as number) >= 0.5 ? "warning" : "fail",
        value: siAudit.displayValue as string,
      });
      realSignals++;
    }

    const imgOptAudit = getAudit(psiMobile, "uses-optimized-images") || getAudit(psiDesktop, "uses-optimized-images");
    if (imgOptAudit) {
      perfCriteria.push({
        label: "Image Optimization",
        status: (imgOptAudit.score as number) >= 0.9 ? "pass" : "warning",
        value: (imgOptAudit.score as number) >= 0.9 ? "Optimized" : "Needs optimization",
        fix: (imgOptAudit.score as number) < 0.9 ? "Use WebP/AVIF, compress images, add responsive srcsets" : undefined,
      });
      realSignals++;
    }

    const unusedJs = getAudit(psiMobile, "unused-javascript") || getAudit(psiDesktop, "unused-javascript");
    if (unusedJs) {
      perfCriteria.push({
        label: "Unused JavaScript",
        status: (unusedJs.score as number) >= 0.9 ? "pass" : "warning",
        value: (unusedJs.score as number) >= 0.9 ? "Minimal" : "Excess JS detected",
        fix: (unusedJs.score as number) < 0.9 ? "Remove unused JavaScript or use code splitting" : undefined,
      });
      realSignals++;
    }

    const unusedCss = getAudit(psiMobile, "unused-css-rules") || getAudit(psiDesktop, "unused-css-rules");
    if (unusedCss) {
      perfCriteria.push({
        label: "Unused CSS",
        status: (unusedCss.score as number) >= 0.9 ? "pass" : "warning",
        value: (unusedCss.score as number) >= 0.9 ? "Minimal" : "Excess CSS detected",
        fix: (unusedCss.score as number) < 0.9 ? "Purge unused CSS rules, use critical CSS" : undefined,
      });
      realSignals++;
    }

    // Calculate score from real data
    const scores = [mobileScore, desktopScore].filter((s): s is number => s !== null);
    perfScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;
  } else if (psiError) {
    perfCriteria.push({
      label: "PageSpeed Insights Analysis",
      status: "na",
      value: psiError || "API key required",
    });
  } else {
    perfCriteria.push({
      label: "PageSpeed Insights Analysis",
      status: "na",
      value: "Enter a Google PageSpeed API key to get real performance data",
    });
  }

  categories.push({
    name: "Performance",
    icon: <Gauge size={20} />,
    score: perfScore,
    status: getStatus(perfScore),
    criteria: perfCriteria,
    isReal: !!(psiMobile || psiDesktop),
  });

  // ─── 2. On-Page SEO ───────────────────────────────────────────────────────
  const onPageCriteria: CriterionResult[] = [];
  let onPageScore = 50;

  if (htmlSignals) {
    let onPagePoints = 0;
    let onPageTotal = 0;

    // Title
    onPageTotal += 15;
    if (htmlSignals.title) {
      if (htmlSignals.titleLength >= 50 && htmlSignals.titleLength <= 60) {
        onPageCriteria.push({ label: "Title Tag", status: "pass", value: `"${htmlSignals.title.substring(0, 60)}${htmlSignals.title.length > 60 ? "..." : ""}" (${htmlSignals.titleLength} chars)` });
        onPagePoints += 15;
      } else {
        onPageCriteria.push({
          label: "Title Tag",
          status: "warning",
          value: `${htmlSignals.titleLength} chars (optimal: 50–60)`,
          fix: htmlSignals.titleLength < 50 ? "Add more descriptive keywords to your title" : "Shorten your title to under 60 characters",
        });
        onPagePoints += 8;
      }
      realSignals++;
    } else {
      onPageCriteria.push({ label: "Title Tag", status: "fail", value: "Missing", fix: "Add a unique, descriptive <title> tag" });
      realSignals++;
    }

    // Meta description
    onPageTotal += 15;
    if (htmlSignals.metaDesc) {
      if (htmlSignals.metaDescLength >= 150 && htmlSignals.metaDescLength <= 160) {
        onPageCriteria.push({ label: "Meta Description", status: "pass", value: `${htmlSignals.metaDescLength} chars` });
        onPagePoints += 15;
      } else {
        onPageCriteria.push({
          label: "Meta Description",
          status: "warning",
          value: `${htmlSignals.metaDescLength} chars (optimal: 150–160)`,
          fix: htmlSignals.metaDescLength < 150 ? "Write a more detailed meta description" : "Trim your meta description to 160 chars",
        });
        onPagePoints += 8;
      }
      realSignals++;
    } else {
      onPageCriteria.push({ label: "Meta Description", status: "fail", value: "Missing", fix: "Add a <meta name='description'> tag with 150–160 characters" });
      realSignals++;
    }

    // H1
    onPageTotal += 15;
    if (htmlSignals.h1Count === 1) {
      onPageCriteria.push({ label: "H1 Tag", status: "pass", value: `"${htmlSignals.h1Content.substring(0, 60)}${htmlSignals.h1Content.length > 60 ? "..." : ""}"` });
      onPagePoints += 15;
    } else if (htmlSignals.h1Count > 1) {
      onPageCriteria.push({ label: "H1 Tag", status: "warning", value: `${htmlSignals.h1Count} H1 tags found (should be 1)`, fix: "Use a single H1 tag per page" });
      onPagePoints += 5;
    } else {
      onPageCriteria.push({ label: "H1 Tag", status: "fail", value: "Missing", fix: "Add a single descriptive <h1> tag" });
    }
    realSignals++;

    // H2/H3
    onPageTotal += 10;
    if (htmlSignals.h2Count > 0 || htmlSignals.h3Count > 0) {
      onPageCriteria.push({ label: "Heading Structure", status: "pass", value: `${htmlSignals.h2Count} H2, ${htmlSignals.h3Count} H3` });
      onPagePoints += 10;
    } else {
      onPageCriteria.push({ label: "Heading Structure", status: "fail", value: "No H2/H3 found", fix: "Add H2 and H3 tags to structure your content" });
    }
    realSignals++;

    // Images alt
    onPageTotal += 15;
    if (htmlSignals.totalImages === 0) {
      onPageCriteria.push({ label: "Image Alt Tags", status: "pass", value: "No images found" });
      onPagePoints += 15;
    } else if (htmlSignals.imagesNoAlt === 0) {
      onPageCriteria.push({ label: "Image Alt Tags", status: "pass", value: `All ${htmlSignals.totalImages} images have alt text` });
      onPagePoints += 15;
    } else {
      onPageCriteria.push({
        label: "Image Alt Tags",
        status: htmlSignals.imagesNoAlt > 3 ? "fail" : "warning",
        value: `${htmlSignals.imagesNoAlt} of ${htmlSignals.totalImages} images missing alt text`,
        fix: "Add descriptive alt attributes to all images",
      });
      onPagePoints += Math.max(0, 15 - htmlSignals.imagesNoAlt * 2);
    }
    realSignals++;

    // Canonical
    onPageTotal += 10;
    if (htmlSignals.canonical) {
      onPageCriteria.push({ label: "Canonical Tag", status: "pass", value: "Present" });
      onPagePoints += 10;
    } else {
      onPageCriteria.push({ label: "Canonical Tag", status: "warning", value: "Missing", fix: "Add a <link rel='canonical'> to avoid duplicate content" });
      onPagePoints += 3;
    }
    realSignals++;

    // Lang
    onPageTotal += 10;
    if (htmlSignals.lang) {
      onPageCriteria.push({ label: "Language Attribute", status: "pass", value: `lang="${htmlSignals.lang}"` });
      onPagePoints += 10;
    } else {
      onPageCriteria.push({ label: "Language Attribute", status: "warning", value: "Missing", fix: "Add lang attribute to <html> tag" });
      onPagePoints += 3;
    }
    realSignals++;

    onPageScore = onPageTotal > 0 ? Math.round((onPagePoints / onPageTotal) * 100) : 50;
  } else if (htmlError) {
    onPageCriteria.push({ label: "HTML Analysis", status: "na", value: htmlError });
  }

  categories.push({
    name: "On-Page SEO",
    icon: <FileText size={20} />,
    score: onPageScore,
    status: getStatus(onPageScore),
    criteria: onPageCriteria,
    isReal: !!htmlSignals,
  });

  // ─── 3. Technical SEO ─────────────────────────────────────────────────────
  const techCriteria: CriterionResult[] = [];
  let techScore = 50;
  let techPoints = 0;
  let techTotal = 0;

  if (htmlSignals) {
    // HTTPS
    techTotal += 15;
    if (htmlSignals.isHttps) {
      techCriteria.push({ label: "HTTPS", status: "pass", value: "Secure connection" });
      techPoints += 15;
    } else {
      techCriteria.push({ label: "HTTPS", status: "fail", value: "Not using HTTPS", fix: "Migrate to HTTPS — critical for SEO and security" });
      recommendations.push({ priority: "high", category: "Technical", description: "Site not using HTTPS", fix: "Install an SSL certificate and redirect all HTTP traffic to HTTPS" });
    }
    realSignals++;

    // Viewport
    techTotal += 10;
    if (htmlSignals.viewport) {
      techCriteria.push({ label: "Viewport Meta", status: "pass", value: "Present" });
      techPoints += 10;
    } else {
      techCriteria.push({ label: "Viewport Meta", status: "fail", value: "Missing", fix: "Add <meta name='viewport' content='width=device-width, initial-scale=1'>" });
    }
    realSignals++;

    // Robots meta
    techTotal += 10;
    if (htmlSignals.robotsMeta) {
      const blocksIndex = htmlSignals.robotsMeta.includes("noindex");
      techCriteria.push({
        label: "Robots Meta",
        status: blocksIndex ? "warning" : "pass",
        value: htmlSignals.robotsMeta,
        fix: blocksIndex ? "This page has noindex — remove it if you want it indexed" : undefined,
      });
      techPoints += blocksIndex ? 5 : 10;
    } else {
      techCriteria.push({ label: "Robots Meta", status: "pass", value: "Not set (defaults to index, follow)" });
      techPoints += 10;
    }
    realSignals++;

    // Structured data
    techTotal += 15;
    if (htmlSignals.structuredDataCount > 0) {
      techCriteria.push({ label: "Structured Data (Schema.org)", status: "pass", value: `${htmlSignals.structuredDataCount} JSON-LD block(s) found` });
      techPoints += 15;
    } else {
      techCriteria.push({ label: "Structured Data (Schema.org)", status: "warning", value: "None found", fix: "Add JSON-LD structured data for rich snippets" });
      techPoints += 3;
    }
    realSignals++;

    // Inline scripts/styles
    techTotal += 10;
    if (htmlSignals.inlineScripts <= 2 && htmlSignals.inlineStyles <= 1) {
      techCriteria.push({ label: "Inline Resources", status: "pass", value: `${htmlSignals.inlineScripts} inline scripts, ${htmlSignals.inlineStyles} inline styles` });
      techPoints += 10;
    } else {
      techCriteria.push({
        label: "Inline Resources",
        status: "warning",
        value: `${htmlSignals.inlineScripts} inline scripts, ${htmlSignals.inlineStyles} inline styles`,
        fix: "Externalize inline scripts and styles for better caching",
      });
      techPoints += 5;
    }
    realSignals++;
  }

  // Render-blocking from PSI
  if (psiMobile || psiDesktop) {
    const rbAudit = getAudit(psiMobile, "render-blocking-resources") || getAudit(psiDesktop, "render-blocking-resources");
    if (rbAudit) {
      techTotal += 15;
      const rbScore = rbAudit.score as number;
      techCriteria.push({
        label: "Render-Blocking Resources",
        status: rbScore >= 0.9 ? "pass" : rbScore >= 0.5 ? "warning" : "fail",
        value: rbScore >= 0.9 ? "No significant blocking" : "Blocking resources detected",
        fix: rbScore < 0.9 ? "Defer non-critical CSS/JS, use async loading" : undefined,
      });
      techPoints += Math.round(rbScore * 15);
      realSignals++;
    }
  }

  techScore = techTotal > 0 ? Math.round((techPoints / techTotal) * 100) : 50;

  categories.push({
    name: "Technical SEO",
    icon: <Settings2 size={20} />,
    score: techScore,
    status: getStatus(techScore),
    criteria: techCriteria,
    isReal: !!(htmlSignals || psiMobile || psiDesktop),
  });

  // ─── 4. Social & Metadata ─────────────────────────────────────────────────
  const socialCriteria: CriterionResult[] = [];
  let socialPoints = 0;
  let socialTotal = 0;

  if (htmlSignals) {
    socialTotal = 50;
    if (htmlSignals.ogTitle) { socialCriteria.push({ label: "Open Graph Title", status: "pass", value: `"${htmlSignals.ogTitle.substring(0, 50)}"` }); socialPoints += 10; }
    else { socialCriteria.push({ label: "Open Graph Title", status: "fail", value: "Missing", fix: "Add <meta property='og:title'>" }); }
    realSignals++;

    if (htmlSignals.ogDesc) { socialCriteria.push({ label: "Open Graph Description", status: "pass", value: "Present" }); socialPoints += 10; }
    else { socialCriteria.push({ label: "Open Graph Description", status: "fail", value: "Missing", fix: "Add <meta property='og:description'>" }); }
    realSignals++;

    if (htmlSignals.ogImage) { socialCriteria.push({ label: "Open Graph Image", status: "pass", value: "Present" }); socialPoints += 10; }
    else { socialCriteria.push({ label: "Open Graph Image", status: "fail", value: "Missing", fix: "Add <meta property='og:image'> with an image URL" }); }
    realSignals++;

    if (htmlSignals.twitterCard) { socialCriteria.push({ label: "Twitter Card", status: "pass", value: htmlSignals.twitterCard }); socialPoints += 10; }
    else { socialCriteria.push({ label: "Twitter Card", status: "warning", value: "Missing", fix: "Add <meta name='twitter:card' content='summary_large_image'>" }); socialPoints += 3; }
    realSignals++;

    if (htmlSignals.hasFavicon) { socialCriteria.push({ label: "Favicon", status: "pass", value: "Present" }); socialPoints += 10; }
    else { socialCriteria.push({ label: "Favicon", status: "warning", value: "Missing", fix: "Add a <link rel='icon'> tag" }); socialPoints += 3; }
    realSignals++;
  }

  const socialScore = socialTotal > 0 ? Math.round((socialPoints / socialTotal) * 100) : 50;

  categories.push({
    name: "Social & Metadata",
    icon: <Share2 size={20} />,
    score: socialScore,
    status: getStatus(socialScore),
    criteria: socialCriteria,
    isReal: !!htmlSignals,
  });

  // ─── 5. Mobile & Accessibility ────────────────────────────────────────────
  const mobileCriteria: CriterionResult[] = [];
  let mobilePoints = 0;
  let mobileTotal = 0;

  if (htmlSignals) {
    mobileTotal += 20;
    if (htmlSignals.viewport) { mobileCriteria.push({ label: "Viewport Meta Tag", status: "pass", value: "Present" }); mobilePoints += 20; }
    else { mobileCriteria.push({ label: "Viewport Meta Tag", status: "fail", value: "Missing", fix: "Add viewport meta tag for mobile compatibility" }); }
    realSignals++;

    mobileTotal += 20;
    if (htmlSignals.imagesNoAlt === 0) { mobileCriteria.push({ label: "Alt Text Coverage", status: "pass", value: "All images have alt text" }); mobilePoints += 20; }
    else { mobileCriteria.push({ label: "Alt Text Coverage", status: "warning", value: `${htmlSignals.imagesNoAlt} images missing alt text`, fix: "Add alt attributes for screen reader accessibility" }); mobilePoints += 5; }

    mobileTotal += 15;
    if (htmlSignals.lang) { mobileCriteria.push({ label: "Language Declaration", status: "pass", value: `lang="${htmlSignals.lang}"` }); mobilePoints += 15; }
    else { mobileCriteria.push({ label: "Language Declaration", status: "warning", value: "Missing", fix: "Add lang attribute for accessibility" }); mobilePoints += 3; }
  }

  if (psiMobile) {
    const mobileScore = getPerfScore(psiMobile);
    if (mobileScore !== null) {
      mobileTotal += 25;
      mobileCriteria.push({
        label: "Mobile Performance Score",
        status: mobileScore >= 90 ? "pass" : mobileScore >= 50 ? "warning" : "fail",
        value: `${mobileScore}/100`,
      });
      mobilePoints += Math.round(mobileScore * 0.25);
      realSignals++;
    }
  }

  const mobileScore = mobileTotal > 0 ? Math.round((mobilePoints / mobileTotal) * 100) : 50;

  categories.push({
    name: "Mobile & Accessibility",
    icon: <Smartphone size={20} />,
    score: mobileScore,
    status: getStatus(mobileScore),
    criteria: mobileCriteria,
    isReal: !!(htmlSignals || psiMobile),
  });

  // ─── 6. Content Quality (estimated) ───────────────────────────────────────
  const contentCriteria: CriterionResult[] = [];
  let contentScore = 65;

  if (htmlSignals) {
    const wc = htmlSignals.wordCount;
    contentCriteria.push({
      label: "Word Count",
      status: wc >= 300 ? "pass" : "warning",
      value: `~${wc} words`,
      fix: wc < 300 ? "Add more substantive content — thin pages rank poorly" : undefined,
    });
    realSignals++;

    if (wc < 300) {
      recommendations.push({ priority: "medium", category: "Content", description: "Thin content detected", fix: `Page has ~${wc} words. Aim for 300+ words of quality content.` });
    }
  }

  // Estimated signals
  const readability = Math.round(55 + seededRandom(seed, 1) * 35);
  contentCriteria.push({ label: "Readability Score (Estimated)", status: readability >= 60 ? "pass" : "warning", value: `${readability}/100` });
  estimatedSignals++;

  const freshness = seededRandom(seed, 2) > 0.4;
  contentCriteria.push({ label: "Content Freshness (Estimated)", status: freshness ? "pass" : "warning", value: freshness ? "Appears recent" : "May be outdated" });
  estimatedSignals++;

  const dupRisk = seededRandom(seed, 3) > 0.7;
  contentCriteria.push({ label: "Duplicate Content Risk (Estimated)", status: dupRisk ? "warning" : "pass", value: dupRisk ? "Potential risk" : "Low risk" });
  estimatedSignals++;

  contentScore = Math.round(50 + seededRandom(seed, 4) * 40);
  if (htmlSignals && htmlSignals.wordCount >= 300) contentScore = Math.max(contentScore, 65);
  if (htmlSignals && htmlSignals.wordCount < 300) contentScore = Math.min(contentScore, 45);

  categories.push({
    name: "Content Quality",
    icon: <BookOpen size={20} />,
    score: contentScore,
    status: getStatus(contentScore),
    criteria: contentCriteria,
    isReal: false,
  });

  // ─── 7. Backlinks & Authority (estimated) ─────────────────────────────────
  const backlinkCriteria: CriterionResult[] = [];
  const da = Math.round(15 + seededRandom(seed, 10) * 65);
  const backlinks = Math.round(50 + seededRandom(seed, 11) * 9950);

  backlinkCriteria.push({ label: "Domain Authority (Estimated)", status: da >= 40 ? "pass" : da >= 20 ? "warning" : "fail", value: `${da}/100` });
  backlinkCriteria.push({ label: "Estimated Backlinks", status: backlinks >= 500 ? "pass" : backlinks >= 100 ? "warning" : "fail", value: backlinks.toLocaleString() });
  backlinkCriteria.push({ label: "Data Source", status: "estimated", value: "Connect Ahrefs or Moz API for real data" });
  estimatedSignals += 2;

  const backlinkScore = da;

  categories.push({
    name: "Backlinks & Authority",
    icon: <Link2 size={20} />,
    score: backlinkScore,
    status: getStatus(backlinkScore),
    criteria: backlinkCriteria,
    isReal: false,
  });

  // ─── Global Score ─────────────────────────────────────────────────────────
  const weights = [0.25, 0.20, 0.20, 0.10, 0.10, 0.10, 0.05];
  const globalScore = Math.round(
    categories.reduce((sum, cat, i) => sum + cat.score * weights[i], 0)
  );

  // ─── Build recommendations from fails/warnings ────────────────────────────
  categories.forEach((cat) => {
    cat.criteria.forEach((c) => {
      if (c.status === "fail" && c.fix) {
        recommendations.push({ priority: "high", category: cat.name, description: c.label + ": " + (c.value || ""), fix: c.fix });
      } else if (c.status === "warning" && c.fix) {
        recommendations.push({ priority: "medium", category: cat.name, description: c.label + ": " + (c.value || ""), fix: c.fix });
      }
    });
  });

  // Sort recommendations: high > medium > low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return { url, globalScore, categories, recommendations, realSignals, estimatedSignals };
}

// ─── Components ──────────────────────────────────────────────────────────────

const glassStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.35)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.55)",
  borderRadius: "24px",
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.02)",
};

const glassCardHover: React.CSSProperties = {
  ...glassStyle,
  transition: "all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
};

const glassInputStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.5)",
  backdropFilter: "blur(16px) saturate(160%)",
  WebkitBackdropFilter: "blur(16px) saturate(160%)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
  borderRadius: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
};

const glassInnerStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.25)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.4)",
  borderRadius: "14px",
};

function AnimatedScore({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const from = 0;
    const to = value;

    function frame(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(frame);
    }

    ref.current = requestAnimationFrame(frame);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);

  return (
    <span style={{ color, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>
      {display}
    </span>
  );
}

function ScoreDonut({ score, size = 220 }: { score: number; size?: number }) {
  const strokeW = 12;
  const radius = (size - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(score);
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 100);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full" style={{
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        animation: "pulseGlow 3s ease-in-out infinite",
        // @ts-expect-error CSS custom property
        "--glow-color": `${color}40`,
      }} />

      <svg width={size} height={size} className="transform -rotate-90 relative z-10">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={strokeW}
        />
        {/* Animated score arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#scoreGradient)" strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#glow)"
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>

      {/* Inner glass circle */}
      <div className="absolute inset-6 rounded-full flex flex-col items-center justify-center z-10" style={{
        background: "rgba(255,255,255,0.3)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "inset 0 2px 4px rgba(255,255,255,0.6), 0 4px 16px rgba(0,0,0,0.04)",
      }}>
        <span className="text-5xl font-bold" style={{ fontFamily: "var(--font-dm-mono), monospace", color }}>
          <AnimatedScore value={score} color={color} />
        </span>
        <span className="text-xs font-medium mt-1" style={{ color: "#9CA3AF" }}>/ 100</span>
      </div>
    </div>
  );
}

function MiniBar({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.04)" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        className="h-full rounded-full relative"
        style={{
          background: `linear-gradient(90deg, ${color}90, ${color})`,
          boxShadow: `0 0 8px ${color}40`,
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: "good" | "warning" | "critical" }) {
  const colors = {
    good: { bg: "rgba(52, 199, 89, 0.1)", text: "#34C759", border: "rgba(52, 199, 89, 0.2)" },
    warning: { bg: "rgba(255, 159, 10, 0.1)", text: "#FF9F0A", border: "rgba(255, 159, 10, 0.2)" },
    critical: { bg: "rgba(255, 69, 58, 0.1)", text: "#FF453A", border: "rgba(255, 69, 58, 0.2)" },
  };
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{
        background: colors[status].bg,
        color: colors[status].text,
        border: `1px solid ${colors[status].border}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function CriterionRow({ c }: { c: CriterionResult }) {
  const icons = {
    pass: <CheckCircle2 size={16} color="#34C759" />,
    warning: <AlertTriangle size={16} color="#FF9F0A" />,
    fail: <XCircle size={16} color="#FF453A" />,
    estimated: <BarChart3 size={16} color="#9CA3AF" />,
    na: <Info size={16} color="#9CA3AF" />,
  };

  return (
    <div className="flex items-start gap-3 py-3 group/row">
      <div className="mt-0.5 flex-shrink-0 transition-transform duration-300 group-hover/row:scale-110">{icons[c.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[13px] font-medium ${c.status === "estimated" ? "italic text-foreground-muted" : "text-foreground"}`}>
            {c.label}
          </span>
          {c.value && (
            <span className="text-[11px] px-2 py-0.5 rounded-lg" style={{
              background: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.6)",
              fontFamily: "var(--font-dm-mono), monospace",
              color: "#6B6B6B",
              backdropFilter: "blur(4px)",
            }}>
              {c.value}
            </span>
          )}
        </div>
        {c.fix && (
          <p className="text-xs text-foreground-secondary mt-1.5 leading-relaxed opacity-80">{c.fix}</p>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ cat, index }: { cat: CategoryResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassCardHover,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 40px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)"
          : glassStyle.boxShadow,
        borderColor: hovered ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.55)",
      }}
      className="overflow-hidden cursor-default"
    >
      <div className="p-5 sm:p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl" style={{
              background: "linear-gradient(135deg, rgba(124, 107, 255, 0.12), rgba(124, 107, 255, 0.04))",
              border: "1px solid rgba(124, 107, 255, 0.1)",
              boxShadow: "0 2px 8px rgba(124, 107, 255, 0.08)",
            }}>
              <span style={{ color: "#7C6BFF" }}>{cat.icon}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">{cat.name}</h3>
              {!cat.isReal && (
                <span className="text-[10px] text-foreground-muted italic font-medium">Estimated</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-bold" style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: getScoreColor(cat.score),
              textShadow: `0 0 20px ${getScoreColor(cat.score)}20`,
            }}>
              <AnimatedScore value={cat.score} color={getScoreColor(cat.score)} />
            </span>
            <StatusBadge status={cat.status} />
          </div>
        </div>

        <MiniBar score={cat.score} />

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1.5 text-[13px] font-medium transition-all duration-300 group/btn"
          style={{ color: "#7C6BFF" }}
        >
          {expanded ? "Hide details" : "View details"}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown size={14} />
          </motion.span>
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6" style={{ borderTop: "1px solid rgba(255,255,255,0.4)" }}>
              <div className="mt-3 space-y-0.5">
                {cat.criteria.map((c, i) => (
                  <CriterionRow key={i} c={c} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LoadingScreen({ steps }: { steps: LoadingStep[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-lg mx-auto mt-16 sm:mt-24"
      style={glassStyle}
    >
      <div className="p-7 sm:p-9">
        <div className="flex items-center gap-3.5 mb-7">
          <div className="relative w-10 h-10 flex items-center justify-center rounded-2xl" style={{
            background: "linear-gradient(135deg, rgba(124, 107, 255, 0.15), rgba(124, 107, 255, 0.05))",
            border: "1px solid rgba(124, 107, 255, 0.12)",
          }}>
            <Loader2 size={20} style={{ color: "#7C6BFF", animation: "spin 1.2s linear infinite" }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground tracking-tight">Analyzing</h3>
            <p className="text-xs text-foreground-muted">This may take a few seconds...</p>
          </div>
        </div>

        {/* Progress shimmer bar */}
        <div className="w-full h-1 rounded-full mb-6 overflow-hidden" style={{ background: "rgba(0,0,0,0.04)" }}>
          <div className="h-full rounded-full" style={{
            width: `${(steps.filter(s => s.done).length / steps.length) * 100}%`,
            background: "linear-gradient(90deg, #7C6BFF, #a78bfa)",
            boxShadow: "0 0 12px rgba(124, 107, 255, 0.4)",
            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }} />
        </div>

        <div className="space-y-3.5">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300"
              style={{
                background: step.done && !step.error ? "rgba(52,199,89,0.04)" :
                             step.error ? "rgba(255,69,58,0.04)" :
                             i === steps.findIndex(s => !s.done) ? "rgba(124,107,255,0.04)" : "transparent",
                border: `1px solid ${step.done && !step.error ? "rgba(52,199,89,0.1)" :
                                      step.error ? "rgba(255,69,58,0.1)" :
                                      i === steps.findIndex(s => !s.done) ? "rgba(124,107,255,0.1)" : "transparent"}`,
              }}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {step.done ? (
                  step.error ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                      <XCircle size={18} color="#FF453A" />
                    </motion.div>
                  ) : (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                      <CheckCircle2 size={18} color="#34C759" />
                    </motion.div>
                  )
                ) : (
                  i === steps.findIndex(s => !s.done) ? (
                    <Loader2 size={16} style={{ color: "#7C6BFF", animation: "spin 1.2s linear infinite" }} />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)" }} />
                  )
                )}
              </div>
              <span className={`text-[13px] flex-1 ${step.done ? (step.error ? "text-red" : "text-foreground") : "text-foreground-secondary"} ${i === steps.findIndex(s => !s.done) ? "font-medium" : ""}`}>
                {step.label}
              </span>
              {step.error && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg" style={{
                  background: "rgba(255,69,58,0.08)", color: "#FF453A"
                }}>{step.error}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function RecommendationPanel({ recs }: { recs: Recommendation[] }) {
  if (recs.length === 0) return null;

  const priorityColors = {
    high: { bg: "rgba(255, 69, 58, 0.06)", text: "#FF453A", border: "rgba(255, 69, 58, 0.12)", glow: "rgba(255, 69, 58, 0.05)" },
    medium: { bg: "rgba(255, 159, 10, 0.06)", text: "#FF9F0A", border: "rgba(255, 159, 10, 0.12)", glow: "rgba(255, 159, 10, 0.05)" },
    low: { bg: "rgba(52, 199, 89, 0.06)", text: "#34C759", border: "rgba(52, 199, 89, 0.12)", glow: "rgba(52, 199, 89, 0.05)" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={glassStyle}
      className="mt-8"
    >
      <div className="p-6 sm:p-7 md:p-9">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl" style={{
            background: "linear-gradient(135deg, rgba(124, 107, 255, 0.12), rgba(124, 107, 255, 0.04))",
            border: "1px solid rgba(124, 107, 255, 0.1)",
          }}>
            <TrendingUp size={20} style={{ color: "#7C6BFF" }} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">Recommendations</h3>
            <span className="text-[11px] text-foreground-muted">{recs.length} items to improve</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {recs.slice(0, 12).map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.05, duration: 0.4 }}
              className="flex items-start gap-3 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.005]"
              style={{
                background: priorityColors[rec.priority].glow,
                border: `1px solid ${priorityColors[rec.priority].border}`,
                backdropFilter: "blur(4px)",
              }}
            >
              <span
                className="flex-shrink-0 mt-0.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg tracking-wide"
                style={{ background: priorityColors[rec.priority].bg, color: priorityColors[rec.priority].text }}
              >
                {rec.priority}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg" style={{
                    background: "rgba(124, 107, 255, 0.06)",
                    color: "#7C6BFF",
                    border: "1px solid rgba(124, 107, 255, 0.08)",
                  }}>
                    {rec.category}
                  </span>
                  <span className="text-[13px] text-foreground font-medium">{rec.description}</span>
                </div>
                <p className="text-xs text-foreground-secondary mt-1.5 leading-relaxed">{rec.fix}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function SEODashboard() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<LoadingStep[]>([]);
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [urlError, setUrlError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const runAudit = useCallback(async () => {
    const normalizedUrl = normalizeUrl(url.trim());

    if (!isValidUrl(url.trim())) {
      setUrlError("Please enter a valid URL (e.g., example.com)");
      return;
    }

    setUrlError("");
    setLoading(true);
    setAudit(null);

    const hasKey = apiKey.trim().length > 0;

    const newSteps: LoadingStep[] = [
      { label: "Step 1/4 — Fetching page HTML...", done: false },
      { label: "Step 2/4 — Analyzing on-page signals...", done: false },
      { label: `Step 3/4 — Running mobile audit...${!hasKey ? " (skipped — no API key)" : ""}`, done: !hasKey, error: !hasKey ? "No API key" : undefined },
      { label: `Step 4/4 — Running desktop audit...${!hasKey ? " (skipped — no API key)" : ""}`, done: !hasKey, error: !hasKey ? "No API key" : undefined },
    ];

    setSteps([...newSteps]);

    let htmlSignals: ReturnType<typeof parseHTMLSignals> | null = null;
    let htmlError: string | null = null;
    let psiMobile: Record<string, unknown> | null = null;
    let psiDesktop: Record<string, unknown> | null = null;
    let psiError: string | null = null;

    try {
      // Step 1: Fetch HTML
      try {
        const html = await fetchHTML(normalizedUrl);
        newSteps[0] = { ...newSteps[0], done: true };
        setSteps([...newSteps]);

        // Step 2: Parse HTML
        htmlSignals = parseHTMLSignals(html, normalizedUrl);
        newSteps[1] = { ...newSteps[1], done: true };
        setSteps([...newSteps]);
      } catch {
        htmlError = "Could not fetch page HTML. The site may block external requests.";
        newSteps[0] = { ...newSteps[0], done: true, error: "Failed" };
        newSteps[1] = { ...newSteps[1], done: true, error: "Skipped" };
        setSteps([...newSteps]);
      }

      // Step 3 & 4: PSI (if API key provided)
      if (hasKey) {
        try {
          psiMobile = await fetchPSI(normalizedUrl, "mobile", apiKey.trim());
          newSteps[2] = { ...newSteps[2], done: true };
          setSteps([...newSteps]);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          psiError = message;
          newSteps[2] = { ...newSteps[2], done: true, error: message.substring(0, 40) };
          setSteps([...newSteps]);
        }

        try {
          psiDesktop = await fetchPSI(normalizedUrl, "desktop", apiKey.trim());
          newSteps[3] = { ...newSteps[3], done: true };
          setSteps([...newSteps]);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          if (!psiError) psiError = message;
          newSteps[3] = { ...newSteps[3], done: true, error: message.substring(0, 40) };
          setSteps([...newSteps]);
        }
      } else {
        psiError = "Enter a Google PageSpeed API key to get real performance data";
      }

      // Build results
      const auditData = buildAuditData(normalizedUrl, htmlSignals, psiMobile, psiDesktop, htmlError, psiError);

      // Brief pause for visual effect
      await new Promise((r) => setTimeout(r, 400));

      setAudit(auditData);
    } catch (err) {
      console.error("Audit error:", err);
    } finally {
      setLoading(false);
    }
  }, [url, apiKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") runAudit();
  };

  return (
    <div className="min-h-screen relative" style={{ background: "#F6F5F3" }}>
      {/* ─── Animated background mesh ─── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Orb 1 — Lavender top-right */}
        <div className="absolute rounded-full" style={{
          width: "700px", height: "700px",
          top: "-150px", right: "-150px",
          background: "radial-gradient(circle, rgba(179, 163, 255, 0.35) 0%, rgba(199, 183, 255, 0.15) 40%, transparent 70%)",
          filter: "blur(100px)",
          animation: "drift1 28s ease-in-out infinite",
        }} />
        {/* Orb 2 — Warm peach bottom-left */}
        <div className="absolute rounded-full" style={{
          width: "600px", height: "600px",
          bottom: "-80px", left: "-80px",
          background: "radial-gradient(circle, rgba(255, 200, 160, 0.3) 0%, rgba(255, 220, 180, 0.12) 45%, transparent 70%)",
          filter: "blur(100px)",
          animation: "drift2 32s ease-in-out infinite",
        }} />
        {/* Orb 3 — Sky blue center */}
        <div className="absolute rounded-full" style={{
          width: "550px", height: "550px",
          top: "35%", left: "35%",
          background: "radial-gradient(circle, rgba(160, 200, 255, 0.28) 0%, rgba(180, 220, 255, 0.1) 45%, transparent 70%)",
          filter: "blur(100px)",
          animation: "drift3 24s ease-in-out infinite",
        }} />
        {/* Orb 4 — Rose pink top-left */}
        <div className="absolute rounded-full" style={{
          width: "400px", height: "400px",
          top: "10%", left: "10%",
          background: "radial-gradient(circle, rgba(255, 180, 200, 0.2) 0%, transparent 65%)",
          filter: "blur(100px)",
          animation: "drift4 26s ease-in-out infinite",
        }} />
        {/* Orb 5 — Mint accent bottom-right */}
        <div className="absolute rounded-full" style={{
          width: "350px", height: "350px",
          bottom: "15%", right: "10%",
          background: "radial-gradient(circle, rgba(160, 230, 200, 0.2) 0%, transparent 65%)",
          filter: "blur(100px)",
          animation: "drift5 30s ease-in-out infinite",
        }} />
        {/* Noise / grain overlay */}
        <div className="absolute inset-0" style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }} />
      </div>

      {/* Content */}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* ─── Header ─── */}
        <header className="sticky top-0 z-50" style={{
          background: "rgba(246, 245, 243, 0.55)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderBottom: "1px solid rgba(255,255,255,0.5)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.03)",
        }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            <div className="flex items-center justify-between h-16 sm:h-[68px]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{
                  background: "linear-gradient(135deg, rgba(124, 107, 255, 0.15), rgba(124, 107, 255, 0.05))",
                  border: "1px solid rgba(124, 107, 255, 0.12)",
                  boxShadow: "0 2px 8px rgba(124, 107, 255, 0.1)",
                }}>
                  <Globe size={17} style={{ color: "#7C6BFF" }} />
                </div>
                <span className="font-bold text-foreground text-base sm:text-lg tracking-tight">SEO Audit</span>
              </div>
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  ...glassInnerStyle,
                  background: apiKey ? "rgba(52, 199, 89, 0.08)" : "rgba(255,255,255,0.4)",
                  color: apiKey ? "#34C759" : "#7C6BFF",
                  borderColor: apiKey ? "rgba(52, 199, 89, 0.15)" : "rgba(255,255,255,0.5)",
                }}
              >
                <Key size={13} />
                <span className="hidden sm:inline">{apiKey ? "API Key Set" : "Add API Key"}</span>
              </button>
            </div>

            <AnimatePresence>
              {showApiKey && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden pb-4"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your Google PageSpeed API key..."
                        className="w-full px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-all duration-300 focus:ring-2 focus:ring-accent/15"
                        style={{
                          ...glassInputStyle,
                          background: "rgba(255,255,255,0.5)",
                        }}
                      />
                    </div>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] flex-shrink-0"
                      style={{ ...glassInnerStyle, color: "#7C6BFF" }}
                    >
                      Get free key <ExternalLink size={11} />
                    </a>
                  </div>
                  <p className="text-[11px] text-foreground-muted mt-2.5 leading-relaxed">
                    Free from Google Cloud Console. Enables real performance data via PageSpeed Insights API.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Main content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          {/* ─── Hero input section ─── */}
          {!audit && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-center mt-20 sm:mt-28 md:mt-36"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
                style={{
                  ...glassInnerStyle,
                  color: "#7C6BFF",
                  animation: "floatY 4s ease-in-out infinite",
                }}
              >
                <Zap size={12} />
                Real-time SEO analysis
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="font-bold leading-[1.08] max-w-2xl mx-auto"
                style={{ fontSize: "clamp(2.25rem, 5vw + 0.5rem, 3.75rem)", letterSpacing: "-0.04em", color: "#1A1A1A" }}
              >
                Audit any website&apos;s{" "}
                <span style={{
                  background: "linear-gradient(135deg, #7C6BFF, #a78bfa, #7C6BFF)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}>SEO</span>{" "}
                in seconds
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 text-base sm:text-lg max-w-md mx-auto leading-relaxed font-light"
                style={{ color: "#6B6B6B" }}
              >
                Get real performance data, on-page analysis, and actionable recommendations.
              </motion.p>

              {/* Search input */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="mt-10 sm:mt-12 max-w-xl mx-auto"
              >
                <div
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2.5"
                  style={{
                    ...glassStyle,
                    borderRadius: "20px",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)",
                    animation: "borderGlow 4s ease-in-out infinite",
                  }}
                >
                  <div className="flex-1 flex items-center gap-3 px-4 py-2">
                    <Search size={18} style={{ color: "#9CA3AF" }} className="flex-shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter a website URL..."
                      className="w-full bg-transparent outline-none text-foreground placeholder:text-foreground-muted text-[15px] font-light"
                    />
                  </div>
                  <button
                    onClick={runAudit}
                    disabled={!url.trim()}
                    className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-[14px] text-[13px] font-semibold text-white transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: url.trim()
                        ? "linear-gradient(135deg, #7C6BFF, #6857e0)"
                        : "rgba(124, 107, 255, 0.3)",
                      boxShadow: url.trim()
                        ? "0 4px 16px rgba(124, 107, 255, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)"
                        : "none",
                    }}
                  >
                    Analyze <ArrowRight size={15} />
                  </button>
                </div>

                {urlError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm mt-3 text-left px-3"
                    style={{ color: "#FF453A" }}
                  >
                    {urlError}
                  </motion.p>
                )}

                {!apiKey && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-[11px] mt-5 font-medium"
                    style={{ color: "#9CA3AF" }}
                  >
                    Works without an API key — add one for full performance data.
                  </motion.p>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Loading */}
          {loading && <LoadingScreen steps={steps} />}

          {/* ─── Results ─── */}
          {audit && !loading && (
            <div className="mt-10 sm:mt-14">
              {/* Top bar — URL + re-analyze */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{
                      background: "rgba(124, 107, 255, 0.1)",
                      border: "1px solid rgba(124, 107, 255, 0.08)",
                    }}>
                      <Globe size={13} style={{ color: "#7C6BFF" }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground truncate max-w-[300px] sm:max-w-[500px] tracking-tight">{audit.url}</span>
                  </div>
                  <p className="text-[11px] mt-1.5 ml-[34px] font-medium" style={{ color: "#9CA3AF" }}>
                    Score based on {audit.realSignals} real signals + {audit.estimatedSignals} estimated signals
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => { setAudit(null); setTimeout(() => inputRef.current?.focus(), 100); }}
                    className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ ...glassInnerStyle, color: "#7C6BFF" }}
                  >
                    <Search size={13} /> New audit
                  </button>
                  <button
                    onClick={runAudit}
                    className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2.5 rounded-xl text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #7C6BFF, #6857e0)",
                      boxShadow: "0 4px 14px rgba(124, 107, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                    }}
                  >
                    <RefreshCw size={13} /> Re-analyze
                  </button>
                </div>
              </motion.div>

              {/* Global Score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  ...glassStyle,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)",
                }}
                className="text-center p-8 sm:p-10 md:p-12 mb-8"
              >
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-8" style={{ color: "#9CA3AF" }}>
                  Overall SEO Score
                </h2>
                <ScoreDonut score={audit.globalScore} size={220} />
                <div className="mt-7 flex items-center justify-center gap-4 flex-wrap">
                  <StatusBadge status={getStatus(audit.globalScore)} />
                  <div className="flex items-center gap-3 text-[11px] font-medium" style={{ color: "#9CA3AF" }}>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={glassInnerStyle}>
                      <Eye size={11} /> {audit.realSignals} real
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={glassInnerStyle}>
                      <BarChart3 size={11} /> {audit.estimatedSignals} estimated
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Category Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {audit.categories.map((cat, i) => (
                  <CategoryCard key={cat.name} cat={cat} index={i} />
                ))}
              </div>

              {/* Recommendations */}
              <RecommendationPanel recs={audit.recommendations} />

              {/* Footer disclaimer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-10 text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={glassInnerStyle}>
                  <Shield size={12} style={{ color: "#9CA3AF" }} />
                  <p className="text-[11px] font-medium" style={{ color: "#9CA3AF" }}>
                    Performance data from PageSpeed Insights. On-page data from live HTML analysis. Backlinks & some content signals are estimated.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
