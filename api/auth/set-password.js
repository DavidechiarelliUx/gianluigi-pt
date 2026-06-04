import { prisma } from "../../server/lib/prisma.js";
import { hashPassword, signToken, authCookie } from "../../server/lib/auth.js";

/**
 * POST /api/auth/set-password { token, password }
 * Completa l'onboarding del cliente: valida l'inviteToken, imposta la password,
 * invalida il token e logga l'utente (cookie).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Metodo non consentito" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ ok: false, error: "Body non valido" }); }
  }
  const { token, password } = body || {};
  if (!token || !password || String(password).length < 8) {
    return res.status(400).json({ ok: false, error: "Token o password non validi (min 8 caratteri)" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { inviteToken: token }, include: { client: true } });
    if (!user || !user.inviteExpires || user.inviteExpires < new Date()) {
      return res.status(400).json({ ok: false, error: "Invito non valido o scaduto" });
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
