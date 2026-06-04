import { prisma } from "../../server/lib/prisma.js";
import { verifyPassword, signToken, authCookie } from "../../server/lib/auth.js";

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** POST /api/auth/login { email, password } → set cookie httpOnly + dati utente. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Metodo non consentito" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ ok: false, error: "Body non valido" }); }
  }
  const { email, password } = body || {};
  if (!isEmail(email) || !password) {
    return res.status(400).json({ ok: false, error: "Email o password mancanti" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { client: true },
    });
    // Messaggio generico per non rivelare se l'email esiste
    if (!user || !user.passwordHash) {
      return res.status(401).json({ ok: false, error: "Credenziali non valide" });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Credenziali non valide" });
    }

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
