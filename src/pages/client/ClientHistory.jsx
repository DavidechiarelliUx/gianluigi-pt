import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChevronDown, Dumbbell, Flame, Plus, Ruler, Save, TrendingUp, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";
import { calcWeeklyStreak, dayKey, isCountedSession, weekKey } from "../../lib/sessionStats";

const numberFormat = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const shortDateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
const longDateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });
const metricFields = [
  { key: "weightKg", label: "Peso", unit: "kg" },
  { key: "waistCm", label: "Vita", unit: "cm" },
  { key: "chestCm", label: "Torace", unit: "cm" },
  { key: "hipsCm", label: "Fianchi", unit: "cm" },
];
const emptyMetric = { weightKg: "", waistCm: "", chestCm: "", hipsCm: "", notes: "" };

const formatNumber = (value) => numberFormat.format(value);
const shortDate = (value) => shortDateFormat.format(new Date(value));
const longDate = (value) => longDateFormat.format(new Date(value));

function weeklyActivity(sessions, expectedDays) {
  const monday = new Date(weekKey(new Date()));
  return Array.from({ length: 4 }, (_, index) => {
    const start = new Date(monday);
    start.setDate(start.getDate() - (3 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inWeek = sessions.filter((session) => {
      const date = new Date(session.date);
      return date >= start && date < end;
    });
    const days = new Set(inWeek.map((session) => dayKey(session.date)));
    const targets = inWeek.map((session) => Number(session.planDays)).filter((value) => value > 0);
    return { start, count: days.size, target: targets.length ? Math.min(...targets) : expectedDays, current: index === 3 };
  });
}

function TrendChart({ points, unit, color, label }) {
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = Math.max((high - low) * 0.18, unit === "kg" ? 1 : 0.5);
  const min = low - pad;
  const max = high + pad;
  const xAt = (index) => 37 + (index / Math.max(1, points.length - 1)) * 272;
  const yAt = (value) => 91 - ((value - min) / (max - min)) * 73;
  const path = points.map((point, index) => (index ? "L " : "M ") + xAt(index) + " " + yAt(point.value)).join(" ");

  return (
    <div>
      <svg viewBox="0 0 320 106" className="h-32 w-full" role="img" aria-label={label}>
        {[0, 1, 2].map((index) => {
          const y = 18 + index * 36.5;
          return (
            <g key={index}>
              <line x1="37" x2="309" y1={y} y2={y} stroke="hsl(var(--border))" />
              <text x="32" y={y + 4} textAnchor="end" fill="hsl(var(--text-muted))" fontSize="11">
                {formatNumber(max - (index / 2) * (max - min))}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={point.date + index} cx={xAt(index)} cy={yAt(point.value)} r={index === points.length - 1 ? 4 : 2.5} fill={color} />
        ))}
      </svg>
      <div className="flex justify-between pl-9 pr-3 text-xs text-text-muted">
        <span>{shortDate(points[0].date)}</span>
        <span>{shortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

function WeeklyOverview({ sessions, expectedDays, streak, onStart }) {
  const weeks = weeklyActivity(sessions, expectedDays);
  const current = weeks[3];
  const scale = Math.max(1, ...weeks.map((week) => Math.max(week.count, week.target || 0)));

  return (
    <section className="-mx-6 border-y border-border bg-surface/70 px-6 py-5" aria-labelledby="weeks-title">
      <div>
        <h2 id="weeks-title" className="font-body text-base font-bold text-text">Costanza</h2>
        <p className="mt-1 text-sm text-text-muted">
          <span className="font-semibold text-text">{current.count} {current.count === 1 ? "allenamento" : "allenamenti"}</span> questa settimana
          {current.target > 0 ? " su " + current.target + " previsti" : ""}
        </p>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3" aria-label="Allenamenti nelle ultime quattro settimane">
        {weeks.map((week) => (
          <div key={week.start.toISOString()} className="min-w-0 text-center">
            <div className="flex h-24 flex-col justify-end">
              <span className="mb-1 text-sm font-semibold text-text">{week.count}</span>
              <div
                className={"mx-auto w-full max-w-12 rounded-t-sm " + (week.count ? (week.current ? "bg-chart-3" : "bg-accent/80") : "bg-surface-2")}
                style={{ height: Math.max(8, (week.count / scale) * 68) + "px" }}
              />
            </div>
            <div className={"border-t pt-2 text-xs " + (week.current ? "border-chart-3 font-semibold text-text" : "border-border text-text-muted")}>
              {week.current ? "Questa" : shortDate(week.start)}
            </div>
          </div>
        ))}
      </div>
      {sessions.length ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="text-text-muted">Ultimo allenamento: {longDate(sessions[0].date)}</p>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <Flame size={14} aria-hidden="true" /> {streak} {streak === 1 ? "settimana" : "settimane"} di fila
            </span>
          )}
        </div>
      ) : (
        <Button size="sm" onClick={onStart} className="mt-5">
          <Dumbbell size={16} aria-hidden="true" /> Vai alla scheda
        </Button>
      )}
    </section>
  );
}

function ExerciseRow({ exercise, open, onToggle }) {
  const history = exercise.history.filter((entry) => entry.completed);
  const loads = history.filter((entry) => Number.isFinite(entry.loadNumber));
  const first = loads[0];
  const latest = loads[loads.length - 1];
  const latestEntry = history.at(-1);
  const best = loads.length ? Math.max(...loads.map((entry) => entry.loadNumber)) : null;
  const change = loads.length >= 2 ? latest.loadNumber - first.loadNumber : null;
  const chartPoints = loads.slice(-12).map((entry) => ({ date: entry.date, value: entry.loadNumber }));

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="flex min-h-16 w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-text">{exercise.name}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {exercise.completedSessions} {exercise.completedSessions === 1 ? "allenamento" : "allenamenti"}
            {exercise.muscleGroup ? " · " + exercise.muscleGroup : ""}
          </p>
        </div>
        <div className="max-w-28 shrink-0 text-right">
          <p className="truncate text-sm font-bold text-text">{latest ? formatNumber(latest.loadNumber) + " kg" : latestEntry?.loadUsed || "—"}</p>
          <p className={"mt-0.5 text-xs " + (change > 0 ? "text-accent" : "text-text-muted")}>
            {change == null ? (latest ? "primo carico" : "ultima registrazione") : (change > 0 ? "+" : "") + formatNumber(change) + " kg dall'inizio"}
          </p>
        </div>
        <ChevronDown size={18} className={"shrink-0 text-text-muted transition-transform " + (open ? "rotate-180" : "")} aria-hidden="true" />
      </button>
      {open && (
        <div className="pb-5 pt-1">
          {chartPoints.length >= 2 ? (
            <>
              <p className="mb-1 text-xs font-semibold text-text-muted">Carico registrato {loads.length > 12 ? "· ultimi 12 allenamenti" : "nel tempo"}</p>
              <TrendChart
                points={chartPoints}
                unit="kg"
                color="hsl(var(--chart-1))"
                label={"Carico di " + exercise.name + ": da " + formatNumber(chartPoints[0].value) + " a " + formatNumber(chartPoints.at(-1).value) + " kg"}
              />
            </>
          ) : (
            <p className="py-3 text-sm text-text-muted">Servono almeno due carichi registrati per vedere l'andamento.</p>
          )}
          {latest && (
            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
              {[
                { label: "Primo", value: first.loadNumber },
                { label: "Ultimo", value: latest.loadNumber },
                { label: "Migliore", value: best },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-text-muted">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-text">{formatNumber(value)} kg</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs font-semibold text-text-muted">Ultime registrazioni</p>
          <div className="mt-1 divide-y divide-border">
            {history.slice(-4).reverse().map((entry, index) => (
              <div key={entry.date + index} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span className="shrink-0 text-text-muted">{shortDate(entry.date)}</span>
                <span className="min-w-0 break-words text-right text-text">
                  {entry.loadUsed || (entry.loadNumber != null ? formatNumber(entry.loadNumber) + " kg" : "Eseguito")}
                  {entry.repsDone ? " · " + entry.repsDone + " rip." : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, dayLabel }) {
  const [open, setOpen] = useState(false);
  const completed = session.itemLogs?.filter((log) => log.completed).length || 0;
  const skipped = session.itemLogs?.filter((log) => log.skipped).length || 0;
  const hasDetails = Boolean(session.feedbackNotes || session.feedbackDifficulty);
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-chart-3/10 text-chart-3">
        <CalendarCheck size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text">{dayLabel}</span>
        <span className="block text-xs text-text-muted">
          {shortDate(session.date)} · {completed} {completed === 1 ? "esercizio" : "esercizi"}
          {skipped ? " · " + skipped + " saltati" : ""}
        </span>
      </span>
      {hasDetails && <ChevronDown size={18} className={"shrink-0 text-text-muted transition-transform " + (open ? "rotate-180" : "")} aria-hidden="true" />}
    </>
  );
  return (
    <div className="border-b border-border last:border-b-0">
      {hasDetails ? (
        <button type="button" className="flex min-h-16 w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {content}
        </button>
      ) : (
        <div className="flex min-h-16 items-center gap-3 py-2">{content}</div>
      )}
      {open && hasDetails && (
        <div className="pb-4 pl-12 text-sm text-text-muted">
          {session.feedbackDifficulty && <p>Sforzo percepito: {session.feedbackDifficulty}/10</p>}
          {session.feedbackNotes && <p className="mt-1 whitespace-pre-wrap text-text">{session.feedbackNotes}</p>}
        </div>
      )}
    </div>
  );
}

export default function ClientHistory() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedDayId, setSelectedDayId] = useState("");
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [metricField, setMetricField] = useState("weightKg");
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [metricForm, setMetricForm] = useState(emptyMetric);
  const [metricError, setMetricError] = useState("");
  const [mode, setMode] = useState("allenamento");

  const workoutQuery = useQuery({ queryKey: ["client", "active-workout"], queryFn: () => apiFetch("/api/client/active-workout") });
  const progressQuery = useQuery({ queryKey: ["client", "progress"], queryFn: () => apiFetch("/api/client/progress") });
  const metricsQuery = useQuery({ queryKey: ["client", "metrics"], queryFn: () => apiFetch("/api/client/metrics") });
  const overviewQuery = useQuery({ queryKey: ["client", "overview"], queryFn: () => apiFetch("/api/client/overview") });

  const sessions = useMemo(() => (workoutQuery.data?.sessions || []).filter(isCountedSession), [workoutQuery.data?.sessions]);
  const workoutDays = useMemo(() => workoutQuery.data?.workout?.days || [], [workoutQuery.data?.workout?.days]);
  const allExercises = useMemo(() => {
    const list = (progressQuery.data?.exercises || []).filter((exercise) => exercise.completedSessions > 0);
    return [...list].sort((a, b) => {
      const lastA = a.history.filter((entry) => entry.completed).at(-1)?.date || "";
      const lastB = b.history.filter((entry) => entry.completed).at(-1)?.date || "";
      return new Date(lastB) - new Date(lastA);
    });
  }, [progressQuery.data?.exercises]);
  const exercises = useMemo(() => {
    if (!selectedDayId) return allExercises;
    const day = workoutDays.find((entry) => entry.id === selectedDayId);
    if (!day) return allExercises;
    const names = new Set(day.items.map((item) => item.exercise?.name));
    return allExercises.filter((exercise) => names.has(exercise.name));
  }, [allExercises, selectedDayId, workoutDays]);
  const visibleExercises = showAllExercises ? exercises : exercises.slice(0, 5);
  const metrics = metricsQuery.data?.metrics || [];
  const streak = useMemo(() => calcWeeklyStreak(sessions, workoutDays.length || 1), [sessions, workoutDays]);
  const chartableMetrics = metricFields.filter((field) => metrics.filter((metric) => Number.isFinite(metric[field.key])).length >= 2);
  const activeMetricField = chartableMetrics.find((field) => field.key === metricField) || chartableMetrics[0];
  const metricPoints = activeMetricField
    ? metrics.filter((metric) => Number.isFinite(metric[activeMetricField.key])).slice().reverse().map((metric) => ({ date: metric.date, value: metric[activeMetricField.key] }))
    : [];
  const currentWeek = weeklyActivity(sessions, workoutDays.length)[3];
  const improvingExercise = allExercises.filter((exercise) => Number.isFinite(exercise.improvement) && exercise.improvement > 0).sort((a, b) => b.improvement - a.improvement)[0];

  const saveMetric = useMutation({
    mutationFn: (payload) => apiFetch("/api/client/metrics", { method: "POST", body: payload }),
    onSuccess: async () => {
      setMetricForm(emptyMetric);
      setMetricError("");
      setCheckinOpen(false);
      await qc.invalidateQueries({ queryKey: ["client", "metrics"] });
      toast({ type: "success", title: "Misure salvate" });
    },
    onError: (error) => toast({ type: "error", title: "Salvataggio fallito", description: error.message }),
  });

  const handleMetricSubmit = (event) => {
    event.preventDefault();
    const payload = { notes: metricForm.notes.trim() };
    let filled = 0;
    for (const field of metricFields) {
      const raw = metricForm[field.key].trim();
      if (!raw) continue;
      const value = Number(raw.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) {
        setMetricError("Inserisci un valore valido per " + field.label.toLowerCase() + ".");
        return;
      }
      payload[field.key] = value;
      filled += 1;
    }
    if (!filled) {
      setMetricError("Inserisci almeno una misura.");
      return;
    }
    setMetricError("");
    saveMetric.mutate(payload);
  };

  return (
    <div className="client-progress space-y-8 pb-8">
      <header className="client-screen-header">
        <div><p>Il tuo percorso</p><h1>Progressi</h1></div>
      </header>
      <div className="client-progress-tabs" role="tablist" aria-label="Tipo di progresso"><button role="tab" aria-selected={mode === "allenamento"} className={mode === "allenamento" ? "active" : ""} onClick={() => setMode("allenamento")}>Allenamento</button><button role="tab" aria-selected={mode === "misure"} className={mode === "misure" ? "active" : ""} onClick={() => setMode("misure")}>Misure</button></div>
      {(overviewQuery.data?.goal || mode === "allenamento") && <section className="client-progress-insights" aria-label="Il tuo punto della situazione">
        {overviewQuery.data?.goal && <p><strong>Il tuo obiettivo</strong>{overviewQuery.data.goal}</p>}
        {mode === "allenamento" && !workoutQuery.isLoading && !workoutQuery.isError && <p><strong>Questa settimana</strong>{currentWeek.target ? currentWeek.count >= currentWeek.target ? `Hai completato ${currentWeek.count} sedute: obiettivo settimanale raggiunto.` : `Hai completato ${currentWeek.count} sedute su ${currentWeek.target}. ${currentWeek.target - currentWeek.count === 1 ? "Ne manca una" : `Ne mancano ${currentWeek.target - currentWeek.count}`} per il tuo ritmo previsto.` : `${currentWeek.count} sedute registrate.`}</p>}
        {mode === "allenamento" && improvingExercise && <p><strong>Un progresso concreto</strong>{improvingExercise.name}: +{formatNumber(improvingExercise.improvement)} kg rispetto al primo carico registrato.</p>}
      </section>}

      {mode === "allenamento" && <>
      {workoutQuery.isLoading ? (
        <div className="-mx-6 h-52 animate-pulse bg-surface px-6" aria-label="Caricamento allenamenti" />
      ) : workoutQuery.isError ? (
        <EmptyState icon={CalendarCheck} title="Allenamenti non disponibili" description="Non siamo riusciti a caricare lo storico. Riprova." action={<Button size="sm" onClick={() => workoutQuery.refetch()}>Riprova</Button>} />
      ) : (
        <WeeklyOverview sessions={sessions} expectedDays={workoutDays.length} streak={streak} onStart={() => navigate("/area-cliente/allenamento")} />
      )}

      <section aria-labelledby="strength-title">
        <div className="flex items-center gap-2">
          <TrendingUp size={19} className="text-accent" aria-hidden="true" />
          <h2 id="strength-title" className="font-body text-base font-bold text-text">Progressi per esercizio</h2>
        </div>
        {workoutDays.length > 1 && (
          <label className="mt-4 flex items-center justify-between gap-3 text-sm text-text-muted">
            Giorno della scheda
            <select
              value={selectedDayId}
              onChange={(event) => {
                setSelectedDayId(event.target.value);
                setExpandedExercise(null);
                setShowAllExercises(false);
              }}
              className="h-10 min-w-0 max-w-[65%] rounded-sm border border-border bg-surface-2 px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">Tutti</option>
              {workoutDays.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
            </select>
          </label>
        )}
        {progressQuery.isLoading ? (
          <div className="mt-4 space-y-2" aria-label="Caricamento progressi">
            {[0, 1, 2].map((index) => <div key={index} className="h-16 animate-pulse rounded-sm bg-surface" />)}
          </div>
        ) : progressQuery.isError ? (
          <EmptyState className="mt-4" icon={TrendingUp} title="Progressi non disponibili" description="Non siamo riusciti a caricare i carichi registrati." action={<Button size="sm" onClick={() => progressQuery.refetch()}>Riprova</Button>} />
        ) : exercises.length ? (
          <>
            <div className="mt-3 border-t border-border">
              {visibleExercises.map((exercise) => (
                <ExerciseRow key={exercise.name} exercise={exercise} open={expandedExercise === exercise.name} onToggle={() => setExpandedExercise((current) => current === exercise.name ? null : exercise.name)} />
              ))}
            </div>
            {exercises.length > 5 && (
              <button type="button" onClick={() => setShowAllExercises((value) => !value)} className="mt-3 min-h-11 text-sm font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {showAllExercises ? "Mostra meno" : "Mostra tutti (" + exercises.length + ")"}
              </button>
            )}
          </>
        ) : (
          <EmptyState className="mt-4" icon={Dumbbell} title={selectedDayId ? "Nessun esercizio registrato" : "Gli esercizi compariranno qui"} description={selectedDayId ? "Non ci sono ancora allenamenti per questo giorno." : "Dopo il primo allenamento vedrai gli esercizi eseguiti e i dati registrati."} />
        )}
      </section>
      </>}

      {mode === "misure" && <section className="-mx-6 border-y border-border bg-surface/40 px-6 py-5" aria-labelledby="metrics-title">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Ruler size={19} className="text-chart-4" aria-hidden="true" />
            <h2 id="metrics-title" className="font-body text-base font-bold text-text">Misure</h2>
          </div>
          <button type="button" onClick={() => setCheckinOpen((value) => !value)} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-expanded={checkinOpen}>
            {checkinOpen ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {checkinOpen ? "Chiudi" : "Aggiungi"}
          </button>
        </div>
        {metricsQuery.isLoading ? (
          <div className="mt-4 h-28 animate-pulse rounded-sm bg-surface-2" aria-label="Caricamento misure" />
        ) : metricsQuery.isError ? (
          <EmptyState className="mt-4" icon={Ruler} title="Misure non disponibili" action={<Button size="sm" onClick={() => metricsQuery.refetch()}>Riprova</Button>} />
        ) : metrics.length ? (
          <>
            <p className="mt-1 text-xs text-text-muted">Ultimo check-in: {longDate(metrics[0].date)}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
              {metricFields.map((field) => {
                const last = metrics.find((metric) => Number.isFinite(metric[field.key]));
                return (
                  <div key={field.key} className="border-t border-border pt-2">
                    <p className="text-xs text-text-muted">{field.label}</p>
                    <p className="mt-0.5 text-lg font-semibold text-text">{last ? formatNumber(last[field.key]) + " " + field.unit : "—"}</p>
                    {last && last.id !== metrics[0].id && <p className="text-xs text-text-muted">{shortDate(last.date)}</p>}
                  </div>
                );
              })}
            </div>
            {activeMetricField && (
              <div className="mt-6 border-t border-border pt-4">
                <label className="flex items-center justify-between gap-3 text-sm text-text-muted">
                  Andamento
                  <select value={activeMetricField.key} onChange={(event) => setMetricField(event.target.value)} className="h-10 rounded-sm border border-border bg-surface-2 px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    {chartableMetrics.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                  </select>
                </label>
                <div className="mt-3">
                  <TrendChart points={metricPoints} unit={activeMetricField.unit} color="hsl(var(--chart-4))" label={activeMetricField.label + ": da " + formatNumber(metricPoints[0].value) + " a " + formatNumber(metricPoints.at(-1).value) + " " + activeMetricField.unit} />
                </div>
              </div>
            )}
            {metrics[0].notes && <p className="mt-4 border-t border-border pt-3 text-sm text-text-muted">{metrics[0].notes}</p>}
          </>
        ) : (
          <p className="mt-3 text-sm text-text-muted">Non hai ancora registrato misure.</p>
        )}

        {checkinOpen && (
          <form onSubmit={handleMetricSubmit} className="mt-5 space-y-4 border-t border-border pt-5">
            <div className="grid grid-cols-2 gap-3">
              {metricFields.map((field) => (
                <label key={field.key} className="block text-sm text-text-muted">
                  {field.label} ({field.unit})
                  <Input
                    className="mt-1.5"
                    inputMode="decimal"
                    value={metricForm[field.key]}
                    onChange={(event) => {
                      setMetricForm((form) => ({ ...form, [field.key]: event.target.value }));
                      setMetricError("");
                    }}
                    placeholder={field.unit === "kg" ? "es. 72,5" : "es. 80"}
                  />
                </label>
              ))}
            </div>
            <label className="block text-sm text-text-muted">
              Note (facoltative)
              <Textarea className="mt-1.5" rows={2} value={metricForm.notes} onChange={(event) => setMetricForm((form) => ({ ...form, notes: event.target.value }))} placeholder="Come ti senti oggi?" />
            </label>
            {metricError && <p role="alert" className="text-sm text-danger">{metricError}</p>}
            <Button type="submit" size="sm" disabled={saveMetric.isPending}>
              <Save size={16} aria-hidden="true" /> {saveMetric.isPending ? "Salvataggio..." : "Salva misure"}
            </Button>
          </form>
        )}
      </section>}

      {mode === "allenamento" && !workoutQuery.isError && sessions.length > 0 && (
        <section aria-labelledby="sessions-title">
          <h2 id="sessions-title" className="font-body text-base font-bold text-text">Allenamenti recenti</h2>
          <div className="mt-3 border-t border-border">
            {(showAllSessions ? sessions : sessions.slice(0, 5)).map((session) => (
              <SessionRow key={session.id} session={session} dayLabel={workoutDays.find((day) => day.id === session.workoutDayId)?.label || "Allenamento"} />
            ))}
          </div>
          {sessions.length > 5 && (
            <button type="button" onClick={() => setShowAllSessions((value) => !value)} className="mt-3 min-h-11 text-sm font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {showAllSessions ? "Mostra meno" : "Mostra tutti (" + sessions.length + ")"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
