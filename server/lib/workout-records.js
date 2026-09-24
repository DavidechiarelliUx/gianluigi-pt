export function normalizeSetLogs(value, loadType, expectedSets) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > expectedSets || value.length > 10) {
    throw new Error("Serie non valide");
  }
  const seen = new Set();
  return value.map((entry) => {
    const setIndex = Number(entry?.setIndex);
    if (!Number.isInteger(setIndex) || setIndex < 0 || setIndex >= expectedSets || seen.has(setIndex)) {
      throw new Error("Numero serie non valido");
    }
    seen.add(setIndex);
    const numeric = (raw, max) => {
      if (raw == null || raw === "") return null;
      const result = Number(String(raw).replace(",", "."));
      if (!Number.isFinite(result) || result < 0 || result > max) throw new Error("Valore serie non valido");
      return result;
    };
    const loadValue = loadType === "weight" ? numeric(entry.loadValue, 2000) : null;
    const repsDone = loadType === "time" ? null : numeric(entry.repsDone, 1000);
    const durationSeconds = loadType === "time" ? numeric(entry.durationSeconds, 86400) : null;
    if (repsDone != null && !Number.isInteger(repsDone)) throw new Error("Ripetizioni non valide");
    if (durationSeconds != null && !Number.isInteger(durationSeconds)) throw new Error("Durata non valida");
    return { setIndex, loadValue, repsDone, durationSeconds };
  }).filter((entry) => entry.loadValue != null || entry.repsDone != null || entry.durationSeconds != null)
    .sort((a, b) => a.setIndex - b.setIndex);
}

export function normalizeDraftState(value, itemsById) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Bozza non valida");
  if (JSON.stringify(value).length > 64000) throw new Error("Bozza troppo grande");
  const text = (input, max) => String(input ?? "").slice(0, max);
  const logs = {};
  for (const [id, log] of Object.entries(value.logs || {})) {
    const item = itemsById.get(id);
    if (!item || !log || typeof log !== "object" || Array.isArray(log)) throw new Error("Esercizio non valido nella bozza");
    const array = (input) => Array.isArray(input) ? input.slice(0, 10).map((entry) => text(entry, 24)) : [];
    const completed = !!log.completed && !log.skipped;
    logs[id] = {
      completed,
      skipped: !!log.skipped,
      loadUsed: text(log.loadUsed, 1000),
      repsDone: text(log.repsDone, 1000),
      rpe: text(log.rpe, 2),
      notes: text(log.notes, 1000),
      sets: completed ? normalizeSetLogs(log.sets, item.loadType, item.sets) : [],
      draftSetLoads: array(log.draftSetLoads),
      draftSetReps: array(log.draftSetReps),
      draftActiveSetIdx: Math.min(9, Math.max(0, Math.floor(Number(log.draftActiveSetIdx) || 0))),
      draftPhase: ["sets", "summary"].includes(log.draftPhase) ? log.draftPhase : "sets",
    };
  }
  if (typeof value.submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.submissionId)) {
    throw new Error("Identificativo sessione non valido");
  }
  return {
    logs,
    feedbackNotes: text(value.feedbackNotes, 2000),
    phase: value.phase === "done" ? "done" : "path",
    unlockedThrough: Math.min(100, Math.max(0, Math.floor(Number(value.unlockedThrough) || 0))),
    submissionId: value.submissionId,
  };
}

export function latestResultsByItem(workout, logs) {
  const result = {};
  const sorted = [...logs].sort((a, b) => new Date(b.session.date) - new Date(a.session.date));
  for (const day of workout?.days || []) {
    for (const item of day.items || []) {
      const matches = sorted.filter((log) =>
        log.completed && !log.skipped &&
        ((log.workoutItemId === item.id && (!log.loadUnit || log.loadUnit === item.loadType))
          || (log.exerciseId === item.exerciseId && log.loadUnit === item.loadType))
      );
      const scored = matches.filter((log) => log.loadUsed?.trim() || log.repsDone?.trim()
        || log.sets?.some((set) =>
          set.loadValue != null || set.repsDone != null || set.durationSeconds != null));
      const candidates = scored.length ? scored : matches;
      const chosen = candidates.find((log) => log.workoutItemId === item.id)
        || candidates.find((log) => log.session.workoutDayId === day.id)
        || candidates[0];
      if (!chosen) continue;
      result[item.id] = {
        loadUsed: chosen.loadUsed || null,
        repsDone: chosen.repsDone || null,
        perceivedDifficulty: chosen.perceivedDifficulty || null,
        notes: chosen.notes || null,
        date: chosen.session.date,
        sets: chosen.sets || [],
      };
    }
  }
  return result;
}

export function romeWeekStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const date = new Date(Date.UTC(values.year, values.month - 1, values.day));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date;
}
