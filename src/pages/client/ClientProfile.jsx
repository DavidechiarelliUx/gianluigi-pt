import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Dumbbell, Settings, TrendingUp, Video, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";

// ─── Level system ──────────────────────────────────────────────────────────────

const LEVELS = [
  { min: 0,    label: "Principiante", emoji: "🌱", color: "#888",    nextMin: 300 },
  { min: 300,  label: "Allenato",     emoji: "💪", color: "#00BFFF", nextMin: 700 },
  { min: 700,  label: "Dedicato",     emoji: "🔥", color: "#FF8C00", nextMin: 1500 },
  { min: 1500, label: "Atleta",       emoji: "⚡", color: "#FFD700", nextMin: 3000 },
  { min: 3000, label: "Campione",     emoji: "🏆", color: "#39FF14", nextMin: null },
];

const XP_PER_SESSION = 100;

function getLevel(xp) {
  return [...LEVELS].reverse().find((l) => xp >= l.min) || LEVELS[0];
}

// ─── Streak / month stats ──────────────────────────────────────────────────────

function computeStats(sessions) {
  const now = new Date();
  const thisMonth = sessions.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // "streak": sessions in last 14 days
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const recentSessions = sessions.filter((s) => new Date(s.date) >= twoWeeksAgo).length;

  return { thisMonth, recentSessions };
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function buildBadges({ totalSessions, messages, activePackage }) {
  return [
    { id: "first",   emoji: "🏅", label: "Primo allenamento",  earned: totalSessions >= 1 },
    { id: "three",   emoji: "💪", label: "3 sessioni",          earned: totalSessions >= 3 },
    { id: "five",    emoji: "🔥", label: "5 sessioni",          earned: totalSessions >= 5 },
    { id: "ten",     emoji: "⚡", label: "10 sessioni",         earned: totalSessions >= 10 },
    { id: "twenty",  emoji: "🏆", label: "20 sessioni",         earned: totalSessions >= 20 },
    { id: "feedback",emoji: "💬", label: "Feedback al coach",   earned: messages.length > 0 },
    { id: "package", emoji: "⭐", label: "Pacchetto attivo",    earned: !!activePackage },
  ];
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatChip({ value, label }) {
  return (
    <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
      <p className="font-display text-2xl font-black" style={{ color: "#39FF14" }}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
    </div>
  );
}

function BadgePill({ emoji, label, earned }) {
  return (
    <div
      className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl p-3"
      style={{
        background: earned ? "rgba(57,255,20,0.07)" : "#111",
        border: earned ? "1px solid rgba(57,255,20,0.3)" : "1px solid #1e1e1e",
        opacity: earned ? 1 : 0.4,
        minWidth: 72,
      }}
    >
      <span className="text-2xl" style={{ filter: earned ? "none" : "grayscale(1)" }}>{emoji}</span>
      <span className="text-center text-[10px] leading-tight text-text-muted">{label}</span>
    </div>
  );
}

function QuickAction({ icon: Icon, label, sublabel, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:brightness-110"
      style={{ background: "#111", border: "1px solid #1e1e1e" }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "rgba(57,255,20,0.1)" }}>
        <Icon size={20} style={{ color: "#39FF14" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold uppercase text-white">{label}</p>
        {sublabel && <p className="text-xs text-text-muted">{sublabel}</p>}
      </div>
      <ChevronRight size={16} className="text-text-muted" />
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ClientProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const overviewQuery = useQuery({
    queryKey: ["client", "overview"],
    queryFn: () => apiFetch("/api/client/overview"),
  });
  const workoutQuery = useQuery({
    queryKey: ["client", "active-workout"],
    queryFn: () => apiFetch("/api/client/active-workout"),
  });
  const messagesQuery = useQuery({
    queryKey: ["client", "messages"],
    queryFn: () => apiFetch("/api/client/messages"),
  });

  const activePackage = overviewQuery.data?.activePackage;
  const sessions = workoutQuery.data?.sessions || [];
  const messages = messagesQuery.data?.messages || [];

  const totalSessions = sessions.length;
  const xp = totalSessions * XP_PER_SESSION;
  const currentLevel = useMemo(() => getLevel(xp), [xp]);
  const nextLevel = useMemo(() => LEVELS.find((l) => l.min === currentLevel.nextMin), [currentLevel]);
  const xpInLevel = xp - currentLevel.min;
  const xpNeeded = nextLevel ? currentLevel.nextMin - currentLevel.min : 0;
  const xpPct = nextLevel ? Math.min(100, xpNeeded > 0 ? (xpInLevel / xpNeeded) * 100 : 100) : 100;

  const { thisMonth, recentSessions } = useMemo(() => computeStats(sessions), [sessions]);
  const badges = useMemo(
    () => buildBadges({ totalSessions, messages, activePackage }),
    [totalSessions, messages, activePackage]
  );
  const earnedBadges = badges.filter((b) => b.earned).length;

  const initials = user?.fullName
    ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="space-y-6 pb-4">
      {/* ── Avatar + level ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(57,255,20,0.1)", border: "2px solid rgba(57,255,20,0.4)" }}>
          <span className="font-display text-xl font-black" style={{ color: "#39FF14" }}>{initials}</span>
          {/* Level badge */}
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs"
            style={{ background: "#0a0a0a", border: "1.5px solid #1e1e1e" }}>
            {currentLevel.emoji}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-black uppercase leading-tight text-white">
            {user?.fullName || "Atleta"}
          </h2>
          <p className="text-sm font-semibold" style={{ color: currentLevel.color }}>
            Livello {LEVELS.indexOf(currentLevel) + 1} — {currentLevel.label} {currentLevel.emoji}
          </p>
        </div>
      </motion.div>

      {/* ── XP bar ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="space-y-1.5"
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold uppercase tracking-wide text-text-muted">
            {xp} XP
          </span>
          {nextLevel ? (
            <span className="text-text-muted">
              prossimo livello: <span className="font-semibold text-white">{nextLevel.label}</span> a {currentLevel.nextMin} XP
            </span>
          ) : (
            <span style={{ color: "#39FF14" }}>Livello massimo 🏆</span>
          )}
        </div>
        <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "#1a1a1a" }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${currentLevel.color}, #39FF14)`,
              boxShadow: `0 0 8px ${currentLevel.color}60`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      </motion.div>

      {/* ── Stats grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="flex gap-2"
      >
        <StatChip value={totalSessions} label="Sessioni tot." />
        <StatChip value={thisMonth} label="Questo mese" />
        <StatChip value={recentSessions} label="Ultime 2 sett." />
      </motion.div>

      {/* ── Badges ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase text-white">I tuoi badge</h2>
          <span className="text-xs text-text-muted">{earnedBadges}/{badges.length} sbloccati</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {badges.map((b) => (
            <BadgePill key={b.id} emoji={b.emoji} label={b.label} earned={b.earned} />
          ))}
        </div>
      </motion.div>

      {/* ── Motivational insight ── */}
      {totalSessions > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="rounded-2xl p-4"
          style={{ background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.2)" }}
        >
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: "#39FF14" }} />
            <p className="text-sm font-semibold text-white">
              {thisMonth > 0
                ? `${thisMonth} ${thisMonth === 1 ? "sessione" : "sessioni"} questo mese — continua così!`
                : "Nessuna sessione questo mese ancora — oggi è il giorno giusto!"}
            </p>
          </div>
          {totalSessions >= 3 && (
            <p className="mt-1 text-xs text-text-muted">
              {totalSessions >= 10
                ? "Sei nel tuo miglior periodo. Non mollare."
                : "Stai costruendo una routine solida. Ogni sessione conta."}
            </p>
          )}
        </motion.div>
      )}

      {/* ── Quick actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <h2 className="font-display text-sm font-bold uppercase text-text-muted">Azioni rapide</h2>
        <QuickAction
          icon={Dumbbell}
          label="Vai all'allenamento"
          sublabel="Apri la scheda di oggi"
          onClick={() => navigate("/area-cliente/allenamento")}
        />
        <QuickAction
          icon={Video}
          label="Sessioni Live"
          sublabel="Prenota una sessione con Gianluigi"
          onClick={() => navigate("/area-cliente/live")}
        />
        <QuickAction
          icon={TrendingUp}
          label="I tuoi progressi"
          sublabel="Storico allenamenti e misure"
          onClick={() => navigate("/area-cliente/storico")}
        />
      </motion.div>

      {/* ── Package summary ── */}
      {activePackage && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="rounded-2xl p-4"
          style={{ background: "#111", border: "1px solid #1e1e1e" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Pacchetto attivo</p>
          <h3 className="mt-1 font-display text-base font-black uppercase text-white">{activePackage.productName}</h3>
          {activePackage.sessionsQty ? (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-xs text-text-muted">
                <span>{activePackage.remainingSessions} sessioni residue</span>
                <span style={{ color: "#39FF14" }}>{activePackage.usedSessions}/{activePackage.sessionsQty}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#1a1a1a" }}>
                <div className="h-full rounded-full" style={{
                  background: "#39FF14",
                  width: `${(activePackage.usedSessions / activePackage.sessionsQty) * 100}%`,
                }} />
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs text-text-muted">Accesso piattaforma attivo</p>
          )}
        </motion.div>
      )}

      {/* ── Link to support ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
      >
        <button
          onClick={() => navigate("/area-cliente/supporto")}
          className="flex w-full items-center justify-between rounded-2xl p-4 text-left transition-colors hover:brightness-110"
          style={{ background: "#111", border: "1px solid #1e1e1e" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "#1a1a1a" }}>
              <Settings size={18} className="text-text-muted" />
            </div>
            <div>
              <p className="font-display text-sm font-bold uppercase text-white">Impostazioni & Supporto</p>
              <p className="text-xs text-text-muted">Account, app, contatti</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-text-muted" />
        </button>
      </motion.div>
    </div>
  );
}
