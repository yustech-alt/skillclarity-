#!/usr/bin/env node
/*
 * SkillClarity landing page server.
 * Serves ./public and stores registrations + analytics events as JSON lines.
 * No dependencies: node server/server.js
 *
 * Env:
 *   PORT       default 3000
 *   DATA_DIR   default ./data
 *   ADMIN_KEY  required to read /api/stats and /api/signups
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const SIGNUPS = path.join(DATA_DIR, "signups.jsonl");
const EVENTS = path.join(DATA_DIR, "events.jsonl");
const ADMIN_KEY = process.env.ADMIN_KEY || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

fs.mkdirSync(DATA_DIR, { recursive: true });

function json(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(payload) });
  res.end(payload);
}

function readBody(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function append(file, record) {
  fs.appendFileSync(file, JSON.stringify(record) + "\n", "utf8");
}

function readLines(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  const rel = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

function authorised(req) {
  const url = new URL(req.url, "http://localhost");
  return ADMIN_KEY !== "" && url.searchParams.get("key") === ADMIN_KEY;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "POST" && url.pathname === "/api/signup") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return json(res, 400, { error: "invalid request body" });
    }
    const email = String(body.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json(res, 422, { error: "invalid email" });
    append(SIGNUPS, {
      email,
      source: String(body.source || "").slice(0, 60),
      visitor: String(body.visitor || "").slice(0, 80),
      referrer: String(body.referrer || "").slice(0, 300),
      ts: new Date().toISOString(),
    });
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/event") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return json(res, 400, { error: "invalid request body" });
    }
    append(EVENTS, {
      event: String(body.event || "").slice(0, 40),
      visitor: String(body.visitor || "").slice(0, 80),
      path: String(body.path || "").slice(0, 120),
      ref: String(body.ref || "").slice(0, 300),
      ts: new Date().toISOString(),
    });
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && (url.pathname === "/api/stats" || url.pathname === "/api/signups")) {
    if (!authorised(req)) return json(res, 401, { error: "set ADMIN_KEY and pass ?key=" });
    const events = readLines(EVENTS);
    const signups = readLines(SIGNUPS);
    if (url.pathname === "/api/signups") return json(res, 200, { count: signups.length, signups });
    const visitors = new Set(events.filter((e) => e.event === "pageview").map((e) => e.visitor));
    const uniqueSignups = new Set(signups.map((s) => s.email));
    return json(res, 200, {
      pageviews: events.filter((e) => e.event === "pageview").length,
      unique_visitors: visitors.size,
      signups: uniqueSignups.size,
      conversion_rate: visitors.size ? Number(((uniqueSignups.size / visitors.size) * 100).toFixed(1)) : 0,
    });
  }

  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);

  return json(res, 405, { error: "method not allowed" });
});

server.listen(PORT, () => {
  console.log(`SkillClarity running on http://localhost:${PORT} (data in ${DATA_DIR})`);
});
