// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActionItem {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: string;
  steps: string[];
  expectedScoreGain: number;
  difficulty: "easy" | "medium" | "hard";
  automatable: boolean;
  automatableNote?: string;
  estimatedTime: string;
}

export interface ActionPlan {
  items: ActionItem[];
  totalPotentialGain: number;
  currentScore: number;
  projectedScore: number;
  generatedAt: string;
}

// ─── Criterion knowledge base ────────────────────────────────────────────────

interface CriterionTemplate {
  title: string;
  impact: string;
  stepsForFail: string[];
  stepsForWarning: string[];
  difficulty: "easy" | "medium" | "hard";
  automatable: boolean;
  automatableNote?: string;
  estimatedTime: string;
  baseGain: number;
}

const KNOWLEDGE_BASE: Record<string, CriterionTemplate> = {
  // ─── Performance ─────────────────────────────────────────────────────────
  "Mobile Performance Score": {
    title: "Improve Mobile Performance",
    impact: "Mobile performance directly impacts Google rankings since mobile-first indexing. A score below 50 signals severe issues that hurt both SEO and user experience. Pages that load in under 3 seconds see 32% lower bounce rates, while 53% of mobile visitors abandon sites taking over 3 seconds to load.",
    stepsForFail: [
      "Run a Lighthouse audit in Chrome DevTools to identify the biggest bottlenecks",
      "Compress and convert all images to WebP/AVIF format using tools like Sharp or Squoosh",
      "Enable text compression (Gzip/Brotli) on your server or CDN",
      "Defer non-critical JavaScript using async/defer attributes or dynamic imports",
      "Implement critical CSS inlining — extract above-the-fold styles and inline them in <head>",
      "Consider a CDN (Cloudflare, Vercel Edge) to reduce server response times globally",
    ],
    stepsForWarning: [
      "Audit your JavaScript bundle size using tools like webpack-bundle-analyzer or next/bundle-analyzer",
      "Lazy-load images below the fold using loading='lazy' or next/image",
      "Minimize third-party scripts — each one adds latency and blocks rendering",
      "Enable HTTP/2 or HTTP/3 on your server for multiplexed resource loading",
    ],
    difficulty: "hard",
    automatable: true,
    automatableNote: "Claude Code can add next/image components, implement lazy loading, add defer attributes to scripts, and configure next.config.js optimizations.",
    estimatedTime: "2-4 hours",
    baseGain: 8,
  },
  "Desktop Performance Score": {
    title: "Improve Desktop Performance",
    impact: "While Google primarily uses mobile scores, desktop performance affects user experience and conversion rates. Fast desktop sites retain visitors longer and reduce bounce rates. Studies show a 1-second delay in page load time leads to a 7% reduction in conversions and 11% fewer page views.",
    stepsForFail: [
      "Profile your page load in Chrome DevTools Performance tab to find long tasks",
      "Optimize the critical rendering path — minimize render-blocking CSS and JS",
      "Implement code splitting to load only what's needed for each page",
      "Use browser caching with proper Cache-Control headers (max-age for static assets)",
      "Minimize DOM size — aim for under 1,500 elements total",
    ],
    stepsForWarning: [
      "Review and remove unused CSS rules using PurgeCSS or similar tools",
      "Optimize web fonts — use font-display: swap and preload critical fonts",
      "Consider preconnecting to required third-party origins with <link rel='preconnect'>",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can add preconnect links, configure font-display, implement code splitting, and optimize next.config.js settings.",
    estimatedTime: "1-2 hours",
    baseGain: 5,
  },
  "Largest Contentful Paint (LCP)": {
    title: "Optimize Largest Contentful Paint",
    impact: "LCP is one of Google's three Core Web Vitals and measures how quickly the main content loads. A good LCP (under 2.5s) is essential for ranking. Pages with poor LCP see up to 24% higher bounce rates. Google reports that sites meeting all Core Web Vitals thresholds experience 24% fewer page abandonments.",
    stepsForFail: [
      "Identify the LCP element using Chrome DevTools > Performance > 'LCP' marker",
      "If LCP is an image: add fetchpriority='high' and preload it via <link rel='preload' as='image'>",
      "If LCP is text: ensure fonts load fast with font-display: swap and preload the font file",
      "Reduce server response time (TTFB) — target under 200ms. Use a CDN or edge caching",
      "Remove or defer any JavaScript that blocks rendering before the LCP element",
      "If using Next.js: add priority prop to the hero Image component",
    ],
    stepsForWarning: [
      "Optimize the LCP image — resize to exact display dimensions, use modern formats (WebP/AVIF)",
      "Preconnect to image CDN origins if images are served from a different domain",
      "Ensure the LCP element is in the initial HTML (not injected by JavaScript)",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can add priority to Next.js Image components, add preload links to the document head, and implement fetchpriority attributes.",
    estimatedTime: "1-2 hours",
    baseGain: 6,
  },
  "Cumulative Layout Shift (CLS)": {
    title: "Fix Layout Shift Issues",
    impact: "CLS is a Core Web Vital measuring visual stability. High CLS (above 0.1) frustrates users when content jumps around and can negatively impact rankings. Google penalizes pages with poor CLS. Research shows that pages with good CLS scores have 15% longer average session durations.",
    stepsForFail: [
      "Add explicit width and height attributes to ALL <img> and <video> elements",
      "Use CSS aspect-ratio property for responsive media containers",
      "Avoid inserting content above existing content (especially ads, banners, or cookie notices)",
      "Preload web fonts and use font-display: optional to prevent font-swap layout shifts",
      "If using iframes or embeds, wrap them in a container with fixed dimensions",
    ],
    stepsForWarning: [
      "Audit your page with Chrome DevTools > Performance > check 'Layout Shift' events",
      "Use placeholder/skeleton components for dynamically loaded content",
      "Ensure animations use transform/opacity only (not width, height, top, left)",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add width/height attributes to images, implement aspect-ratio containers, and add skeleton loading states.",
    estimatedTime: "15-30 min",
    baseGain: 4,
  },
  "Total Blocking Time (TBT)": {
    title: "Reduce Total Blocking Time",
    impact: "TBT measures how long the main thread is blocked by long tasks, directly correlating with interactivity. High TBT means users can't click or type — Google treats this as a poor experience signal. Sites with TBT under 200ms see 70% better engagement rates compared to those with TBT over 600ms.",
    stepsForFail: [
      "Identify long tasks (>50ms) using Chrome DevTools Performance tab",
      "Break up large JavaScript bundles using code splitting (dynamic import())",
      "Defer non-essential third-party scripts (analytics, chat widgets) to load after interaction",
      "Use Web Workers for heavy computations that don't need DOM access",
      "Remove or replace heavy JavaScript libraries with lighter alternatives",
    ],
    stepsForWarning: [
      "Audit third-party scripts — each one contributes to blocking time",
      "Use requestIdleCallback for non-urgent JavaScript work",
      "Implement progressive hydration if using server-side rendering",
    ],
    difficulty: "hard",
    automatable: true,
    automatableNote: "Claude Code can implement dynamic imports, add defer attributes to scripts, and set up code splitting in your bundler config.",
    estimatedTime: "2-4 hours",
    baseGain: 5,
  },
  "Speed Index": {
    title: "Improve Speed Index",
    impact: "Speed Index measures how quickly visible content is populated. A faster Speed Index means users see content sooner, improving perceived performance and engagement metrics. Pages with a Speed Index under 3.4s are considered good by Lighthouse, and every 100ms improvement in Speed Index correlates with a 1% increase in conversion rates.",
    stepsForFail: [
      "Minimize render-blocking resources — move non-critical CSS to async loading",
      "Inline critical above-the-fold CSS directly in the HTML <head>",
      "Optimize the order of resource loading — critical resources first",
      "Reduce the number of network round-trips by bundling and minifying assets",
      "Implement server-side rendering (SSR) or static generation (SSG) for faster first paint",
    ],
    stepsForWarning: [
      "Use resource hints: preload for critical assets, prefetch for next-page assets",
      "Implement server-side rendering (SSR) or static generation (SSG) for faster first paint",
      "Reduce the size of above-the-fold content to speed up visual completion",
    ],
    difficulty: "medium",
    automatable: false,
    estimatedTime: "1-2 hours",
    baseGain: 3,
  },
  "Image Optimization": {
    title: "Optimize Images",
    impact: "Unoptimized images are the #1 cause of slow page loads. Properly optimized images can reduce page weight by 50-80%, dramatically improving load times and Core Web Vitals scores. The average web page serves over 1MB of images, and switching to WebP can reduce that by 25-34% with no quality loss.",
    stepsForFail: [
      "Convert all images to WebP format (30% smaller than JPEG) or AVIF (50% smaller)",
      "Resize images to their display size — never serve a 2000px image in a 400px container",
      "Add responsive srcset attributes so browsers load the right size for each device",
      "Implement lazy loading with loading='lazy' for below-the-fold images",
      "Use a CDN with automatic image optimization (Cloudflare, Imgix, Vercel Image Optimization)",
    ],
    stepsForWarning: [
      "Audit large images using Chrome DevTools Network tab — filter by 'Img' and sort by size",
      "Add width and height attributes to prevent layout shifts during loading",
      "Consider using CSS background-image with image-set() for art direction",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can convert img tags to next/image components with proper sizing, add loading='lazy', and configure next.config.js image optimization.",
    estimatedTime: "15-30 min",
    baseGain: 4,
  },
  "Unused JavaScript": {
    title: "Remove Unused JavaScript",
    impact: "Unused JavaScript increases download time, parse time, and memory usage. Every KB of unused JS delays interactivity. Reducing unused JS directly improves TBT and Time to Interactive. On average, 35% of JavaScript loaded on web pages is unused, and removing it can cut page load time by 0.5-2 seconds.",
    stepsForFail: [
      "Use Chrome DevTools Coverage tab to identify unused JS (red = unused bytes)",
      "Implement tree-shaking by using ES module imports (import { x } from 'lib' instead of import lib)",
      "Split your bundle by route using dynamic import() for page-specific code",
      "Replace large libraries with smaller alternatives (e.g., date-fns instead of moment.js)",
      "Remove unused npm dependencies with depcheck tool",
    ],
    stepsForWarning: [
      "Enable tree-shaking in your bundler configuration",
      "Lazy-load feature-specific code that's not needed on initial page load",
      "Audit third-party scripts and remove any that are no longer used",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can convert imports to named imports for tree-shaking, implement dynamic imports for code splitting, and identify unused dependencies.",
    estimatedTime: "1-2 hours",
    baseGain: 3,
  },
  "Unused CSS": {
    title: "Remove Unused CSS",
    impact: "Unused CSS blocks rendering and increases page load time. Browsers must download and parse ALL CSS before rendering content. Removing unused CSS can significantly reduce First Contentful Paint. Studies show that the average page loads 6x more CSS than it actually uses, with 85% of CSS rules going unused on any given page.",
    stepsForFail: [
      "Use PurgeCSS or Tailwind's built-in purging to remove unused CSS classes",
      "Split CSS by route — load only the styles needed for the current page",
      "Move non-critical CSS to async loading using media='print' onload trick",
      "Remove unused CSS frameworks or utility classes",
      "Audit CSS coverage using Chrome DevTools Coverage tab to quantify waste",
    ],
    stepsForWarning: [
      "Audit CSS coverage using Chrome DevTools Coverage tab",
      "Consider CSS-in-JS or CSS Modules for automatic scoping and dead-code elimination",
      "Remove any imported CSS files that are no longer referenced by components",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can configure PurgeCSS, set up Tailwind purging, and convert global CSS to CSS Modules.",
    estimatedTime: "15-30 min",
    baseGain: 2,
  },

  // ─── On-Page SEO ─────────────────────────────────────────────────────────
  "Title Tag": {
    title: "Optimize Title Tag",
    impact: "The title tag is the single most important on-page SEO element. It appears in search results as the clickable headline and heavily influences click-through rates and rankings. Google uses it to understand page topic. Well-optimized title tags can increase organic CTR by 20-35%.",
    stepsForFail: [
      "Add a unique <title> tag in the <head> section of every page",
      "Include your primary keyword naturally within the first 60 characters",
      "Format: 'Primary Keyword - Secondary Keyword | Brand Name'",
      "Make it compelling — it's your ad copy in search results",
      "In Next.js: use the metadata export in page.tsx or layout.tsx",
    ],
    stepsForWarning: [
      "Adjust title length to 50-60 characters for optimal display in search results",
      "Front-load your primary keyword — put it near the beginning of the title",
      "Avoid keyword stuffing — write for humans, not just search engines",
      "Ensure each page has a unique title that describes its specific content",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add or modify the <title> tag, implement Next.js metadata exports, and suggest keyword-optimized titles.",
    estimatedTime: "15-30 min",
    baseGain: 5,
  },
  "Meta Description": {
    title: "Add/Optimize Meta Description",
    impact: "While not a direct ranking factor, meta descriptions significantly impact click-through rates from search results. A compelling description can increase CTR by 5-10%, which indirectly improves rankings. Pages with custom meta descriptions receive 5.8% more clicks than those without.",
    stepsForFail: [
      "Add <meta name='description' content='...'> to the <head> of every page",
      "Write 150-160 characters that summarize the page content and include a call-to-action",
      "Include your primary keyword naturally — Google bolds matching search terms",
      "Make it unique per page — duplicate descriptions are treated as missing",
      "In Next.js: add description to your metadata export object",
    ],
    stepsForWarning: [
      "Adjust length to 150-160 characters — too short won't be descriptive, too long gets truncated",
      "Include your primary keyword and a value proposition",
      "Add a call-to-action (Learn more, Get started, Discover, etc.)",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add meta description tags, implement Next.js metadata, and suggest optimized descriptions based on page content.",
    estimatedTime: "15-30 min",
    baseGain: 4,
  },
  "H1 Tag": {
    title: "Fix H1 Heading",
    impact: "The H1 tag is the second most important on-page SEO element after the title. It tells Google the main topic of the page. Pages with a single, descriptive H1 rank significantly better than those without. An Ahrefs study found a correlation between H1 tags containing target keywords and higher Google rankings.",
    stepsForFail: [
      "Add exactly one <h1> tag to the page that describes the main topic",
      "Include your primary keyword in the H1 text naturally",
      "Place the H1 near the top of the main content area",
      "Keep it under 70 characters for best results",
      "Ensure the H1 is different from the <title> tag but topically aligned",
    ],
    stepsForWarning: [
      "Reduce to exactly one H1 per page — multiple H1s dilute topical relevance",
      "Ensure the H1 accurately represents the page's main content",
      "Use H2/H3 for subtopics instead of additional H1 tags",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add, modify, or consolidate H1 tags in your HTML templates or React components.",
    estimatedTime: "15-30 min",
    baseGain: 4,
  },
  "Heading Structure": {
    title: "Improve Heading Hierarchy",
    impact: "A proper heading hierarchy (H1 → H2 → H3) helps Google understand your content structure and can earn featured snippets. Well-structured content with subheadings keeps users engaged longer, reducing bounce rate. Pages with proper heading hierarchies are 2x more likely to appear in featured snippets.",
    stepsForFail: [
      "Add H2 tags for each major section of your content",
      "Use H3 tags for subsections within H2 sections",
      "Follow a logical hierarchy — never skip levels (H1 → H3 without H2)",
      "Include relevant keywords in subheadings where natural",
      "Aim for at least 2-3 H2 tags per page for content structure",
    ],
    stepsForWarning: [
      "Review heading levels — ensure they create a logical outline of your content",
      "Add H3 subheadings to break up long sections",
      "Include relevant keywords naturally in your H2 and H3 tags",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can restructure your HTML headings to create a proper hierarchy and suggest keyword-rich subheadings.",
    estimatedTime: "15-30 min",
    baseGain: 3,
  },
  "Image Alt Tags": {
    title: "Add Alt Text to Images",
    impact: "Alt text is essential for accessibility (screen readers) and SEO (Google Image Search). Images with descriptive alt text can rank in Google Images, driving additional organic traffic. Missing alt text is also an accessibility violation. Google Images accounts for 22.6% of all web searches, making alt text a significant traffic opportunity.",
    stepsForFail: [
      "Add descriptive alt attributes to every <img> tag on the page",
      "Describe WHAT the image shows, not just 'image' or 'photo'",
      "Include relevant keywords naturally when they describe the image accurately",
      "For decorative images only, use alt='' (empty string) to hide from screen readers",
      "Keep alt text under 125 characters for optimal screen reader compatibility",
    ],
    stepsForWarning: [
      "Audit remaining images without alt text and add descriptions",
      "Improve generic alt text (like 'image1.jpg') with meaningful descriptions",
      "Review keyword usage in alt text to ensure relevance without stuffing",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can identify images missing alt attributes and suggest descriptive alt text based on the image context and filename.",
    estimatedTime: "15-30 min",
    baseGain: 3,
  },
  "Canonical Tag": {
    title: "Add Canonical Tag",
    impact: "Canonical tags tell Google which URL is the 'official' version of a page, preventing duplicate content issues. Without a canonical tag, Google may index multiple URLs for the same content, diluting your ranking signals. Sites that properly implement canonical tags see up to 10% improvement in crawl efficiency.",
    stepsForFail: [
      "Add <link rel='canonical' href='https://yoursite.com/page'> to the <head> of every page",
      "Use the full absolute URL (including https:// and www or non-www)",
      "Ensure the canonical URL matches the URL you want indexed",
      "For paginated content, each page should canonical to itself",
      "In Next.js: use the alternates.canonical field in your metadata export",
    ],
    stepsForWarning: [
      "Add a self-referencing canonical tag to prevent URL parameter duplicates",
      "Ensure canonical URLs are consistent (always www or always non-www)",
      "Verify canonical tags point to pages that return 200 status codes",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add canonical link tags to your HTML head, configure Next.js metadata alternates, and ensure URL consistency.",
    estimatedTime: "15-30 min",
    baseGain: 3,
  },
  "Language Attribute": {
    title: "Add Language Attribute",
    impact: "The lang attribute helps search engines serve your content to the right audience and improves accessibility for screen readers. It's a basic requirement for international SEO and WCAG compliance. Pages with correct language declarations are 12% more likely to rank in the correct regional search results.",
    stepsForFail: [
      "Add lang attribute to your <html> tag: <html lang='en'> (or your content language)",
      "Use the correct ISO 639-1 language code (en, fr, de, es, etc.)",
      "For multi-language sites, use hreflang tags to indicate language alternatives",
      "In Next.js: set the lang attribute in your root layout.tsx html tag",
      "Validate the language code matches your actual page content language",
    ],
    stepsForWarning: [
      "Verify the lang attribute matches your actual content language",
      "Add hreflang annotations if your site serves multiple languages",
      "Consider adding lang attributes to sections of content in different languages",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add the lang attribute to your <html> tag and configure hreflang tags for multi-language sites.",
    estimatedTime: "15-30 min",
    baseGain: 2,
  },

  // ─── Technical SEO ───────────────────────────────────────────────────────
  "HTTPS": {
    title: "Migrate to HTTPS",
    impact: "HTTPS is a confirmed Google ranking signal. Sites without HTTPS show a 'Not Secure' warning in Chrome, causing users to leave immediately. It's required for HTTP/2, service workers, and many modern web APIs. Google reports that 95% of page-one results use HTTPS, and sites migrating from HTTP to HTTPS see an average 5% ranking boost.",
    stepsForFail: [
      "Obtain an SSL/TLS certificate — free options: Let's Encrypt, Cloudflare, or your hosting provider",
      "Install the certificate on your web server (Apache, Nginx, etc.)",
      "Set up 301 redirects from all HTTP URLs to their HTTPS equivalents",
      "Update all internal links, images, and resources to use https:// URLs",
      "Update your sitemap.xml and robots.txt with HTTPS URLs",
      "Update Google Search Console property to the HTTPS version",
    ],
    stepsForWarning: [
      "Check for mixed content warnings — some resources may still load over HTTP",
      "Verify all internal links use HTTPS URLs",
      "Ensure HSTS (HTTP Strict Transport Security) header is set for extra security",
    ],
    difficulty: "medium",
    automatable: false,
    estimatedTime: "1-2 hours",
    baseGain: 8,
  },
  "Viewport Meta": {
    title: "Add Viewport Meta Tag",
    impact: "The viewport meta tag is required for mobile-friendly rendering. Without it, mobile devices display the desktop version zoomed out, making the site unusable. Google requires a viewport tag for mobile-first indexing. Sites without a proper viewport tag are effectively excluded from mobile search results, which account for over 60% of all searches.",
    stepsForFail: [
      "Add to <head>: <meta name='viewport' content='width=device-width, initial-scale=1'>",
      "Do NOT use maximum-scale=1 or user-scalable=no (accessibility violations)",
      "Ensure your CSS is responsive — use relative units (rem, %, vw) not fixed pixels",
      "Test on actual mobile devices or Chrome DevTools device emulation",
      "Verify the viewport tag is not duplicated or conflicting with another meta tag",
    ],
    stepsForWarning: [
      "Review viewport configuration for accessibility compliance",
      "Ensure responsive CSS accompanies the viewport tag",
      "Test on multiple screen sizes to confirm proper rendering",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add the viewport meta tag to your HTML head or Next.js layout.",
    estimatedTime: "15-30 min",
    baseGain: 5,
  },
  "Robots Meta": {
    title: "Fix Robots Meta Directive",
    impact: "A noindex directive prevents Google from indexing the page entirely. If this is unintentional, your page is completely invisible in search results. This is one of the most critical SEO issues possible. Accidentally noindexing key pages can cause organic traffic drops of 90% or more overnight.",
    stepsForFail: [
      "Remove or change the <meta name='robots' content='noindex'> tag",
      "If you need noindex on specific pages only, ensure it's not applied globally",
      "Check for X-Robots-Tag HTTP headers that might also set noindex",
      "Verify in Google Search Console that the page is indexed after the change",
      "Audit all pages for unintended noindex directives in templates or layouts",
    ],
    stepsForWarning: [
      "Review the robots meta content to ensure it matches your indexing intent",
      "Ensure important pages use 'index, follow' (or omit the tag entirely for default behavior)",
      "Check for conflicting robots directives between meta tags and HTTP headers",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can modify or remove robots meta tags from your HTML templates.",
    estimatedTime: "15-30 min",
    baseGain: 6,
  },
  "Structured Data (Schema.org)": {
    title: "Add Structured Data Markup",
    impact: "Structured data (JSON-LD) helps Google understand your content type and can generate rich snippets in search results — star ratings, FAQs, prices, events, etc. Rich snippets increase CTR by 20-30% on average. Sites implementing structured data see a 25% increase in click-through rate compared to plain blue links.",
    stepsForFail: [
      "Identify the most relevant schema type for your page (Article, Product, LocalBusiness, FAQ, etc.)",
      "Add a <script type='application/ld+json'> block in the <head> or <body>",
      "Include required properties for your schema type (check schema.org)",
      "Validate your markup using Google's Rich Results Test tool",
      "For Next.js: add JSON-LD in a <script> tag within your page component",
    ],
    stepsForWarning: [
      "Add structured data to improve your search result appearance",
      "Start with the schema type most relevant to your business (Organization, WebSite, BreadcrumbList)",
      "Expand existing structured data to include more properties for richer results",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can generate JSON-LD structured data blocks based on your page content and business type, and add them to your HTML.",
    estimatedTime: "1-2 hours",
    baseGain: 4,
  },
  "Inline Resources": {
    title: "Externalize Inline Scripts and Styles",
    impact: "Excessive inline scripts and styles increase HTML document size, prevent browser caching, and can block rendering. Externalizing them enables caching and reduces repeated downloads across page visits. Pages with properly externalized resources load 15-25% faster on repeat visits due to browser caching benefits.",
    stepsForFail: [
      "Move inline <script> blocks to external .js files and reference with <script src='...'>",
      "Move inline <style> blocks to external .css files and reference with <link rel='stylesheet'>",
      "Use defer or async attributes on non-critical script tags",
      "Keep only truly critical inline CSS for above-the-fold rendering",
      "Bundle related inline scripts into a single external file to reduce HTTP requests",
    ],
    stepsForWarning: [
      "Review inline scripts — move any over 1KB to external files",
      "Consider CSS-in-JS solutions that extract critical CSS automatically",
      "Audit the total size of inline resources and prioritize the largest ones",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can extract inline scripts and styles into separate files and update the HTML references.",
    estimatedTime: "1-2 hours",
    baseGain: 2,
  },
  "Render-Blocking Resources": {
    title: "Eliminate Render-Blocking Resources",
    impact: "Render-blocking CSS and JavaScript delay First Contentful Paint and LCP. Every render-blocking resource adds latency before users see any content. Eliminating them can improve load times by 1-3 seconds. Google Lighthouse data shows that removing render-blocking resources can improve FCP by up to 50% on resource-heavy pages.",
    stepsForFail: [
      "Add async or defer attributes to non-critical <script> tags",
      "Move non-critical CSS to async loading: <link rel='stylesheet' media='print' onload=\"this.media='all'\">",
      "Inline critical above-the-fold CSS directly in the document <head>",
      "Load third-party scripts (analytics, tracking) asynchronously",
      "Use modulepreload for critical JavaScript modules",
    ],
    stepsForWarning: [
      "Identify blocking resources in Chrome DevTools Performance tab",
      "Prioritize moving third-party scripts to async loading",
      "Consider using the Critters plugin for automatic critical CSS extraction",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can add defer/async attributes, implement critical CSS inlining, and configure resource loading priorities.",
    estimatedTime: "1-2 hours",
    baseGain: 4,
  },
  "Robots.txt": {
    title: "Configure Robots.txt",
    impact: "The robots.txt file controls which parts of your site search engine crawlers can access. A missing or misconfigured robots.txt can either block important pages from being crawled or waste crawl budget on irrelevant pages. Sites with proper robots.txt configuration see up to 30% more efficient crawling by Googlebot.",
    stepsForFail: [
      "Create a robots.txt file in the root of your website (e.g., public/robots.txt)",
      "Add 'User-agent: *' followed by 'Allow: /' to permit crawling of all public pages",
      "Add 'Disallow:' directives for admin areas, private content, or duplicate pages",
      "Include a 'Sitemap:' directive pointing to your sitemap.xml URL",
      "Test the file using Google Search Console's robots.txt tester tool",
    ],
    stepsForWarning: [
      "Review existing rules to ensure no important pages are accidentally blocked",
      "Add a Sitemap directive if missing to help crawlers discover your pages",
      "Remove overly broad Disallow rules that may block valuable content",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can create or modify the robots.txt file with proper directives and add it to your public directory.",
    estimatedTime: "15-30 min",
    baseGain: 5,
  },
  "Sitemap.xml": {
    title: "Create/Fix Sitemap.xml",
    impact: "A sitemap.xml file helps search engines discover and prioritize your pages for crawling. Without a sitemap, Google relies solely on following links, which can miss orphaned or deep pages. Sites with sitemaps get indexed 50% faster on average, and large sites can see a 10-15% increase in indexed pages.",
    stepsForFail: [
      "Generate a sitemap.xml file listing all important public URLs on your site",
      "Include <lastmod>, <changefreq>, and <priority> tags for each URL",
      "Place the sitemap.xml in the root of your domain (e.g., yoursite.com/sitemap.xml)",
      "Reference the sitemap in your robots.txt file: Sitemap: https://yoursite.com/sitemap.xml",
      "Submit the sitemap to Google Search Console and Bing Webmaster Tools",
    ],
    stepsForWarning: [
      "Update the sitemap to include any new or missing pages",
      "Ensure <lastmod> dates are accurate and reflect actual content changes",
      "Remove URLs that return 404 or redirect from the sitemap",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can generate a sitemap.xml file, configure dynamic sitemap generation in Next.js, and add the reference to robots.txt.",
    estimatedTime: "15-30 min",
    baseGain: 5,
  },
  "Character Encoding": {
    title: "Fix Character Encoding",
    impact: "Proper character encoding (UTF-8) ensures text displays correctly across all browsers and devices. Missing or incorrect encoding can cause garbled text, broken characters, and poor user experience. Google recommends UTF-8 and may penalize pages with encoding issues that affect content readability.",
    stepsForFail: [
      "Add <meta charset='UTF-8'> as the first element inside <head>",
      "Ensure your server sends the correct Content-Type header: text/html; charset=UTF-8",
      "Save all HTML files with UTF-8 encoding in your text editor",
      "Check for any BOM (Byte Order Mark) characters that may cause issues",
      "Validate that special characters (accents, symbols, emoji) display correctly",
    ],
    stepsForWarning: [
      "Verify the charset meta tag is present and set to UTF-8",
      "Check server response headers for correct Content-Type encoding",
      "Test pages with international characters to confirm proper display",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add the charset meta tag to your HTML head or verify it in your Next.js layout.",
    estimatedTime: "15-30 min",
    baseGain: 2,
  },
  "Page Size": {
    title: "Reduce Page Size",
    impact: "Large page sizes increase load time, especially on mobile networks. Google recommends keeping total page weight under 1.5MB for optimal performance. Pages over 3MB take an average of 6+ seconds to load on 3G connections, leading to 53% of mobile users abandoning the site.",
    stepsForFail: [
      "Audit total page weight using Chrome DevTools Network tab — check the transferred size",
      "Compress and optimize all images — this is typically the biggest contributor to page size",
      "Enable Gzip or Brotli compression on your server for text-based resources (HTML, CSS, JS)",
      "Minify CSS and JavaScript files to remove whitespace and comments",
      "Remove unnecessary fonts, icons, or libraries that are loaded but not used",
    ],
    stepsForWarning: [
      "Review the largest resources and prioritize optimizing them",
      "Consider lazy-loading non-critical resources to reduce initial page weight",
      "Implement responsive images with srcset to serve smaller files on mobile",
    ],
    difficulty: "medium",
    automatable: false,
    estimatedTime: "1-2 hours",
    baseGain: 4,
  },
  "Internal Links": {
    title: "Improve Internal Linking",
    impact: "Internal links distribute page authority (PageRank) throughout your site and help search engines discover and understand your content hierarchy. Pages with strong internal linking rank 40% better on average. Proper internal linking can increase organic traffic by 20-40% by ensuring all pages are discoverable and contextually connected.",
    stepsForFail: [
      "Identify orphan pages (pages with no internal links pointing to them) using a crawl tool like Screaming Frog",
      "Add contextual internal links from related content pages to important target pages",
      "Use descriptive anchor text that includes relevant keywords instead of 'click here'",
      "Create a logical site hierarchy with clear navigation paths to all important pages",
      "Add breadcrumb navigation to help both users and search engines understand page relationships",
    ],
    stepsForWarning: [
      "Audit internal links for broken or redirected URLs and fix them",
      "Add more contextual links between topically related pages",
      "Review anchor text distribution to ensure variety and relevance",
    ],
    difficulty: "medium",
    automatable: false,
    estimatedTime: "1-2 hours",
    baseGain: 3,
  },
  "Heading Density": {
    title: "Optimize Heading Density",
    impact: "Heading density refers to the ratio of headings to content on a page. Too few headings make content hard to scan, while too many dilute their semantic value. Well-distributed headings every 200-300 words improve readability and help Google extract key topics from your page.",
    stepsForFail: [
      "Add H2 headings to break up long content sections — aim for one every 200-300 words",
      "Use H3 subheadings within sections that cover multiple subtopics",
      "Remove excessive or redundant headings that don't add semantic value",
      "Ensure headings are descriptive and summarize the content that follows",
      "Include relevant keywords in headings where they fit naturally",
    ],
    stepsForWarning: [
      "Review heading distribution and add headings to long unbroken text sections",
      "Ensure headings create a scannable outline of your content",
      "Balance heading density — neither too sparse nor too dense",
    ],
    difficulty: "easy",
    automatable: false,
    estimatedTime: "15-30 min",
    baseGain: 2,
  },
  "Content-to-HTML Ratio": {
    title: "Improve Content-to-HTML Ratio",
    impact: "A low content-to-HTML ratio indicates excessive code relative to actual content, which can signal thin content to search engines. Pages with a ratio below 10% may be flagged as low-quality. Improving the ratio by adding meaningful content and reducing code bloat can boost rankings by 5-15% for targeted keywords.",
    stepsForFail: [
      "Add more meaningful text content to the page — aim for at least 300 words of unique content",
      "Remove unnecessary HTML comments, whitespace, and inline styles from your markup",
      "Externalize inline JavaScript and CSS to reduce HTML document size",
      "Remove unused or redundant HTML elements, empty divs, and wrapper elements",
      "Minify your HTML output in production to remove extra whitespace",
    ],
    stepsForWarning: [
      "Audit the page for unnecessary HTML bloat and clean up the markup",
      "Add more substantive content to improve the text-to-code ratio",
      "Consider server-side rendering to reduce client-side HTML overhead",
    ],
    difficulty: "medium",
    automatable: false,
    estimatedTime: "1-2 hours",
    baseGain: 3,
  },
  "Keyword in Title": {
    title: "Add Target Keyword to Title",
    impact: "Including your target keyword in the page title is one of the strongest on-page ranking signals. Pages with the exact target keyword in their title tag are 2x more likely to rank in the top 10 results. A well-optimized title with natural keyword placement drives both higher rankings and better click-through rates from search results.",
    stepsForFail: [
      "Identify the primary keyword for this page based on search intent and competition",
      "Place the keyword near the beginning of the <title> tag for maximum impact",
      "Keep the title under 60 characters to avoid truncation in search results",
      "Write the title naturally — avoid keyword stuffing or awkward phrasing",
      "In Next.js: update the title in your metadata export to include the keyword",
    ],
    stepsForWarning: [
      "Move the keyword closer to the beginning of the title if it appears late",
      "Ensure the keyword usage sounds natural and compelling to users",
      "Consider adding a secondary keyword or modifier to capture long-tail searches",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can analyze your page content, suggest relevant keywords, and update the title tag in your HTML or Next.js metadata.",
    estimatedTime: "15-30 min",
    baseGain: 3,
  },

  // ─── Social & Metadata ──────────────────────────────────────────────────
  "Open Graph Title": {
    title: "Add Open Graph Title",
    impact: "Open Graph tags control how your page appears when shared on Facebook, LinkedIn, Slack, and other platforms. Without og:title, platforms guess your title and often display it incorrectly, reducing click-throughs from social shares. Posts with properly configured OG tags receive 2x more engagement on social platforms.",
    stepsForFail: [
      "Add <meta property='og:title' content='Your Page Title'> to the <head>",
      "Make it compelling — this is the headline people see when your link is shared",
      "Keep it under 60 characters for optimal display on most platforms",
      "In Next.js: add openGraph.title to your metadata export",
      "Use a slightly different title than your SEO title to optimize for social engagement",
    ],
    stepsForWarning: [
      "Review your og:title for engagement potential on social platforms",
      "Test how your page appears when shared using Facebook's Sharing Debugger",
      "Ensure og:title differs meaningfully from the default title tag if needed",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add all Open Graph meta tags to your HTML head or Next.js metadata configuration.",
    estimatedTime: "15-30 min",
    baseGain: 2,
  },
  "Open Graph Description": {
    title: "Add Open Graph Description",
    impact: "The og:description appears as the preview text when your link is shared on social platforms. A compelling description increases social click-through rates and drives referral traffic to your site. Social referral traffic can account for 10-30% of total traffic for well-optimized pages.",
    stepsForFail: [
      "Add <meta property='og:description' content='...'> to the <head>",
      "Write 1-2 sentences that entice people to click when they see your link shared",
      "Different from meta description — optimize for social engagement, not search",
      "In Next.js: add openGraph.description to your metadata export",
      "Include a clear value proposition or intriguing hook to drive clicks",
    ],
    stepsForWarning: [
      "Review your og:description for social engagement potential",
      "Test the description appearance using platform-specific debugger tools",
      "Ensure the description accurately represents the page content",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add og:description meta tags and suggest engaging social descriptions.",
    estimatedTime: "15-30 min",
    baseGain: 2,
  },
  "Open Graph Image": {
    title: "Add Open Graph Image",
    impact: "Links shared with an og:image get 2-3x more engagement than those without. The image is the most visually prominent element in social shares. Missing images make your links look unprofessional and reduce clicks. Facebook data shows that posts with images receive 87% more interactions.",
    stepsForFail: [
      "Create a 1200x630px image optimized for social sharing",
      "Add <meta property='og:image' content='https://yoursite.com/og-image.jpg'> to <head>",
      "Use an absolute URL (not relative) for the image path",
      "Add og:image:width and og:image:height meta tags for faster rendering",
      "Consider using a dynamic OG image generator (like Vercel's @vercel/og) for unique per-page images",
    ],
    stepsForWarning: [
      "Verify your og:image URL is accessible and returns a valid image",
      "Test the image appearance on multiple platforms using their debugger tools",
      "Ensure the image dimensions are optimal (1200x630px) for large previews",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add og:image meta tags and set up Vercel OG image generation for dynamic social images.",
    estimatedTime: "15-30 min",
    baseGain: 2,
  },
  "Twitter Card": {
    title: "Add Twitter Card Meta Tags",
    impact: "Twitter Card tags control how your links appear on X/Twitter. summary_large_image cards get significantly more engagement than basic text links. They also work on other platforms that support Twitter Cards. Tweets with Twitter Cards see 43% more engagement than those without.",
    stepsForFail: [
      "Add <meta name='twitter:card' content='summary_large_image'> for large image previews",
      "Add <meta name='twitter:title'> and <meta name='twitter:description'>",
      "Add <meta name='twitter:image'> pointing to a 1200x628px image",
      "Validate using Twitter Card Validator tool",
      "In Next.js: add twitter property to your metadata export",
    ],
    stepsForWarning: [
      "Add twitter:card meta tag to enable rich link previews on X/Twitter",
      "Use summary_large_image for maximum visual impact",
      "Test your Twitter Card using the X Card Validator tool",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add all Twitter Card meta tags to your HTML head or Next.js metadata configuration.",
    estimatedTime: "15-30 min",
    baseGain: 1,
  },
  "Favicon": {
    title: "Add Favicon",
    impact: "Favicons appear in browser tabs, bookmarks, and Google search results (on mobile). A missing favicon shows a generic icon, making your site look unfinished. It's a small but important trust signal. Google now displays favicons in mobile search results, making them a visible branding opportunity for every search impression.",
    stepsForFail: [
      "Create a favicon.ico (32x32 or 16x16) and place it in your public/ directory",
      "Add <link rel='icon' href='/favicon.ico'> to your <head>",
      "Also create apple-touch-icon (180x180) for iOS: <link rel='apple-touch-icon' href='/apple-touch-icon.png'>",
      "Consider adding a web manifest with multiple icon sizes for PWA support",
      "In Next.js: place favicon.ico in the app/ directory for automatic detection",
    ],
    stepsForWarning: [
      "Add a favicon to your site for professional appearance in browser tabs and search results",
      "Create multiple sizes (16x16, 32x32, 180x180) for cross-device compatibility",
      "Add an SVG favicon for scalable, high-quality display on all screen densities",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add favicon link tags to your HTML head and configure Next.js favicon in the app directory.",
    estimatedTime: "15-30 min",
    baseGain: 1,
  },

  // ─── Mobile & Accessibility ─────────────────────────────────────────────
  "Viewport Meta Tag": {
    title: "Add Viewport Meta Tag",
    impact: "Essential for mobile rendering. Without it, your site is not mobile-friendly and will be penalized in mobile search rankings. Mobile-first indexing means Google primarily uses the mobile version of your site for ranking, making proper viewport configuration critical for 60%+ of all search traffic.",
    stepsForFail: [
      "Add <meta name='viewport' content='width=device-width, initial-scale=1'> to <head>",
      "Ensure responsive CSS accompanies the viewport tag",
      "Do NOT use maximum-scale=1 or user-scalable=no (accessibility violations)",
      "Test on actual mobile devices or Chrome DevTools device emulation",
      "Verify no other meta viewport tags conflict with this one",
    ],
    stepsForWarning: [
      "Verify the viewport configuration is correct and complete",
      "Test on multiple device sizes to confirm proper rendering",
      "Ensure no JavaScript overrides the viewport settings",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add the viewport meta tag to your HTML head or Next.js layout.",
    estimatedTime: "15-30 min",
    baseGain: 4,
  },
  "Alt Text Coverage": {
    title: "Improve Image Accessibility",
    impact: "Alt text is required for WCAG 2.1 compliance and helps visually impaired users understand images. It's also used by Google to understand image content for SEO. Approximately 15% of the global population has some form of disability, and accessible sites see 12% higher engagement from these users.",
    stepsForFail: [
      "Add descriptive alt attributes to all images missing them",
      "Use meaningful descriptions, not just filenames",
      "Include relevant keywords where they naturally describe the image",
      "For decorative images, use alt='' (empty string) rather than omitting the attribute",
      "Keep alt text concise but descriptive — under 125 characters",
    ],
    stepsForWarning: [
      "Add alt text to the remaining images without it",
      "Review existing alt text for accuracy and keyword relevance",
      "Test with a screen reader to verify alt text provides meaningful context",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can identify images missing alt text and add descriptive attributes.",
    estimatedTime: "15-30 min",
    baseGain: 2,
  },
  "Language Declaration": {
    title: "Add Language Declaration",
    impact: "Improves accessibility and helps search engines serve content to the right audience. Screen readers use the lang attribute to apply correct pronunciation rules. Missing language declarations affect both WCAG compliance and international SEO targeting, potentially misdirecting content to wrong-language audiences.",
    stepsForFail: [
      "Add lang attribute to your <html> tag with the correct ISO 639-1 code",
      "For multi-language content, add lang attributes to sections in different languages",
      "Validate the language code matches your actual content language",
      "In Next.js: set the lang attribute in your root layout.tsx html tag",
      "Consider adding hreflang tags for multi-language or multi-region sites",
    ],
    stepsForWarning: [
      "Verify the lang attribute matches your content language",
      "Add lang attributes to inline content in other languages",
      "Test with screen readers to ensure correct pronunciation",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add the lang attribute to your HTML element.",
    estimatedTime: "15-30 min",
    baseGain: 1,
  },
  "Mobile Usability": {
    title: "Improve Mobile Usability",
    impact: "Google uses mobile-first indexing. Poor mobile usability directly impacts rankings and user experience on the majority of web traffic. 61% of users are unlikely to return to a mobile site they had trouble accessing, and 40% visit a competitor's site instead. Mobile usability is a direct ranking factor in Google's algorithm.",
    stepsForFail: [
      "Follow all Performance category recommendations with a mobile focus",
      "Test with Chrome DevTools mobile emulation across multiple device sizes",
      "Optimize touch targets to be at least 44x44px with adequate spacing between them",
      "Ensure text is readable without zooming — use a minimum 16px base font size",
      "Fix horizontal scrolling issues by ensuring content fits within the viewport width",
    ],
    stepsForWarning: [
      "Focus on reducing JavaScript payload for mobile users",
      "Implement adaptive loading — serve lighter assets to mobile devices",
      "Test navigation and interactive elements on actual mobile devices",
    ],
    difficulty: "hard",
    automatable: false,
    estimatedTime: "2-4 hours",
    baseGain: 4,
  },

  // ─── Content Quality ────────────────────────────────────────────────────
  "Word Count": {
    title: "Add More Content",
    impact: "Thin content (under 300 words) rarely ranks well. Google needs sufficient content to understand the page topic. Pages with 1,000+ words of quality content tend to rank for more keywords and earn more backlinks. The average first-page Google result contains 1,447 words, and longer content generates 77% more backlinks.",
    stepsForFail: [
      "Expand your page content to at least 300 words (ideally 800+)",
      "Add sections covering related topics and common questions",
      "Include relevant keywords naturally throughout the content",
      "Add FAQ sections to address user queries (can also trigger FAQ rich snippets)",
      "Ensure content is unique and provides genuine value — not filler text",
    ],
    stepsForWarning: [
      "Consider adding more depth to your content",
      "Research related questions your audience asks and address them",
      "Add supporting examples, case studies, or data to strengthen existing content",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can help draft additional content sections, FAQ blocks, and supporting copy for your pages.",
    estimatedTime: "1-2 hours",
    baseGain: 3,
  },
  "Readability Score (Estimated)": {
    title: "Improve Content Readability",
    impact: "Content that's easy to read keeps users engaged longer, reducing bounce rate. Google's algorithms favor content that matches user intent and is easy to consume. Pages written at an 8th-grade reading level receive 36% more engagement than those written at a college level. Clear, scannable content also increases time on page by 25%.",
    stepsForFail: [
      "Rewrite complex sentences to be shorter and clearer — aim for under 20 words per sentence",
      "Break long paragraphs into 2-3 sentences each for better readability",
      "Use bullet points and numbered lists to present information clearly",
      "Add descriptive subheadings every 200-300 words for scannability",
      "Replace jargon and technical terms with simpler alternatives where possible",
    ],
    stepsForWarning: [
      "Use shorter sentences (under 20 words) and paragraphs (2-3 sentences)",
      "Write at an 8th-grade reading level for general audiences",
      "Add subheadings every 200-300 words for scannability",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can rewrite content for improved readability, break up long paragraphs, and add structural elements.",
    estimatedTime: "15-30 min",
    baseGain: 2,
  },
  "Content Freshness (Estimated)": {
    title: "Update Content Regularly",
    impact: "Google favors fresh, updated content for many queries. Regularly updated pages signal that the information is current and reliable, improving rankings over time. Pages updated within the last 30 days rank 35% higher for time-sensitive queries. Content freshness is especially important for news, technology, and health-related topics.",
    stepsForFail: [
      "Review all key pages and update outdated information, statistics, and examples",
      "Add a 'Last Updated' date visible on the page to show freshness to users and Google",
      "Update internal and external links to ensure they are not broken or outdated",
      "Add new sections addressing recent developments or trends in your topic area",
      "Republish updated content with a new date to signal freshness to search engines",
    ],
    stepsForWarning: [
      "Review and update key pages at least quarterly",
      "Add a 'Last Updated' date to show freshness",
      "Update statistics, links, and examples with current data",
    ],
    difficulty: "medium",
    automatable: false,
    estimatedTime: "1-2 hours",
    baseGain: 2,
  },
  "Duplicate Content Risk (Estimated)": {
    title: "Address Duplicate Content",
    impact: "Duplicate content confuses search engines about which version to rank, potentially splitting ranking signals across multiple URLs. Canonical tags and proper redirects are essential. An estimated 29% of the web consists of duplicate content, and sites that consolidate duplicates see an average 10% improvement in organic traffic.",
    stepsForFail: [
      "Add canonical tags to all pages to indicate the preferred URL version",
      "Set up 301 redirects for any duplicate or alternate URLs to their canonical versions",
      "Use consistent URL structures (choose www vs non-www and stick with it)",
      "Check for HTTP/HTTPS duplicates and consolidate with redirects",
      "Audit your site with Screaming Frog or Sitebulb to identify duplicate title tags and content",
    ],
    stepsForWarning: [
      "Add canonical tags to all pages to indicate the preferred URL",
      "Set up 301 redirects for any duplicate or alternate URLs",
      "Use consistent URL structures (choose www vs non-www and stick with it)",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can add canonical tags and help identify potential duplicate content issues.",
    estimatedTime: "1-2 hours",
    baseGain: 2,
  },

  // ─── Backlinks (estimated — generic advice) ─────────────────────────────
  "Domain Authority (Estimated)": {
    title: "Build Domain Authority",
    impact: "Domain Authority correlates strongly with search rankings. Higher authority means your pages are more likely to rank for competitive keywords. Building authority is a long-term investment that compounds over time. Sites with a DA above 40 are 5x more likely to rank on the first page for competitive terms compared to sites with DA below 20.",
    stepsForFail: [
      "Create high-quality, linkable content (original research, infographics, comprehensive guides)",
      "Guest post on reputable industry blogs with links back to your site",
      "Build relationships with industry influencers and journalists for natural mentions",
      "Ensure your technical SEO is solid — Google won't trust a site with fundamental issues",
      "Register and optimize your Google Business Profile for local authority",
    ],
    stepsForWarning: [
      "Focus on earning quality backlinks from authoritative sites in your industry",
      "Create content that naturally attracts links (data, research, tools)",
      "Monitor your backlink profile with Ahrefs or Moz and disavow toxic links",
    ],
    difficulty: "hard",
    automatable: false,
    estimatedTime: "2-4 hours",
    baseGain: 3,
  },
  "Estimated Backlinks": {
    title: "Increase Quality Backlinks",
    impact: "Backlinks remain one of Google's top 3 ranking factors. Quality matters more than quantity — one link from an authoritative site is worth more than hundreds from low-quality sites. Pages with at least 10 referring domains are 2x more likely to rank in the top 10 compared to pages with fewer than 5 referring domains.",
    stepsForFail: [
      "Audit your current backlink profile using Ahrefs, Moz, or SEMrush",
      "Identify your competitors' backlinks and target the same sources",
      "Create 10x content — content so good that people naturally want to link to it",
      "Implement a broken link building strategy — find broken links on other sites and offer your content as a replacement",
      "Submit your site to relevant directories and industry listings",
    ],
    stepsForWarning: [
      "Continue building links through content marketing and outreach",
      "Focus on earning editorial links rather than manual link placement",
      "Diversify your backlink sources across different domains and content types",
    ],
    difficulty: "hard",
    automatable: false,
    estimatedTime: "2-4 hours",
    baseGain: 2,
  },
};

// ─── Weight map for priority calculation ─────────────────────────────────────

const CATEGORY_WEIGHTS: Record<string, number> = {
  "Performance": 0.25,
  "On-Page SEO": 0.20,
  "Technical SEO": 0.20,
  "Social & Metadata": 0.10,
  "Mobile & Accessibility": 0.10,
  "Content Quality": 0.10,
  "Backlinks & Authority": 0.05,
};

// ─── Builder ─────────────────────────────────────────────────────────────────

interface CategoryResult {
  name: string;
  score: number;
  status: "good" | "warning" | "critical";
  criteria: { label: string; status: "pass" | "warning" | "fail" | "estimated" | "na"; value?: string; fix?: string }[];
  isReal: boolean;
}

interface AuditData {
  url: string;
  globalScore: number;
  categories: CategoryResult[];
  recommendations: { priority: "high" | "medium" | "low"; category: string; description: string; fix: string }[];
  realSignals: number;
  estimatedSignals: number;
}

export function buildActionPlan(audit: AuditData): ActionPlan {
  const items: ActionItem[] = [];
  let idCounter = 0;

  for (const cat of audit.categories) {
    const weight = CATEGORY_WEIGHTS[cat.name] || 0.05;
    const isHighWeight = weight >= 0.20;

    for (const criterion of cat.criteria) {
      if (criterion.status === "pass" || criterion.status === "na") continue;

      const template = KNOWLEDGE_BASE[criterion.label];
      const isFail = criterion.status === "fail";
      const isWarning = criterion.status === "warning";
      const isEstimated = criterion.status === "estimated";

      if (isEstimated && !template) continue;

      let priority: ActionItem["priority"];
      if (isFail && isHighWeight) priority = "critical";
      else if (isFail) priority = "high";
      else if (isWarning && isHighWeight) priority = "high";
      else if (isWarning) priority = "medium";
      else priority = "low";

      if (template) {
        const steps = isFail && template.stepsForFail.length > 0
          ? template.stepsForFail
          : template.stepsForWarning.length > 0
            ? template.stepsForWarning
            : template.stepsForFail;

        const gainMultiplier = isFail ? 1.0 : 0.5;

        items.push({
          id: `action-${idCounter++}`,
          priority,
          category: cat.name,
          title: template.title,
          description: criterion.value
            ? `${criterion.label}: ${criterion.value}`
            : criterion.label,
          impact: template.impact,
          steps,
          expectedScoreGain: Math.round(template.baseGain * gainMultiplier),
          difficulty: template.difficulty,
          automatable: template.automatable,
          automatableNote: template.automatableNote,
          estimatedTime: template.estimatedTime,
        });
      } else {
        // Fallback for unmapped criteria
        items.push({
          id: `action-${idCounter++}`,
          priority,
          category: cat.name,
          title: `Fix: ${criterion.label}`,
          description: criterion.value
            ? `${criterion.label}: ${criterion.value}`
            : criterion.label,
          impact: `This ${isFail ? "critical" : "moderate"} issue in ${cat.name} affects your overall SEO score. Fixing it will improve your site's search engine visibility.`,
          steps: criterion.fix
            ? [criterion.fix]
            : [`Review and address the ${criterion.label} issue`],
          expectedScoreGain: isFail ? 3 : 1,
          difficulty: "medium",
          automatable: false,
          estimatedTime: "1-2 hours",
        });
      }
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const totalPotentialGain = Math.min(
    items.reduce((sum, item) => sum + item.expectedScoreGain, 0),
    100 - audit.globalScore
  );

  return {
    items,
    totalPotentialGain,
    currentScore: audit.globalScore,
    projectedScore: Math.min(100, audit.globalScore + totalPotentialGain),
    generatedAt: new Date().toISOString(),
  };
}
