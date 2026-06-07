import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
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
import {
  getExerciseIllustrationId,
  getExerciseMuscleGroup,
  getMuscleGroupColor,
} from "../../components/exercises/exercise-data";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";
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

// ─── Session reducer — logs + feedbackNotes + phase in un unico stato ─────────

const SESSION_INIT = { logs: {}, feedbackNotes: "", phase: "path" };

function sessionReducer(state, action) {
  switch (action.type) {
    case "RESTORE":
      return { ...SESSION_INIT, ...action.payload };
    case "PATCH_LOG":
      return { ...state, logs: { ...state.logs, [action.id]: { ...state.logs[action.id], ...action.patch } } };
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

// ─── GymBackground ────────────────────────────────────────────────────────────

function GymBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Base dark */}
      <div className="absolute inset-0" style={{ background: "hsl(var(--bg))" }} />
      {/* Grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(57,255,20,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.025) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      {/* Top radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% -10%, rgba(57,255,20,0.07) 0%, transparent 60%)",
        }}
      />
      {/* Bottom vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.5) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}

// ─── PathConnector — diagonal SVG line between nodes ─────────────────────────

// LEFT_X / RIGHT_X: % from left where the circle center sits
const LEFT_X  = 26; // even nodes
const RIGHT_X = 74; // odd nodes

function PathConnector({ toLeft, status }) {
  const fromX = toLeft ? RIGHT_X : LEFT_X; // prev node
  const currX = toLeft ? LEFT_X : RIGHT_X; // current node
  const isDone   = status === "done";
  const isActive = status === "active";
  const color = isDone ? "#39FF14" : isActive ? "rgba(57,255,20,0.35)" : "#1c1c1c";

  return (
    <svg
      className="w-full"
      height="52"
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      {isDone && (
        <defs>
          <linearGradient id={`conn-grad-${toLeft}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#39FF14" />
            <stop offset="100%" stopColor="rgba(57,255,20,0.4)" />
          </linearGradient>
        </defs>
      )}
      <line
        x1={`${fromX}%`} y1="0"
        x2={`${currX}%`} y2="52"
        stroke={isDone ? `url(#conn-grad-${toLeft})` : color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={status === "locked" ? "5 7" : undefined}
        style={isDone ? { filter: "drop-shadow(0 0 4px rgba(57,255,20,0.6))" } : undefined}
      />
    </svg>
  );
}

// ─── ExerciseNode ─────────────────────────────────────────────────────────────

function ExerciseNode({ item, index, status, onClick, nodeRef }) {
  const isLeft       = index % 2 === 0;
  const illustrationId = resolveIllustrationId(item);
  const muscleGroup  = resolveMuscleGroup(item);
  const { bg, color } = muscleGroup ? getMuscleGroupColor(muscleGroup) : { bg: "rgba(255,255,255,0.05)", color: "#555" };

  const textColor =
    status === "done"   ? "#39FF14"
    : status === "active" ? "#ffffff"
    : "#2e2e2e";

  const subColor = status === "locked" ? "#1e1e1e" : "#555";

  return (
    <div ref={nodeRef} className="flex flex-col">
      {/* Diagonal connector from previous node */}
      {index > 0 && <PathConnector toLeft={isLeft} status={status} />}

      {/* Node row: circle offset left or right */}
      <div
        className="flex items-center gap-3 py-2"
        style={{
          paddingLeft:  isLeft  ? `calc(${LEFT_X}% - 32px)` : undefined,
          paddingRight: !isLeft ? `calc(${LEFT_X}% - 32px)` : undefined,
          flexDirection: isLeft ? "row" : "row-reverse",
        }}
      >
        {/* ── Circle / node button ── */}
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
                boxShadow: "0 0 22px rgba(57,255,20,0.55)",
              }}
            >
              <CheckCircle2 size={28} color="#0a0a0a" />
            </motion.div>
          )}

          {status === "active" && (
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 12px rgba(57,255,20,0.4)",
                  "0 0 30px rgba(57,255,20,0.85)",
                  "0 0 12px rgba(57,255,20,0.4)",
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2"
              style={{ background: illustrationId ? "#0d0d0d" : "rgba(57,255,20,0.12)", borderColor: "#39FF14" }}
            >
              {illustrationId ? (
                <ExerciseIllustration
                  exercise={illustrationId}
                  className="h-full w-full"
                  showBackground={false}
                />
              ) : (
                <span className="text-2xl">🏋️</span>
              )}
            </motion.div>
          )}

          {status === "locked" && (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border"
              style={{ background: "#0d0d0d", borderColor: "#1e1e1e" }}
            >
              <Lock size={20} color="#252525" />
            </div>
          )}
        </button>

        {/* ── Text label ── */}
        <div className={`min-w-0 flex-1 ${isLeft ? "text-left" : "text-right"}`}>
          <p
            className="truncate text-[12px] font-bold uppercase leading-tight tracking-wide"
            style={{ color: textColor }}
          >
            {item.exercise.name}
          </p>
          <p className="mt-0.5 text-[10px] leading-snug" style={{ color: subColor }}>
            {item.sets} × {item.reps}
            {item.restSeconds ? ` · rec ${item.restSeconds}s` : ""}
          </p>
          {muscleGroup && status !== "locked" && (
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: bg, color }}
            >
              {muscleGroup}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Full-screen rest timer ────────────────────────────────────────────────────

function RestTimer({ initialSeconds, nextExerciseName, onSkip, onDone }) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [total, setTotal]         = useState(initialSeconds);

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

// ─── ExerciseSheet — set-by-set tracking ──────────────────────────────────────

function ExerciseSheet({ item, log, onClose, onSave }) {
  const totalSets    = Math.min(10, Math.max(1, parseInt(String(item.sets ?? 1), 10) || 1));
  const isAlreadyDone = !!log?.completed;
  const illustrationId = resolveIllustrationId(item);
  const muscleGroup    = resolveMuscleGroup(item);

  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [setLoads, setSetLoads]         = useState(Array(totalSets).fill(""));
  const [phase, setPhase]               = useState(isAlreadyDone ? "edit" : "sets");
  const [intraRest, setIntraRest]       = useState(null);

  const [editLoad, setEditLoad] = useState(log?.loadUsed ?? "");
  const [rpe, setRpe]           = useState(log?.rpe ?? "");
  const [notes, setNotes]       = useState(log?.notes ?? "");

  const restTotal = item.restSeconds || 60;

  useEffect(() => {
    if (!intraRest) return;
    const t = setTimeout(() => setIntraRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(t);
  }, [intraRest]);

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
      const nonEmpty = all.filter(Boolean);
      setEditLoad(nonEmpty.join(" / "));
      setPhase("summary");
    }
  };

  const handleSave = () => onSave(item, { loadUsed: editLoad, rpe, notes });
  const isLastSet  = activeSetIdx === totalSets - 1;
  const restPct    = intraRest ? Math.max(0, (intraRest / restTotal) * 100) : 0;

  const { bg: mgBg, color: mgColor } = muscleGroup
    ? getMuscleGroupColor(muscleGroup)
    : { bg: "rgba(255,255,255,0.05)", color: "#555" };

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md overflow-y-auto rounded-t-3xl pb-10 pt-3 shadow-base"
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
            {item.sets} serie × {item.reps} rip
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
                Serie {activeSetIdx + 1} di {totalSets}
              </p>
              <p className="font-display text-xl font-black text-white">{item.reps} ripetizioni</p>
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

            {!intraRest && (
              <Button className="w-full" onClick={handleSetDone}>
                <CheckCircle2 size={18} />
                {isLastSet ? "Ultima serie — Completa" : `Serie ${activeSetIdx + 1} completata`}
              </Button>
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
                ✓ {totalSets} {totalSets === 1 ? "serie completata" : "serie completate"}!
              </p>
            </div>

            {totalSets > 1 && setLoads.some(Boolean) && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  Carichi per serie
                </p>
                {setLoads.map((load, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
                  >
                    <span className="text-xs text-text-muted">Serie {i + 1}</span>
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
              color:      active ? "#0a0a0a" : "#666",
              border:     active ? "none" : "1px solid #2a2a2a",
              boxShadow:  active ? "0 0 10px rgba(57,255,20,0.35)" : "none",
            }}
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
  const { logs, feedbackNotes, phase } = session;

  const [sheetItem, setSheetItem]   = useState(null);
  const [restConfig, setRestConfig] = useState(null);

  // syncReady: true dopo aver eseguito il restore da sessionStorage per il giorno corrente
  const [syncReady, setSyncReady] = useState(false);

  const nodeRefs = useRef({});

  // Hide tab bar when sheet or rest timer is active
  useEffect(() => {
    setTabBarHidden(!!sheetItem || !!restConfig);
    return () => setTabBarHidden(false);
  }, [sheetItem, restConfig, setTabBarHidden]);

  const workoutQuery = useQuery({
    queryKey: ["client", "active-workout"],
    queryFn:  () => apiFetch("/api/client/active-workout"),
  });

  const workout    = workoutQuery.data?.workout;
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
    if (saved) dispatchSession({ type: "RESTORE", payload: saved });
    setSyncReady(true);
  }, [workout?.id, activeDay?.id, syncReady]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Persist su ogni cambio di stato rilevante (solo dopo il restore) ─────────
  useEffect(() => {
    if (!syncReady || !workout?.id || !activeDay?.id) return;
    writeProgress(workout.id, activeDay.id, { logs, feedbackNotes, phase });
  }, [syncReady, logs, feedbackNotes, phase, workout?.id, activeDay?.id]);

  const items     = useMemo(() => activeDay?.items ?? [], [activeDay]);
  const doneCount = useMemo(
    () => items.filter((it) => logs[it.id]?.completed).length,
    [items, logs]
  );
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const alreadyTrainedToday = useMemo(() => {
    const sessions = workoutQuery.data?.sessions ?? [];
    if (!sessions.length) return false;
    const todayTs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    return sessions.some((s) => {
      const d = new Date(s.date); d.setHours(0, 0, 0, 0);
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
    dispatchSession({ type: "PATCH_LOG", id: itemId, patch });
  }, []);

  const handleSave = useCallback(
    (item, data) => {
      updateLog(item.id, { ...data, completed: true });
      setSheetItem(null);
      toast({ type: "success", title: "Esercizio completato! 💪" });

      const idx    = items.findIndex((i) => i.id === item.id);
      const isLast = idx === items.length - 1;

      if (isLast) {
        setTimeout(() => dispatchSession({ type: "SET_PHASE", value: "done" }), 500);
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
          workoutId:    workout.id,
          workoutDayId: activeDay.id,
          feedbackNotes,
          logs: items.map((item) => ({
            workoutItemId: item.id,
            ...(logs[item.id] || {}),
          })),
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
          className="flex flex-col items-center space-y-5 rounded-2xl p-6 text-center"
          style={{ background: "#111", border: "1px solid rgba(255,59,59,0.25)" }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.3)" }}
          >
            <Lock size={26} style={{ color: "#ff6b6b" }} />
          </div>
          <div>
            <p className="font-display text-xl font-black uppercase text-white">
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
      <>
        <GymBackground />
        <CelebrationScreen
          workout={workout} activeDay={activeDay} items={items} logs={logs}
          feedbackNotes={feedbackNotes}
        onFeedbackChange={(v) => dispatchSession({ type: "SET_FEEDBACK", value: v })}
          onSave={() => saveSession.mutate()} isSaving={saveSession.isPending}
        />
      </>
    );
  }

  return (
    <>
      <GymBackground />

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
            <h1 className="font-display text-xl font-black uppercase leading-none">
              {workout.title}
            </h1>
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
              // Resetta syncReady → il restore effect caricherà il progresso del nuovo giorno
              setSyncReady(false);
              setActiveDayId(id);
              dispatchSession({ type: "RESET_DAY" });
              setRestConfig(null);
            }}
          />
        )}

        {/* Progress bar */}
        <div>
          <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "#111" }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg,#39FF14,#00FF87)",
                boxShadow: pct > 0 ? "0 0 10px rgba(57,255,20,0.4)" : "none",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wide text-text-muted">
            <span>Percorso</span>
            <span style={{ color: pct > 0 ? "#39FF14" : undefined }}>{pct}%</span>
          </div>
        </div>

        {/* "Già allenato oggi" banner */}
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

        {/* ── Percorso esercizi ── */}
        <div className="py-2">
          {items.map((item, idx) => (
            <ExerciseNode
              key={item.id}
              item={item}
              index={idx}
              status={nodeStatus(item, idx)}
              onClick={(it) => setSheetItem(it)}
              nodeRef={(el) => { nodeRefs.current[item.id] = el; }}
            />
          ))}
        </div>

        {/* Safety CTA when all done */}
        {doneCount === items.length && items.length > 0 && !restConfig && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.3)" }}
            >
              <p className="text-2xl">🏆</p>
              <p className="mt-1 font-display text-base font-black uppercase" style={{ color: "#39FF14" }}>
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
                onClose={() => setSheetItem(null)}
                onSave={handleSave}
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
