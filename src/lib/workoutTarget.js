const MINUTE_RE = /(?:^|\s)(min|mins|minuto|minuti|\')(?:\s|$)/i;
const SECOND_RE = /(?:^|\s)(sec|secs|secondo|secondi|s|")(?=\s|$)/i;
const COMPOUND_RE = /^\s*(\d+)\s*[x×]\s*(.+?)\s*$/i;
const NUMBER_RE = /^\s*\d+(?:[.,]\d+)?\s*$/;

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isCardioExercise(name = "") {
  const text = normalize(name);
  return [
    "cardio",
    "cyclette",
    "bike",
    "top cardio",
    "tapis",
    "ellittica",
    "vogatore",
    "rowing",
    "battle ropes",
    "salto con la corda",
    "jump rope",
  ].some((word) => text.includes(word));
}

export function isTimeHoldExercise(name = "") {
  const text = normalize(name);
  return ["plank", "side plank", "wall sit", "hollow hold", "barchetta"].some((word) => text.includes(word));
}

export function defaultTargetForExercise(name = "") {
  if (isCardioExercise(name)) return { sets: 1, reps: "10 min", restSeconds: "" };
  if (isTimeHoldExercise(name)) return { sets: 3, reps: "45 sec", restSeconds: 60 };
  return null;
}

export function isDefaultStrengthTarget(item = {}) {
  const sets = String(item.sets ?? "").trim();
  const reps = String(item.reps ?? "").trim();
  return (!sets || sets === "3") && (!reps || reps === "8-10");
}

function splitCompoundTarget(sets, reps) {
  const raw = String(reps ?? "").trim();
  const match = raw.match(COMPOUND_RE);
  if (!match) return { setsNumber: Number.parseInt(String(sets ?? 1), 10) || 1, repsText: raw || "8-10" };
  return { setsNumber: Number.parseInt(match[1], 10) || 1, repsText: match[2].trim() || "8-10" };
}

function cleanTimeText(value) {
  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/minuti?/i, "min")
    .replace(/secondi?/i, "sec")
    .replace(/'/g, " min")
    .replace(/"/g, " sec")
    .replace(/\s+/g, " ")
    .trim();
}

function timeKind(repsText, exerciseName) {
  if (MINUTE_RE.test(` ${repsText} `)) return "minutes";
  if (SECOND_RE.test(` ${repsText} `)) return "seconds";
  if (NUMBER_RE.test(repsText) && isCardioExercise(exerciseName)) return "minutes";
  if (NUMBER_RE.test(repsText) && isTimeHoldExercise(exerciseName)) return "seconds";
  return null;
}

function timeLabel(repsText, kind, long = false) {
  const numeric = String(repsText).trim().replace(/[^0-9.,]/g, "").replace(",", ".");
  const value = numeric || String(repsText).trim();
  if (kind === "minutes") return long ? `${value} minuti` : `${value} min`;
  if (kind === "seconds") return `${value} sec`;
  return cleanTimeText(repsText);
}

export function formatWorkoutTarget(item = {}) {
  const exerciseName = item.exerciseName || item.exercise?.name || item.name || "";
  const { setsNumber, repsText } = splitCompoundTarget(item.sets, item.reps);
  const kind = timeKind(repsText, exerciseName);
  const isTime = !!kind;
  const valueShort = isTime ? timeLabel(repsText, kind, false) : `${repsText} rip`;
  const valueLong = isTime ? timeLabel(repsText, kind, true) : `${repsText} ripetizioni`;
  const setWord = isTime ? "blocco" : "serie";
  const setWordPlural = isTime ? "blocchi" : "serie";

  return {
    type: isTime ? "time" : "reps",
    sets: setsNumber,
    valueShort,
    valueLong,
    shortLabel: setsNumber > 1 ? `${setsNumber} x ${valueShort}` : valueShort,
    fullLabel: setsNumber > 1 ? `${setsNumber} ${setWordPlural} da ${valueLong}` : valueLong,
    actionLabel: valueLong,
    unitLabel: isTime ? "Durata" : "Ripetizioni",
    setWord,
    setWordPlural,
  };
}
