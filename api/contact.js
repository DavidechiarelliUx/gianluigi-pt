import nodemailer from "nodemailer";
import { contactSchema, REQUEST_TYPES } from "../src/lib/contactSchema.js";

const labelOf = (v) => REQUEST_TYPES.find((r) => r.value === v)?.label || v;

/** POST /api/contact — valida, anti-spam, invia email via Nodemailer. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Metodo non consentito" });
  }

  // Body può arrivare come stringa a seconda del runtime
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "Body non valido" });
    }
  }

  // Honeypot: se compilato, fingiamo successo e scartiamo
  if (body?.company) {
    return res.status(200).json({ ok: true });
  }

  // Validazione server-side
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Dati non validi",
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, email, phone, goal, requestType, message } = parsed.data;

  // Config SMTP da env — se mancante, errore gestito (no crash)
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, STUDIO_EMAIL } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS || !STUDIO_EMAIL) {
    return res.status(503).json({
      ok: false,
      error: "Servizio email non configurato. Contattaci su WhatsApp.",
      code: "EMAIL_NOT_CONFIGURED",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT) || 587,
      secure: Number(EMAIL_PORT) === 465,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Sito Gianluigi PT" <${EMAIL_USER}>`,
      to: STUDIO_EMAIL,
      replyTo: email,
      subject: `Nuova richiesta: ${labelOf(requestType)} — ${name}`,
      text: [
        `Tipo richiesta: ${labelOf(requestType)}`,
        `Nome: ${name}`,
        `Email: ${email}`,
        `Telefono: ${phone || "—"}`,
        `Obiettivo: ${goal || "—"}`,
        "",
        "Messaggio:",
        message,
      ].join("\n"),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Errore invio email:", err);
    return res.status(502).json({
      ok: false,
      error: "Invio non riuscito. Riprova o contattaci su WhatsApp.",
    });
  }
}
