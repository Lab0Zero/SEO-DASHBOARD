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
  baseGain: number;
}

const KNOWLEDGE_BASE: Record<string, CriterionTemplate> = {
  // ─── Performance ─────────────────────────────────────────────────────────
  "Mobile Performance Score": {
    title: "Improve Mobile Performance",
    impact: "Mobile performance directly impacts Google rankings since mobile-first indexing. A score below 50 signals severe issues that hurt both SEO and user experience. Google uses Core Web Vitals as a ranking factor.",
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
    baseGain: 8,
  },
  "Desktop Performance Score": {
    title: "Improve Desktop Performance",
    impact: "While Google primarily uses mobile scores, desktop performance affects user experience and conversion rates. Fast desktop sites retain visitors longer and reduce bounce rates.",
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
    baseGain: 5,
  },
  "Largest Contentful Paint (LCP)": {
    title: "Optimize Largest Contentful Paint",
    impact: "LCP is one of Google's three Core Web Vitals and measures how quickly the main content loads. A good LCP (under 2.5s) is essential for ranking. Pages with poor LCP see up to 24% higher bounce rates.",
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
    baseGain: 6,
  },
  "Cumulative Layout Shift (CLS)": {
    title: "Fix Layout Shift Issues",
    impact: "CLS is a Core Web Vital measuring visual stability. High CLS (above 0.1) frustrates users when content jumps around and can negatively impact rankings. Google penalizes pages with poor CLS.",
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
    baseGain: 4,
  },
  "Total Blocking Time (TBT)": {
    title: "Reduce Total Blocking Time",
    impact: "TBT measures how long the main thread is blocked by long tasks, directly correlating with interactivity. High TBT means users can't click or type — Google treats this as a poor experience signal.",
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
    baseGain: 5,
  },
  "Speed Index": {
    title: "Improve Speed Index",
    impact: "Speed Index measures how quickly visible content is populated. A faster Speed Index means users see content sooner, improving perceived performance and engagement metrics.",
    stepsForFail: [
      "Minimize render-blocking resources — move non-critical CSS to async loading",
      "Inline critical above-the-fold CSS directly in the HTML <head>",
      "Optimize the order of resource loading — critical resources first",
      "Reduce the number of network round-trips by bundling and minifying assets",
    ],
    stepsForWarning: [
      "Use resource hints: preload for critical assets, prefetch for next-page assets",
      "Implement server-side rendering (SSR) or static generation (SSG) for faster first paint",
    ],
    difficulty: "medium",
    automatable: false,
    baseGain: 3,
  },
  "Image Optimization": {
    title: "Optimize Images",
    impact: "Unoptimized images are the #1 cause of slow page loads. Properly optimized images can reduce page weight by 50-80%, dramatically improving load times and Core Web Vitals scores.",
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
    baseGain: 4,
  },
  "Unused JavaScript": {
    title: "Remove Unused JavaScript",
    impact: "Unused JavaScript increases download time, parse time, and memory usage. Every KB of unused JS delays interactivity. Reducing unused JS directly improves TBT and Time to Interactive.",
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
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can convert imports to named imports for tree-shaking, implement dynamic imports for code splitting, and identify unused dependencies.",
    baseGain: 3,
  },
  "Unused CSS": {
    title: "Remove Unused CSS",
    impact: "Unused CSS blocks rendering and increases page load time. Browsers must download and parse ALL CSS before rendering content. Removing unused CSS can significantly reduce First Contentful Paint.",
    stepsForFail: [
      "Use PurgeCSS or Tailwind's built-in purging to remove unused CSS classes",
      "Split CSS by route — load only the styles needed for the current page",
      "Move non-critical CSS to async loading using media='print' onload trick",
      "Remove unused CSS frameworks or utility classes",
    ],
    stepsForWarning: [
      "Audit CSS coverage using Chrome DevTools Coverage tab",
      "Consider CSS-in-JS or CSS Modules for automatic scoping and dead-code elimination",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can configure PurgeCSS, set up Tailwind purging, and convert global CSS to CSS Modules.",
    baseGain: 2,
  },

  // ─── On-Page SEO ─────────────────────────────────────────────────────────
  "Title Tag": {
    title: "Optimize Title Tag",
    impact: "The title tag is the single most important on-page SEO element. It appears in search results as the clickable headline and heavily influences click-through rates and rankings. Google uses it to understand page topic.",
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
    baseGain: 5,
  },
  "Meta Description": {
    title: "Add/Optimize Meta Description",
    impact: "While not a direct ranking factor, meta descriptions significantly impact click-through rates from search results. A compelling description can increase CTR by 5-10%, which indirectly improves rankings.",
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
    baseGain: 4,
  },
  "H1 Tag": {
    title: "Fix H1 Heading",
    impact: "The H1 tag is the second most important on-page SEO element after the title. It tells Google the main topic of the page. Pages with a single, descriptive H1 rank significantly better than those without.",
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
    baseGain: 4,
  },
  "Heading Structure": {
    title: "Improve Heading Hierarchy",
    impact: "A proper heading hierarchy (H1 → H2 → H3) helps Google understand your content structure and can earn featured snippets. Well-structured content with subheadings keeps users engaged longer, reducing bounce rate.",
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
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can restructure your HTML headings to create a proper hierarchy and suggest keyword-rich subheadings.",
    baseGain: 3,
  },
  "Image Alt Tags": {
    title: "Add Alt Text to Images",
    impact: "Alt text is essential for accessibility (screen readers) and SEO (Google Image Search). Images with descriptive alt text can rank in Google Images, driving additional organic traffic. Missing alt text is also an accessibility violation.",
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
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can identify images missing alt attributes and suggest descriptive alt text based on the image context and filename.",
    baseGain: 3,
  },
  "Canonical Tag": {
    title: "Add Canonical Tag",
    impact: "Canonical tags tell Google which URL is the 'official' version of a page, preventing duplicate content issues. Without a canonical tag, Google may index multiple URLs for the same content, diluting your ranking signals.",
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
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add canonical link tags to your HTML head, configure Next.js metadata alternates, and ensure URL consistency.",
    baseGain: 3,
  },
  "Language Attribute": {
    title: "Add Language Attribute",
    impact: "The lang attribute helps search engines serve your content to the right audience and improves accessibility for screen readers. It's a basic requirement for international SEO and WCAG compliance.",
    stepsForFail: [
      "Add lang attribute to your <html> tag: <html lang='en'> (or your content language)",
      "Use the correct ISO 639-1 language code (en, fr, de, es, etc.)",
      "For multi-language sites, use hreflang tags to indicate language alternatives",
      "In Next.js: set the lang attribute in your root layout.tsx html tag",
    ],
    stepsForWarning: [
      "Verify the lang attribute matches your actual content language",
      "Add hreflang annotations if your site serves multiple languages",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add the lang attribute to your <html> tag and configure hreflang tags for multi-language sites.",
    baseGain: 2,
  },

  // ─── Technical SEO ───────────────────────────────────────────────────────
  "HTTPS": {
    title: "Migrate to HTTPS",
    impact: "HTTPS is a confirmed Google ranking signal. Sites without HTTPS show a 'Not Secure' warning in Chrome, causing users to leave immediately. It's required for HTTP/2, service workers, and many modern web APIs.",
    stepsForFail: [
      "Obtain an SSL/TLS certificate — free options: Let's Encrypt, Cloudflare, or your hosting provider",
      "Install the certificate on your web server (Apache, Nginx, etc.)",
      "Set up 301 redirects from all HTTP URLs to their HTTPS equivalents",
      "Update all internal links, images, and resources to use https:// URLs",
      "Update your sitemap.xml and robots.txt with HTTPS URLs",
      "Update Google Search Console property to the HTTPS version",
    ],
    stepsForWarning: [],
    difficulty: "medium",
    automatable: false,
    baseGain: 8,
  },
  "Viewport Meta": {
    title: "Add Viewport Meta Tag",
    impact: "The viewport meta tag is required for mobile-friendly rendering. Without it, mobile devices display the desktop version zoomed out, making the site unusable. Google requires a viewport tag for mobile-first indexing.",
    stepsForFail: [
      "Add to <head>: <meta name='viewport' content='width=device-width, initial-scale=1'>",
      "Do NOT use maximum-scale=1 or user-scalable=no (accessibility violations)",
      "Ensure your CSS is responsive — use relative units (rem, %, vw) not fixed pixels",
      "Test on actual mobile devices or Chrome DevTools device emulation",
    ],
    stepsForWarning: [],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add the viewport meta tag to your HTML head or Next.js layout.",
    baseGain: 5,
  },
  "Robots Meta": {
    title: "Fix Robots Meta Directive",
    impact: "A noindex directive prevents Google from indexing the page entirely. If this is unintentional, your page is completely invisible in search results. This is one of the most critical SEO issues possible.",
    stepsForFail: [
      "Remove or change the <meta name='robots' content='noindex'> tag",
      "If you need noindex on specific pages only, ensure it's not applied globally",
      "Check for X-Robots-Tag HTTP headers that might also set noindex",
      "Verify in Google Search Console that the page is indexed after the change",
    ],
    stepsForWarning: [
      "Review the robots meta content to ensure it matches your indexing intent",
      "Ensure important pages use 'index, follow' (or omit the tag entirely for default behavior)",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can modify or remove robots meta tags from your HTML templates.",
    baseGain: 6,
  },
  "Structured Data (Schema.org)": {
    title: "Add Structured Data Markup",
    impact: "Structured data (JSON-LD) helps Google understand your content type and can generate rich snippets in search results — star ratings, FAQs, prices, events, etc. Rich snippets increase CTR by 20-30% on average.",
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
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can generate JSON-LD structured data blocks based on your page content and business type, and add them to your HTML.",
    baseGain: 4,
  },
  "Inline Resources": {
    title: "Externalize Inline Scripts and Styles",
    impact: "Excessive inline scripts and styles increase HTML document size, prevent browser caching, and can block rendering. Externalizing them enables caching and reduces repeated downloads across page visits.",
    stepsForFail: [
      "Move inline <script> blocks to external .js files and reference with <script src='...'>",
      "Move inline <style> blocks to external .css files and reference with <link rel='stylesheet'>",
      "Use defer or async attributes on non-critical script tags",
      "Keep only truly critical inline CSS for above-the-fold rendering",
    ],
    stepsForWarning: [
      "Review inline scripts — move any over 1KB to external files",
      "Consider CSS-in-JS solutions that extract critical CSS automatically",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can extract inline scripts and styles into separate files and update the HTML references.",
    baseGain: 2,
  },
  "Render-Blocking Resources": {
    title: "Eliminate Render-Blocking Resources",
    impact: "Render-blocking CSS and JavaScript delay First Contentful Paint and LCP. Every render-blocking resource adds latency before users see any content. Eliminating them can improve load times by 1-3 seconds.",
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
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can add defer/async attributes, implement critical CSS inlining, and configure resource loading priorities.",
    baseGain: 4,
  },

  // ─── Social & Metadata ──────────────────────────────────────────────────
  "Open Graph Title": {
    title: "Add Open Graph Title",
    impact: "Open Graph tags control how your page appears when shared on Facebook, LinkedIn, Slack, and other platforms. Without og:title, platforms guess your title and often display it incorrectly, reducing click-throughs from social shares.",
    stepsForFail: [
      "Add <meta property='og:title' content='Your Page Title'> to the <head>",
      "Make it compelling — this is the headline people see when your link is shared",
      "Keep it under 60 characters for optimal display on most platforms",
      "In Next.js: add openGraph.title to your metadata export",
    ],
    stepsForWarning: [],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add all Open Graph meta tags to your HTML head or Next.js metadata configuration.",
    baseGain: 2,
  },
  "Open Graph Description": {
    title: "Add Open Graph Description",
    impact: "The og:description appears as the preview text when your link is shared on social platforms. A compelling description increases social click-through rates and drives referral traffic to your site.",
    stepsForFail: [
      "Add <meta property='og:description' content='...'> to the <head>",
      "Write 1-2 sentences that entice people to click when they see your link shared",
      "Different from meta description — optimize for social engagement, not search",
      "In Next.js: add openGraph.description to your metadata export",
    ],
    stepsForWarning: [],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add og:description meta tags and suggest engaging social descriptions.",
    baseGain: 2,
  },
  "Open Graph Image": {
    title: "Add Open Graph Image",
    impact: "Links shared with an og:image get 2-3x more engagement than those without. The image is the most visually prominent element in social shares. Missing images make your links look unprofessional and reduce clicks.",
    stepsForFail: [
      "Create a 1200x630px image optimized for social sharing",
      "Add <meta property='og:image' content='https://yoursite.com/og-image.jpg'> to <head>",
      "Use an absolute URL (not relative) for the image path",
      "Add og:image:width and og:image:height meta tags for faster rendering",
      "Consider using a dynamic OG image generator (like Vercel's @vercel/og) for unique per-page images",
    ],
    stepsForWarning: [],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add og:image meta tags and set up Vercel OG image generation for dynamic social images.",
    baseGain: 2,
  },
  "Twitter Card": {
    title: "Add Twitter Card Meta Tags",
    impact: "Twitter Card tags control how your links appear on X/Twitter. summary_large_image cards get significantly more engagement than basic text links. They also work on other platforms that support Twitter Cards.",
    stepsForFail: [
      "Add <meta name='twitter:card' content='summary_large_image'> for large image previews",
      "Add <meta name='twitter:title'> and <meta name='twitter:description'>",
      "Add <meta name='twitter:image'> pointing to a 1200x628px image",
      "Validate using Twitter Card Validator tool",
    ],
    stepsForWarning: [
      "Add twitter:card meta tag to enable rich link previews on X/Twitter",
      "Use summary_large_image for maximum visual impact",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add all Twitter Card meta tags to your HTML head or Next.js metadata configuration.",
    baseGain: 1,
  },
  "Favicon": {
    title: "Add Favicon",
    impact: "Favicons appear in browser tabs, bookmarks, and Google search results (on mobile). A missing favicon shows a generic icon, making your site look unfinished. It's a small but important trust signal.",
    stepsForFail: [
      "Create a favicon.ico (32x32 or 16x16) and place it in your public/ directory",
      "Add <link rel='icon' href='/favicon.ico'> to your <head>",
      "Also create apple-touch-icon (180x180) for iOS: <link rel='apple-touch-icon' href='/apple-touch-icon.png'>",
      "Consider adding a web manifest with multiple icon sizes for PWA support",
    ],
    stepsForWarning: [
      "Add a favicon to your site for professional appearance in browser tabs and search results",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add favicon link tags to your HTML head and configure Next.js favicon in the app directory.",
    baseGain: 1,
  },

  // ─── Mobile & Accessibility ─────────────────────────────────────────────
  "Viewport Meta Tag": {
    title: "Add Viewport Meta Tag",
    impact: "Essential for mobile rendering. Without it, your site is not mobile-friendly and will be penalized in mobile search rankings.",
    stepsForFail: [
      "Add <meta name='viewport' content='width=device-width, initial-scale=1'> to <head>",
      "Ensure responsive CSS accompanies the viewport tag",
    ],
    stepsForWarning: [],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add the viewport meta tag.",
    baseGain: 4,
  },
  "Alt Text Coverage": {
    title: "Improve Image Accessibility",
    impact: "Alt text is required for WCAG 2.1 compliance and helps visually impaired users understand images. It's also used by Google to understand image content for SEO.",
    stepsForFail: [
      "Add descriptive alt attributes to all images missing them",
      "Use meaningful descriptions, not just filenames",
    ],
    stepsForWarning: [
      "Add alt text to the remaining images without it",
      "Review existing alt text for accuracy and keyword relevance",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can identify images missing alt text and add descriptive attributes.",
    baseGain: 2,
  },
  "Language Declaration": {
    title: "Add Language Declaration",
    impact: "Improves accessibility and helps search engines serve content to the right audience.",
    stepsForFail: [
      "Add lang attribute to your <html> tag",
    ],
    stepsForWarning: [
      "Verify the lang attribute matches your content language",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can add the lang attribute to your HTML element.",
    baseGain: 1,
  },
  "Mobile Usability": {
    title: "Improve Mobile Usability",
    impact: "Google uses mobile-first indexing. Poor mobile usability directly impacts rankings and user experience on the majority of web traffic.",
    stepsForFail: [
      "Follow all Performance category recommendations with a mobile focus",
      "Test with Chrome DevTools mobile emulation",
      "Optimize touch targets to be at least 44x44px",
    ],
    stepsForWarning: [
      "Focus on reducing JavaScript payload for mobile users",
      "Implement adaptive loading — serve lighter assets to mobile devices",
    ],
    difficulty: "hard",
    automatable: false,
    baseGain: 4,
  },

  // ─── Content Quality ────────────────────────────────────────────────────
  "Word Count": {
    title: "Add More Content",
    impact: "Thin content (under 300 words) rarely ranks well. Google needs sufficient content to understand the page topic. Pages with 1,000+ words of quality content tend to rank for more keywords and earn more backlinks.",
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
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can help draft additional content sections, FAQ blocks, and supporting copy for your pages.",
    baseGain: 3,
  },
  "Readability Score (Estimated)": {
    title: "Improve Content Readability",
    impact: "Content that's easy to read keeps users engaged longer, reducing bounce rate. Google's algorithms favor content that matches user intent and is easy to consume.",
    stepsForFail: [],
    stepsForWarning: [
      "Use shorter sentences (under 20 words) and paragraphs (2-3 sentences)",
      "Write at an 8th-grade reading level for general audiences",
      "Use bullet points and numbered lists to break up text",
      "Add subheadings every 200-300 words for scannability",
    ],
    difficulty: "easy",
    automatable: true,
    automatableNote: "Claude Code can rewrite content for improved readability, break up long paragraphs, and add structural elements.",
    baseGain: 2,
  },
  "Content Freshness (Estimated)": {
    title: "Update Content Regularly",
    impact: "Google favors fresh, updated content for many queries. Regularly updated pages signal that the information is current and reliable, improving rankings over time.",
    stepsForFail: [],
    stepsForWarning: [
      "Review and update key pages at least quarterly",
      "Add a 'Last Updated' date to show freshness",
      "Update statistics, links, and examples with current data",
      "Add new sections addressing recent developments in your topic",
    ],
    difficulty: "medium",
    automatable: false,
    baseGain: 2,
  },
  "Duplicate Content Risk (Estimated)": {
    title: "Address Duplicate Content",
    impact: "Duplicate content confuses search engines about which version to rank, potentially splitting ranking signals across multiple URLs. Canonical tags and proper redirects are essential.",
    stepsForFail: [],
    stepsForWarning: [
      "Add canonical tags to all pages to indicate the preferred URL",
      "Set up 301 redirects for any duplicate or alternate URLs",
      "Use consistent URL structures (choose www vs non-www and stick with it)",
      "Check for HTTP/HTTPS duplicates and consolidate with redirects",
    ],
    difficulty: "medium",
    automatable: true,
    automatableNote: "Claude Code can add canonical tags and help identify potential duplicate content issues.",
    baseGain: 2,
  },

  // ─── Backlinks (estimated — generic advice) ─────────────────────────────
  "Domain Authority (Estimated)": {
    title: "Build Domain Authority",
    impact: "Domain Authority correlates strongly with search rankings. Higher authority means your pages are more likely to rank for competitive keywords. Building authority is a long-term investment that compounds over time.",
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
    baseGain: 3,
  },
  "Estimated Backlinks": {
    title: "Increase Quality Backlinks",
    impact: "Backlinks remain one of Google's top 3 ranking factors. Quality matters more than quantity — one link from an authoritative site is worth more than hundreds from low-quality sites.",
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
    ],
    difficulty: "hard",
    automatable: false,
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
