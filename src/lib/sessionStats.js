// Statistiche sessioni condivise tra Home, Progressi e Profilo.
// Un'unica definizione di "sessione svolta" e di "streak", cosi' le schermate
// non mostrano piu' numeri diversi per la stessa cosa.

const WEEK_MS = 7 * 86400000;

/** Mezzanotte del giorno di `value`, come timestamp. */
export function dayKey(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Lunedi' della settimana di `value`, come timestamp. */
export function weekKey(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lun=0 … dom=6
  return d.getTime();
}

/**
 * Una sessione conta se e' stata chiusa con almeno un esercizio eseguito.
 * Gli esercizi saltati vengono salvati con `completed: false`, quindi
 * pretendere che *tutti* i log siano completed escluderebbe ogni sessione
 * in cui il cliente ha saltato anche un solo esercizio.
 */
export function isCountedSession(session) {
  return (session?.itemLogs || []).some((log) => log.completed);
}

/** Giorni distinti di allenamento, raggruppati per settimana. */
function trainedDaysByWeek(sessions) {
  const byWeek = new Map();
  for (const session of sessions) {
    const week = weekKey(session.date);
    if (!byWeek.has(week)) byWeek.set(week, new Set());
    byWeek.get(week).add(dayKey(session.date));
  }
  return byWeek;
}

/**
 * Obiettivo settimanale in vigore in ogni settimana, letto da `planDays` delle
 * sessioni di quella settimana. Senza questo, passare da una scheda da 3 giorni
 * a una da 4 renderebbe "incomplete" a posteriori tutte le settimane gia'
 * chiuse, azzerando uno streak guadagnato sul campo.
 *
 * Se la scheda cambia a meta' settimana vale l'obiettivo piu' basso: il cliente
 * non puo' essere penalizzato per una sostituzione decisa dal trainer.
 */
function weeklyTargets(sessions) {
  const targets = new Map();
  for (const session of sessions) {
    const planDays = Number(session.planDays);
    if (!Number.isFinite(planDays) || planDays < 1) continue;
    const week = weekKey(session.date);
    const current = targets.get(week);
    if (current === undefined || planDays < current) targets.set(week, planDays);
  }
  return targets;
}

/**
 * Settimane consecutive in cui sono stati allenati tutti i giorni previsti
 * dalla scheda di quella settimana. La settimana in corso non puo' rompere lo
 * streak: se non e' ancora completa il conteggio riparte da quella precedente.
 *
 * `expectedDays` e' il fallback per le settimane senza `planDays` (dati vecchi):
 * di norma i giorni della scheda attiva.
 */
export function calcWeeklyStreak(sessions, expectedDays = 1) {
  if (!sessions?.length) return 0;
  const fallback = Math.max(1, Number(expectedDays) || 1);
  const byWeek = trainedDaysByWeek(sessions);
  const targets = weeklyTargets(sessions);
  const isComplete = (week) => {
    const trained = byWeek.get(week)?.size || 0;
    return trained > 0 && trained >= (targets.get(week) ?? fallback);
  };

  const currentWeek = weekKey(new Date());
  let streak = isComplete(currentWeek) ? 1 : 0;
  for (let week = currentWeek - WEEK_MS; isComplete(week); week -= WEEK_MS) {
    streak++;
  }
  return streak;
}
