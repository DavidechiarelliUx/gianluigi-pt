import { prisma } from "../../server/lib/prisma.js";
import { requireAuth, requireAdmin, getAuth } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";
import { getLiveCreditBalance } from "../../server/lib/live-credits.js";
import {
  clientAppCtaLabel,
  clientAppLoginLink,
  sendGroupLiveSessionEmail,
  sendSoloLiveSessionEmail,
} from "../../server/lib/mailer.js";

// ─────────────────────────────────────────
// Helper
// ─────────────────────────────────────────

/** Conta le prenotazioni confirmed per una sessione live. */
async function confirmedCount(liveSessionId) {
  return prisma.booking.count({
    where: { liveSessionId, status: "confirmed" },
  });
}

async function liveCreditBalanceTx(tx, clientId) {
  const result = await tx.liveCreditLedger.aggregate({
    where: { clientId },
    _sum: { amount: true },
  });
  return result._sum.amount || 0;
}

async function consumeLiveCreditForBooking(tx, { clientId, bookingId, title }) {
  const balance = await liveCreditBalanceTx(tx, clientId);
  if (balance <= 0) {
    const err = new Error("Cliente senza crediti live disponibili. Aggiungi crediti prima di prenotare.");
    err.code = "NO_LIVE_CREDITS";
    err.liveCredits = balance;
    throw err;
  }

  await tx.liveCreditLedger.create({
    data: {
      clientId,
      bookingId,
      externalRef: `booking:${bookingId}`,
      amount: -1,
      reason: "booking",
      note: title,
    },
  });
}

// ─────────────────────────────────────────
// GET/POST /api/live/sessions
// ─────────────────────────────────────────

async function sessions(req, res) {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ ok: false, error: "Non autenticato" });

  /* ---- GET ---- */
  if (req.method === "GET") {
    try {
      if (auth.role === "client") {
        const liveCredits = await getLiveCreditBalance(auth.clientId);
        const list = await prisma.liveSession.findMany({
          where: {
            status: { in: ["scheduled", "live"] },
            OR: [{ targetClientId: null }, { targetClientId: auth.clientId }],
          },
          orderBy: { scheduledAt: "asc" },
          include: {
            _count: { select: { bookings: { where: { status: "confirmed" } } } },
            bookings: {
              where: { clientId: auth.clientId },
              select: { id: true, status: true },
            },
          },
        });

        return res.status(200).json({ ok: true, access: "granted", liveCredits, sessions: list });
      }

      const where =
        auth.role === "admin"
          ? {} // admin vede tutto
          : { status: { in: ["scheduled", "live"] } }; // cliente vede solo prenotabili

      const list = await prisma.liveSession.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        include: {
          _count: { select: { bookings: { where: { status: "confirmed" } } } },
          targetClient: { include: { user: { select: { fullName: true, email: true } } } },
          ...(auth.role === "client" && auth.clientId
            ? {
                bookings: {
                  where: { clientId: auth.clientId },
                  select: { id: true, status: true },
                },
              }
            : {}),
        },
      });

      return res.status(200).json({ ok: true, sessions: list });
    } catch (err) {
      console.error("GET /api/live/sessions:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  /* ---- POST (solo admin) ---- */
  if (req.method === "POST") {
    if (auth.role !== "admin") return res.status(403).json({ ok: false, error: "Solo admin" });

    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });

    const { title, type = "solo", scheduledAt, durationMin = 60, maxSlots, productId, targetClientId, videoLink, notes } =
      body;

    if (!title?.trim() || !scheduledAt) {
      return res.status(400).json({ ok: false, error: "Titolo e data/ora obbligatori" });
    }

    try {
      const assignedClientId = type === "solo" && targetClientId ? String(targetClientId) : null;
      let assignedClient = null;
      if (assignedClientId) {
        assignedClient = await prisma.client.findFirst({
          where: { id: assignedClientId, deletedAt: null },
          include: {
            user: {
              select: {
                email: true,
                fullName: true,
                passwordHash: true,
                inviteToken: true,
                inviteExpires: true,
              },
            },
          },
        });
        if (!assignedClient) return res.status(404).json({ ok: false, error: "Cliente non trovato" });
      }

      const session = await prisma.$transaction(async (tx) => {
        const created = await tx.liveSession.create({
          data: {
            title: title.trim(),
            type,
            scheduledAt: new Date(scheduledAt),
            durationMin: Number(durationMin) || 60,
            maxSlots: assignedClientId ? 1 : maxSlots ? Number(maxSlots) : type === "solo" ? 1 : 10,
            productId: productId || null,
            targetClientId: assignedClientId,
            videoLink: videoLink?.trim() || null,
            notes: notes?.trim() || null,
          },
        });
        if (assignedClientId) {
          const booking = await tx.booking.create({
            data: { liveSessionId: created.id, clientId: assignedClientId, status: "confirmed" },
          });
          await consumeLiveCreditForBooking(tx, {
            clientId: assignedClientId,
            bookingId: booking.id,
            title: created.title,
          });
        }
        return created;
      });

      let emailSent = 0;
      let emailFailed = 0;
      let emailError = null;

      if (assignedClient) {
        try {
          await sendSoloLiveSessionEmail({
            to: assignedClient.user.email,
            fullName: assignedClient.user.fullName,
            title: session.title,
            scheduledAt: session.scheduledAt,
            durationMin: session.durationMin,
            videoLink: session.videoLink,
            loginHref: clientAppLoginLink(assignedClient.user),
            ctaLabel: clientAppCtaLabel(assignedClient.user),
          });
          emailSent = 1;
        } catch (err) {
          emailFailed = 1;
          emailError = err.code || err.message || "EMAIL_FAILED";
          console.warn("POST /api/live/sessions: email live 1:1 non inviata", emailError);
        }
      } else if (type === "group") {
        try {
          const recipients = await prisma.client.findMany({
            where: { deletedAt: null },
            include: {
              user: {
                select: {
                  email: true,
                  fullName: true,
                  passwordHash: true,
                  inviteToken: true,
                  inviteExpires: true,
                },
              },
            },
          });
          const availableSlots = Math.max(0, Number(session.maxSlots) || 0);
          const results = await Promise.allSettled(
            recipients
              .filter((client) => client.user?.email)
              .map((client) =>
                sendGroupLiveSessionEmail({
                  to: client.user.email,
                  fullName: client.user.fullName,
                  title: session.title,
                  scheduledAt: session.scheduledAt,
                  durationMin: session.durationMin,
                  availableSlots,
                  maxSlots: session.maxSlots,
                  loginHref: clientAppLoginLink(client.user),
                  ctaLabel: clientAppCtaLabel(client.user),
                })
              )
          );
          emailSent = results.filter((result) => result.status === "fulfilled").length;
          emailFailed = results.length - emailSent;
          if (emailFailed > 0) emailError = "SOME_EMAILS_FAILED";
        } catch (err) {
          emailError = err.code || err.message || "EMAIL_FAILED";
          emailFailed = 1;
          console.warn("POST /api/live/sessions: email live gruppo non inviate", emailError);
        }
      }

      return res.status(201).json({ ok: true, session, emailSent, emailFailed, emailError });
    } catch (err) {
      if (err.code === "NO_LIVE_CREDITS") {
        return res.status(402).json({ ok: false, error: err.message, liveCredits: err.liveCredits || 0 });
      }
      console.error("POST /api/live/sessions:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}

// ─────────────────────────────────────────
// GET/PUT/DELETE /api/live/session-detail?id=xxx
// ─────────────────────────────────────────

async function sessionDetail(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ ok: false, error: "id mancante" });

  /* ---- GET ---- */
  if (req.method === "GET") {
    try {
      const session = await prisma.liveSession.findUnique({
        where: { id },
        include: {
          bookings: {
            where: { status: { not: "cancelled" } },
            include: { client: { include: { user: { select: { fullName: true, email: true } } } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!session) return res.status(404).json({ ok: false, error: "Sessione non trovata" });
      return res.status(200).json({ ok: true, session });
    } catch (err) {
      console.error("GET /api/live/session-detail:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  /* ---- PUT ---- */
  if (req.method === "PUT") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });

    const { title, type, status, scheduledAt, durationMin, maxSlots, productId, targetClientId, videoLink, notes } = body;

    try {
      const session = await prisma.liveSession.update({
        where: { id },
        data: {
          ...(title != null && { title: title.trim() }),
          ...(type != null && { type }),
          ...(status != null && { status }),
          ...(scheduledAt != null && { scheduledAt: new Date(scheduledAt) }),
          ...(durationMin != null && { durationMin: Number(durationMin) }),
          ...(maxSlots != null && { maxSlots: Number(maxSlots) }),
          ...(productId !== undefined && { productId: productId || null }),
          ...(targetClientId !== undefined && { targetClientId: targetClientId || null }),
          ...(videoLink !== undefined && { videoLink: videoLink?.trim() || null }),
          ...(notes !== undefined && { notes: notes?.trim() || null }),
        },
      });
      return res.status(200).json({ ok: true, session });
    } catch (err) {
      console.error("PUT /api/live/session-detail:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  /* ---- DELETE (elimina davvero la sessione creata per errore) ---- */
  if (req.method === "DELETE") {
    try {
      const session = await prisma.liveSession.findUnique({
        where: { id },
        include: { bookings: { select: { id: true } } },
      });
      if (!session) return res.status(404).json({ ok: false, error: "Sessione non trovata" });
      const bookingIds = session.bookings.map((booking) => booking.id);

      await prisma.$transaction(async (tx) => {
        if (bookingIds.length > 0) {
          await tx.liveCreditLedger.deleteMany({ where: { bookingId: { in: bookingIds } } });
        }
        await tx.liveSession.delete({ where: { id } });
      });
      return res.status(200).json({ ok: true, deleted: true, removedBookings: bookingIds.length });
    } catch (err) {
      console.error("DELETE /api/live/session-detail:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "PUT", "DELETE"]);
}

// ─────────────────────────────────────────
// POST/DELETE /api/live/bookings
// ─────────────────────────────────────────

async function bookings(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  /* ---- POST — prenota ---- */
  if (req.method === "POST") {
    // Admin può prenotare per un clientId specificato; cliente prenota per sé
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });

    const liveSessionId = body.liveSessionId;
    const clientId = auth.role === "admin" ? body.clientId : auth.clientId;

    if (!liveSessionId || !clientId) {
      return res.status(400).json({ ok: false, error: "liveSessionId e clientId obbligatori" });
    }

    try {
      const session = await prisma.liveSession.findUnique({ where: { id: liveSessionId } });
      if (!session || session.status !== "scheduled") {
        return res.status(400).json({ ok: false, error: "Sessione non prenotabile" });
      }
      if (session.targetClientId && session.targetClientId !== clientId) {
        return res.status(403).json({ ok: false, error: "Sessione riservata a un altro cliente" });
      }

      const balance = await getLiveCreditBalance(clientId);
      if (balance <= 0) {
        return res.status(402).json({
          ok: false,
          error: auth.role === "client"
            ? "Non hai crediti live disponibili. Acquista una live per prenotare."
            : "Cliente senza crediti live disponibili. Aggiungi crediti prima di prenotare.",
          liveCredits: balance,
        });
      }

      const booked = await confirmedCount(liveSessionId);
      if (booked >= session.maxSlots) {
        return res.status(409).json({ ok: false, error: "Sessione al completo" });
      }

      const booking = await prisma.$transaction(async (tx) => {
        const created = await tx.booking.create({
          data: { liveSessionId, clientId, status: "confirmed" },
        });
        await consumeLiveCreditForBooking(tx, { clientId, bookingId: created.id, title: session.title });
        return created;
      });
      return res.status(201).json({ ok: true, booking });
    } catch (err) {
      if (err.code === "NO_LIVE_CREDITS") {
        return res.status(402).json({ ok: false, error: err.message, liveCredits: err.liveCredits || 0 });
      }
      // Unique constraint → già prenotato
      if (err.code === "P2002") {
        return res.status(409).json({ ok: false, error: "Hai già prenotato questa sessione" });
      }
      console.error("POST /api/live/bookings:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  /* ---- DELETE — cancella prenotazione ---- */
  if (req.method === "DELETE") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });

    const { bookingId } = body;
    if (!bookingId) return res.status(400).json({ ok: false, error: "bookingId obbligatorio" });

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { liveSession: true },
      });
      if (!booking) return res.status(404).json({ ok: false, error: "Prenotazione non trovata" });

      // Sicurezza ownership: il cliente può cancellare solo le proprie
      if (auth.role === "client" && booking.clientId !== auth.clientId) {
        return res.status(403).json({ ok: false, error: "Non autorizzato" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
        const consumedCredit = await tx.liveCreditLedger.findFirst({
          where: { bookingId, amount: { lt: 0 }, reason: "booking" },
        });
        if (consumedCredit) {
          await tx.liveCreditLedger.upsert({
            where: { externalRef: `booking-cancelled:${bookingId}` },
            update: {},
            create: {
              clientId: booking.clientId,
              bookingId,
              externalRef: `booking-cancelled:${bookingId}`,
              amount: Math.abs(consumedCredit.amount),
              reason: "booking_cancelled",
              note: booking.liveSession.title,
            },
          });
        }
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/live/bookings:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["POST", "DELETE"]);
}

// ─────────────────────────────────────────
// Router principale
// ─────────────────────────────────────────

export default function handler(req, res) {
  const { action } = req.query;
  if (action === "sessions")       return sessions(req, res);
  if (action === "session-detail") return sessionDetail(req, res);
  if (action === "bookings")       return bookings(req, res);
  return res.status(404).json({ ok: false, error: "Endpoint live non trovato" });
}
