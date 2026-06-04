#!/usr/bin/env node
/**
 * Tiny static file server that mirrors Cloudflare Pages' clean-URL routing:
 *   /bathroom        -> bathroom.html
 *   /bathroom/austin -> bathroom/austin.html  (city pages)
 *   /                -> index.html
 *   /404             -> 404.html (if present)
 *
 * Use it to preview the site locally exactly like production:
 *   npm run serve          # then open http://localhost:8080
 * The mobile test harness starts its own copy of this automatically.
 */
import { createServer } from "http";
import { readFile, stat } from "fs/promises";
import { extname, join, normalize } from "path";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

async function exists(p) {
  try { const s = await stat(p); return s.isFile(); } catch { return false; }
}

// Resolve a request path to a file on disk, applying clean-URL rules.
async function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  p = normalize(p).replace(/^(\.\.[/\\])+/, ""); // prevent traversal
  if (p === "/" || p === "") return join(ROOT, "index.html");
  const abs = join(ROOT, p);
  if (await exists(abs)) return abs;                 // exact file (styles.css, etc.)
  if (await exists(abs + ".html")) return abs + ".html"; // /bathroom -> bathroom.html
  if (await exists(join(abs, "index.html"))) return join(abs, "index.html");
  return null;
}

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const file = await resolveFile(req.url || "/");
      if (!file) {
        const nf = join(ROOT, "404.html");
        if (await exists(nf)) {
          res.writeHead(404, { "content-type": TYPES[".html"] });
          res.end(await readFile(nf));
        } else {
          res.writeHead(404, { "content-type": "text/plain" });
          res.end("404 Not Found");
        }
        return;
      }
      try {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end("500");
      }
    });
    server.listen(port, () => resolve(server));
  });
}

// Run directly (npm run serve)
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().then(() => console.log(`Serving ${ROOT} at http://localhost:${PORT}`));
}
