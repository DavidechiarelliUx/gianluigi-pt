import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  Dumbbell,
  Home,
  Lock,
  MessageSquare,
  Plus,
  Save,
  SkipForward,
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
import { useClientLayout } from "./ClientLayoutContext";

// ─── Utilities ────────────────────────────────────────────────────────────────

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

function formatSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}`;
}

// ─── Exercise node ─────────────────────────────────────────────────────────────

function ExerciseNode({ item, index, status, onClick, nodeRef }) {
  const isLeft = index % 2 === 0;
  return (
    <div className="flex flex-col items-center" ref={nodeRef}>
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
      <div className={`flex w-full items-center gap-4 ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
        <div className={`flex-1 ${isLeft ? "text-right" : "text-left"}`}>
          <p className="text-[11px] font-bold uppercase leading-tight"
            style={{ color: status === "done" ? "#39FF14" : status === "active" ? "#fff" : "#3a3a3a" }}>
            {item.exercise.name}
          </p>
          <p className="text-[10px]" style={{ color: status === "locked" ? "#2a2a2a" : "#666" }}>
            {item.sets} × {item.reps}
            {item.restSeconds ? ` · rec ${item.restSeconds}s` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => status !== "locked" && onClick(item)}
          disabled={status === "locked"}
          className="relative shrink-0 outline-none"
          aria-label={item.exercise.name}
        >
          {status === "done" && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "#39FF14", boxShadow: "0 0 20px rgba(57,255,20,0.5)" }}
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full border"
              style={{ background: "#111", borderColor: "#222" }}>
              <Lock size={20} color="#2a2a2a" />
            </div>
          )}
        </button>
        <div className="flex-1" />
      </div>
    </div>
  );
}

// ─── Full-screen rest timer (between exercises) ────────────────────────────────

function RestTimer({ initialSeconds, nextExerciseName, onSkip, onDone }) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [total, setTotal] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onDone]);

  const handleAdd = () => { setRemaining((r) => r + 15); setTotal((t) => t + 15); };
  const pct = Math.max(0, remaining / total);
  const circumference = 2 * Math.PI * 54;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black px-6"
    >
      <motion.p
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mb-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#39FF14" }}
      >
        Recupero
      </motion.p>

      <div className="relative mb-6 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1a1a1a" strokeWidth="6" />
          <motion.circle
            cx="60" cy="60" r="54" fill="none" stroke="#39FF14" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference * (1 - pct) }}
            transition={{ duration: 0.5, ease: "linear" }}
            style={{ filter: "drop-shadow(0 0 8px rgba(57,255,20,0.7))" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <motion.span
            key={remaining} initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="font-display text-5xl font-black leading-none text-white"
          >
            {formatSeconds(remaining)}
          </motion.span>
          <span className="mt-1 text-[10px] uppercase tracking-widest text-text-muted">secondi</span>
        </div>
      </div>

      <p className="mb-1 text-center text-base font-semibold text-white">Preparati al prossimo esercizio</p>
      {nextExerciseName && (
        <p className="mb-8 text-center text-sm" style={{ color: "#666" }}>{nextExerciseName}</p>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button onClick={handleAdd}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
          style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>
          <Plus size={16} /> +15 secondi
        </button>
        <button onClick={onSkip}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
          style={{ background: "rgba(57,255,20,0.08)", color: "#39FF14", border: "1px solid rgba(57,255,20,0.25)" }}>
          <SkipForward size={16} /> Salta recupero
        </button>
      </div>
    </motion.div>
  );
}

// ─── Exercise sheet with set-by-set tracking ───────────────────────────────────

function ExerciseSheet({ item, log, onClose, onSave }) {
  const totalSets = Math.min(10, Math.max(1, parseInt(String(item.sets ?? 1), 10) || 1));
  const isAlreadyDone = !!log?.completed;

  // Set tracking state
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [setLoads, setSetLoads] = useState(Array(totalSets).fill(""));
  const [phase, setPhase] = useState(isAlreadyDone ? "edit" : "sets");
  const [intraRest, setIntraRest] = useState(null); // seconds left between sets

  // Summary / edit state
  const [editLoad, setEditLoad] = useState(log?.loadUsed ?? "");
  const [rpe, setRpe] = useState(log?.rpe ?? "");
  const [notes, setNotes] = useState(log?.notes ?? "");

  const illustrationId = item.exercise.defaultNotes || getExerciseIllustrationId(item.exercise.name);
  const restTotal = item.restSeconds || 60;

  // Intra-set rest countdown (0 = stopped, null = inactive)
  useEffect(() => {
    if (!intraRest) return; // handles null and 0 (both falsy)
    const t = setTimeout(() => setIntraRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(t);
  }, [intraRest]);

  const handleSetDone = () => {
    if (activeSetIdx < totalSets - 1) {
      const nextIdx = activeSetIdx + 1;
      setSetLoads((prev) => {
        const next = [...prev];
        if (!next[nextIdx]) next[nextIdx] = prev[activeSetIdx]; // pre-fill
        return next;
      });
      if (item.restSeconds) setIntraRest(item.restSeconds);
      setActiveSetIdx(nextIdx);
    } else {
      // All sets done → aggregate and go to summary
      const all = [...setLoads];
      all[activeSetIdx] = setLoads[activeSetIdx]; // ensure current captured
      const nonEmpty = all.filter(Boolean);
      setEditLoad(nonEmpty.join(" / "));
      setPhase("summary");
    }
  };

  const handleSave = () => onSave(item, { loadUsed: editLoad, rpe, notes });

  const isLastSet = activeSetIdx === totalSets - 1;
  const restPct = intraRest ? Math.max(0, (intraRest / restTotal) * 100) : 0;

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md overflow-y-auto rounded-t-3xl pb-10 pt-3 shadow-base"
      style={{ background: "#111", maxHeight: "92vh" }}
    >
      <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "#333" }} />
      <button onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-1 text-text-muted hover:text-text">
        <X size={20} />
      </button>

      <div className="space-y-4 px-5">
        {/* Exercise header */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#39FF14" }}>
            Esercizio {muscleIcon(item.exercise.name)}
          </p>
          <h2 className="font-display text-2xl font-black uppercase leading-tight text-white">
            {item.exercise.name}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "#888" }}>
            {item.sets} serie × {item.reps} rip
            {item.restSeconds ? ` · rec ${item.restSeconds}s` : ""}
          </p>
        </div>

        {/* Illustration – only in sets phase */}
        {phase === "sets" && illustrationId && (
          <div className="overflow-hidden rounded-2xl" style={{ background: "#0d0d0d", border: "1px solid #222" }}>
            <ExerciseIllustration
              exercise={illustrationId}
              className="mx-auto h-40 w-full max-w-[240px] object-contain"
            />
          </div>
        )}

        {/* ── PHASE: sets ── */}
        {phase === "sets" && (
          <div className="space-y-4">
            {/* Set pills */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: totalSets }, (_, i) => (
                <div
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: i < activeSetIdx ? "#39FF14" : i === activeSetIdx ? "rgba(57,255,20,0.15)" : "#1a1a1a",
                    border: i === activeSetIdx ? "1.5px solid #39FF14" : "1px solid #2a2a2a",
                    color: i < activeSetIdx ? "#0a0a0a" : i === activeSetIdx ? "#39FF14" : "#2a2a2a",
                  }}
                >
                  {i < activeSetIdx ? <CheckCircle2 size={13} /> : i + 1}
                </div>
              ))}
            </div>

            {/* Current set label */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#39FF14" }}>
                Serie {activeSetIdx + 1} di {totalSets}
              </p>
              <p className="font-display text-xl font-black text-white">{item.reps} ripetizioni</p>
            </div>

            {/* Intra-set rest timer */}
            {intraRest > 0 && (
              <div className="overflow-hidden rounded-xl p-3" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted">Recupero tra le serie</span>
                  <motion.span
                    key={intraRest} initial={{ scale: 1.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-sm font-bold" style={{ color: "#39FF14" }}
                  >
                    {intraRest}s
                  </motion.span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "#1a1a1a" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #39FF14, #00FF87)" }}
                    animate={{ width: `${restPct}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
                <button onClick={() => setIntraRest(0)}
                  className="mt-2 text-[11px] text-text-muted hover:text-text">
                  Salta recupero
                </button>
              </div>
            )}

            {/* Load input */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                Carico — Serie {activeSetIdx + 1}
              </span>
              <Input
                inputMode="text"
                placeholder="es. 60kg · elastico · corpo libero"
                value={setLoads[activeSetIdx]}
                onChange={(e) => {
                  const next = [...setLoads];
                  next[activeSetIdx] = e.target.value;
                  setSetLoads(next);
                }}
              />
            </label>

            {/* Done button – hidden while rest is running */}
            {!intraRest && (
              <Button className="w-full" onClick={handleSetDone}>
                <CheckCircle2 size={18} />
                {isLastSet ? "Ultima serie — Completa" : `Serie ${activeSetIdx + 1} completata`}
              </Button>
            )}
          </div>
        )}

        {/* ── PHASE: summary (after completing all sets) ── */}
        {phase === "summary" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-xl p-3 text-center"
              style={{ background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.25)" }}>
              <p className="font-bold" style={{ color: "#39FF14" }}>
                ✓ {totalSets} {totalSets === 1 ? "serie completata" : "serie completate"}!
              </p>
            </div>

            {/* Per-set load recap */}
            {totalSets > 1 && setLoads.some(Boolean) && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Carichi per serie</p>
                {setLoads.map((load, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                    <span className="text-xs text-text-muted">Serie {i + 1}</span>
                    <span className="text-xs font-semibold text-white">{load || "—"}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Aggregate load edit */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                Carico riepilogo
              </span>
              <Input inputMode="text" placeholder="es. 60kg / 62.5kg"
                value={editLoad} onChange={(e) => setEditLoad(e.target.value)} />
            </label>

            {/* RPE */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                Sforzo percepito (1–10)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <button key={v} type="button" onClick={() => setRpe(String(v))}
                    className="h-9 w-9 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: rpe === String(v) ? "#39FF14" : "#1e1e1e",
                      color: rpe === String(v) ? "#0a0a0a" : "#555",
                      border: rpe === String(v) ? "none" : "1px solid #2a2a2a",
                    }}>
                    {v}
                  </button>
                ))}
              </div>
            </label>

            {/* Notes */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                Note (facoltative)
              </span>
              <Textarea placeholder="Dolori, difficoltà, variante usata..." rows={2}
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <Button className="w-full" onClick={handleSave}>
              <Save size={18} /> Salva esercizio
            </Button>
            <button onClick={() => setPhase("sets")}
              className="w-full text-center text-xs text-text-muted hover:text-text">
              ← Torna alle serie
            </button>
          </motion.div>
        )}

        {/* ── PHASE: edit (exercise already completed, reopened) ── */}
        {phase === "edit" && (
          <div className="space-y-4">
            <div className="rounded-xl p-3 text-center"
              style={{ background: "rgba(57,255,20,0.05)", border: "1px solid rgba(57,255,20,0.2)" }}>
              <p className="text-xs text-text-muted">Esercizio già completato — modifica se necessario</p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>Carico usato</span>
              <Input inputMode="text" placeholder="es. 60kg · corpo libero"
                value={editLoad} onChange={(e) => setEditLoad(e.target.value)} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>RPE (1–10)</span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <button key={v} type="button" onClick={() => setRpe(String(v))}
                    className="h-9 w-9 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: rpe === String(v) ? "#39FF14" : "#1e1e1e",
                      color: rpe === String(v) ? "#0a0a0a" : "#555",
                      border: rpe === String(v) ? "none" : "1px solid #2a2a2a",
                    }}>
                    {v}
                  </button>
                ))}
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>Note</span>
              <Textarea placeholder="Dolori, difficoltà, variante usata..." rows={2}
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <Button className="w-full" onClick={handleSave}><Save size={18} /> Aggiorna esercizio</Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Celebration / end workout ─────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 54;

function CelebrationScreen({ workout, activeDay, items, logs, feedbackNotes, onFeedbackChange, onSave, isSaving }) {
  const navigate = useNavigate();

  const completedItems = items.filter((i) => logs[i.id]?.completed);
  const loadsUsed = completedItems.filter((i) => logs[i.id]?.loadUsed).map((i) => logs[i.id].loadUsed);
  const rpeValues = completedItems.filter((i) => logs[i.id]?.rpe).map((i) => Number(logs[i.id].rpe));
  const avgRpe = rpeValues.length
    ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10
    : null;

  const days = workout.days ?? [];
  const currentIdx = days.findIndex((d) => d.id === activeDay?.id);
  const nextDay = currentIdx >= 0 && currentIdx < days.length - 1 ? days[currentIdx + 1] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex min-h-[80vh] flex-col items-center justify-start space-y-6 pb-10 pt-4 text-center"
    >
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1a1a1a" strokeWidth="6" />
          <motion.circle
            cx="60" cy="60" r="54" fill="none" stroke="#39FF14" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }} animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
            style={{ filter: "drop-shadow(0 0 10px rgba(57,255,20,0.6))" }}
          />
        </svg>
        <motion.div
          animate={{ rotate: [0, -8, 8, -8, 8, 0] }} transition={{ duration: 0.6, delay: 0.5 }}
          className="absolute text-4xl">🏆</motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: "#39FF14" }}>
          100% · Sessione completata!
        </p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase leading-tight">Ottimo lavoro 💪</h2>
        <p className="mt-2 text-sm text-text-muted">
          Hai finito <span className="font-semibold text-white">{activeDay?.label}</span>{" "}
          di <span className="font-semibold text-white">{workout.title}</span>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
        className="grid w-full grid-cols-3 gap-2"
      >
        {[
          { label: "Esercizi", value: completedItems.length },
          { label: "Carichi", value: loadsUsed.length || "—" },
          { label: "RPE medio", value: avgRpe ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-3" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
            <p className="text-2xl font-black" style={{ color: "#39FF14" }}>{value}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
          </div>
        ))}
      </motion.div>

      {loadsUsed.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
          className="w-full space-y-1.5"
        >
          <p className="text-left text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Riepilogo carichi
          </p>
          {completedItems.filter((i) => logs[i.id]?.loadUsed).map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
              <span className="text-xs font-semibold text-white">{item.exercise.name}</span>
              <span className="text-xs" style={{ color: "#39FF14" }}>{logs[item.id].loadUsed}</span>
            </div>
          ))}
        </motion.div>
      )}

      {nextDay && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="w-full rounded-xl p-3 text-center"
          style={{ background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.2)" }}
        >
          <p className="text-[11px] text-text-muted">
            Prossima sessione disponibile:{" "}
            <span className="font-bold" style={{ color: "#39FF14" }}>{nextDay.label}</span>
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72 }}
        className="w-full"
      >
        <label className="block text-left">
          <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            <MessageSquare size={13} className="text-accent" /> Feedback sessione
          </span>
          <Textarea placeholder="Come è andata? Energia, dolori, note per Gianluigi..." rows={3}
            value={feedbackNotes} onChange={(e) => onFeedbackChange(e.target.value)} />
        </label>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="w-full space-y-3"
      >
        <Button className="w-full" onClick={onSave} disabled={isSaving}>
          <Save size={18} /> {isSaving ? "Salvo…" : "Salva sessione"}
        </Button>
        {!isSaving && (
          <button onClick={() => navigate("/area-cliente")}
            className="flex w-full items-center justify-center gap-2 text-sm text-text-muted transition-colors hover:text-text">
            <Home size={15} /> Torna alla Home
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Day tabs ──────────────────────────────────────────────────────────────────

function DayTabs({ days, activeId, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {days.map((day) => {
        const active = day.id === activeId;
        return (
          <button key={day.id} onClick={() => onChange(day.id)}
            className="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase transition-all"
            style={{
              background: active ? "#39FF14" : "#1a1a1a",
              color: active ? "#0a0a0a" : "#666",
              border: active ? "none" : "1px solid #2a2a2a",
            }}>
            {day.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function WorkoutPath() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { setTabBarHidden } = useClientLayout();

  const [activeDayId, setActiveDayId] = useState(null);
  const [logs, setLogs] = useState({});
  const [sheetItem, setSheetItem] = useState(null);
  const [restConfig, setRestConfig] = useState(null); // { initialSeconds, nextItemId }
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [phase, setPhase] = useState("path"); // "path" | "done"

  const nodeRefs = useRef({});

  // Hide tab bar when sheet OR inter-exercise rest is active
  useEffect(() => {
    setTabBarHidden(!!sheetItem || !!restConfig);
    return () => setTabBarHidden(false);
  }, [sheetItem, restConfig, setTabBarHidden]);

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
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  // Controlla se oggi c'è già una sessione completata (dal server)
  const alreadyTrainedToday = useMemo(() => {
    const sessions = workoutQuery.data?.sessions ?? [];
    if (!sessions.length) return false;
    const todayTs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    return sessions.some((s) => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === todayTs;
    });
  }, [workoutQuery.data?.sessions]);

  const nodeStatus = useCallback(
    (item, idx) => {
      if (logs[item.id]?.completed) return "done";
      const prevDone = idx === 0 || logs[items[idx - 1]?.id]?.completed;
      return prevDone ? "active" : "locked";
    },
    [logs, items]
  );

  const updateLog = useCallback((itemId, patch) => {
    setLogs((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }, []);

  const handleSave = useCallback(
    (item, data) => {
      updateLog(item.id, { ...data, completed: true });
      setSheetItem(null);
      toast({ type: "success", title: "Esercizio completato! 💪" });

      const idx = items.findIndex((i) => i.id === item.id);
      const isLast = idx === items.length - 1;

      if (isLast) {
        setTimeout(() => setPhase("done"), 500);
      } else if (item.restSeconds) {
        const nextItem = items[idx + 1] ?? null;
        setRestConfig({ initialSeconds: item.restSeconds, nextItemId: nextItem?.id ?? null });
      } else {
        const nextItem = items[idx + 1];
        if (nextItem) {
          setTimeout(() => {
            nodeRefs.current[nextItem.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 300);
        }
      }
    },
    [items, updateLog, toast]
  );

  const handleRestDone = useCallback(() => {
    const nextItemId = restConfig?.nextItemId;
    setRestConfig(null);
    toast({ type: "success", title: "Recupero finito! Forza 💥" });
    if (nextItemId) {
      setTimeout(() => {
        nodeRefs.current[nextItemId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [restConfig, toast]);

  const handleRestSkip = useCallback(() => {
    const nextItemId = restConfig?.nextItemId;
    setRestConfig(null);
    if (nextItemId) {
      setTimeout(() => {
        nodeRefs.current[nextItemId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [restConfig]);

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

  if (workoutQuery.isLoading) return <EmptyState icon={Dumbbell} title="Carico la scheda…" />;

  // Accesso negato — abbonamento non attivo o piano insufficiente
  if (workoutQuery.data?.access === "upgrade_required") {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate("/area-cliente")} className="flex items-center gap-2 text-text-muted hover:text-text">
          <ChevronLeft size={20} /> Home
        </button>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center space-y-5 rounded-2xl p-6 text-center"
          style={{ background: "#111", border: "1px solid rgba(255,59,59,0.25)" }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.3)" }}>
            <Lock size={26} style={{ color: "#ff6b6b" }} />
          </div>
          <div>
            <p className="font-display text-xl font-black uppercase text-white">Abbonamento non attivo</p>
            <p className="mt-2 text-sm text-text-muted">
              Per accedere alle schede di allenamento è necessario un abbonamento attivo.
            </p>
          </div>
          <Button className="w-full" onClick={() => navigate("/pacchetti")}>
            Vedi abbonamenti
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-muted hover:text-text">
          <ChevronLeft size={20} /> Indietro
        </button>
        <EmptyState icon={Dumbbell} title="Nessuna scheda attiva"
          description="Gianluigi ti assegnerà presto la tua scheda." />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <CelebrationScreen
        workout={workout} activeDay={activeDay} items={items} logs={logs}
        feedbackNotes={feedbackNotes} onFeedbackChange={setFeedbackNotes}
        onSave={() => saveSession.mutate()} isSaving={saveSession.isPending}
      />
    );
  }

  return (
    <div className="relative space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/area-cliente")}
          className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-black uppercase leading-none">{workout.title}</h1>
          <p className="text-xs text-text-muted">{activeDay?.label}</p>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase"
          style={{ background: "rgba(57,255,20,0.12)", color: "#39FF14" }}>
          {doneCount}/{items.length}
        </span>
      </div>

      {/* Day tabs */}
      {workout.days.length > 1 && (
        <DayTabs days={workout.days} activeId={activeDay?.id}
          onChange={(id) => { setActiveDayId(id); setLogs({}); setRestConfig(null); setPhase("path"); setFeedbackNotes(""); }} />
      )}

      {/* Progress bar */}
      <div>
        <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "#1a1a1a" }}>
          <motion.div className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg,#39FF14,#00FF87)", boxShadow: pct > 0 ? "0 0 10px rgba(57,255,20,0.4)" : "none" }}
            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
        </div>
        <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wide text-text-muted">
          <span>Completamento</span>
          <span style={{ color: pct > 0 ? "#39FF14" : undefined }}>{pct}%</span>
        </div>
      </div>

      {/* Banner "già allenato oggi" */}
      {alreadyTrainedToday && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3"
          style={{ background: "rgba(57,255,20,0.07)", border: "1px solid rgba(57,255,20,0.25)" }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#39FF14" }}>
            <CheckCircle2 size={15} /> Hai già completato l&apos;allenamento di oggi!
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Puoi comunque aggiungere un&apos;altra sessione o modificare i dati.
          </p>
        </motion.div>
      )}

      {/* Exercise nodes */}
      <div className="py-4">
        {items.map((item, idx) => (
          <ExerciseNode
            key={item.id} item={item} index={idx} status={nodeStatus(item, idx)}
            onClick={(it) => setSheetItem(it)}
            nodeRef={(el) => { nodeRefs.current[item.id] = el; }}
          />
        ))}
      </div>

      {/* Safety CTA if all done but phase not yet "done" */}
      {doneCount === items.length && items.length > 0 && !restConfig && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="rounded-xl p-4 text-center"
            style={{ background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.3)" }}>
            <p className="text-2xl">🏆</p>
            <p className="mt-1 font-display text-base font-black uppercase" style={{ color: "#39FF14" }}>
              Tutti gli esercizi completati!
            </p>
          </div>
          <Button className="w-full" onClick={() => setPhase("done")}>
            <Sparkles size={18} /> Vedi il riepilogo
          </Button>
        </motion.div>
      )}

      {/* Sheet overlay */}
      <AnimatePresence>
        {sheetItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70" onClick={() => setSheetItem(null)} />
            <ExerciseSheet
              item={sheetItem} log={logs[sheetItem.id]}
              onClose={() => setSheetItem(null)} onSave={handleSave}
            />
          </>
        )}
      </AnimatePresence>

      {/* Inter-exercise rest timer */}
      <AnimatePresence>
        {restConfig && (
          <RestTimer
            key={`rest-${restConfig.initialSeconds}`}
            initialSeconds={restConfig.initialSeconds}
            nextExerciseName={items.find((i) => i.id === restConfig.nextItemId)?.exercise?.name ?? null}
            onSkip={handleRestSkip} onDone={handleRestDone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
