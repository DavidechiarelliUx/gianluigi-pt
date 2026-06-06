import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  Dumbbell,
  Lock,
  MessageSquare,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState } from "../../components/app";
import { ExerciseIllustration } from "../../components/exercises/ExerciseIllustration";
import { getExerciseIllustrationId } from "../../components/exercises/exercise-data";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

// ─── Utilities ───────────────────────────────────────────────────────────────

function muscleIcon(name = "") {
  const n = name.toLowerCase();
  if (n.includes("squat") || n.includes("leg") || n.includes("stacco") || n.includes("affondo") || n.includes("hip") || n.includes("glute") || n.includes("calf")) return "🦵";
  if (n.includes("panca") || n.includes("push") || n.includes("dip") || n.includes("petto")) return "💪";
  if (n.includes("pull") || n.includes("lat") || n.includes("remator") || n.includes("row") || n.includes("dorso")) return "🔙";
  if (n.includes("shoulder") || n.includes("spalle") || n.includes("lateral") || n.includes("military") || n.includes("press")) return "🎯";
  if (n.includes("curl") || n.includes("bicep") || n.includes("hammer")) return "💪";
  if (n.includes("tricep") || n.includes("french")) return "🔱";
  if (n.includes("plank") || n.includes("crunch") || n.includes("core") || n.includes("russian") || n.includes("sit")) return "🔥";
  if (n.includes("burpee") || n.includes("jump") || n.includes("mountain") || n.includes("cardio")) return "⚡";
  return "🏋️";
}

// ─── Node component ───────────────────────────────────────────────────────────

function ExerciseNode({ item, index, status, onClick }) {
  // status: "done" | "active" | "locked"
  const isLeft = index % 2 === 0;

  return (
    <div className="flex flex-col items-center">
      {/* connector line above (except first) */}
      {index > 0 && (
        <div className="relative flex w-full items-center justify-center">
          <div
            className="w-0.5 transition-all duration-700"
            style={{
              height: 40,
              background:
                status === "done" || status === "active"
                  ? "linear-gradient(to bottom, #39FF14, rgba(57,255,20,0.2))"
                  : "#1e1e1e",
            }}
          />
        </div>
      )}

      {/* Node row: info on alternating sides */}
      <div
        className={`flex w-full items-center gap-4 ${isLeft ? "flex-row" : "flex-row-reverse"}`}
      >
        {/* Side label */}
        <div
          className={`flex-1 ${isLeft ? "text-right" : "text-left"}`}
        >
          <p
            className="text-[11px] font-bold uppercase leading-tight"
            style={{ color: status === "done" ? "#39FF14" : status === "active" ? "#fff" : "#3a3a3a" }}
          >
            {item.exercise.name}
          </p>
          <p className="text-[10px]" style={{ color: status === "locked" ? "#2a2a2a" : "#666" }}>
            {item.sets} × {item.reps}
            {item.restSeconds ? ` · rec ${item.restSeconds}s` : ""}
          </p>
        </div>

        {/* Circle node */}
        <button
          type="button"
          onClick={() => status !== "locked" && onClick(item)}
          disabled={status === "locked"}
          className="relative shrink-0 outline-none"
          aria-label={item.exercise.name}
        >
          {status === "done" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: "#39FF14",
                boxShadow: "0 0 20px rgba(57,255,20,0.5)",
              }}
            >
              <CheckCircle2 size={28} color="#0a0a0a" />
            </motion.div>
          )}

          {status === "active" && (
            <motion.div
              animate={{ boxShadow: ["0 0 12px rgba(57,255,20,0.4)", "0 0 28px rgba(57,255,20,0.8)", "0 0 12px rgba(57,255,20,0.4)"] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 text-2xl"
              style={{ background: "rgba(57,255,20,0.12)", borderColor: "#39FF14" }}
            >
              {muscleIcon(item.exercise.name)}
            </motion.div>
          )}

          {status === "locked" && (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border"
              style={{ background: "#111", borderColor: "#222" }}
            >
              <Lock size={20} color="#2a2a2a" />
            </div>
          )}
        </button>

        {/* Spacer on other side */}
        <div className="flex-1" />
      </div>
    </div>
  );
}

// ─── Bottom sheet — exercise tracking ────────────────────────────────────────

function ExerciseSheet({ item, log, onClose, onComplete }) {
  const [loadUsed, setLoadUsed] = useState(log?.loadUsed ?? "");
  const [rpe, setRpe] = useState(log?.rpe ?? "");
  const [notes, setNotes] = useState(log?.notes ?? "");

  const illustrationId =
    item.exercise.defaultNotes || getExerciseIllustrationId(item.exercise.name);

  const handleComplete = () => {
    onComplete(item.id, { completed: true, loadUsed, rpe, notes });
    onClose();
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md overflow-y-auto rounded-t-3xl pb-10 pt-3 shadow-base"
      style={{ background: "#111", maxHeight: "88vh" }}
    >
      {/* Handle */}
      <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "#333" }} />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-1 text-text-muted hover:text-text"
      >
        <X size={20} />
      </button>

      <div className="space-y-4 px-5">
        {/* Exercise info */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#39FF14" }}>
            Esercizio {muscleIcon(item.exercise.name)}
          </p>
          <h2 className="font-display text-2xl font-black uppercase leading-tight text-white">
            {item.exercise.name}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "#888" }}>
            {item.sets} serie × {item.reps} rip
            {item.restSeconds ? ` · recupero ${item.restSeconds}s` : ""}
          </p>
        </div>

        {/* Illustration */}
        {illustrationId && (
          <div
            className="overflow-hidden rounded-2xl"
            style={{ background: "#0d0d0d", border: "1px solid #222" }}
          >
            <ExerciseIllustration
              exercise={illustrationId}
              className="mx-auto h-48 w-full max-w-[260px] object-contain"
            />
          </div>
        )}

        {/* Tracking */}
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
              Carico usato
            </span>
            <Input
              inputMode="text"
              placeholder="es. 60kg · elastico medio · corpo libero"
              value={loadUsed}
              onChange={(e) => setLoadUsed(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
              RPE percepito (1–10)
            </span>
            {/* RPE pill selector */}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRpe(String(v))}
                  className="h-9 w-9 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: rpe === String(v) ? "#39FF14" : "#1e1e1e",
                    color: rpe === String(v) ? "#0a0a0a" : "#555",
                    border: rpe === String(v) ? "none" : "1px solid #2a2a2a",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
              Note (facoltative)
            </span>
            <Textarea
              placeholder="Dolori, difficoltà, variante usata..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </label>
        </div>

        {/* CTA */}
        <Button className="w-full" onClick={handleComplete}>
          <CheckCircle2 size={18} /> Segna come completato
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Celebration screen ───────────────────────────────────────────────────────

function CelebrationScreen({ workout, dayLabel, onSave, isSaving }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-[70vh] flex-col items-center justify-center space-y-6 text-center"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-7xl"
      >
        🏆
      </motion.div>

      <div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <p className="text-sm uppercase tracking-widest" style={{ color: "#39FF14" }}>
            Sessione completata!
          </p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase leading-tight">
            Ottimo lavoro 💪
          </h2>
          <p className="mt-2 text-base text-text-muted">
            Hai finito{" "}
            <span className="font-semibold text-white">{dayLabel}</span> di{" "}
            <span className="font-semibold text-white">{workout.title}</span>.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full space-y-3"
      >
        <Button className="w-full" onClick={onSave} disabled={isSaving}>
          <Save size={18} /> {isSaving ? "Salvo…" : "Salva sessione"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Day Tabs ─────────────────────────────────────────────────────────────────

function DayTabs({ days, activeId, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {days.map((day) => {
        const active = day.id === activeId;
        return (
          <button
            key={day.id}
            onClick={() => onChange(day.id)}
            className="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase transition-all"
            style={{
              background: active ? "#39FF14" : "#1a1a1a",
              color: active ? "#0a0a0a" : "#666",
              border: active ? "none" : "1px solid #2a2a2a",
            }}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkoutPath() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeDayId, setActiveDayId] = useState(null);
  const [logs, setLogs] = useState({}); // itemId → { completed, loadUsed, rpe, notes }
  const [sheetItem, setSheetItem] = useState(null); // item being tracked
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [phase, setPhase] = useState("path"); // "path" | "feedback" | "done"

  const workoutQuery = useQuery({
    queryKey: ["client", "active-workout"],
    queryFn: () => apiFetch("/api/client/active-workout"),
  });

  const workout = workoutQuery.data?.workout;
  const activeDay = useMemo(() => {
    if (!workout?.days?.length) return null;
    return workout.days.find((d) => d.id === activeDayId) || workout.days[0];
  }, [workout, activeDayId]);

  const items = useMemo(() => activeDay?.items ?? [], [activeDay]);
  const doneCount = useMemo(
    () => items.filter((it) => logs[it.id]?.completed).length,
    [items, logs]
  );
  const allDone = items.length > 0 && doneCount === items.length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  // Status per nodo
  const nodeStatus = useCallback(
    (item, idx) => {
      if (logs[item.id]?.completed) return "done";
      // Active = primo non completato (o comunque tappabile se il precedente è done)
      const prevDone = idx === 0 || logs[items[idx - 1]?.id]?.completed;
      if (prevDone) return "active";
      return "locked";
    },
    [logs, items]
  );

  const updateLog = useCallback((itemId, patch) => {
    setLogs((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }, []);

  const saveSession = useMutation({
    mutationFn: () =>
      apiFetch("/api/client/sessions", {
        method: "POST",
        body: {
          workoutId: workout.id,
          workoutDayId: activeDay.id,
          feedbackNotes,
          logs: items.map((item) => ({
            workoutItemId: item.id,
            ...(logs[item.id] || {}),
          })),
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["client", "active-workout"] });
      await qc.invalidateQueries({ queryKey: ["client", "overview"] });
      toast({ type: "success", title: "Sessione salvata! 🏆" });
      navigate("/area-cliente");
    },
    onError: (err) =>
      toast({ type: "error", title: "Salvataggio fallito", description: err.message }),
  });

  if (workoutQuery.isLoading) {
    return <EmptyState icon={Dumbbell} title="Carico la scheda…" />;
  }

  if (!workout) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted hover:text-text">
          <ChevronLeft size={20} /> Indietro
        </button>
        <EmptyState
          icon={Dumbbell}
          title="Nessuna scheda attiva"
          description="Gianluigi ti assegnerà presto la tua scheda."
        />
      </div>
    );
  }

  // ── Celebration / feedback phase ──
  if (allDone && phase === "done") {
    return (
      <CelebrationScreen
        workout={workout}
        dayLabel={activeDay?.label}
        onSave={() => saveSession.mutate()}
        isSaving={saveSession.isPending}
      />
    );
  }

  return (
    <div className="relative space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/area-cliente")}
          className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-black uppercase leading-none">{workout.title}</h1>
          <p className="text-xs text-text-muted">{activeDay?.label}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase"
          style={{ background: "rgba(57,255,20,0.12)", color: "#39FF14" }}
        >
          {doneCount}/{items.length}
        </span>
      </div>

      {/* Day tabs */}
      {workout.days.length > 1 && (
        <DayTabs
          days={workout.days}
          activeId={activeDay?.id}
          onChange={(id) => {
            setActiveDayId(id);
            setLogs({});
            setPhase("path");
          }}
        />
      )}

      {/* Progress bar */}
      <div>
        <div
          className="h-2.5 overflow-hidden rounded-full"
          style={{ background: "#1a1a1a" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#39FF14,#00FF87)", boxShadow: pct > 0 ? "0 0 10px rgba(57,255,20,0.4)" : "none" }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wide text-text-muted">
          <span>Completamento</span>
          <span style={{ color: pct > 0 ? "#39FF14" : undefined }}>{pct}%</span>
        </div>
      </div>

      {/* Path of exercise nodes */}
      <div className="py-4">
        {items.map((item, idx) => (
          <ExerciseNode
            key={item.id}
            item={item}
            index={idx}
            status={nodeStatus(item, idx)}

            onClick={(it) => setSheetItem(it)}
          />
        ))}
      </div>

      {/* CTA when all done */}
      {allDone && phase === "path" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.3)" }}
          >
            <p className="text-2xl">🏆</p>
            <p className="mt-1 font-display text-base font-black uppercase" style={{ color: "#39FF14" }}>
              Tutti gli esercizi completati!
            </p>
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              <MessageSquare size={14} className="text-accent" /> Feedback sessione
            </span>
            <Textarea
              placeholder="Come è andata? Energia, dolori, note per Gianluigi..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              rows={3}
            />
          </label>

          <Button className="w-full" onClick={() => setPhase("done")}>
            <Sparkles size={18} /> Termina sessione
          </Button>
        </motion.div>
      )}

      {/* Bottom sheet overlay */}
      <AnimatePresence>
        {sheetItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70"
              onClick={() => setSheetItem(null)}
            />
            <ExerciseSheet
              item={sheetItem}
              log={logs[sheetItem.id]}
              onClose={() => setSheetItem(null)}
              onComplete={updateLog}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
