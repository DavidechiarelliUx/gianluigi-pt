const COMPOUND_RE = /^\s*(\d+)\s*[x×]\s*(.+?)\s*$/i;

export function normalizeWorkoutItemTarget(item = {}) {
  const rawReps = String(item.reps || "8-10").trim();
  const compound = rawReps.match(COMPOUND_RE);
  const sets = compound ? Number(compound[1]) || 1 : Number(item.sets) || 3;
  const reps = compound ? compound[2].trim() || "8-10" : rawReps || "8-10";
  return {
    sets,
    reps,
    restSeconds: item.restSeconds === "" || item.restSeconds == null ? null : Number(item.restSeconds) || null,
    notes: item.notes ? String(item.notes).trim() : null,
  };
}
