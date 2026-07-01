import { prisma } from "../server/lib/prisma.js";
import { requireAdmin } from "../server/lib/guards.js";
import { methodNotAllowed, parseJsonBody } from "../server/lib/body.js";

function cleanDays(days = []) {
  if (!Array.isArray(days)) return [];
  return days
    .map((day, dayIndex) => ({
      label: String(day?.label || `Giorno ${dayIndex + 1}`).trim(),
      items: Array.isArray(day?.items)
        ? day.items
            .filter((item) => item?.exerciseId)
            .map((item) => ({
              exerciseId: String(item.exerciseId),
              sets: Number(item.sets) || 3,
              reps: String(item.reps || "8-10"),
              restSeconds: item.restSeconds === "" || item.restSeconds == null ? null : Number(item.restSeconds) || null,
              notes: item.notes ? String(item.notes).trim() : null,
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

export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    try {
      const templates = await prisma.workoutTemplate.findMany({
        orderBy: { updatedAt: "desc" },
      });
      return res.status(200).json({ ok: true, templates: templates.map(templatePayload) });
    } catch (err) {
      console.error("GET /api/workout-templates:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "POST") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });

    const name = String(body.name || "").trim();
    const days = cleanDays(body.days);
    if (!name || days.length === 0) {
      return res.status(400).json({ ok: false, error: "Nome template e almeno un esercizio sono obbligatori" });
    }

    try {
      const template = await prisma.workoutTemplate.create({
        data: {
          name,
          description: body.description ? String(body.description).trim() : null,
          days,
        },
      });
      return res.status(201).json({ ok: true, template: templatePayload(template) });
    } catch (err) {
      console.error("POST /api/workout-templates:", err);
      if (err.code === "P2002") return res.status(409).json({ ok: false, error: "Esiste gia un template con questo nome" });
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "PUT") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });

    const id = String(body.id || "").trim();
    const name = String(body.name || "").trim();
    const days = cleanDays(body.days);
    if (!id || !name || days.length === 0) {
      return res.status(400).json({ ok: false, error: "Id, nome template e almeno un esercizio sono obbligatori" });
    }

    try {
      const template = await prisma.workoutTemplate.update({
        where: { id },
        data: {
          name,
          description: body.description ? String(body.description).trim() : null,
          days,
        },
      });
      return res.status(200).json({ ok: true, template: templatePayload(template) });
    } catch (err) {
      console.error("PUT /api/workout-templates:", err);
      if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Template non trovato" });
      if (err.code === "P2002") return res.status(409).json({ ok: false, error: "Esiste gia un template con questo nome" });
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "DELETE") {
    const body = parseJsonBody(req);
    const id = String(body?.id || req.query.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "id template obbligatorio" });

    try {
      await prisma.workoutTemplate.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/workout-templates:", err);
      if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Template non trovato" });
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}
