import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck, ChevronDown, Flame, Ruler, Save, TrendingUp, Zap } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyMetric = { weightKg: "", waistCm: "", chestCm: "", hipsCm: "", photoUrl: "", notes: "" };

function shortDate(value) {
  return new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function daysAgo(value) {
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (diff === 0) return "oggi";
  if (diff === 1) return "ieri";
  return `${diff}gg fa`;
}

function weekKey(date) {
  const d = new Date(date);
  const offset = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const mon = new Date(d);
  mon.setDate(d.getDate() - offset);
  mon.setHours(0, 0, 0, 0);
  return mon.getTime();
}

function calcStreak(sessions) {
  if (!sessions.length) return 0;
  const weeks = [...new Set(sessions.map((s) => weekKey(s.date)))].sort((a, b) => b - a);
  const thisWeek = weekKey(new Date());
  const lastWeek = thisWeek - 7 * 86400000;
  if (weeks[0] !== thisWeek && weeks[0] !== lastWeek) return 0;
  let streak = 1;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i - 1] - weeks[i] === 7 * 86400000) streak++;
    else break;
  }
  return streak;
}

const MG_COLORS = {
  petto: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  schiena: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  gambe: { bg: "rgba(234,179,8,0.15)", color: "#facc15" },
  spalle: { bg: "rgba(168,85,247,0.15)", color: "#c084fc" },
  braccia: { bg: "rgba(249,115,22,0.15)", color: "#fb923c" },
  core: { bg: "rgba(20,184,166,0.15)", color: "#2dd4bf" },
  cardio: { bg: "rgba(236,72,153,0.15)", color: "#f472b6" },
};
function mgColor(mg) {
  return MG_COLORS[String(mg || "").toLowerCase()] || { bg: "rgba(255,255,255,0.07)", color: "#888" };
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ history }) {
  const pts = history.filter((h) => h.loadNumber != null);
  if (pts.length < 2) return null;

  const W = 300;
  const H = 36;
  const PAD = 3;
  const minY = Math.min(...pts.map((p) => p.loadNumber));
  const maxY = Math.max(...pts.map((p) => p.loadNumber));
  const rangeY = maxY - minY || 1;

  const coords = pts.map((p, i) => ({
    x: PAD + (i / (pts.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((p.loadNumber - minY) / rangeY) * (H - PAD * 2),
  }));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#39FF14" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#39FF14" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${coords[0].x},${H} ${polyline} ${coords.at(-1).x},${H}`}
        fill="url(#spark-fill)"
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="#39FF14"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={i === coords.length - 1 ? 3.5 : 2}
          fill={i === coords.length - 1 ? "#39FF14" : "#1a1a1a"}
          stroke="#39FF14"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

function KpiTile({ icon: Icon, label, value, sub, color = "#39FF14" }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-3"
      style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#555" }}>
        <Icon size={11} /> {label}
      </div>
      <div className="font-display text-2xl font-black leading-none" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[10px] leading-tight" style={{ color: "#555" }}>{sub}</div>}
    </div>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({ exercise }) {
  const { bg, color } = mgColor(exercise.muscleGroup);
  const loadPts = exercise.history.filter((h) => h.loadNumber != null);
  const firstLoad = loadPts[0]?.loadUsed ?? null;
  const lastLoad  = loadPts.at(-1)?.loadUsed ?? exercise.history.at(-1)?.loadUsed ?? null;
  const lastDate  = exercise.history.at(-1)?.date ?? null;
  const avgRpe    = (() => {
    const rpes = exercise.history.map((h) => h.rpe).filter(Boolean);
    return rpes.length ? (rpes.reduce((s, v) => s + v, 0) / rpes.length).toFixed(1) : null;
  })();

  const imp = exercise.improvement;
  const impLabel = imp != null ? `${imp >= 0 ? "+" : ""}${imp} kg` : null;
  const impColor = imp == null ? null : imp >= 0 ? "#39FF14" : "#f87171";

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-black uppercase leading-tight text-white">
            {exercise.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {exercise.muscleGroup && (
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ background: bg, color }}
              >
                {exercise.muscleGroup}
              </span>
            )}
            <span className="text-[10px]" style={{ color: "#444" }}>
              {exercise.completedSessions} sessioni
              {lastDate ? ` · ${daysAgo(lastDate)}` : ""}
            </span>
          </div>
        </div>
        {impLabel && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black"
            style={{ background: `${impColor}18`, color: impColor, border: `1px solid ${impColor}40` }}
          >
            {impLabel}
          </span>
        )}
      </div>

      {/* Milestones */}
      {(firstLoad || lastLoad || exercise.bestLoad) && (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "Inizio", value: firstLoad },
            { label: "Attuale", value: lastLoad, highlight: true },
            { label: "Best", value: exercise.bestLoad ? `${exercise.bestLoad} kg` : null },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className="rounded-lg px-2 py-1.5 text-center"
              style={{
                background: highlight ? "rgba(57,255,20,0.08)" : "#111",
                border: highlight ? "1px solid rgba(57,255,20,0.25)" : "1px solid #1a1a1a",
              }}
            >
              <div className="text-[9px] uppercase tracking-wide" style={{ color: "#444" }}>{label}</div>
              <div
                className="mt-0.5 font-display text-xs font-black"
                style={{ color: highlight ? "#39FF14" : "#666" }}
              >
                {value ?? "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sparkline */}
      {loadPts.length >= 2 && (
        <div>
          <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "#333" }}>
            Progressione carico
          </div>
          <Sparkline history={exercise.history} />
        </div>
      )}

      {/* Footer */}
      {avgRpe && (
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#555" }}>
          <Flame size={10} style={{ color: "#FFA500" }} />
          RPE medio: <span style={{ color: "#FFA500" }}>{avgRpe}/10</span>
        </div>
      )}
    </div>
  );
}

// ─── Session Pill ─────────────────────────────────────────────────────────────

function SessionPill({ session }) {
  const [open, setOpen] = useState(false);
  const completed = session.itemLogs.filter((l) => l.completed).length;
  const total = session.itemLogs.length;
  const hasNote = !!session.feedbackNotes;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
    >
      <button
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5"
        onClick={() => hasNote && setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold" style={{ color: "#39FF14" }}>
            {shortDate(session.date)}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: "#444" }}>
            ✓ {completed}/{total}
          </span>
          {session.feedbackDifficulty && (
            <span className="text-[10px]" style={{ color: "#FFA500" }}>
              RPE {session.feedbackDifficulty}
            </span>
          )}
          {hasNote && !open && (
            <span className="truncate max-w-[120px] text-[10px]" style={{ color: "#555" }}>
              {session.feedbackNotes}
            </span>
          )}
        </div>
        {hasNote && (
          <ChevronDown
            size={13}
            style={{ color: "#444", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}
          />
        )}
      </button>
      <AnimatePresence>
        {open && hasNote && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 text-xs leading-relaxed" style={{ color: "#777", borderTop: "1px solid #1a1a1a" }}>
              <div className="pt-2">{session.feedbackNotes}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ClientHistory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [metricForm, setMetricForm] = useState(emptyMetric);
  const [checkinOpen, setCheckinOpen] = useState(false);

  const workoutQuery  = useQuery({ queryKey: ["client", "active-workout"], queryFn: () => apiFetch("/api/client/active-workout") });
  const progressQuery = useQuery({ queryKey: ["client", "progress"],        queryFn: () => apiFetch("/api/client/progress") });
  const metricsQuery  = useQuery({ queryKey: ["client", "metrics"],         queryFn: () => apiFetch("/api/client/metrics") });

  const sessions  = useMemo(() => workoutQuery.data?.sessions  || [], [workoutQuery.data]);
  const exercises = useMemo(() => progressQuery.data?.exercises || [], [progressQuery.data]);
  const metrics   = metricsQuery.data?.metrics   || [];
  const latestMetric = metrics[0];

  // KPIs
  const avgRpe = useMemo(() => {
    const vals = sessions.map((s) => s.feedbackDifficulty).filter(Boolean);
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null;
  }, [sessions]);

  const streak = useMemo(() => calcStreak(sessions), [sessions]);

  const bestImprovement = useMemo(() => {
    const exWithImp = exercises.filter((e) => e.improvement != null && e.improvement > 0);
    if (!exWithImp.length) return null;
    return exWithImp.reduce((best, e) => (e.improvement > best.improvement ? e : best));
  }, [exercises]);

  const saveMetric = useMutation({
    mutationFn: () => apiFetch("/api/client/metrics", { method: "POST", body: metricForm }),
    onSuccess: async () => {
      setMetricForm(emptyMetric);
      setCheckinOpen(false);
      await qc.invalidateQueries({ queryKey: ["client", "metrics"] });
      toast({ type: "success", title: "Check-in salvato" });
    },
    onError: (err) => toast({ type: "error", title: "Salvataggio fallito", description: err.message }),
  });

  if (workoutQuery.isLoading || progressQuery.isLoading) {
    return <EmptyState icon={CalendarCheck} title="Carico progressi…" />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase">Progressi</h1>
        <p className="text-sm text-text-muted">Dashboard allenamenti e progressione carichi.</p>
      </div>

      {/* ── KPI Dashboard ── */}
      <div className="grid grid-cols-2 gap-2">
        <KpiTile
          icon={CalendarCheck}
          label="Sessioni"
          value={sessions.length}
          sub={sessions.length ? `ultima ${daysAgo(sessions[0].date)}` : "nessuna ancora"}
        />
        <KpiTile
          icon={Flame}
          label="RPE medio"
          value={avgRpe ?? "—"}
          sub="sforzo percepito sessione"
          color="#FFA500"
        />
        <KpiTile
          icon={Zap}
          label="Streak"
          value={streak > 0 ? `${streak} sett.` : "—"}
          sub={streak >= 2 ? "settimane consecutive" : streak === 1 ? "questa settimana ✓" : "inizia adesso!"}
          color={streak >= 3 ? "#39FF14" : streak >= 1 ? "#FFA500" : "#555"}
        />
        <KpiTile
          icon={TrendingUp}
          label="Top progresso"
          value={bestImprovement ? `+${bestImprovement.improvement}kg` : "—"}
          sub={bestImprovement?.name ?? "ancora pochi dati"}
        />
      </div>

      {/* ── Progressi esercizi ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} style={{ color: "#39FF14" }} />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide" style={{ color: "#39FF14" }}>
            Progressi esercizi
          </h2>
        </div>

        {exercises.length ? (
          <div className="space-y-2">
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise.name} exercise={exercise} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl p-5 text-center text-sm"
            style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#555" }}
          >
            Completa qualche sessione tracciando i carichi per vedere la progressione.
          </div>
        )}
      </div>

      {/* ── Ultime sessioni (compact) ── */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide" style={{ color: "#444" }}>
            Sessioni recenti
          </h2>
          <div className="space-y-1">
            {sessions.slice(0, 8).map((session) => (
              <SessionPill key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* ── Check-in fisico (collapsibile) ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #1a1a1a" }}
      >
        <button
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
          style={{ background: "#0a0a0a" }}
          onClick={() => setCheckinOpen((o) => !o)}
        >
          <div className="flex items-center gap-2">
            <Ruler size={14} style={{ color: "#555" }} />
            <span className="text-sm font-bold uppercase tracking-wide" style={{ color: "#555" }}>
              Check-in fisico
            </span>
            {latestMetric && (
              <span className="text-[10px]" style={{ color: "#444" }}>
                · {latestMetric.weightKg ? `${latestMetric.weightKg}kg` : ""}
                {" "}aggiornato {shortDate(latestMetric.date)}
              </span>
            )}
          </div>
          <ChevronDown
            size={15}
            style={{ color: "#444", transform: checkinOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}
          />
        </button>

        <AnimatePresence>
          {checkinOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 px-4 pb-4 pt-3" style={{ background: "#080808", borderTop: "1px solid #1a1a1a" }}>
                {latestMetric && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Peso", value: latestMetric.weightKg ? `${latestMetric.weightKg} kg` : "—" },
                      { label: "Vita", value: latestMetric.waistCm ? `${latestMetric.waistCm} cm` : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
                        <div className="text-[10px] uppercase text-text-muted">{label}</div>
                        <div className="font-display text-lg font-bold text-accent">{value}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input inputMode="decimal" placeholder="Peso kg" value={metricForm.weightKg} onChange={(e) => setMetricForm({ ...metricForm, weightKg: e.target.value })} />
                  <Input inputMode="decimal" placeholder="Vita cm"  value={metricForm.waistCm}  onChange={(e) => setMetricForm({ ...metricForm, waistCm:  e.target.value })} />
                  <Input inputMode="decimal" placeholder="Torace cm" value={metricForm.chestCm}  onChange={(e) => setMetricForm({ ...metricForm, chestCm:  e.target.value })} />
                  <Input inputMode="decimal" placeholder="Fianchi cm" value={metricForm.hipsCm}  onChange={(e) => setMetricForm({ ...metricForm, hipsCm:   e.target.value })} />
                </div>
                <Textarea rows={2} placeholder="Note: energia, sonno, dolori..." value={metricForm.notes} onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })} />
                <Button onClick={() => saveMetric.mutate()} disabled={saveMetric.isPending}>
                  <Save size={16} /> Salva check-in
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
