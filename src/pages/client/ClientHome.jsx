import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  ChevronRight,
  Dumbbell,
  Flame,
  ListChecks,
  TrendingUp,
  Video,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/app";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";

// ─── Utilities ───────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Buonanotte";
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function calcStreak(sessions) {
  if (!sessions.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [
    ...new Set(
      sessions.map((s) => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    ),
  ].sort((a, b) => b - a);

  let streak = 0;
  for (const ts of days) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - streak);
    if (ts === expected.getTime()) streak++;
    else break;
  }
  return streak;
}

function weekDays(sessions) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);

  const trained = new Set(
    sessions.map((s) => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: ["L", "M", "M", "G", "V", "S", "D"][i],
      ts: d.getTime(),
      isToday: d.getTime() === today.getTime(),
      past: d.getTime() <= today.getTime(),
      trained: trained.has(d.getTime()),
    };
  });
}

// ─── SVG Progress Ring ────────────────────────────────────────────────────────

function ProgressRing({ pct = 0, size = 120, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <svg width={size} height={size} aria-hidden>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#1e1e1e" strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#39FF14"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: "drop-shadow(0 0 6px rgba(57,255,20,0.5))" }}
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.fullName?.split(" ")[0] || "Atleta";

  const workoutQuery = useQuery({
    queryKey: ["client", "active-workout"],
    queryFn: () => apiFetch("/api/client/active-workout"),
  });
  const liveQuery = useQuery({
    queryKey: ["live", "sessions"],
    queryFn: () => apiFetch("/api/live/sessions"),
    retry: false,
  });

  const workout = workoutQuery.data?.workout;
  const sessions = useMemo(
    () => workoutQuery.data?.sessions || [],
    [workoutQuery.data?.sessions]
  );
  const liveSessions = useMemo(
    () =>
      (liveQuery.data?.sessions || []).filter(
        (s) => s.status === "scheduled" || s.status === "live"
      ),
    [liveQuery.data?.sessions]
  );
  const nextLive = liveSessions[0];

  const streak = useMemo(() => calcStreak(sessions), [sessions]);
  const week = useMemo(() => weekDays(sessions), [sessions]);
  const totalSessions = sessions.length;
  const lastSession = sessions[0];
  const lastDone = lastSession?.itemLogs?.filter((l) => l.completed).length ?? 0;
  const lastTotal = lastSession?.itemLogs?.length ?? 0;

  // Oggi: ci sono sessioni di oggi?
  const todayTs = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
  const trainedToday = sessions.some((s) => {
    const d = new Date(s.date); d.setHours(0,0,0,0);
    return d.getTime() === todayTs;
  });

  // Progress oggi: prima scheda disponibile, conteggio items
  const firstDay = workout?.days?.[0];
  const totalItems = firstDay?.items?.length ?? 0;

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.07, ease: "easeOut" } }),
  };

  if (workoutQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-2 text-center">
          <Dumbbell size={32} className="mx-auto animate-pulse text-accent" />
          <p className="text-sm text-text-muted">Carico la tua area…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* ── Greeting ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
        <p className="text-sm text-text-muted">{greeting()},</p>
        <h1 className="font-display text-3xl font-black uppercase leading-none">
          {firstName}{" "}
          <span className="text-accent">💪</span>
        </h1>
      </motion.div>

      {/* ── Stats strip ── */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show" custom={1}
        className="grid grid-cols-3 gap-2"
      >
        {[
          { icon: Flame, value: streak, label: "streak" },
          { icon: Dumbbell, value: totalSessions, label: "sessioni" },
          { icon: TrendingUp, value: workout?.days?.length ?? "—", label: "giorni piano" },
        ].map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-xl border border-border bg-surface py-3"
          >
            <Icon size={16} className="text-accent" />
            <span className="mt-1 font-display text-2xl font-black text-text">{value}</span>
            <span className="text-[9px] uppercase tracking-wide text-text-muted">{label}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Today's workout card ── */}
      {workout ? (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}>
          <Card
            className="relative overflow-hidden border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-surface"
          >
            {/* glow */}
            <div className="pointer-events-none absolute -top-10 right-0 h-32 w-32 rounded-full bg-accent/20 blur-3xl" aria-hidden />

            <div className="flex items-center gap-5">
              {/* Ring */}
              <div className="relative shrink-0">
                <ProgressRing pct={trainedToday ? 100 : 0} size={90} stroke={8} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-xl font-black text-accent">
                    {trainedToday ? "✓" : `${totalItems}`}
                  </span>
                  <span className="text-[8px] uppercase tracking-wide text-text-muted">
                    {trainedToday ? "fatto" : "esercizi"}
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                  {trainedToday ? "Completato oggi 🎉" : "Allenamento oggi"}
                </p>
                <h2 className="mt-0.5 font-display text-lg font-extrabold uppercase leading-tight">
                  {firstDay?.label ?? workout.title}
                </h2>
                <p className="mt-1 text-sm text-text-muted line-clamp-1">
                  {trainedToday ? "Ottimo lavoro! Guarda il riepilogo." : workout.title}
                </p>
              </div>
            </div>

            <Button
              className="mt-4 w-full"
              onClick={() => navigate(trainedToday ? "/area-cliente/storico" : "/area-cliente/allenamento")}
            >
              {trainedToday ? (
                <><ListChecks size={18} /> Riepilogo di oggi</>
              ) : (
                <><Zap size={18} /> Inizia allenamento</>
              )}
            </Button>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}>
          <EmptyState
            icon={Dumbbell}
            title="Nessuna scheda attiva"
            description="Gianluigi ti assegnerà presto la tua scheda."
          />
        </motion.div>
      )}

      {/* ── Weekly calendar ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Settimana in corso
          </p>
          <div className="grid grid-cols-7 gap-1">
            {week.map((d) => (
              <div key={d.ts} className="flex flex-col items-center gap-1">
                <span
                  className="text-[9px] font-medium uppercase"
                  style={{ color: d.isToday ? "#39FF14" : "#555" }}
                >
                  {d.label}
                </span>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold transition-all"
                  style={{
                    background: d.trained
                      ? "#39FF14"
                      : d.isToday
                      ? "rgba(57,255,20,0.12)"
                      : "transparent",
                    border: d.isToday && !d.trained
                      ? "1.5px solid rgba(57,255,20,0.5)"
                      : d.trained
                      ? "none"
                      : "1.5px solid #222",
                    color: d.trained ? "#0a0a0a" : d.past ? "#555" : "#333",
                  }}
                >
                  {d.trained ? "✓" : new Date(d.ts).getDate()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Next live session ── */}
      {nextLive && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
          <button
            className="w-full text-left"
            onClick={() => navigate("/area-cliente/live")}
          >
            <Card className="border-accent/20 transition-colors hover:border-accent/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <Video size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                      Prossima sessione live
                    </p>
                    <p className="font-display text-sm font-bold uppercase">
                      {nextLive.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(nextLive.scheduledAt).toLocaleString("it-IT", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {nextLive.durationMin} min
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-text-muted" />
              </div>
            </Card>
          </button>
        </motion.div>
      )}

      {/* ── Last session recap ── */}
      {lastSession && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
          <button
            className="w-full text-left"
            onClick={() => navigate("/area-cliente/storico")}
          >
            <Card className="border-border transition-colors hover:border-accent/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2">
                    <CalendarCheck size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      Ultima sessione
                    </p>
                    <p className="font-display text-sm font-bold uppercase">
                      {new Date(lastSession.date).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "long",
                      })}
                    </p>
                    <p className="text-xs text-text-muted">
                      {lastDone}/{lastTotal} esercizi completati
                      {lastSession.feedbackNotes && ` · "${lastSession.feedbackNotes.slice(0, 30)}…"`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="font-display text-xl font-black"
                    style={{ color: "#39FF14" }}
                  >
                    {lastTotal ? Math.round((lastDone / lastTotal) * 100) : 0}%
                  </span>
                  <ChevronRight size={16} className="text-text-muted" />
                </div>
              </div>
            </Card>
          </button>
        </motion.div>
      )}

      {/* ── Se no sessioni ── */}
      {!sessions.length && workout && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
          <Card className="border-border bg-surface/50 text-center">
            <Flame className="mx-auto mb-3 text-accent/50" size={32} />
            <p className="font-display text-base font-bold uppercase">Prima sessione</p>
            <p className="mt-1 text-sm text-text-muted">
              Inizia oggi e costruisci la tua streak.
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
