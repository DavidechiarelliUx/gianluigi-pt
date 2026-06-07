import { prisma } from "../../server/lib/prisma.js";
import { requireAuth, requireAdmin, getAuth } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";
import { getClientEntitlements, canAccess } from "../../server/lib/access.js";

// ─────────────────────────────────────────
// Helper
// ─────────────────────────────────────────

/** Conta le prenotazioni confirmed per una sessione live. */
async function confirmedCount(liveSessionId) {
  return prisma.booking.count({
    where: { liveSessionId, status: "confirmed" },
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
        const entitlements = await getClientEntitlements(auth.userId);
        if (!entitlements.hasAccess) {
          return res.status(200).json({ ok: true, access: "payment_required", sessions: [] });
        }
        if (!canAccess(entitlements, "live")) {
          return res.status(200).json({
            ok: true,
            access: "upgrade_required",
            accessLevel: entitlements.accessLevel,
            sessions: [],
          });
        }
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

    const { title, type = "solo", scheduledAt, durationMin = 60, maxSlots, productId, videoLink, notes } =
      body;

    if (!title?.trim() || !scheduledAt) {
      return res.status(400).json({ ok: false, error: "Titolo e data/ora obbligatori" });
    }

    try {
      const session = await prisma.liveSession.create({
        data: {
          title: title.trim(),
          type,
          scheduledAt: new Date(scheduledAt),
          durationMin: Number(durationMin) || 60,
          maxSlots: maxSlots ? Number(maxSlots) : type === "solo" ? 1 : 10,
          productId: productId || null,
          videoLink: videoLink?.trim() || null,
          notes: notes?.trim() || null,
        },
      });
      return res.status(201).json({ ok: true, session });
    } catch (err) {
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

    const { title, type, status, scheduledAt, durationMin, maxSlots, productId, videoLink, notes } = body;

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

  /* ---- DELETE (annulla la sessione, non elimina — preserva storico) ---- */
  if (req.method === "DELETE") {
    try {
      await prisma.liveSession.update({ where: { id }, data: { status: "cancelled" } });
      // Cancella anche le prenotazioni attive
      await prisma.booking.updateMany({
        where: { liveSessionId: id, status: { not: "cancelled" } },
        data: { status: "cancelled" },
      });
      return res.status(200).json({ ok: true });
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
      if (auth.role === "client") {
        const entitlements = await getClientEntitlements(auth.userId);
        if (!canAccess(entitlements, "live")) {
          const msg = entitlements.hasAccess
            ? "Il tuo abbonamento non include le sessioni live. Passa ad App + Live o Premium."
            : "Acquista un abbonamento per prenotare le sessioni live.";
          return res.status(402).json({ ok: false, error: msg, accessLevel: entitlements.accessLevel });
        }
      }

      const session = await prisma.liveSession.findUnique({ where: { id: liveSessionId } });
      if (!session || session.status !== "scheduled") {
        return res.status(400).json({ ok: false, error: "Sessione non prenotabile" });
      }

      const booked = await confirmedCount(liveSessionId);
      if (booked >= session.maxSlots) {
        return res.status(409).json({ ok: false, error: "Sessione al completo" });
      }

      const booking = await prisma.booking.create({
        data: { liveSessionId, clientId, status: "confirmed" },
      });
      return res.status(201).json({ ok: true, booking });
    } catch (err) {
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

      await prisma.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
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
