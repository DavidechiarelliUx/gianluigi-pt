const buckets = new Map();

function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export function rateLimit(req, res, { key = "global", limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucketKey = `${key}:${clientIp(req)}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  current.count += 1;
  if (current.count <= limit) return true;

  res.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
  res.status(429).json({ ok: false, error: "Troppe richieste. Riprova tra poco." });
  return false;
}

export function requireSameOrigin(req, res) {
  const origin = req.headers?.origin;
  if (!origin) return true;

  const host = req.headers?.["x-forwarded-host"] || req.headers?.host;
  const proto = req.headers?.["x-forwarded-proto"] || (process.env.NODE_ENV === "production" ? "https" : "http");
  const allowed = new Set([
    `${proto}://${host}`,
    process.env.APP_URL?.replace(/\/$/, ""),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter(Boolean));

  if (allowed.has(origin)) return true;

  res.status(403).json({ ok: false, error: "Origine richiesta non consentita" });
  return false;
}
