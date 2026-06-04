import nodemailer from "nodemailer";

/* Etichette tipo richiesta (self-contained, niente import da ../src) */
const LABELS = {
  personal_training: "Personal Training",
  scheda: "Scheda personalizzata",
  coaching_online: "Coaching online",
  sessione_live: "Sessione live",
  altro: "Altro",
};

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** /api/contact — invia le richieste del form via Nodemailer. */
export default async function handler(req, res) {
  // Preflight CORS (innocuo, same-origin)
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  // Visita diretta (GET): messaggio amichevole, non un errore
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, info: "Endpoint attivo. Usa POST per inviare il form." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, error: "Metodo non consentito" });
  }

  // Body (può arrivare già parsato o come stringa)
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "Body non valido" });
    }
  }
  body = body || {};

  // Honeypot: se compilato, fingiamo successo e scartiamo
  if (body.company) return res.status(200).json({ ok: true });

  // Validazione server minima
  const errors = {};
  if (!body.name || String(body.name).trim().length < 2) errors.name = "Nome mancante";
  if (!isEmail(body.email)) errors.email = "Email non valida";
  if (!body.message || String(body.message).trim().length < 10) errors.message = "Messaggio troppo corto";
  if (!LABELS[body.requestType]) errors.requestType = "Tipo richiesta non valido";
  if (body.privacy !== true) errors.privacy = "Consenso privacy mancante";
  if (Object.keys(errors).length) {
    return res.status(400).json({ ok: false, error: "Dati non validi", issues: errors });
  }

  const { name, email, phone, goal, requestType, message } = body;

  // Env SMTP
  const EMAIL_HOST = process.env.EMAIL_HOST?.trim();
  const EMAIL_PORT = process.env.EMAIL_PORT?.trim();
  const EMAIL_USER = process.env.EMAIL_USER?.trim();
  const EMAIL_PASS = process.env.EMAIL_PASS?.trim();
  const STUDIO_EMAIL = process.env.STUDIO_EMAIL?.trim();
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS || !STUDIO_EMAIL) {
    return res.status(503).json({
      ok: false,
      error: "Servizio email non configurato. Contattaci su WhatsApp.",
      code: "EMAIL_NOT_CONFIGURED",
    });
  }

  try {
    const port = Number(EMAIL_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port,
      secure: port === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({
      from: `"Sito Gianluigi PT" <${EMAIL_USER}>`,
      to: STUDIO_EMAIL,
      replyTo: email,
      subject: `Nuova richiesta: ${LABELS[requestType]} — ${name}`,
      text: [
        `Tipo richiesta: ${LABELS[requestType]}`,
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
    // Log completo lato server (visibile nei Runtime Logs di Vercel)
    console.error("Errore invio email:", err);
    // Dettaglio sicuro al client per il debug (nessuna credenziale)
    return res.status(502).json({
      ok: false,
      error: "Invio non riuscito. Riprova o contattaci su WhatsApp.",
      detail: { code: err?.code, command: err?.command, response: err?.response },
    });
  }
}
