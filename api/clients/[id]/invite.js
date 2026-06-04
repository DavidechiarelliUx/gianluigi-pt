import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "../../../server/lib/prisma.js";
import { requireAdmin } from "../../../server/lib/guards.js";
import { methodNotAllowed } from "../../../server/lib/body.js";

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

    const appUrl = process.env.APP_URL?.trim() || "https://gianluigi-pt.vercel.app";
    const link = `${appUrl}/login?invite=${token}`;
    const emailHost = process.env.EMAIL_HOST?.trim() || "smtp.gmail.com";
    const emailPort = Number(process.env.EMAIL_PORT?.trim()) || 587;
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASS?.trim();
    if (!emailUser || !emailPass) {
      return res.status(503).json({ ok: false, error: "Email non configurata" });
    }

    // Nodemailer via Gmail SMTP (stessa config del form contatto)
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: `"Gianluigi PT" <${emailUser}>`,
      to: client.user.email,
      subject: "Benvenuto — imposta la tua password",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;border-radius:12px;padding:32px;">
          <h2 style="color:#39FF14;margin-top:0">Ciao, ${client.user.fullName.split(" ")[0]}!</h2>
          <p>Gianluigi ti ha aggiunto alla sua piattaforma di allenamento.<br>
          Imposta la tua password per accedere alla tua scheda.</p>
          <a href="${link}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#39FF14;color:#0a0a0a;font-weight:700;border-radius:8px;text-decoration:none;font-size:16px;">
            Imposta password
          </a>
          <p style="color:#888;font-size:13px;">Il link scade tra 48 ore.<br>Se non hai richiesto questo invito, ignora questa email.</p>
        </div>
      `,
      text: `Ciao ${client.user.fullName}!\n\nGianluigi ti ha aggiunto alla piattaforma di allenamento.\nImposta la tua password qui: ${link}\n\nIl link scade tra 48 ore.`,
    });

    return res.status(200).json({ ok: true, message: "Invito inviato" });
  } catch (err) {
    console.error("POST /api/clients/[id]/invite:", err);
    return res.status(500).json({ ok: false, error: "Errore interno durante l'invio" });
  }
}
