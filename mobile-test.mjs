#!/usr/bin/env node
/**
 * Renue Home — mobile rendering test harness.
 *
 * Renders every page (and steps through each funnel) at real mobile viewports
 * using headless Chromium, screenshots them, and flags layout problems:
 *   - horizontal overflow (document scrollWidth > viewport width)
 *   - any element whose box extends past the right edge (the "top-right corner" bug)
 *   - the hovering sticky CTA bar overlapping the form once the quiz is engaged
 *   - the primary CTA / first quiz option sitting below the fold on load
 *
 * SETUP (one time):
 *   npm install            # installs playwright
 *   npx playwright install chromium
 *   (or just: npm run setup)
 *
 * RUN against the LOCAL files (no network needed — boots its own server):
 *   npm run test:mobile
 *   # or: node mobile-test.mjs
 * RUN against the LIVE site:
 *   npm run test:mobile:live
 *   # or: node mobile-test.mjs https://renuehome.com
 *
 * Output: ./mobile-shots/*.png  and a printed PASS/FAIL report (non-zero exit on FAIL).
 */
import { chromium, devices } from "playwright";
import { mkdirSync, readdirSync } from "fs";
import { startServer } from "./serve.mjs";

const arg = process.argv[2];
const isUrl = arg && /^https?:\/\//.test(arg);
const OUT = process.env.SHOTS_DIR || "./mobile-shots";
mkdirSync(OUT, { recursive: true });

let PROFILES = [
  { name: "iPhone-SE", device: devices["iPhone SE"] },
  { name: "iPhone-14", device: devices["iPhone 14"] },
  { name: "iPhone-14-Pro-Max", device: devices["iPhone 14 Pro Max"] },
  { name: "Pixel-7", device: devices["Pixel 7"] },
];
// Optional filters for fast targeted runs:
//   ONLY_PROFILE="iPhone-14" ONLY_PAGES="/siding,/plumbing" node mobile-test.mjs
if (process.env.ONLY_PROFILE) PROFILES = PROFILES.filter((p) => p.name === process.env.ONLY_PROFILE);

const LEGAL = ["/privacy", "/terms", "/ccpa", "/do-not-sell", "/partners"];

// Auto-discover pages from the .html files in the repo so new verticals /
// legal / city pages get tested without editing this list.
function discoverPages() {
  const files = readdirSync(".").filter((f) => f.endsWith(".html") && !f.startsWith("404"));
  const routes = files.map((f) => "/" + f.replace(/\.html$/, "").replace(/^index$/, ""));
  const cityDirs = [];
  for (const v of ["bathroom", "windows", "roofing"]) {
    try {
      const sub = readdirSync(v).filter((f) => f.endsWith(".html")).slice(0, 2);
      sub.forEach((f) => cityDirs.push(`/${v}/${f.replace(/\.html$/, "")}`));
    } catch {}
  }
  return [...new Set([...routes, ...cityDirs])].sort((a, b) => (a === "/" ? -1 : a.localeCompare(b)));
}

// Walk a vertical funnel to the last step so we screenshot every step on mobile.
// All interactions use a short timeout so a missing selector fails in ~1s, not 30s.
const T = { timeout: 1500 };
async function stepThroughFunnel(page) {
  for (let i = 0; i < 9; i++) {
    if (await page.$("#f_first")) break; // reached contact step
    const zip = await page.$("#f_zip");
    const addr = await page.$("#f_addr");
    if (zip) { await zip.fill("78733", T).catch(() => {}); await page.click("[data-zip]", T).catch(() => {}); }
    else if (addr) { await addr.fill("123 Main St", T).catch(() => {}); await page.click("[data-addr]", T).catch(() => {}); }
    else {
      const opt = await page.$(".opt[data-pick], .opt[data-multi]");
      if (opt) { await opt.click(T).catch(() => {}); if (await page.$("[data-multinext]")) await page.click("[data-multinext]", T).catch(() => {}); }
      else break;
    }
    await page.waitForTimeout(300);
  }
}

async function audit(page) {
  return await page.evaluate(() => {
    const iw = window.innerWidth, ih = window.innerHeight;
    const offenders = [];
    // Content clipped by an ancestor (overflow-x:auto/scroll/hidden/clip — e.g. a horizontal
    // scroller or an animated marquee) is allowed to be wider than the viewport: it's clipped,
    // so it can't scroll the page. Only un-clipped content that exceeds the viewport is a real bug.
    const inScroller = (el) => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const o = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(o.overflowX) || /(auto|scroll|hidden|clip)/.test(o.overflow)) return true;
        p = p.parentElement;
      }
      return false;
    };
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" || r.width < 2 || cs.visibility === "hidden") return;
      if ((r.right > iw + 1 || r.left < -1) && !inScroller(el)) {
        offenders.push(el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "") + " right=" + Math.round(r.right));
      }
    });
    const sticky = document.querySelector(".sticky");
    const card = document.querySelector("#quizcard");
    let stickyOverlapsForm = false;
    if (sticky && card && getComputedStyle(sticky).display !== "none") {
      const sb = sticky.getBoundingClientRect(), cb = card.getBoundingClientRect();
      stickyOverlapsForm = document.body.classList.contains("quiz-engaged") && sb.top < cb.bottom && sb.top < ih;
    }
    // Is the primary above-the-fold action visible without scrolling?
    const primary = document.querySelector("#quizcard .opt, #quizcard #f_zip, #quizcard button, .hero .btn-grad, #projects");
    let primaryBelowFold = false;
    if (primary) { const pr = primary.getBoundingClientRect(); primaryBelowFold = pr.top > ih; }
    return {
      hScroll: document.documentElement.scrollWidth > iw + 1,
      offenders: offenders.slice(0, 10),
      stickyOverlapsForm, primaryBelowFold,
    };
  });
}

let server = null;
let BASE = arg;
if (!isUrl) {
  const port = Number(process.env.PORT) || 8080;
  server = await startServer(port);
  BASE = `http://localhost:${port}`;
  console.log(`Serving local files at ${BASE}`);
} else {
  console.log(`Testing live: ${BASE}`);
}

let PAGES = isUrl
  ? ["/", "/windows", "/bathroom", "/roofing", "/hvac", "/kitchen", "/flooring", "/solar",
     "/gutters", "/painting", "/siding", "/plumbing", "/water-damage", "/other", ...LEGAL]
  : discoverPages();
if (process.env.ONLY_PAGES) PAGES = process.env.ONLY_PAGES.split(",").map((s) => s.trim());

const results = [];
// Each (profile, path) runs in its own context so a single browser hiccup
// can't abort the whole sweep. The browser is relaunched if it ever crashes.
let browser = await chromium.launch();
async function ensureBrowser() {
  if (!browser || !browser.isConnected()) browser = await chromium.launch();
  return browser;
}

for (const p of PROFILES) {
  for (const path of PAGES) {
    const tag = path.replace(/\W+/g, "_") || "home";
    const isFunnel = path !== "/" && !LEGAL.includes(path);
    let top = { hScroll: false, offenders: [], stickyOverlapsForm: false, primaryBelowFold: false };
    let funnel = null;
    let errored = false;
    try {
      await ensureBrowser();
      const ctx = await browser.newContext({ ...p.device });
      const page = await ctx.newPage();
      await page.goto(BASE + path, { waitUntil: "load", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(300);
      top = await audit(page);
      await page.screenshot({ path: `${OUT}/${p.name}_${tag}.png` }).catch(() => {});
      if (isFunnel) {
        await stepThroughFunnel(page);
        funnel = await audit(page);
        await page.screenshot({ path: `${OUT}/${p.name}_${tag}_engaged.png` }).catch(() => {});
      }
      await ctx.close().catch(() => {});
    } catch (e) {
      errored = true;
    }
    const fail = top.hScroll || top.offenders.length || top.primaryBelowFold ||
      (funnel && (funnel.hScroll || funnel.offenders.length || funnel.stickyOverlapsForm));
    results.push({ profile: p.name, path, fail: !!fail, errored, top, funnel });
    console.log(`${errored ? "err " : fail ? "FAIL" : "ok  "} ${p.name} ${path}` +
      (errored ? " [render error — rechecked next run]" : "") +
      (top.hScroll ? " [hScroll]" : "") +
      (top.primaryBelowFold ? " [primary below fold]" : "") +
      (top.offenders.length ? ` [overflow: ${top.offenders.join(", ")}]` : "") +
      (funnel && funnel.stickyOverlapsForm ? " [sticky overlaps form]" : "") +
      (funnel && funnel.offenders.length ? ` [engaged overflow: ${funnel.offenders.join(", ")}]` : ""));
  }
}
if (browser && browser.isConnected()) await browser.close().catch(() => {});
if (server) server.close();
const fails = results.filter((r) => r.fail);
console.log(`\n${fails.length ? "❌" : "✅"} ${results.length} checks, ${fails.length} failures. Screenshots in ${OUT}/`);
process.exit(fails.length ? 1 : 0);
