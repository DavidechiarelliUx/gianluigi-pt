import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";
import { normalizeWorkoutItemTarget } from "../../server/lib/workoutTarget.js";

const includeWorkout = {
  client: { include: { user: { select: { fullName: true, email: true } } } },
  days: {
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" }, include: { exercise: true } } },
  },
  _count: { select: { sessions: true } },
};

function cleanTemplateDays(days = []) {
  if (!Array.isArray(days)) return [];
  return days
    .map((day, dayIndex) => ({
      label: String(day?.label || `Giorno ${dayIndex + 1}`).trim(),
      items: Array.isArray(day?.items)
        ? day.items
            .filter((item) => item?.exerciseId)
            .map((item) => ({
              exerciseId: String(item.exerciseId),
              ...normalizeWorkoutItemTarget(item),
            }))
        : [],
    }))
    .filter((day) => day.items.length > 0);
}

function templatePayload(template) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    days: Array.isArray(template.days) ? template.days : [],
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

async function workoutTemplates(req, res) {
  if (req.method === "GET") {
    try {
      const templates = await prisma.workoutTemplate.findMany({ orderBy: { updatedAt: "desc" } });
      return res.status(200).json({ ok: true, templates: templates.map(templatePayload) });
    } catch (err) {
      console.error("GET /api/workouts/templates:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "POST" || req.method === "PUT") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });

    const id = String(body.id || "").trim();
    const name = String(body.name || "").trim();
    const days = cleanTemplateDays(body.days);
    if ((req.method === "PUT" && !id) || !name || days.length === 0) {
      return res.status(400).json({ ok: false, error: "Nome template e almeno un esercizio sono obbligatori" });
    }

    try {
      const template = req.method === "PUT"
        ? await prisma.workoutTemplate.update({
            where: { id },
            data: { name, description: body.description ? String(body.description).trim() : null, days },
          })
        : await prisma.workoutTemplate.create({
            data: { name, description: body.description ? String(body.description).trim() : null, days },
          });
      return res.status(req.method === "PUT" ? 200 : 201).json({ ok: true, template: templatePayload(template) });
    } catch (err) {
      console.error(`${req.method} /api/workouts/templates:`, err);
      if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Template non trovato" });
      if (err.code === "P2002") return res.status(409).json({ ok: false, error: "Esiste gia un template con questo nome" });
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "DELETE") {
    const body = parseJsonBody(req);
    const id = String(body?.id || req.query.templateId || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "id template obbligatorio" });

    try {
      await prisma.workoutTemplate.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/workouts/templates:", err);
      if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Template non trovato" });
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}

async function replaceDays(tx, workoutId, days = []) {
  // Leggo la struttura corrente per fare un diff e preservare gli ID degli item esistenti.
  // Questo è fondamentale per non rompere il collegamento tra WorkoutItemLog storici
  // e gli esercizi correnti (lastMaximalByItemId usa workoutItemId).
  const currentDays = await tx.workoutDay.findMany({
    where: { workoutId },
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" } } },
  });

  for (const [dayIndex, day] of days.entries()) {
    const currentDay = currentDays[dayIndex];

    if (currentDay) {
      // Aggiorna label e ordine del giorno esistente
      await tx.workoutDay.update({
        where: { id: currentDay.id },
        data: { label: day.label?.trim() || `Giorno ${dayIndex + 1}`, order: dayIndex },
      });

      // Diff items: abbina per exerciseId (primo match non ancora usato)
      const usedIds = new Set();
      for (const [itemIndex, newItem] of (day.items || []).entries()) {
        const match = currentDay.items.find(
          (ci) => ci.exerciseId === newItem.exerciseId && !usedIds.has(ci.id),
        );
        if (match) {
          usedIds.add(match.id);
          // Update in-place — l'ID del WorkoutItem rimane lo stesso ✓
          await tx.workoutItem.update({
            where: { id: match.id },
            data: { ...normalizeWorkoutItemTarget(newItem), order: itemIndex },
          });
        } else {
          // Nuovo esercizio — crea un nuovo item
          await tx.workoutItem.create({
            data: {
              workoutDayId: currentDay.id,
              exerciseId: newItem.exerciseId,
              ...normalizeWorkoutItemTarget(newItem),
              order: itemIndex,
            },
          });
        }
      }
      // Cancella solo gli item rimossi (non quelli aggiornati in-place)
      const toDelete = currentDay.items.filter((ci) => !usedIds.has(ci.id)).map((ci) => ci.id);
      if (toDelete.length) {
        await tx.workoutItem.deleteMany({ where: { id: { in: toDelete } } });
      }
    } else {
      // Giorno completamente nuovo
      await tx.workoutDay.create({
        data: {
          workoutId,
          label: day.label?.trim() || `Giorno ${dayIndex + 1}`,
          order: dayIndex,
          items: {
            create: (day.items || []).map((item, itemIndex) => ({
              exerciseId: item.exerciseId,
              ...normalizeWorkoutItemTarget(item),
              order: itemIndex,
            })),
          },
        },
      });
    }
  }

  // Cancella i giorni in eccesso (se il numero di giorni è diminuito)
  if (currentDays.length > days.length) {
    const excessIds = currentDays.slice(days.length).map((d) => d.id);
    await tx.workoutDay.deleteMany({ where: { id: { in: excessIds } } });
  }
}

export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const { id } = req.query;
  if (id === "templates") return workoutTemplates(req, res);

  if (req.method === "GET") {
    try {
      const workout = await prisma.workout.findUnique({ where: { id }, include: includeWorkout });
      if (!workout) return res.status(404).json({ ok: false, error: "Scheda non trovata" });
      return res.status(200).json({ ok: true, workout });
    } catch (err) {
      console.error("GET /api/workouts/[id]:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "PUT") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
    const { title, description, status, days } = body;

    try {
      const current = await prisma.workout.findUnique({ where: { id } });
      if (!current) return res.status(404).json({ ok: false, error: "Scheda non trovata" });

      // Transazione breve: solo le 2 query atomiche (status + update workout).
      // replaceDays viene eseguito FUORI dalla transaction perché fa molte
      // query sequenziali e supererebbe il timeout di 5 s su Neon→Vercel.
      await prisma.$transaction(async (tx) => {
        if (status === "active") {
          await tx.workout.updateMany({
            where: { clientId: current.clientId, status: "active", NOT: { id } },
            data: { status: "archived", archivedAt: new Date() },
          });
        }
        await tx.workout.update({
          where: { id },
          data: {
            title: title?.trim() || current.title,
            description: description?.trim() || null,
            status: status === "archived" ? "archived" : status === "active" ? "active" : current.status,
            archivedAt:
              status === "archived" ? new Date() : status === "active" ? null : current.archivedAt,
          },
        });
      });

      // Aggiorna i giorni/esercizi fuori dalla transaction
      if (Array.isArray(days)) await replaceDays(prisma, id, days);

      const workout = await prisma.workout.findUnique({ where: { id }, include: includeWorkout });
      return res.status(200).json({ ok: true, workout });
    } catch (err) {
      console.error("PUT /api/workouts/[id]:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const workout = await prisma.workout.findUnique({
        where: { id },
        include: { _count: { select: { sessions: true } } },
      });
      if (!workout) return res.status(404).json({ ok: false, error: "Scheda non trovata" });

      await prisma.$transaction(async (tx) => {
        await tx.workoutSession.deleteMany({ where: { workoutId: id } });
        await tx.workout.delete({ where: { id } });
      });

      return res.status(200).json({ ok: true, deleted: true, removedSessions: workout._count.sessions });
    } catch (err) {
      console.error("DELETE /api/workouts/[id]:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "PUT", "DELETE"]);
}
