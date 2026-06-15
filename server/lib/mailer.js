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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

export function clientAppLoginLink(user = {}) {
  const baseUrl = appUrl();
  const inviteExpires = user.inviteExpires ? new Date(user.inviteExpires) : null;
  const hasValidInvite = !!user.inviteToken && (!inviteExpires || inviteExpires > new Date());
  if (!user.passwordHash && hasValidInvite) return `${baseUrl}/login?invite=${encodeURIComponent(user.inviteToken)}`;
  return `${baseUrl}/login`;
}

export function clientAppCtaLabel(user = {}) {
  const inviteExpires = user.inviteExpires ? new Date(user.inviteExpires) : null;
  const hasValidInvite = !!user.inviteToken && (!inviteExpires || inviteExpires > new Date());
  return !user.passwordHash && hasValidInvite ? "Imposta password e accedi" : "Accedi all'app";
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

function appInstallBlock(installLink) {
  return `
    <div style="margin-top:22px;padding:18px;border-radius:14px;background:#111610;border:1px solid rgba(255,255,255,.08);">
      <h3 style="margin:0 0 8px;color:#ffffff;font-size:16px;">Aggiungila alla schermata Home</h3>
      <p style="margin:0;color:#aeb9aa;line-height:1.55;font-size:14px;">Da iPhone apri il link in Safari, premi Condividi e scegli “Aggiungi alla schermata Home”. Così avrai l'app Gianluigi PT tra le tue app.</p>
      <p style="margin:10px 0 0;"><a href="${installLink}" style="color:#39FF14;font-weight:800;">Guida installazione app</a></p>
    </div>
  `;
}

function emailShell({ firstName, intro, ctaHref, ctaLabel, extraHtml = "", footer = "" }) {
  const installLink = `${appUrl()}/installa-app`;
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0b0a;color:#f4f7f2;border-radius:18px;padding:32px;border:1px solid rgba(57,255,20,.28);">
      <p style="margin:0 0 10px;color:#39FF14;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Gianluigi Chiarelli PT</p>
      <h2 style="margin:0 0 18px;color:#ffffff;font-size:28px;line-height:1.1;">Ciao, ${escapeHtml(firstName)}.</h2>
      <p style="color:#c7d0c3;line-height:1.6;">${intro}</p>
      ${extraHtml}
      <a href="${ctaHref}" style="display:inline-block;margin:22px 0;padding:14px 24px;background:#39FF14;color:#071007;font-weight:900;border-radius:999px;text-decoration:none;font-size:15px;">
        ${ctaLabel}
      </a>
      ${appInstallBlock(installLink)}
      <p style="color:#7f887b;font-size:12px;margin-top:22px;">${footer}</p>
    </div>
  `;
}

function detailsCard(rows = []) {
  const content = rows
    .filter((row) => row?.value != null && row.value !== "")
    .map((row) => `
      <div style="margin-top:8px;">
        <strong style="color:#39FF14;">${escapeHtml(row.label)}:</strong>
        <span style="color:#f4f7f2;"> ${escapeHtml(row.value)}</span>
      </div>
    `)
    .join("");

  return `
    <div style="margin-top:18px;padding:16px;border-radius:12px;background:#111610;border:1px solid rgba(57,255,20,.22);">
      ${content}
    </div>
  `;
}

export async function sendClientInviteEmail({ to, fullName, token, context = "manual", productName, sessionsQty }) {
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
    ? "Pagamento ricevuto. La tua area allenamenti è pronta.<br>Imposta la password e accedi alla piattaforma."
    : "Gianluigi ti ha aggiunto alla sua piattaforma di allenamento.";
  const extraHtml = productName
    ? `<div style="margin-top:18px;padding:14px;border-radius:12px;background:#111610;border:1px solid rgba(57,255,20,.22);"><strong style="color:#39FF14;">Acquisto:</strong> ${productName}${sessionsQty ? ` · ${sessionsQty} sessioni` : ""}</div>`
    : "";

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Gianluigi PT" <${user}>`,
    to,
    subject,
    html: emailShell({
      firstName,
      intro,
      ctaHref: loginLink,
      ctaLabel: "Imposta password",
      extraHtml,
      footer: "Il link scade tra 48 ore. Se non hai richiesto questo accesso, ignora questa email.",
    }),
    text: [
      `Ciao ${fullName || ""}!`,
      "",
      intro,
      productName ? `Acquisto: ${productName}${sessionsQty ? ` · ${sessionsQty} sessioni` : ""}` : "",
      `Imposta la password qui: ${loginLink}`,
      "",
      "Per aggiungere l'app alla schermata Home:",
      "iPhone: apri il link in Safari → Condividi → Aggiungi alla schermata Home.",
      `Guida: ${installLink}`,
      "",
      "Il link scade tra 48 ore.",
    ].filter(Boolean).join("\n"),
  });
}

export async function sendRenewalReminderEmail({ to, fullName, productName, expiresAt, cancelAtPeriodEnd }) {
  const { user } = smtpConfig();
  const firstName = fullName?.split(" ")[0] || "ciao";
  const baseUrl = appUrl();
  const dateStr = expiresAt
    ? new Date(expiresAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const isCancel = !!cancelAtPeriodEnd;
  const subject = isCancel
    ? `Il tuo accesso Gianluigi PT scade il ${dateStr || "presto"}`
    : `Il tuo abbonamento Gianluigi PT si rinnova il ${dateStr || "presto"}`;

  const intro = isCancel
    ? `Il tuo accesso a <strong>${productName}</strong> sarà attivo fino al <strong>${dateStr}</strong>. Dopo quella data le schede e l'area allenamenti non saranno più disponibili.`
    : `Il tuo abbonamento <strong>${productName}</strong> si rinnova automaticamente il <strong>${dateStr}</strong>. Tutto è in regola e puoi continuare ad allenarti senza interruzioni.`;

  const extraHtml = `
    <div style="margin-top:18px;padding:14px;border-radius:12px;background:#111610;border:1px solid rgba(57,255,20,.22);">
      <strong style="color:#39FF14;">Piano attivo:</strong> ${productName}
      ${dateStr ? `<br><strong style="color:#39FF14;">${isCancel ? "Valido fino al" : "Prossimo rinnovo"}:</strong> ${dateStr}` : ""}
    </div>
  `;

  const ctaHref = isCancel ? `${baseUrl}/pacchetti` : `${baseUrl}/area-cliente`;
  const ctaLabel = isCancel ? "Rinnova il tuo accesso" : "Vai all'area allenamenti";

  await createTransporter().sendMail({
    from: `"Gianluigi PT" <${user}>`,
    to,
    subject,
    html: emailShell({
      firstName,
      intro,
      ctaHref,
      ctaLabel,
      extraHtml,
      footer: "Se hai domande, rispondi a questa email o contatta Gianluigi.",
    }),
    text: [
      `Ciao ${firstName}!`,
      "",
      isCancel
        ? `Il tuo accesso a ${productName} scade il ${dateStr}.`
        : `Il tuo abbonamento ${productName} si rinnova il ${dateStr}.`,
      isCancel ? `Rinnova qui: ${baseUrl}/pacchetti` : `Accedi alla tua area: ${baseUrl}/area-cliente`,
    ].filter(Boolean).join("\n"),
  });
}

export async function sendExistingClientPaymentEmail({ to, fullName, productName, sessionsQty }) {
  const { user } = smtpConfig();
  const firstName = fullName?.split(" ")[0] || "ciao";
  const baseUrl = appUrl();
  const loginLink = `${baseUrl}/login`;
  const installLink = `${baseUrl}/installa-app`;
  const summary = productName
    ? `<div style="margin-top:18px;padding:14px;border-radius:12px;background:#111610;border:1px solid rgba(57,255,20,.22);"><strong style="color:#39FF14;">Acquisto confermato:</strong> ${productName}${sessionsQty ? ` · ${sessionsQty} sessioni` : ""}</div>`
    : "";

  await createTransporter().sendMail({
    from: `"Gianluigi PT" <${user}>`,
    to,
    subject: "Pagamento confermato — accedi alla tua area Gianluigi PT",
    html: emailShell({
      firstName,
      intro: "Pagamento ricevuto. Il tuo acquisto è stato aggiunto alla tua area cliente.",
      ctaHref: loginLink,
      ctaLabel: "Accedi alla tua area",
      extraHtml: summary,
      footer: "Se hai dubbi, rispondi a questa email o contatta Gianluigi.",
    }),
    text: [
      `Ciao ${fullName || ""}!`,
      "",
      "Pagamento ricevuto. Il tuo acquisto è stato aggiunto alla tua area cliente.",
      productName ? `Acquisto: ${productName}${sessionsQty ? ` · ${sessionsQty} sessioni` : ""}` : "",
      `Accedi qui: ${loginLink}`,
      "",
      "Per aggiungere l'app alla schermata Home:",
      "iPhone: apri il link in Safari → Condividi → Aggiungi alla schermata Home.",
      `Guida: ${installLink}`,
    ].filter(Boolean).join("\n"),
  });
}

export async function sendWorkoutAssignedEmail({
  to,
  fullName,
  workoutTitle,
  daysCount,
  exercisesCount,
  loginHref,
  ctaLabel = "Accedi all'app",
}) {
  const { user } = smtpConfig();
  const firstName = fullName?.split(" ")[0] || "ciao";
  const title = workoutTitle || "Nuova scheda";
  const extraHtml = detailsCard([
    { label: "Scheda", value: title },
    { label: "Giorni", value: daysCount },
    { label: "Esercizi", value: exercisesCount },
  ]);

  await createTransporter().sendMail({
    from: `"Gianluigi PT" <${user}>`,
    to,
    subject: `Nuova scheda disponibile: ${title}`,
    html: emailShell({
      firstName,
      intro: "Gianluigi ha preparato una nuova scheda personalizzata per te. La trovi già nell'app, pronta da seguire allenamento dopo allenamento.",
      ctaHref: loginHref || `${appUrl()}/login`,
      ctaLabel,
      extraHtml,
      footer: "Accedi all'app per vedere la scheda completa, gli esercizi e tracciare i tuoi progressi.",
    }),
    text: [
      `Ciao ${firstName}!`,
      "",
      "Gianluigi ha preparato una nuova scheda personalizzata per te.",
      `Scheda: ${title}`,
      daysCount != null ? `Giorni: ${daysCount}` : "",
      exercisesCount != null ? `Esercizi: ${exercisesCount}` : "",
      `Accedi qui: ${loginHref || `${appUrl()}/login`}`,
    ].filter(Boolean).join("\n"),
  });
}

export async function sendSoloLiveSessionEmail({
  to,
  fullName,
  title,
  scheduledAt,
  durationMin,
  videoLink,
  loginHref,
  ctaLabel = "Accedi all'app",
}) {
  const { user } = smtpConfig();
  const firstName = fullName?.split(" ")[0] || "ciao";
  const sessionTitle = title || "Sessione 1:1";
  const extraHtml = detailsCard([
    { label: "Sessione", value: sessionTitle },
    { label: "Quando", value: formatDateTime(scheduledAt) },
    { label: "Durata", value: durationMin ? `${durationMin} minuti` : null },
    { label: "Link video", value: videoLink || "Disponibile nell'app" },
  ]);

  await createTransporter().sendMail({
    from: `"Gianluigi PT" <${user}>`,
    to,
    subject: `Sessione 1:1 programmata: ${sessionTitle}`,
    html: emailShell({
      firstName,
      intro: "Gianluigi ha programmato una sessione live 1:1 per te. Apri l'app per controllare i dettagli e prepararti alla sessione.",
      ctaHref: loginHref || `${appUrl()}/login`,
      ctaLabel,
      extraHtml,
      footer: "Se non puoi partecipare, rispondi a questa email o scrivi a Gianluigi dall'app.",
    }),
    text: [
      `Ciao ${firstName}!`,
      "",
      "Gianluigi ha programmato una sessione live 1:1 per te.",
      `Sessione: ${sessionTitle}`,
      `Quando: ${formatDateTime(scheduledAt)}`,
      durationMin ? `Durata: ${durationMin} minuti` : "",
      videoLink ? `Link video: ${videoLink}` : "Link video disponibile nell'app.",
      `Accedi qui: ${loginHref || `${appUrl()}/login`}`,
    ].filter(Boolean).join("\n"),
  });
}

export async function sendGroupLiveSessionEmail({
  to,
  fullName,
  title,
  scheduledAt,
  durationMin,
  availableSlots,
  maxSlots,
  loginHref,
  ctaLabel = "Accedi all'app",
}) {
  const { user } = smtpConfig();
  const firstName = fullName?.split(" ")[0] || "ciao";
  const sessionTitle = title || "Live di gruppo";
  const slotsLabel = `${Math.max(0, Number(availableSlots) || 0)} su ${Number(maxSlots) || 0}`;
  const extraHtml = detailsCard([
    { label: "Live", value: sessionTitle },
    { label: "Quando", value: formatDateTime(scheduledAt) },
    { label: "Durata", value: durationMin ? `${durationMin} minuti` : null },
    { label: "Posti disponibili", value: slotsLabel },
    { label: "Prenotazione", value: "Disponibile nell'app" },
  ]);

  await createTransporter().sendMail({
    from: `"Gianluigi PT" <${user}>`,
    to,
    subject: `Nuova live di gruppo: ${sessionTitle}`,
    html: emailShell({
      firstName,
      intro: "Gianluigi ha creato una nuova live di gruppo. I posti sono limitati: entra nell'app per vedere i dettagli e prenotarti.",
      ctaHref: loginHref || `${appUrl()}/login`,
      ctaLabel,
      extraHtml,
      footer: "La prenotazione e i dettagli aggiornati sono sempre disponibili nella tua area cliente.",
    }),
    text: [
      `Ciao ${firstName}!`,
      "",
      "Gianluigi ha creato una nuova live di gruppo.",
      `Live: ${sessionTitle}`,
      `Quando: ${formatDateTime(scheduledAt)}`,
      durationMin ? `Durata: ${durationMin} minuti` : "",
      `Posti disponibili: ${slotsLabel}`,
      "Prenotazione disponibile nell'app.",
      `Accedi qui: ${loginHref || `${appUrl()}/login`}`,
    ].filter(Boolean).join("\n"),
  });
}
