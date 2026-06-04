import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize, parse } from "cookie";

const COOKIE_NAME = "gpt_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 giorni (decisione confermata)

/* ---------- Password ---------- */
export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/* ---------- JWT ---------- */
function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET non configurato");
  return s;
}
/** payload: { sub: userId, role, clientId? } */
export function signToken(payload) {
  return jwt.sign(payload, secret(), { expiresIn: MAX_AGE });
}
export function verifyToken(token) {
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
}

/* ---------- Cookie httpOnly ---------- */
const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

export function authCookie(token) {
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd, // Secure solo in produzione (HTTPS); in locale http
    sameSite: "lax", // mitigazione CSRF di base (no token CSRF in MVP)
    path: "/",
    maxAge: MAX_AGE,
  });
}
export function clearCookie() {
  return serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
export function getTokenFromReq(req) {
  const header = req.headers?.cookie;
  if (!header) return null;
  const cookies = parse(header);
  return cookies[COOKIE_NAME] || null;
}
