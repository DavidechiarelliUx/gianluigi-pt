import { getTokenFromReq, verifyToken } from "./auth.js";
import { requireSameOrigin } from "./security.js";

function checkMutatingOrigin(req, res) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  return requireSameOrigin(req, res);
}

/**
 * Restituisce l'identità dal cookie ({ userId, role, clientId }) o null.
 * Non scrive risposte: usalo quando vuoi gestire tu i casi.
 */
export function getAuth(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return { userId: payload.sub, role: payload.role, clientId: payload.clientId || null };
}

/** Richiede autenticazione; se manca, risponde 401 e ritorna null. */
export function requireAuth(req, res) {
  if (!checkMutatingOrigin(req, res)) return null;
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ ok: false, error: "Non autenticato" });
    return null;
  }
  return auth;
}

/** Richiede ruolo admin; risponde 401/403 se non valido. */
export function requireAdmin(req, res) {
  if (!checkMutatingOrigin(req, res)) return null;
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ ok: false, error: "Non autenticato" });
    return null;
  }
  if (auth.role !== "admin") {
    res.status(403).json({ ok: false, error: "Accesso riservato all'admin" });
    return null;
  }
  return auth;
}
