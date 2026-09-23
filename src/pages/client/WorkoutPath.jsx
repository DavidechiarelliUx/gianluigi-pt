import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Home,
  Lock,
  MessageSquare,
  Plus,
  RotateCcw,
  Save,
  SkipForward,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState } from "../../components/app";
import { ExerciseIllustration } from "../../components/exercises/ExerciseIllustration";
import {
  getExerciseIllustrationId,
  getExerciseMuscleGroup,
  getMuscleGroupColor,
} from "../../components/exercises/exercise-data";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";
import { calcWeeklyStreak, isCountedSession, weekKey } from "../../lib/sessionStats";
import { formatWorkoutTarget } from "../../lib/workoutTarget";
import { useClientLayout } from "./ClientLayoutContext";

// ─── sessionStorage helpers — sopravvivono alla navigazione ──────────────────

const WP_KEY = (wid, did) => `wp-${wid}-${did}`;

function readProgress(wid, did) {
  try { return JSON.parse(sessionStorage.getItem(WP_KEY(wid, did)) ?? "null"); }
  catch { return null; }
}
function writeProgress(wid, did, data) {
  try { sessionStorage.setItem(WP_KEY(wid, did), JSON.stringify(data)); }
  catch { /* quota exceeded o private browsing — non bloccante */ }
}
function clearProgress(wid, did) {
  try { sessionStorage.removeItem(WP_KEY(wid, did)); }
  catch { /* non bloccante */ }
}

// ─── Session reducer — stato del percorso per il giorno corrente ──────────────

const SESSION_INIT = { logs: {}, feedbackNotes: "", phase: "path", unlockedThrough: 0 };

function sessionReducer(state, action) {
  switch (action.type) {
    case "RESTORE":
      return { ...SESSION_INIT, ...action.payload };
    case "PATCH_LOG":
      return { ...state, logs: { ...state.logs, [action.id]: { ...state.logs[action.id], ...action.patch } } };
    case "REACH":
      return { ...state, unlockedThrough: Math.max(state.unlockedThrough, action.index) };
    case "SET_FEEDBACK":
      return { ...state, feedbackNotes: action.value };
    case "SET_PHASE":
      return { ...state, phase: action.value };
    case "RESET_DAY":
      return { ...SESSION_INIT };
    default:
      return state;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}`;
}

function resolveIllustrationId(item) {
  return item.exercise.defaultNotes || getExerciseIllustrationId(item.exercise.name);
}

function resolveMuscleGroup(item) {
  return item.exercise.muscleGroup || getExerciseMuscleGroup(item.exercise.name);
}

// Rileva durata (in secondi) dall'eventuale stringa di reps: "60s", "5 min" ecc.
function parseExerciseDuration(repsStr) {
  const m = /(\d+)\s*(s\b|sec|min|minuti|m\b)/i.exec(String(repsStr || ""));
  if (!m) return null;
  const v = parseInt(m[1]);
  return /min|m$/i.test(m[2]) ? v * 60 : v;
}

// ─── GymBackground ────────────────────────────────────────────────────────────

function GymBackground() {
  return null;
}

// ─── PathConnector — diagonal SVG line between nodes ─────────────────────────

function PathConnector({ toLeft, status }) {
  return (
    <svg className={"client-path-connector " + status} viewBox="0 0 360 92" preserveAspectRatio="none" aria-hidden="true">
      <path d={toLeft ? "M 318 0 C 318 48, 42 42, 42 92" : "M 42 0 C 42 48, 318 42, 318 92"} />
    </svg>
  );
}

// ─── ExerciseNode ─────────────────────────────────────────────────────────────

function ExerciseNode({ item, index, status, onClick, nodeRef, previous }) {
  const isLeft = index % 2 === 0;
  const illustrationId = resolveIllustrationId(item);
  const muscleGroup = resolveMuscleGroup(item);
  const target = formatWorkoutTarget(item);

  return (
    <div ref={nodeRef} className="client-path-segment">
      {index > 0 && <PathConnector toLeft={isLeft} status={status} />}
      <div className={"client-path-node " + (isLeft ? "left " : "right ") + status}>
        <button type="button" className="client-path-circle" onClick={() => onClick(item)} disabled={status === "locked"} aria-label={`${item.exercise.name}, ${status === "done" ? "completato" : status === "skipped" ? "da riprendere" : status === "locked" ? "bloccato" : "disponibile"}`}>
          <ExerciseIllustration exercise={illustrationId} className="client-path-art" showBackground={false} />
          <span className="client-path-symbol">{status === "done" ? <Check size={17} strokeWidth={3} /> : status === "skipped" ? <RotateCcw size={16} /> : status === "locked" ? <Lock size={16} /> : <Zap size={17} fill="currentColor" />}</span>
        </button>
        <div className="client-path-copy"><span>TAPPA {String(index + 1).padStart(2, "0")}</span><strong>{item.exercise.name}</strong><small>{target.shortLabel}{item.restSeconds ? ` · rec ${item.restSeconds}s` : ""}</small>{muscleGroup && <small>{muscleGroup}</small>}{status !== "locked" && previous?.loadUsed && <em>Ultima volta: {previous.loadUsed}{previous.repsDone ? ` · ${previous.repsDone} rip.` : ""}</em>}<button type="button" onClick={() => onClick(item)} disabled={status === "locked"}>{status === "done" ? "Rivedi" : status === "skipped" ? "Riprendi" : status === "locked" ? "Bloccato" : "Inizia"}{status !== "locked" && <ChevronRight size={14} />}</button></div>
      </div>
    </div>
  );
}

// ─── Full-screen rest timer ────────────────────────────────────────────────────

// Singleton AudioContext — va sbloccato durante un gesto utente (requisito iOS)
let _audioCtx = null;

function unlockAudio() {
  if (_audioCtx) {
    if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
    return;
  }
  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Riproduce buffer silenzioso per sbloccare il contesto su iOS
    const buf = _audioCtx.createBuffer(1, 1, 22050);
    const src = _audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(_audioCtx.destination);
    src.start(0);
    if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
  } catch { /* browser senza AudioContext */ }
}

function getAudioCtx() {
  if (!_audioCtx) return null; // non ancora sbloccato
  if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

function playTimerEndSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const beep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + start + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    beep(880, 0, 0.15); beep(880, 0.2, 0.15); beep(1100, 0.4, 0.3);
  } catch { /* browser senza AudioContext */ }
}

function RestTimer({ initialSeconds, nextExerciseName, onSkip, onDone }) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [total, setTotal]         = useState(initialSeconds);
  const doneCalledRef             = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!doneCalledRef.current) {
        doneCalledRef.current = true;
        playTimerEndSound();
        setTimeout(onDone, 600);
      }
      return;
    }
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

      <p className="mb-1 text-center text-base font-semibold text-white">Preparati al prossimo</p>
      {nextExerciseName && (
        <p className="mb-8 text-center text-sm font-bold" style={{ color: "#39FF14" }}>
          {nextExerciseName}
        </p>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
          style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}
        >
          <Plus size={16} /> +15 secondi
        </button>
        <button
          onClick={onSkip}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
          style={{ background: "rgba(57,255,20,0.08)", color: "#39FF14", border: "1px solid rgba(57,255,20,0.25)" }}
        >
          <SkipForward size={16} /> Salta recupero
        </button>
      </div>
    </motion.div>
  );
}

// ─── ExerciseSetTimer — countdown inline per esercizi a tempo ─────────────────

function ExerciseSetTimer({ totalSeconds, onComplete }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const intRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intRef.current);
          setRunning(false);
          onComplete?.(totalSeconds);
          playTimerEndSound();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intRef.current);
  }, [running, totalSeconds, onComplete]);

  const pct = (remaining / totalSeconds) * 100;

  return (
    <div
      className="rounded-xl p-4 text-center space-y-3"
      style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
    >
      <div className="font-display text-4xl font-black tabular-nums" style={{ color: "#39FF14" }}>
        {formatSeconds(remaining)}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#1a1a1a" }}>
        <div
          className="h-full rounded-full"
          style={{ background: "#39FF14", width: `${pct}%`, transition: "width 1s linear" }}
        />
      </div>
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => { clearInterval(intRef.current); setRemaining(totalSeconds); setRunning(false); }}
          className="rounded-lg px-3 py-1.5 text-xs font-bold"
          style={{ background: "#1a1a1a", color: "#555" }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="rounded-lg px-6 py-1.5 text-sm font-bold"
          style={{ background: running ? "#333" : "#39FF14", color: running ? "#aaa" : "#000" }}
        >
          {running ? "Pausa" : remaining < totalSeconds ? "Riprendi" : "Avvia"}
        </button>
      </div>
    </div>
  );
}

// ─── ExerciseSheet — set-by-set tracking ──────────────────────────────────────

function ExerciseSheet({ item, log, lastMaximal, onClose, onDraftChange, onSave, onSkip }) {
  const totalSets    = Math.min(10, Math.max(1, parseInt(String(item.sets ?? 1), 10) || 1));
  const isAlreadyDone = !!log?.completed;
  const illustrationId = resolveIllustrationId(item);
  const muscleGroup    = resolveMuscleGroup(item);
  const target = formatWorkoutTarget(item);
  const savedLoads = Array.isArray(log?.draftSetLoads) ? log.draftSetLoads : [];

  const [activeSetIdx, setActiveSetIdx] = useState(
    Math.min(totalSets - 1, Math.max(0, Number(log?.draftActiveSetIdx) || 0))
  );
  const [setLoads, setSetLoads]         = useState(() =>
    Array.from({ length: totalSets }, (_, i) => savedLoads[i] ?? "")
  );
  const [phase, setPhase]               = useState(isAlreadyDone ? "edit" : log?.draftPhase ?? "sets");
  const [intraRest, setIntraRest]       = useState(null);

  const [editLoad, setEditLoad] = useState(log?.loadUsed ?? "");
  const [rpe, setRpe]           = useState(log?.rpe ?? "");
  const [notes, setNotes]       = useState(log?.notes ?? "");

  // Tipo carico: deciso dal trainer sulla riga di scheda, il cliente non sceglie.
  // Il fallback sull'esercizio copre le righe salvate prima della migration.
  const loadType = item.loadType ?? item.exercise?.loadType ?? "weight";
  const exerciseDuration = parseExerciseDuration(item.reps); // secondi, null se non a tempo

  const restTotal = item.restSeconds || 60;

  useEffect(() => {
    if (!intraRest) return;
    const t = setTimeout(() => setIntraRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(t);
  }, [intraRest]);

  useEffect(() => {
    onDraftChange?.(item, {
      completed: isAlreadyDone,
      skipped: false,
      loadUsed: editLoad,
      rpe,
      notes,
      draftSetLoads: setLoads,
      draftActiveSetIdx: activeSetIdx,
      draftPhase: phase === "edit" ? "sets" : phase,
    });
  }, [activeSetIdx, editLoad, isAlreadyDone, item, notes, onDraftChange, phase, rpe, setLoads]);

  const handleSetDone = () => {
    if (activeSetIdx < totalSets - 1) {
      const nextIdx = activeSetIdx + 1;
      setSetLoads((prev) => {
        const next = [...prev];
        if (!next[nextIdx]) next[nextIdx] = prev[activeSetIdx];
        return next;
      });
      if (item.restSeconds) setIntraRest(item.restSeconds);
      setActiveSetIdx(nextIdx);
    } else {
      const all = [...setLoads];
      all[activeSetIdx] = setLoads[activeSetIdx];
      const suffix = loadType === "weight" ? " kg" : loadType === "time" ? " min" : "";
      const formatted = all.map((v) => {
        if (!v) return loadType === "body" ? "corpo libero" : "";
        return `${v}${suffix}`;
      });
      setEditLoad(formatted.filter(Boolean).join(" / ") || (loadType === "body" ? "corpo libero" : ""));
      setPhase("summary");
    }
  };

  const handleSave = () => onSave(item, {
    loadUsed: editLoad,
    rpe,
    notes,
    draftSetLoads: setLoads,
    draftActiveSetIdx: activeSetIdx,
    draftPhase: phase,
  });
  const isLastSet  = activeSetIdx === totalSets - 1;
  const restPct    = intraRest ? Math.max(0, (intraRest / restTotal) * 100) : 0;

  const { bg: mgBg, color: mgColor } = muscleGroup
    ? getMuscleGroupColor(muscleGroup)
    : { bg: "rgba(255,255,255,0.05)", color: "#555" };

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
      className="client-workout-sheet fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md overflow-y-auto rounded-t-3xl pb-10 pt-3 shadow-base"
      style={{ background: "#0e0e0e", maxHeight: "92vh" }}
    >
      <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "#2a2a2a" }} />
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-1 text-text-muted hover:text-text"
      >
        <X size={20} />
      </button>

      <div className="space-y-4 px-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: mgBg, color: mgColor }}
            >
              {muscleGroup || "Esercizio"}
            </span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-black uppercase leading-tight text-white">
            {item.exercise.name}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "#888" }}>
            {target.fullLabel}
            {item.restSeconds ? ` · rec ${item.restSeconds}s` : ""}
          </p>
        </div>

        {/* Illustration — sets phase only */}
        {phase === "sets" && illustrationId && (
          <div
            className="overflow-hidden rounded-2xl"
            style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
          >
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

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#39FF14" }}>
                {target.setWord[0].toUpperCase() + target.setWord.slice(1)} {activeSetIdx + 1} di {totalSets}
              </p>
              <p className="font-display text-xl font-black text-white">{target.actionLabel}</p>
            </div>

            {/* Intra-set rest */}
            {intraRest > 0 && (
              <div
                className="overflow-hidden rounded-xl p-3"
                style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted">Recupero tra serie</span>
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
                <button onClick={() => setIntraRest(0)} className="mt-2 text-[11px] text-text-muted hover:text-text">
                  Salta recupero
                </button>
              </div>
            )}

            <div className="space-y-3">
              {/* ── Serie in corso ── */}
              <span className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                {target.setWord[0].toUpperCase() + target.setWord.slice(1)} {activeSetIdx + 1}
                <span style={{ color: "#555" }}>
                  {" · "}
                  {loadType === "time" ? "a tempo" : loadType === "body" ? "corpo libero" : "carico in kg"}
                </span>
              </span>

              {/* ── Timer inline per esercizi a tempo ── */}
              {loadType === "time" && exerciseDuration && (
                <ExerciseSetTimer
                  totalSeconds={exerciseDuration}
                  onComplete={(secs) => {
                    const mins = Math.round(secs / 60 * 10) / 10;
                    const next = [...setLoads];
                    next[activeSetIdx] = String(mins);
                    setSetLoads(next);
                  }}
                />
              )}

              {/* ── Input numerico (nascosto per corpo libero) ── */}
              {loadType !== "body" && (
                <label className="block">
                  <div className="flex gap-2 items-center">
                    <Input
                      inputMode="decimal"
                      placeholder={loadType === "time" ? "es. 3" : "es. 60"}
                      value={setLoads[activeSetIdx]}
                      onChange={(e) => {
                        const next = [...setLoads];
                        next[activeSetIdx] = e.target.value;
                        setSetLoads(next);
                      }}
                      className="flex-1"
                    />
                    <span className="shrink-0 text-sm font-bold" style={{ color: "#555" }}>
                      {loadType === "time" ? "min" : "kg"}
                    </span>
                  </div>
                </label>
              )}
              {loadType === "body" && (
                <div className="rounded-lg px-3 py-2.5 text-sm font-semibold text-center" style={{ background: "#111", color: "#555" }}>
                  Corpo libero / nessun carico
                </div>
              )}
              {lastMaximal && (
                <div className="mt-2 space-y-1.5">
                  {/* Ultima rip badge */}
                  {(lastMaximal.loadUsed || lastMaximal.repsDone) && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                      style={{
                        background: "rgba(57,255,20,0.15)",
                        border: "1px solid rgba(57,255,20,0.5)",
                        color: "#39FF14",
                        boxShadow: "0 0 8px rgba(57,255,20,0.2)",
                      }}
                    >
                      ⚡ Ultima rip:{" "}
                      {[lastMaximal.loadUsed, lastMaximal.repsDone ? `${lastMaximal.repsDone} reps` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                  {/* RPE percepito */}
                  {lastMaximal.perceivedDifficulty && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                      style={{
                        background: "rgba(255,165,0,0.12)",
                        border: "1px solid rgba(255,165,0,0.35)",
                        color: "#FFA500",
                      }}
                    >
                      🔥 Sforzo percepito: {lastMaximal.perceivedDifficulty}/10
                    </span>
                  )}
                  {/* Note cliente */}
                  {lastMaximal.notes && (
                    <div
                      className="rounded-lg px-3 py-2 text-[11px] leading-relaxed"
                      style={{ background: "#111", border: "1px solid #222", color: "#aaa" }}
                    >
                      <span className="font-semibold" style={{ color: "#666" }}>📝 Tua nota: </span>
                      {lastMaximal.notes}
                    </div>
                  )}
                </div>
              )}
              {/* Note trainer */}
              {item.notes && (
                <div
                  className="rounded-lg px-3 py-2 text-[11px] leading-relaxed"
                  style={{ background: "rgba(57,255,20,0.05)", border: "1px solid rgba(57,255,20,0.2)", color: "#aaa" }}
                >
                  <span className="font-semibold" style={{ color: "#39FF14" }}>💬 Trainer: </span>
                  {item.notes}
                </div>
              )}
            </div>

            {!intraRest && (
              <Button className="w-full" onClick={handleSetDone}>
                <CheckCircle2 size={18} />
                {isLastSet ? `Ultimo ${target.setWord} — Completa` : `${target.setWord[0].toUpperCase() + target.setWord.slice(1)} ${activeSetIdx + 1} completato`}
              </Button>
            )}

            {/* Salta esercizio */}
            {onSkip && !intraRest && (
              <button
                type="button"
                onClick={() => onSkip(item)}
                className="w-full text-center text-xs font-semibold py-1"
                style={{ color: "#444" }}
              >
                ↩ Salta esercizio
              </button>
            )}
          </div>
        )}

        {/* ── PHASE: summary ── */}
        {phase === "summary" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.25)" }}
            >
              <p className="font-bold" style={{ color: "#39FF14" }}>
                ✓ {totalSets} {totalSets === 1 ? `${target.setWord} completato` : `${target.setWordPlural} completati`}!
              </p>
            </div>

            {totalSets > 1 && setLoads.some(Boolean) && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  {target.type === "time" ? "Note per blocco" : "Carichi per serie"}
                </p>
                {setLoads.map((load, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
                  >
                    <span className="text-xs text-text-muted">{target.setWord[0].toUpperCase() + target.setWord.slice(1)} {i + 1}</span>
                    <span className="text-xs font-semibold text-white">{load || "—"}</span>
                  </div>
                ))}
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                Carico riepilogo
              </span>
              <Input inputMode="text" placeholder="es. 60kg / 62.5kg"
                value={editLoad} onChange={(e) => setEditLoad(e.target.value)} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                Sforzo percepito (1–10)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <button
                    key={v} type="button" onClick={() => setRpe(String(v))}
                    className="h-9 w-9 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: rpe === String(v) ? "#39FF14" : "#1e1e1e",
                      color:      rpe === String(v) ? "#0a0a0a" : "#555",
                      border:     rpe === String(v) ? "none" : "1px solid #2a2a2a",
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
              <Textarea placeholder="Dolori, difficoltà, variante usata…" rows={2}
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <Button className="w-full" onClick={handleSave}>
              <Save size={18} /> Salva esercizio
            </Button>
            <button onClick={() => setPhase("sets")} className="w-full text-center text-xs text-text-muted hover:text-text">
              ← Torna alle serie
            </button>
          </motion.div>
        )}

        {/* ── PHASE: edit ── */}
        {phase === "edit" && (
          <div className="space-y-4">
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: "rgba(57,255,20,0.05)", border: "1px solid rgba(57,255,20,0.2)" }}
            >
              <p className="text-xs text-text-muted">Esercizio già completato — modifica se necessario</p>
            </div>

            {/* Badge sessione precedente (stessa logica della fase sets) */}
            {lastMaximal && (
              <div className="space-y-1.5">
                {(lastMaximal.loadUsed || lastMaximal.repsDone) && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                    style={{ background: "rgba(57,255,20,0.15)", border: "1px solid rgba(57,255,20,0.5)", color: "#39FF14", boxShadow: "0 0 8px rgba(57,255,20,0.2)" }}
                  >
                    ⚡ Ultima rip:{" "}
                    {[lastMaximal.loadUsed, lastMaximal.repsDone ? `${lastMaximal.repsDone} reps` : null].filter(Boolean).join(" · ")}
                  </span>
                )}
                {lastMaximal.perceivedDifficulty && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                    style={{ background: "rgba(255,165,0,0.12)", border: "1px solid rgba(255,165,0,0.35)", color: "#FFA500" }}
                  >
                    🔥 Sforzo: {lastMaximal.perceivedDifficulty}/10
                  </span>
                )}
                {lastMaximal.notes && (
                  <div className="rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background: "#111", border: "1px solid #222", color: "#aaa" }}>
                    <span className="font-semibold" style={{ color: "#666" }}>📝 Nota prec.: </span>{lastMaximal.notes}
                  </div>
                )}
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                Carico usato
              </span>
              <Input inputMode="text" placeholder="es. 60kg · corpo libero"
                value={editLoad} onChange={(e) => setEditLoad(e.target.value)} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                RPE (1–10)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <button
                    key={v} type="button" onClick={() => setRpe(String(v))}
                    className="h-9 w-9 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: rpe === String(v) ? "#39FF14" : "#1e1e1e",
                      color:      rpe === String(v) ? "#0a0a0a" : "#555",
                      border:     rpe === String(v) ? "none" : "1px solid #2a2a2a",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#888" }}>
                Note
              </span>
              <Textarea placeholder="Dolori, difficoltà, variante usata…" rows={2}
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <Button className="w-full" onClick={handleSave}>
              <Save size={18} /> Aggiorna esercizio
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── CelebrationScreen ─────────────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 54;

function CelebrationScreen({ workout, activeDay, items, logs, feedbackNotes, onFeedbackChange, onSave, isSaving }) {
  const navigate = useNavigate();

  const completedItems = items.filter((i) => logs[i.id]?.completed);
  const loadsUsed  = completedItems.filter((i) => logs[i.id]?.loadUsed).map((i) => logs[i.id].loadUsed);
  const rpeValues  = completedItems.filter((i) => logs[i.id]?.rpe).map((i) => Number(logs[i.id].rpe));
  const avgRpe     = rpeValues.length
    ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10
    : null;

  const days       = workout.days ?? [];
  const currentIdx = days.findIndex((d) => d.id === activeDay?.id);
  const nextDay    = currentIdx >= 0 && currentIdx < days.length - 1 ? days[currentIdx + 1] : null;

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
          className="absolute text-4xl"
        >
          🏆
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: "#39FF14" }}>
          100% · Sessione completata!
        </p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase leading-tight">
          Ottimo lavoro 💪
        </h2>
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
          { label: "Carichi",  value: loadsUsed.length || "—" },
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
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
            >
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
            Prossima sessione:{" "}
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
          <Textarea
            placeholder="Come è andata? Energia, dolori, note per il coach…"
            rows={3}
            value={feedbackNotes}
            onChange={(e) => onFeedbackChange(e.target.value)}
          />
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
          <button
            onClick={() => navigate("/area-cliente")}
            className="flex w-full items-center justify-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
          >
            <Home size={15} /> Torna alla Home
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── DayTabs ───────────────────────────────────────────────────────────────────

function DayTabs({ days, activeId, onChange }) {
  return (
    <div className="client-mission-days" role="tablist" aria-label="Giorno di allenamento">
      {days.map((day) => {
        const active = day.id === activeId;
        return (
          <button
            key={day.id}
            onClick={() => onChange(day.id)}
            role="tab"
            aria-selected={active}
            className={active ? "active" : ""}
          >
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
  const qc       = useQueryClient();
  const { setTabBarHidden } = useClientLayout();

  const [activeDayId, setActiveDayId] = useState(null);
  const [session, dispatchSession]    = useReducer(sessionReducer, SESSION_INIT);
  const { logs, feedbackNotes, phase, unlockedThrough } = session;

  const [sheetItem, setSheetItem]   = useState(null);
  const [restConfig, setRestConfig] = useState(null);

  // syncReady: true dopo aver eseguito il restore da sessionStorage per il giorno corrente
  const [syncReady, setSyncReady] = useState(false);

  const nodeRefs = useRef({});

  // Sblocca AudioContext su primo tap (requisito iOS per Web Audio API)
  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, []);

  // Hide tab bar when sheet or rest timer is active
  useEffect(() => {
    setTabBarHidden(!!sheetItem || !!restConfig);
    return () => setTabBarHidden(false);
  }, [sheetItem, restConfig, setTabBarHidden]);

  const workoutQuery = useQuery({
    queryKey: ["client", "active-workout"],
    queryFn:  () => apiFetch("/api/client/active-workout"),
  });

  const workout              = workoutQuery.data?.workout;
  const lastMaximalByItemId  = workoutQuery.data?.lastMaximalByItemId ?? {};
  const activeDay  = useMemo(() => {
    if (!workout?.days?.length) return null;
    return workout.days.find((d) => d.id === activeDayId) || workout.days[0];
  }, [workout, activeDayId]);

  // ── Restore da sessionStorage quando il giorno attivo è disponibile ──────────
  // Caso legittimo: sincronizzazione one-shot con storage esterno sincrono.
  // React 18 batcha le chiamate setState in un effect → nessun cascade render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!workout?.id || !activeDay?.id || syncReady) return;
    const saved = readProgress(workout.id, activeDay.id);
    if (saved) {
      const reachedFromLogs = activeDay.items.reduce((max, item, index) => {
        const log = saved.logs?.[item.id];
        return Math.max(max, log?.completed || log?.skipped ? index + 1 : log ? index : 0);
      }, 0);
      const allCompleted =
        activeDay.items?.length > 0 &&
        activeDay.items.every((item) => saved.logs?.[item.id]?.completed);
      dispatchSession({
        type: "RESTORE",
        payload: {
          ...saved,
          unlockedThrough: Math.max(
            0,
            Math.min(activeDay.items.length - 1, Math.max(saved.unlockedThrough ?? 0, reachedFromLogs))
          ),
          phase: saved.phase === "done" && !allCompleted ? "path" : saved.phase,
        },
      });
    }
    setSyncReady(true);
  }, [workout?.id, activeDay?.id, activeDay?.items, syncReady]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Persist su ogni cambio di stato rilevante (solo dopo il restore) ─────────
  useEffect(() => {
    if (!syncReady || !workout?.id || !activeDay?.id) return;
    writeProgress(workout.id, activeDay.id, { logs, feedbackNotes, phase, unlockedThrough });
  }, [syncReady, logs, feedbackNotes, phase, unlockedThrough, workout?.id, activeDay?.id]);

  const items     = useMemo(() => activeDay?.items ?? [], [activeDay]);
  const doneCount = useMemo(
    () => items.filter((it) => logs[it.id]?.completed).length,
    [items, logs]
  );
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const allSessions = workoutQuery.data?.sessions ?? [];
  const countedSessions = allSessions.filter(isCountedSession);
  const streak = calcWeeklyStreak(countedSessions, workout?.days?.length || 1);
  const skippedCount = items.filter((item) => logs[item.id]?.skipped).length;

  // Vale solo per QUESTO giorno di scheda: allenare il giorno A lunedì non deve
  // marcare come "già fatto" anche il giorno B. Si azzera il lunedì successivo.
  const currentWorkoutId = workout?.id;
  const currentDayId = activeDay?.id;
  const alreadyTrainedThisWeek = useMemo(() => {
    const sessions = workoutQuery.data?.sessions ?? [];
    if (!sessions.length || !currentWorkoutId || !currentDayId) return false;
    const monday = weekKey(new Date());
    return sessions.some(
      (s) =>
        s.workoutId === currentWorkoutId &&
        s.workoutDayId === currentDayId &&
        new Date(s.date).getTime() >= monday &&
        isCountedSession(s)
    );
  }, [workoutQuery.data?.sessions, currentWorkoutId, currentDayId]);

  const nodeStatus = useCallback(
    (item, idx) => {
      if (logs[item.id]?.skipped) return "skipped";
      if (logs[item.id]?.completed) return "done";
      const prevLog = logs[items[idx - 1]?.id];
      const prevPassed = idx === 0 || prevLog?.completed || prevLog?.skipped;
      return idx <= unlockedThrough || prevPassed ? "active" : "locked";
    },
    [logs, items, unlockedThrough]
  );

  const updateLog = useCallback((itemId, patch) => {
    dispatchSession({ type: "PATCH_LOG", id: itemId, patch });
  }, []);

  const handleSave = useCallback(
    (item, data) => {
      updateLog(item.id, { ...data, completed: true, skipped: false });
      setSheetItem(null);
      toast({ type: "success", title: "Esercizio completato! 💪" });

      const idx    = items.findIndex((i) => i.id === item.id);
      const isLast = idx === items.length - 1;
      dispatchSession({ type: "REACH", index: Math.min(idx + 1, items.length - 1) });
      const allCompleted = items.every((i) => i.id === item.id || logs[i.id]?.completed);

      if (allCompleted) {
        setTimeout(() => dispatchSession({ type: "SET_PHASE", value: "done" }), 500);
      } else if (isLast) {
        const firstPending = items.find((i) => i.id !== item.id && !logs[i.id]?.completed);
        setTimeout(() => {
          nodeRefs.current[firstPending?.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
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
    [items, logs, updateLog, toast]
  );

  const handleSkip = useCallback(
    (item) => {
      updateLog(item.id, { completed: false, skipped: true });
      setSheetItem(null);
      toast({ type: "info", title: "Esercizio saltato" });
      const idx = items.findIndex((i) => i.id === item.id);
      dispatchSession({ type: "REACH", index: Math.min(idx + 1, items.length - 1) });
      const nextItem = items[idx + 1];
      if (nextItem) {
        setTimeout(() => {
          nodeRefs.current[nextItem.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    },
    [items, updateLog, toast]
  );

  const handleDraftChange = useCallback(
    (item, patch) => {
      updateLog(item.id, patch);
    },
    [updateLog]
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
          workoutId:    workout.id,
          workoutDayId: activeDay.id,
          feedbackNotes,
          logs: items.map((item) => {
            const log = logs[item.id] || {};
            if (log.skipped) {
              return { workoutItemId: item.id, completed: false, skipped: true, loadUsed: null, rpe: null };
            }
            // loadValue: primo numero del carico registrato. L'unità la decide il
            // server dalla riga di scheda, il client non la dichiara.
            const first = String(log.loadUsed ?? "").replace(",", ".").match(/(\d+(?:\.\d+)?)/);
            return {
              workoutItemId: item.id,
              completed: !!log.completed,
              skipped: false,
              loadUsed: log.loadUsed ?? null,
              rpe: log.rpe ?? null,
              notes: log.notes ?? null,
              loadValue: first ? first[1] : null,
            };
          }),
        },
      }),
    onSuccess: async () => {
      // Cancella il progresso salvato: sessione completata, non serve più
      clearProgress(workout.id, activeDay.id);
      await qc.invalidateQueries({ queryKey: ["client", "active-workout"] });
      await qc.invalidateQueries({ queryKey: ["client", "overview"] });
      toast({ type: "success", title: "Sessione salvata! 🏆" });
      navigate("/area-cliente");
    },
    onError: (err) =>
      toast({ type: "error", title: "Salvataggio fallito", description: err.message }),
  });

  // ── Loading / error states ─────────────────────────────────────────────────
  if (workoutQuery.isLoading) return <EmptyState icon={Dumbbell} title="Carico la scheda…" />;

  if (workoutQuery.data?.access === "upgrade_required") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/area-cliente")}
          className="flex items-center gap-2 text-text-muted hover:text-text"
        >
          <ChevronLeft size={20} /> Home
        </button>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center space-y-5 rounded-lg p-6 text-center"
          style={{ background: "var(--client-surface)", border: "1px solid var(--client-line)" }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.3)" }}
          >
            <Lock size={26} style={{ color: "#ff6b6b" }} />
          </div>
          <div>
            <p className="font-display text-xl font-black uppercase text-text">
              Abbonamento non attivo
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Per accedere alle schede è necessario un abbonamento attivo.
            </p>
          </div>
          <Button className="w-full" onClick={() => navigate("/area-cliente/abbonamenti")}>
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
      <div className="client-workout-celebration">
        <CelebrationScreen
          workout={workout} activeDay={activeDay} items={items} logs={logs}
          feedbackNotes={feedbackNotes}
        onFeedbackChange={(v) => dispatchSession({ type: "SET_FEEDBACK", value: v })}
          onSave={() => saveSession.mutate()} isSaving={saveSession.isPending}
        />
      </div>
    );
  }

  return (
    <>
      <GymBackground />

      <div className="client-workout-path">
        {/* Header */}
        <header className="client-mission-header"><div><p>La tua missione</p><h1>Allenamento<span>.</span></h1></div><button onClick={() => navigate("/area-cliente")} aria-label="Torna alla Home"><ChevronLeft size={20} /></button></header>
        <div className="client-mission-stats"><div><Flame size={19} /><strong>{streak}</strong><span>settimane di fila</span></div><div><Zap size={19} /><strong>{countedSessions.length * 100}</strong><span>XP guadagnati</span></div></div>

        {/* Day tabs */}
        {workout.days.length > 1 && (
          <DayTabs
            days={workout.days}
            activeId={activeDay?.id}
            onChange={(id) => {
              // Resetta syncReady → il restore effect caricherà il progresso del nuovo giorno
              setSyncReady(false);
              setActiveDayId(id);
              dispatchSession({ type: "RESET_DAY" });
              setRestConfig(null);
            }}
          />
        )}

        <section className="client-mission-summary"><div><span>IL PERCORSO DI OGGI</span><h2>{activeDay?.label || workout.title}</h2><p>{items.length} esercizi · {workout.title}</p></div><div className="client-mission-ring" style={{ "--progress": `${pct}%` }}><strong>{doneCount}<small>/{items.length}</small></strong></div></section>

        {/* "Già allenato oggi" banner */}
        {alreadyTrainedThisWeek && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="client-mission-trained"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 size={15} /> Hai già completato questo allenamento questa settimana!
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              Puoi comunque aggiungere un&apos;altra sessione o modificare i dati.
            </p>
          </motion.div>
        )}

        {/* ── Percorso esercizi ── */}
        <div className="client-route-heading"><span><Zap size={15} /> {activeDay?.label || "PERCORSO"}</span><strong>{doneCount === items.length ? "Percorso completo" : skippedCount ? `${skippedCount} da riprendere` : "Prossima tappa"}</strong></div>
        <div className="client-path-map">
          {items.map((item, idx) => (
            <ExerciseNode
              key={item.id}
              item={item}
              index={idx}
              status={nodeStatus(item, idx)}
              previous={lastMaximalByItemId[item.id]}
              onClick={(it) => setSheetItem(it)}
              nodeRef={(el) => { nodeRefs.current[item.id] = el; }}
            />
          ))}
        </div>
        <div className={"client-path-finish " + (doneCount === items.length && items.length > 0 ? "complete" : "")}><Trophy size={21} /><span><strong>{doneCount === items.length && items.length > 0 ? "Percorso completato!" : "Traguardo"}</strong><small>{skippedCount ? "Riprendi le tappe saltate quando vuoi." : doneCount === items.length && items.length > 0 ? "Tutte le tappe conquistate." : "Completa tutte le tappe per arrivare qui."}</small></span></div>

        {/* Safety CTA when all done */}
        {doneCount === items.length && items.length > 0 && !restConfig && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div
              className="rounded-lg p-4 text-center"
              style={{ background: "var(--client-accent-soft)", border: "1px solid var(--client-line)" }}
            >
              <p className="text-2xl">🏆</p>
              <p className="mt-1 font-display text-base font-black uppercase" style={{ color: "var(--client-accent-ink)" }}>
                Tutti gli esercizi completati!
              </p>
            </div>
            <Button className="w-full" onClick={() => dispatchSession({ type: "SET_PHASE", value: "done" })}>
              <Sparkles size={18} /> Vedi il riepilogo
            </Button>
          </motion.div>
        )}

        {/* Sheet overlay */}
        <AnimatePresence>
          {sheetItem && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/70"
                onClick={() => setSheetItem(null)}
              />
              <ExerciseSheet
                item={sheetItem}
                log={logs[sheetItem.id]}
                lastMaximal={lastMaximalByItemId[sheetItem.id] ?? null}
                onClose={() => setSheetItem(null)}
                onDraftChange={handleDraftChange}
                onSave={handleSave}
                onSkip={handleSkip}
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
              nextExerciseName={
                items.find((i) => i.id === restConfig.nextItemId)?.exercise?.name ?? null
              }
              onSkip={handleRestSkip}
              onDone={handleRestDone}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
