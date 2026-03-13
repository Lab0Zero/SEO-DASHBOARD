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
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Key,
  Loader2,
  RefreshCw,
  Globe,
  ArrowRight,
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
  return "#FF3B30";
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

  const bodyText = doc.body?.textContent || "";
  const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 1).length;

  const isHttps = url.startsWith("https://");

  return {
    title, titleLength: title.length, metaDesc, metaDescLength: metaDesc.length,
    h1Count: h1s.length, h1Content: h1s[0]?.textContent?.trim().substring(0, 100) || "",
    h2Count: h2s.length, h3Count: h3s.length,
    ogTitle, ogDesc, ogImage, twitterCard, canonical, robotsMeta, viewport, lang,
    hasFavicon: !!favicon, totalImages: imagesAll.length, imagesNoAlt,
    structuredDataCount: structuredData.length, inlineScripts: inlineScripts.length,
    inlineStyles: inlineStyles.length, wordCount, isHttps,
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

  // ─── 1. Performance ─────────────────────────────────────────────────────
  const perfCriteria: CriterionResult[] = [];
  let perfScore = 50;

  if (psiMobile || psiDesktop) {
    const mobileScore = getPerfScore(psiMobile);
    const desktopScore = getPerfScore(psiDesktop);

    if (mobileScore !== null) {
      perfCriteria.push({ label: "Mobile Performance Score", status: mobileScore >= 90 ? "pass" : mobileScore >= 50 ? "warning" : "fail", value: `${mobileScore}/100`, fix: mobileScore < 50 ? "Optimize images, reduce JavaScript, enable compression" : undefined });
      realSignals++;
    }
    if (desktopScore !== null) {
      perfCriteria.push({ label: "Desktop Performance Score", status: desktopScore >= 90 ? "pass" : desktopScore >= 50 ? "warning" : "fail", value: `${desktopScore}/100`, fix: desktopScore < 50 ? "Reduce render-blocking resources and optimize loading" : undefined });
      realSignals++;
    }

    const lcpAudit = getAudit(psiMobile, "largest-contentful-paint") || getAudit(psiDesktop, "largest-contentful-paint");
    if (lcpAudit) {
      const lcpVal = lcpAudit.displayValue as string;
      const lcpMs = parseMs(lcpVal);
      perfCriteria.push({ label: "Largest Contentful Paint (LCP)", status: lcpMs !== null && lcpMs <= 2500 ? "pass" : lcpMs !== null && lcpMs <= 4000 ? "warning" : "fail", value: lcpVal, fix: lcpMs !== null && lcpMs > 2500 ? "Optimize server response times, preload critical resources" : undefined });
      realSignals++;
    }

    const clsAudit = getAudit(psiMobile, "cumulative-layout-shift") || getAudit(psiDesktop, "cumulative-layout-shift");
    if (clsAudit) {
      const clsVal = clsAudit.displayValue as string;
      const clsNum = parseFloat(clsVal);
      perfCriteria.push({ label: "Cumulative Layout Shift (CLS)", status: clsNum <= 0.1 ? "pass" : clsNum <= 0.25 ? "warning" : "fail", value: clsVal, fix: clsNum > 0.1 ? "Add explicit width/height to images and embeds" : undefined });
      realSignals++;
    }

    const tbtAudit = getAudit(psiMobile, "total-blocking-time") || getAudit(psiDesktop, "total-blocking-time");
    if (tbtAudit) {
      const tbtVal = tbtAudit.displayValue as string;
      const tbtMs = parseMs(tbtVal);
      perfCriteria.push({ label: "Total Blocking Time (TBT)", status: tbtMs !== null && tbtMs <= 200 ? "pass" : tbtMs !== null && tbtMs <= 600 ? "warning" : "fail", value: tbtVal, fix: tbtMs !== null && tbtMs > 200 ? "Break up long tasks, defer non-critical JavaScript" : undefined });
      realSignals++;
    }

    const siAudit = getAudit(psiMobile, "speed-index") || getAudit(psiDesktop, "speed-index");
    if (siAudit) {
      perfCriteria.push({ label: "Speed Index", status: (siAudit.score as number) >= 0.9 ? "pass" : (siAudit.score as number) >= 0.5 ? "warning" : "fail", value: siAudit.displayValue as string });
      realSignals++;
    }

    const imgOptAudit = getAudit(psiMobile, "uses-optimized-images") || getAudit(psiDesktop, "uses-optimized-images");
    if (imgOptAudit) {
      perfCriteria.push({ label: "Image Optimization", status: (imgOptAudit.score as number) >= 0.9 ? "pass" : "warning", value: (imgOptAudit.score as number) >= 0.9 ? "Optimized" : "Needs optimization", fix: (imgOptAudit.score as number) < 0.9 ? "Use WebP/AVIF, compress images, add responsive srcsets" : undefined });
      realSignals++;
    }

    const unusedJs = getAudit(psiMobile, "unused-javascript") || getAudit(psiDesktop, "unused-javascript");
    if (unusedJs) {
      perfCriteria.push({ label: "Unused JavaScript", status: (unusedJs.score as number) >= 0.9 ? "pass" : "warning", value: (unusedJs.score as number) >= 0.9 ? "Minimal" : "Excess JS detected", fix: (unusedJs.score as number) < 0.9 ? "Remove unused JavaScript or use code splitting" : undefined });
      realSignals++;
    }

    const unusedCss = getAudit(psiMobile, "unused-css-rules") || getAudit(psiDesktop, "unused-css-rules");
    if (unusedCss) {
      perfCriteria.push({ label: "Unused CSS", status: (unusedCss.score as number) >= 0.9 ? "pass" : "warning", value: (unusedCss.score as number) >= 0.9 ? "Minimal" : "Excess CSS detected", fix: (unusedCss.score as number) < 0.9 ? "Purge unused CSS rules, use critical CSS" : undefined });
      realSignals++;
    }

    const scores = [mobileScore, desktopScore].filter((s): s is number => s !== null);
    perfScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;
  } else if (psiError) {
    perfCriteria.push({ label: "PageSpeed Insights Analysis", status: "na", value: psiError || "API key required" });
  } else {
    perfCriteria.push({ label: "PageSpeed Insights Analysis", status: "na", value: "Enter a Google PageSpeed API key to get real performance data" });
  }

  categories.push({ name: "Performance", icon: <Gauge size={18} />, score: perfScore, status: getStatus(perfScore), criteria: perfCriteria, isReal: !!(psiMobile || psiDesktop) });

  // ─── 2. On-Page SEO ─────────────────────────────────────────────────────
  const onPageCriteria: CriterionResult[] = [];
  let onPageScore = 50;

  if (htmlSignals) {
    let onPagePoints = 0;
    let onPageTotal = 0;

    onPageTotal += 15;
    if (htmlSignals.title) {
      if (htmlSignals.titleLength >= 50 && htmlSignals.titleLength <= 60) {
        onPageCriteria.push({ label: "Title Tag", status: "pass", value: `"${htmlSignals.title.substring(0, 60)}${htmlSignals.title.length > 60 ? "..." : ""}" (${htmlSignals.titleLength} chars)` });
        onPagePoints += 15;
      } else {
        onPageCriteria.push({ label: "Title Tag", status: "warning", value: `${htmlSignals.titleLength} chars (optimal: 50-60)`, fix: htmlSignals.titleLength < 50 ? "Add more descriptive keywords to your title" : "Shorten your title to under 60 characters" });
        onPagePoints += 8;
      }
      realSignals++;
    } else {
      onPageCriteria.push({ label: "Title Tag", status: "fail", value: "Missing", fix: "Add a unique, descriptive <title> tag" });
      realSignals++;
    }

    onPageTotal += 15;
    if (htmlSignals.metaDesc) {
      if (htmlSignals.metaDescLength >= 150 && htmlSignals.metaDescLength <= 160) {
        onPageCriteria.push({ label: "Meta Description", status: "pass", value: `${htmlSignals.metaDescLength} chars` });
        onPagePoints += 15;
      } else {
        onPageCriteria.push({ label: "Meta Description", status: "warning", value: `${htmlSignals.metaDescLength} chars (optimal: 150-160)`, fix: htmlSignals.metaDescLength < 150 ? "Write a more detailed meta description" : "Trim your meta description to 160 chars" });
        onPagePoints += 8;
      }
      realSignals++;
    } else {
      onPageCriteria.push({ label: "Meta Description", status: "fail", value: "Missing", fix: "Add a <meta name='description'> tag with 150-160 characters" });
      realSignals++;
    }

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

    onPageTotal += 10;
    if (htmlSignals.h2Count > 0 || htmlSignals.h3Count > 0) {
      onPageCriteria.push({ label: "Heading Structure", status: "pass", value: `${htmlSignals.h2Count} H2, ${htmlSignals.h3Count} H3` });
      onPagePoints += 10;
    } else {
      onPageCriteria.push({ label: "Heading Structure", status: "fail", value: "No H2/H3 found", fix: "Add H2 and H3 tags to structure your content" });
    }
    realSignals++;

    onPageTotal += 15;
    if (htmlSignals.totalImages === 0) {
      onPageCriteria.push({ label: "Image Alt Tags", status: "pass", value: "No images found" });
      onPagePoints += 15;
    } else if (htmlSignals.imagesNoAlt === 0) {
      onPageCriteria.push({ label: "Image Alt Tags", status: "pass", value: `All ${htmlSignals.totalImages} images have alt text` });
      onPagePoints += 15;
    } else {
      onPageCriteria.push({ label: "Image Alt Tags", status: htmlSignals.imagesNoAlt > 3 ? "fail" : "warning", value: `${htmlSignals.imagesNoAlt} of ${htmlSignals.totalImages} images missing alt text`, fix: "Add descriptive alt attributes to all images" });
      onPagePoints += Math.max(0, 15 - htmlSignals.imagesNoAlt * 2);
    }
    realSignals++;

    onPageTotal += 10;
    if (htmlSignals.canonical) {
      onPageCriteria.push({ label: "Canonical Tag", status: "pass", value: "Present" });
      onPagePoints += 10;
    } else {
      onPageCriteria.push({ label: "Canonical Tag", status: "warning", value: "Missing", fix: "Add a <link rel='canonical'> to avoid duplicate content" });
      onPagePoints += 3;
    }
    realSignals++;

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

  categories.push({ name: "On-Page SEO", icon: <FileText size={18} />, score: onPageScore, status: getStatus(onPageScore), criteria: onPageCriteria, isReal: !!htmlSignals });

  // ─── 3. Technical SEO ───────────────────────────────────────────────────
  const techCriteria: CriterionResult[] = [];
  let techScore = 50;
  let techPoints = 0;
  let techTotal = 0;

  if (htmlSignals) {
    techTotal += 15;
    if (htmlSignals.isHttps) {
      techCriteria.push({ label: "HTTPS", status: "pass", value: "Secure connection" });
      techPoints += 15;
    } else {
      techCriteria.push({ label: "HTTPS", status: "fail", value: "Not using HTTPS", fix: "Migrate to HTTPS" });
      recommendations.push({ priority: "high", category: "Technical", description: "Site not using HTTPS", fix: "Install an SSL certificate and redirect all HTTP traffic to HTTPS" });
    }
    realSignals++;

    techTotal += 10;
    if (htmlSignals.viewport) {
      techCriteria.push({ label: "Viewport Meta", status: "pass", value: "Present" });
      techPoints += 10;
    } else {
      techCriteria.push({ label: "Viewport Meta", status: "fail", value: "Missing", fix: "Add <meta name='viewport' content='width=device-width, initial-scale=1'>" });
    }
    realSignals++;

    techTotal += 10;
    if (htmlSignals.robotsMeta) {
      const blocksIndex = htmlSignals.robotsMeta.includes("noindex");
      techCriteria.push({ label: "Robots Meta", status: blocksIndex ? "warning" : "pass", value: htmlSignals.robotsMeta, fix: blocksIndex ? "This page has noindex — remove it if you want it indexed" : undefined });
      techPoints += blocksIndex ? 5 : 10;
    } else {
      techCriteria.push({ label: "Robots Meta", status: "pass", value: "Not set (defaults to index, follow)" });
      techPoints += 10;
    }
    realSignals++;

    techTotal += 15;
    if (htmlSignals.structuredDataCount > 0) {
      techCriteria.push({ label: "Structured Data (Schema.org)", status: "pass", value: `${htmlSignals.structuredDataCount} JSON-LD block(s) found` });
      techPoints += 15;
    } else {
      techCriteria.push({ label: "Structured Data (Schema.org)", status: "warning", value: "None found", fix: "Add JSON-LD structured data for rich snippets" });
      techPoints += 3;
    }
    realSignals++;

    techTotal += 10;
    if (htmlSignals.inlineScripts <= 2 && htmlSignals.inlineStyles <= 1) {
      techCriteria.push({ label: "Inline Resources", status: "pass", value: `${htmlSignals.inlineScripts} inline scripts, ${htmlSignals.inlineStyles} inline styles` });
      techPoints += 10;
    } else {
      techCriteria.push({ label: "Inline Resources", status: "warning", value: `${htmlSignals.inlineScripts} inline scripts, ${htmlSignals.inlineStyles} inline styles`, fix: "Externalize inline scripts and styles for better caching" });
      techPoints += 5;
    }
    realSignals++;
  }

  if (psiMobile || psiDesktop) {
    const rbAudit = getAudit(psiMobile, "render-blocking-resources") || getAudit(psiDesktop, "render-blocking-resources");
    if (rbAudit) {
      techTotal += 15;
      const rbScore = rbAudit.score as number;
      techCriteria.push({ label: "Render-Blocking Resources", status: rbScore >= 0.9 ? "pass" : rbScore >= 0.5 ? "warning" : "fail", value: rbScore >= 0.9 ? "No significant blocking" : "Blocking resources detected", fix: rbScore < 0.9 ? "Defer non-critical CSS/JS, use async loading" : undefined });
      techPoints += Math.round(rbScore * 15);
      realSignals++;
    }
  }

  techScore = techTotal > 0 ? Math.round((techPoints / techTotal) * 100) : 50;
  categories.push({ name: "Technical SEO", icon: <Settings2 size={18} />, score: techScore, status: getStatus(techScore), criteria: techCriteria, isReal: !!(htmlSignals || psiMobile || psiDesktop) });

  // ─── 4. Social & Metadata ──────────────────────────────────────────────
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
  categories.push({ name: "Social & Metadata", icon: <Share2 size={18} />, score: socialScore, status: getStatus(socialScore), criteria: socialCriteria, isReal: !!htmlSignals });

  // ─── 5. Mobile & Accessibility ─────────────────────────────────────────
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
    const ms = getPerfScore(psiMobile);
    if (ms !== null) {
      mobileTotal += 25;
      mobileCriteria.push({ label: "Mobile Performance Score", status: ms >= 90 ? "pass" : ms >= 50 ? "warning" : "fail", value: `${ms}/100` });
      mobilePoints += Math.round(ms * 0.25);
      realSignals++;
    }
  }

  const mobileScore = mobileTotal > 0 ? Math.round((mobilePoints / mobileTotal) * 100) : 50;
  categories.push({ name: "Mobile & Accessibility", icon: <Smartphone size={18} />, score: mobileScore, status: getStatus(mobileScore), criteria: mobileCriteria, isReal: !!(htmlSignals || psiMobile) });

  // ─── 6. Content Quality (estimated) ────────────────────────────────────
  const contentCriteria: CriterionResult[] = [];
  let contentScore = 65;

  if (htmlSignals) {
    const wc = htmlSignals.wordCount;
    contentCriteria.push({ label: "Word Count", status: wc >= 300 ? "pass" : "warning", value: `~${wc} words`, fix: wc < 300 ? "Add more substantive content" : undefined });
    realSignals++;
    if (wc < 300) {
      recommendations.push({ priority: "medium", category: "Content", description: "Thin content detected", fix: `Page has ~${wc} words. Aim for 300+ words of quality content.` });
    }
  }

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

  categories.push({ name: "Content Quality", icon: <BookOpen size={18} />, score: contentScore, status: getStatus(contentScore), criteria: contentCriteria, isReal: false });

  // ─── 7. Backlinks & Authority (estimated) ──────────────────────────────
  const backlinkCriteria: CriterionResult[] = [];
  const da = Math.round(15 + seededRandom(seed, 10) * 65);
  const backlinks = Math.round(50 + seededRandom(seed, 11) * 9950);

  backlinkCriteria.push({ label: "Domain Authority (Estimated)", status: da >= 40 ? "pass" : da >= 20 ? "warning" : "fail", value: `${da}/100` });
  backlinkCriteria.push({ label: "Estimated Backlinks", status: backlinks >= 500 ? "pass" : backlinks >= 100 ? "warning" : "fail", value: backlinks.toLocaleString() });
  backlinkCriteria.push({ label: "Data Source", status: "estimated", value: "Connect Ahrefs or Moz API for real data" });
  estimatedSignals += 2;

  const backlinkScore = da;
  categories.push({ name: "Backlinks & Authority", icon: <Link2 size={18} />, score: backlinkScore, status: getStatus(backlinkScore), criteria: backlinkCriteria, isReal: false });

  // ─── Global Score ──────────────────────────────────────────────────────
  const weights = [0.25, 0.20, 0.20, 0.10, 0.10, 0.10, 0.05];
  const globalScore = Math.round(categories.reduce((sum, cat, i) => sum + cat.score * weights[i], 0));

  // ─── Build recommendations from fails/warnings ─────────────────────────
  categories.forEach((cat) => {
    cat.criteria.forEach((c) => {
      if (c.status === "fail" && c.fix) {
        recommendations.push({ priority: "high", category: cat.name, description: c.label + ": " + (c.value || ""), fix: c.fix });
      } else if (c.status === "warning" && c.fix) {
        recommendations.push({ priority: "medium", category: cat.name, description: c.label + ": " + (c.value || ""), fix: c.fix });
      }
    });
  });

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return { url, globalScore, categories, recommendations, realSignals, estimatedSignals };
}

// ─── UI Components ───────────────────────────────────────────────────────────

function AnimatedScore({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 1400;
    const to = value;

    function frame(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(to * eased));
      if (progress < 1) ref.current = requestAnimationFrame(frame);
    }

    ref.current = requestAnimationFrame(frame);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);

  return (
    <span style={{ color, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 500 }}>
      {display}
    </span>
  );
}

function ScoreDonut({ score, size = 200 }: { score: number; size?: number }) {
  const strokeW = 8;
  const radius = (size - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(score);
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 200);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#F2F2F7" strokeWidth={strokeW}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[48px] font-light tracking-tight" style={{ color: "#1D1D1F", fontFamily: "var(--font-dm-mono), monospace" }}>
          <AnimatedScore value={score} color="#1D1D1F" />
        </span>
        <span className="text-[13px] font-normal tracking-wide" style={{ color: "#86868B" }}>out of 100</span>
      </div>
    </div>
  );
}

function MiniBar({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: "#F2F2F7" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: "good" | "warning" | "critical" }) {
  const config = {
    good: { bg: "#F0FFF4", text: "#34C759", label: "Good" },
    warning: { bg: "#FFFBF0", text: "#FF9F0A", label: "Needs Work" },
    critical: { bg: "#FFF5F5", text: "#FF3B30", label: "Critical" },
  };
  const c = config[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

function CriterionRow({ c }: { c: CriterionResult }) {
  const icons = {
    pass: <CheckCircle2 size={15} color="#34C759" strokeWidth={1.5} />,
    warning: <AlertTriangle size={15} color="#FF9F0A" strokeWidth={1.5} />,
    fail: <XCircle size={15} color="#FF3B30" strokeWidth={1.5} />,
    estimated: <BarChart3 size={15} color="#86868B" strokeWidth={1.5} />,
    na: <Info size={15} color="#86868B" strokeWidth={1.5} />,
  };

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-px flex-shrink-0">{icons[c.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[13px] ${c.status === "estimated" ? "text-[#86868B]" : "text-[#1D1D1F]"}`}>
            {c.label}
          </span>
          {c.value && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F5F5F7] text-[#86868B]" style={{ fontFamily: "var(--font-dm-mono), monospace" }}>
              {c.value}
            </span>
          )}
        </div>
        {c.fix && (
          <p className="text-[12px] text-[#86868B] mt-1 leading-relaxed">{c.fix}</p>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ cat, index }: { cat: CategoryResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 + index * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-lg"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F5F5F7]">
              <span className="text-[#1D1D1F]">{cat.icon}</span>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[#1D1D1F] tracking-tight">{cat.name}</h3>
              {!cat.isReal && (
                <span className="text-[10px] text-[#86868B]">Estimated</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[22px] font-medium" style={{ fontFamily: "var(--font-dm-mono), monospace", color: getScoreColor(cat.score) }}>
              <AnimatedScore value={cat.score} color={getScoreColor(cat.score)} />
            </span>
            <StatusBadge status={cat.status} />
          </div>
        </div>

        <MiniBar score={cat.score} />

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1 text-[13px] font-medium text-[#0071E3] transition-colors hover:text-[#0077ED]"
        >
          {expanded ? "Hide details" : "View details"}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
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
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-[#F2F2F7]">
              <div className="mt-2">
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
  const completedCount = steps.filter(s => s.done).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="max-w-md mx-auto mt-20 sm:mt-28"
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F5F5F7] mb-5">
          <Loader2 size={22} className="text-[#1D1D1F]" style={{ animation: "spin 1.5s linear infinite" }} />
        </div>
        <h2 className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight">Analyzing</h2>
        <p className="text-[15px] text-[#86868B] mt-1">This takes a few seconds.</p>
      </div>

      <div className="w-full h-1 rounded-full bg-[#F2F2F7] mb-8 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#1D1D1F] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="flex items-center gap-3 py-2.5 px-4 rounded-xl"
            style={{
              background: step.done && !step.error ? "rgba(52,199,89,0.04)" :
                           step.error ? "rgba(255,59,48,0.04)" :
                           i === steps.findIndex(s => !s.done) ? "#F5F5F7" : "transparent",
            }}
          >
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {step.done ? (
                step.error ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                    <XCircle size={16} color="#FF3B30" strokeWidth={1.5} />
                  </motion.div>
                ) : (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                    <CheckCircle2 size={16} color="#34C759" strokeWidth={1.5} />
                  </motion.div>
                )
              ) : (
                i === steps.findIndex(s => !s.done) ? (
                  <Loader2 size={14} className="text-[#1D1D1F]" style={{ animation: "spin 1.5s linear infinite" }} />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-[#D1D1D6]" />
                )
              )}
            </div>
            <span className={`text-[13px] flex-1 ${step.done ? (step.error ? "text-[#FF3B30]" : "text-[#1D1D1F]") : i === steps.findIndex(s => !s.done) ? "text-[#1D1D1F] font-medium" : "text-[#86868B]"}`}>
              {step.label}
            </span>
            {step.error && (
              <span className="text-[11px] font-medium text-[#FF3B30]">{step.error}</span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function RecommendationPanel({ recs }: { recs: Recommendation[] }) {
  if (recs.length === 0) return null;

  const priorityConfig = {
    high: { bg: "#FFF5F5", text: "#FF3B30", label: "High" },
    medium: { bg: "#FFFBF0", text: "#FF9F0A", label: "Medium" },
    low: { bg: "#F0FFF4", text: "#34C759", label: "Low" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="mt-6 bg-white rounded-2xl"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F5F5F7]">
            <TrendingUp size={18} className="text-[#1D1D1F]" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] tracking-tight">Recommendations</h3>
            <span className="text-[12px] text-[#86868B]">{recs.length} items to improve</span>
          </div>
        </div>

        <div className="space-y-2">
          {recs.slice(0, 12).map((rec, i) => {
            const pc = priorityConfig[rec.priority];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.04, duration: 0.3 }}
                className="flex items-start gap-3 p-4 rounded-xl border border-[#F2F2F7] hover:bg-[#FAFAFA] transition-colors duration-200"
              >
                <span
                  className="flex-shrink-0 mt-0.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md"
                  style={{ background: pc.bg, color: pc.text }}
                >
                  {pc.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#F5F5F7] text-[#86868B]">
                      {rec.category}
                    </span>
                    <span className="text-[13px] text-[#1D1D1F]">{rec.description}</span>
                  </div>
                  <p className="text-[12px] text-[#86868B] mt-1 leading-relaxed">{rec.fix}</p>
                </div>
              </motion.div>
            );
          })}
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
      setUrlError("Please enter a valid URL");
      return;
    }

    setUrlError("");
    setLoading(true);
    setAudit(null);

    const hasKey = apiKey.trim().length > 0;

    const newSteps: LoadingStep[] = [
      { label: "Fetching page HTML...", done: false },
      { label: "Analyzing on-page signals...", done: false },
      { label: `Running mobile audit...${!hasKey ? " (skipped)" : ""}`, done: !hasKey, error: !hasKey ? "No API key" : undefined },
      { label: `Running desktop audit...${!hasKey ? " (skipped)" : ""}`, done: !hasKey, error: !hasKey ? "No API key" : undefined },
    ];

    setSteps([...newSteps]);

    let htmlSignals: ReturnType<typeof parseHTMLSignals> | null = null;
    let htmlError: string | null = null;
    let psiMobile: Record<string, unknown> | null = null;
    let psiDesktop: Record<string, unknown> | null = null;
    let psiError: string | null = null;

    try {
      try {
        const html = await fetchHTML(normalizedUrl);
        newSteps[0] = { ...newSteps[0], done: true };
        setSteps([...newSteps]);

        htmlSignals = parseHTMLSignals(html, normalizedUrl);
        newSteps[1] = { ...newSteps[1], done: true };
        setSteps([...newSteps]);
      } catch {
        htmlError = "Could not fetch page HTML. The site may block external requests.";
        newSteps[0] = { ...newSteps[0], done: true, error: "Failed" };
        newSteps[1] = { ...newSteps[1], done: true, error: "Skipped" };
        setSteps([...newSteps]);
      }

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

      const auditData = buildAuditData(normalizedUrl, htmlSignals, psiMobile, psiDesktop, htmlError, psiError);
      await new Promise((r) => setTimeout(r, 300));
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
    <div className="min-h-screen bg-[#FBFBFD]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FBFBFD]/80 backdrop-blur-xl" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <Globe size={18} className="text-[#1D1D1F]" />
              <span className="font-semibold text-[#1D1D1F] text-[15px] tracking-tight">SEO Audit</span>
            </div>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors duration-200 hover:bg-[#F5F5F7]"
              style={{ color: apiKey ? "#34C759" : "#86868B" }}
            >
              <Key size={13} />
              <span className="hidden sm:inline">{apiKey ? "API Key Set" : "API Key"}</span>
            </button>
          </div>

          <AnimatePresence>
            {showApiKey && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden pb-4"
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your Google PageSpeed API key..."
                    className="flex-1 px-4 py-2.5 text-[13px] text-[#1D1D1F] placeholder:text-[#C7C7CC] bg-white border border-[#E5E5EA] rounded-xl outline-none transition-all duration-200 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/10"
                  />
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-[12px] font-medium px-4 py-2.5 rounded-xl text-[#0071E3] bg-[#F5F5F7] hover:bg-[#E8E8ED] transition-colors duration-200 flex-shrink-0"
                  >
                    Get free key <ExternalLink size={10} />
                  </a>
                </div>
                <p className="text-[11px] text-[#86868B] mt-2">
                  Free from Google Cloud Console. Enables real performance data.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-5 sm:px-6 pb-20">
        {/* Hero */}
        {!audit && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center mt-24 sm:mt-32 md:mt-40"
          >
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="font-semibold leading-[1.08] max-w-xl mx-auto text-[#1D1D1F]"
              style={{ fontSize: "clamp(2rem, 5vw + 0.25rem, 3.25rem)", letterSpacing: "-0.03em" }}
            >
              Audit any website&apos;s SEO in seconds.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-4 text-[17px] max-w-md mx-auto leading-relaxed text-[#86868B]"
            >
              Real performance data, on-page analysis, and actionable recommendations.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-10 sm:mt-12 max-w-xl mx-auto"
            >
              <div
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-white rounded-2xl"
                style={{
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex-1 flex items-center gap-3 px-4 py-2">
                  <Search size={18} className="text-[#C7C7CC] flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter a website URL..."
                    className="w-full bg-transparent outline-none text-[#1D1D1F] placeholder:text-[#C7C7CC] text-[15px]"
                  />
                </div>
                <button
                  onClick={runAudit}
                  disabled={!url.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: "#0071E3",
                  }}
                >
                  Analyze <ArrowRight size={15} />
                </button>
              </div>

              {urlError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[13px] mt-3 text-left px-2 text-[#FF3B30]"
                >
                  {urlError}
                </motion.p>
              )}

              {!apiKey && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-[12px] mt-5 text-[#86868B]"
                >
                  Works without an API key. Add one for full performance data.
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Loading */}
        {loading && <LoadingScreen steps={steps} />}

        {/* Results */}
        {audit && !loading && (
          <div className="mt-10 sm:mt-12">
            {/* Top bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-[#86868B]" />
                  <span className="text-[14px] font-medium text-[#1D1D1F] truncate max-w-[300px] sm:max-w-[500px]">{audit.url}</span>
                </div>
                <p className="text-[12px] mt-1 ml-[22px] text-[#86868B]">
                  {audit.realSignals} real + {audit.estimatedSignals} estimated signals
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setAudit(null); setTimeout(() => inputRef.current?.focus(), 100); }}
                  className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED] transition-colors duration-200"
                >
                  <Search size={13} /> New audit
                </button>
                <button
                  onClick={runAudit}
                  className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg bg-[#0071E3] text-white hover:brightness-110 transition-all duration-200"
                >
                  <RefreshCw size={13} /> Re-analyze
                </button>
              </div>
            </motion.div>

            {/* Global Score */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-center bg-white rounded-2xl p-10 sm:p-12 mb-6"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
                border: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#86868B] mb-8">
                Overall SEO Score
              </p>
              <ScoreDonut score={audit.globalScore} size={200} />
              <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                <StatusBadge status={getStatus(audit.globalScore)} />
                <div className="flex items-center gap-2 text-[11px] text-[#86868B]">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#F5F5F7]">
                    <Eye size={10} /> {audit.realSignals} real
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#F5F5F7]">
                    <BarChart3 size={10} /> {audit.estimatedSignals} estimated
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Category Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {audit.categories.map((cat, i) => (
                <CategoryCard key={cat.name} cat={cat} index={i} />
              ))}
            </div>

            {/* Recommendations */}
            <RecommendationPanel recs={audit.recommendations} />

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5F5F7]">
                <Shield size={11} className="text-[#86868B]" />
                <p className="text-[11px] text-[#86868B]">
                  Performance data from PageSpeed Insights. On-page data from live HTML analysis. Some signals are estimated.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
