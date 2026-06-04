import nodemailer from "nodemailer";

function smtpConfig() {
  const host = process.env.EMAIL_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT?.trim()) || 587;
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) {
    const err = new Error("Email non configurata");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  return { host, port, user, pass };
}

export function appUrl() {
  return process.env.APP_URL?.trim() || "https://gianluigi-pt.vercel.app";
}

export function createTransporter() {
  const { host, port, user, pass } = smtpConfig();
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function sendClientInviteEmail({ to, fullName, token, context = "manual" }) {
  const { user } = smtpConfig();
  const firstName = fullName?.split(" ")[0] || "ciao";
  const baseUrl = appUrl();
  const loginLink = `${baseUrl}/login?invite=${token}`;
  const installLink = `${baseUrl}/installa-app`;
  const isPayment = context === "payment";

  const subject = isPayment
    ? "Il tuo accesso Gianluigi PT è pronto"
    : "Benvenuto — imposta la tua password";

  const intro = isPayment
    ? "Pagamento ricevuto. La tua area allenamenti è pronta."
    : "Gianluigi ti ha aggiunto alla sua piattaforma di allenamento.";

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Gianluigi PT" <${user}>`,
    to,
    subject,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0b0a;color:#f4f7f2;border-radius:18px;padding:32px;border:1px solid rgba(57,255,20,.28);">
        <p style="margin:0 0 10px;color:#39FF14;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Gianluigi Chiarelli PT</p>
        <h2 style="margin:0 0 18px;color:#ffffff;font-size:28px;line-height:1.1;">Ciao, ${firstName}.</h2>
        <p style="color:#c7d0c3;line-height:1.6;">${intro}<br>Imposta la tua password e accedi alla tua scheda, alle sessioni live e ai prossimi contenuti riservati.</p>
        <a href="${loginLink}" style="display:inline-block;margin:22px 0;padding:14px 24px;background:#39FF14;color:#071007;font-weight:900;border-radius:999px;text-decoration:none;font-size:15px;">
          Entra nella tua area
        </a>
        <div style="margin-top:22px;padding:18px;border-radius:14px;background:#111610;border:1px solid rgba(255,255,255,.08);">
          <h3 style="margin:0 0 8px;color:#ffffff;font-size:16px;">Aggiungila alla schermata Home</h3>
          <p style="margin:0;color:#aeb9aa;line-height:1.55;font-size:14px;">Da iPhone apri il link in Safari, premi Condividi e scegli “Aggiungi alla schermata Home”. Così avrai l'app Gianluigi PT tra le tue app.</p>
          <p style="margin:10px 0 0;"><a href="${installLink}" style="color:#39FF14;font-weight:800;">Guida installazione app</a></p>
        </div>
        <p style="color:#7f887b;font-size:12px;margin-top:22px;">Il link scade tra 48 ore. Se non hai richiesto questo accesso, ignora questa email.</p>
      </div>
    `,
    text: [
      `Ciao ${fullName || ""}!`,
      "",
      intro,
      `Imposta la password qui: ${loginLink}`,
      "",
      "Per aggiungere l'app alla schermata Home:",
      "iPhone: apri il link in Safari → Condividi → Aggiungi alla schermata Home.",
      `Guida: ${installLink}`,
      "",
      "Il link scade tra 48 ore.",
    ].join("\n"),
  });
}
