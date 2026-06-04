import crypto from "crypto";
import { prisma } from "../../../server/lib/prisma.js";
import { requireAdmin } from "../../../server/lib/guards.js";
import { methodNotAllowed } from "../../../server/lib/body.js";
import { sendClientInviteEmail } from "../../../server/lib/mailer.js";

/**
 * POST /api/clients/:id/invite
 * Genera un inviteToken monouso (48h), salva su DB, invia email con link set-password.
 */
export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  const { id } = req.query;

  try {
    const client = await prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });
    if (!client) return res.status(404).json({ ok: false, error: "Cliente non trovato" });

    // Token monouso, 48 ore di validità
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: client.userId },
      data: { inviteToken: token, inviteExpires: expires },
    });

    await sendClientInviteEmail({
      to: client.user.email,
      fullName: client.user.fullName,
      token,
    });

    return res.status(200).json({ ok: true, message: "Invito inviato" });
  } catch (err) {
    console.error("POST /api/clients/[id]/invite:", err);
    return res.status(500).json({ ok: false, error: "Errore interno durante l'invio" });
  }
}
