import { prisma } from "../../server/lib/prisma.js";
import { authCookie, clearCookie, hashPassword, signToken, verifyPassword } from "../../server/lib/auth.js";
import { getAuth } from "../../server/lib/guards.js";
import { methodNotAllowed, parseJsonBody } from "../../server/lib/body.js";

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

async function login(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const body = parseJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
  const { email, password } = body;
  if (!isEmail(email) || !password) {
    return res.status(400).json({ ok: false, error: "Email o password mancanti" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { client: true },
    });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ ok: false, error: "Credenziali non valide" });
    }
    if (user.role === "client" && (user.client?.deletedAt || user.client?.accessDisabledAt)) {
      return res.status(403).json({
        ok: false,
        error: user.client?.accessDisabledAt
          ? "Accesso app chiuso dal trainer. Contatta il coach per riattivarlo."
          : "Accesso cliente non disponibile.",
      });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ ok: false, error: "Credenziali non valide" });

    const token = signToken({ sub: user.id, role: user.role, clientId: user.client?.id || null });
    res.setHeader("Set-Cookie", authCookie(token));
    return res.status(200).json({
      ok: true,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  } catch (err) {
    console.error("Errore login:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

async function logout(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  res.setHeader("Set-Cookie", clearCookie());
  return res.status(200).json({ ok: true });
}

async function me(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ ok: false, error: "Non autenticato" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { client: true },
    });
    if (!user) return res.status(401).json({ ok: false, error: "Non autenticato" });
    if (user.role === "client" && (user.client?.deletedAt || user.client?.accessDisabledAt)) {
      res.setHeader("Set-Cookie", clearCookie());
      return res.status(401).json({
        ok: false,
        error: user.client?.accessDisabledAt
          ? "Accesso app chiuso dal trainer. Contatta il coach per riattivarlo."
          : "Accesso cliente non disponibile.",
      });
    }
    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        clientId: user.client?.id || null,
      },
    });
  } catch (err) {
    console.error("Errore me:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

async function setPassword(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const body = parseJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
  const { token, password } = body;
  if (!token || !password || String(password).length < 8) {
    return res.status(400).json({ ok: false, error: "Token o password non validi (min 8 caratteri)" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      include: { client: true },
    });
    if (!user || !user.inviteExpires || user.inviteExpires < new Date()) {
      return res.status(400).json({ ok: false, error: "Invito non valido o scaduto" });
    }
    if (user.role === "client" && (user.client?.deletedAt || user.client?.accessDisabledAt)) {
      return res.status(403).json({
        ok: false,
        error: user.client?.accessDisabledAt
          ? "Accesso app chiuso dal trainer. Contatta il coach per riattivarlo."
          : "Accesso cliente non disponibile.",
      });
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, inviteToken: null, inviteExpires: null },
    });

    const jwtToken = signToken({ sub: user.id, role: user.role, clientId: user.client?.id || null });
    res.setHeader("Set-Cookie", authCookie(jwtToken));
    return res.status(200).json({
      ok: true,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  } catch (err) {
    console.error("Errore set-password:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

export default function handler(req, res) {
  const { action } = req.query;
  if (action === "login") return login(req, res);
  if (action === "logout") return logout(req, res);
  if (action === "me") return me(req, res);
  if (action === "set-password") return setPassword(req, res);
  return res.status(404).json({ ok: false, error: "Endpoint auth non trovato" });
}
