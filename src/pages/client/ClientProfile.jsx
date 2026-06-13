import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronRight, Dumbbell, ImagePlus, Settings, TrendingUp, Video, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
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

function computeStats(sessions) {
  const now = new Date();
  const thisMonth = sessions.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const recentSessions = sessions.filter((s) => new Date(s.date) >= twoWeeksAgo).length;
  return { thisMonth, recentSessions };
}

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

// ─── Image resize via Canvas ───────────────────────────────────────────────────

/** Resize a File to max `maxDim` px on the longest side, returns base64 JPEG. */
function resizeImage(file, maxDim = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (evt) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Avatar storage helpers ────────────────────────────────────────────────────

const AVATAR_KEY = "gianluigi-pt:avatar";

function avatarKey(identity) {
  return identity ? `${AVATAR_KEY}:${identity}` : AVATAR_KEY;
}

function loadAvatar(identity) {
  try { return localStorage.getItem(avatarKey(identity)) || ""; } catch { return ""; }
}

function saveAvatarStorage(identity, url) {
  try {
    if (url) localStorage.setItem(avatarKey(identity), url);
    else localStorage.removeItem(avatarKey(identity));
  } catch { /* noop */ }
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

// ─── Avatar edit modal ─────────────────────────────────────────────────────────

function AvatarModal({ current, onSave, onClose }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(current);
  const [urlInput, setUrlInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Seleziona un file immagine."); return; }
    setError("");
    setProcessing(true);
    try {
      const resized = await resizeImage(file, 400);
      setPreview(resized);
      setUrlInput("");
    } catch {
      setError("Errore nell'elaborazione dell'immagine. Riprova.");
    } finally {
      setProcessing(false);
    }
  };

  const handleUrlChange = (e) => {
    setUrlInput(e.target.value);
    setPreview(e.target.value);
    setError("");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/70"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl px-5 pb-10 pt-4"
        style={{ background: "#111" }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full" style={{ background: "#333" }} />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-black uppercase text-white">Foto profilo</h3>
          <button onClick={onClose} className="rounded-full p-1 text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>

        {/* Preview */}
        <div className="mb-5 flex justify-center">
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full"
            style={{ background: "rgba(57,255,20,0.08)", border: "2px solid rgba(57,255,20,0.35)" }}
          >
            {preview ? (
              <img src={preview} alt="Anteprima" className="h-full w-full object-cover"
                onError={() => setPreview("")} />
            ) : (
              <Camera size={28} style={{ color: "#39FF14", opacity: 0.5 }} />
            )}
          </div>
        </div>

        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Primary CTA — device picker */}
        <button
          onClick={() => { setError(""); fileInputRef.current?.click(); }}
          disabled={processing}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-opacity disabled:opacity-60"
          style={{ background: "#39FF14", color: "#0a0a0a" }}
        >
          <ImagePlus size={18} />
          {processing ? "Elaborazione…" : "Scegli dalla galleria / Scatta foto"}
        </button>

        {error && <p className="mt-2 text-center text-xs" style={{ color: "#ff6b6b" }}>{error}</p>}

        {/* Secondary — URL fallback */}
        <div className="mt-4 space-y-1.5">
          <p className="text-[11px] text-text-muted">Oppure incolla un URL immagine</p>
          <Input
            placeholder="https://..."
            value={urlInput}
            onChange={handleUrlChange}
            inputMode="url"
          />
        </div>

        <div className="mt-5 space-y-2">
          <Button
            className="w-full"
            onClick={() => onSave(preview)}
            disabled={!preview || processing}
          >
            Salva foto
          </Button>
          {current && (
            <button
              onClick={() => { setPreview(""); onSave(""); }}
              className="w-full text-center text-sm text-text-muted hover:text-text"
            >
              Rimuovi foto
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ClientProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const avatarIdentity = user?.id || user?.email || "";

  // Avatar state (client-side, localStorage)
  const [avatars, setAvatars] = useState({});
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const avatar = avatars[avatarIdentity] ?? loadAvatar(avatarIdentity);

  const handleSaveAvatar = (url) => {
    saveAvatarStorage(avatarIdentity, url);
    setAvatars((value) => ({ ...value, [avatarIdentity]: url }));
    setShowAvatarModal(false);
  };

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
  const sessions = useMemo(() => workoutQuery.data?.sessions ?? [], [workoutQuery.data]);
  const messages = useMemo(() => messagesQuery.data?.messages ?? [], [messagesQuery.data]);

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
        {/* Tappable avatar */}
        <button
          onClick={() => setShowAvatarModal(true)}
          className="group relative shrink-0"
          aria-label="Modifica foto profilo"
        >
          <div
            className="flex h-16 w-16 overflow-hidden rounded-full"
            style={{ background: "rgba(57,255,20,0.1)", border: "2px solid rgba(57,255,20,0.4)" }}
          >
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="h-full w-full object-cover"
                onError={() => {
                  saveAvatarStorage(avatarIdentity, "");
                  setAvatars((value) => ({ ...value, [avatarIdentity]: "" }));
                }}
              />
            ) : (
              <span className="m-auto font-display text-xl font-black" style={{ color: "#39FF14" }}>
                {initials}
              </span>
            )}
          </div>
          {/* Camera overlay */}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
            <Camera size={18} className="text-white" />
          </div>
          {/* Level badge */}
          <span
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs"
            style={{ background: "#0a0a0a", border: "1.5px solid #1e1e1e" }}
          >
            {currentLevel.emoji}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-black uppercase leading-tight text-white">
            {user?.fullName || "Atleta"}
          </h2>
          <p className="text-sm font-semibold" style={{ color: currentLevel.color }}>
            Livello {LEVELS.indexOf(currentLevel) + 1} — {currentLevel.label} {currentLevel.emoji}
          </p>
          <button
            onClick={() => setShowAvatarModal(true)}
            className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted hover:text-text"
          >
            <Camera size={11} /> Modifica foto
          </button>
        </div>
      </motion.div>

      {/* ── XP bar ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="space-y-1.5"
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold uppercase tracking-wide text-text-muted">{xp} XP</span>
          {nextLevel ? (
            <span className="text-text-muted">
              → <span className="font-semibold text-white">{nextLevel.label}</span> a {currentLevel.nextMin} XP
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

      {/* ── Stats ── */}
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

      {/* ── Insight ── */}
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
                : "Nessuna sessione questo mese — oggi è il momento giusto!"}
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
        <QuickAction icon={Dumbbell} label="Vai all'allenamento" sublabel="Apri la scheda di oggi"
          onClick={() => navigate("/area-cliente/allenamento")} />
        <QuickAction icon={Video} label="Sessioni Live" sublabel="Prenota con Gianluigi"
          onClick={() => navigate("/area-cliente/live")} />
        <QuickAction icon={TrendingUp} label="I tuoi progressi" sublabel="Storico e misure"
          onClick={() => navigate("/area-cliente/storico")} />
      </motion.div>

      {/* ── Package ── */}
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

      {/* ── Settings link ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <button
          onClick={() => navigate("/area-cliente/supporto")}
          className="flex w-full items-center justify-between rounded-2xl p-4 text-left transition-colors hover:brightness-110"
          style={{ background: "#111", border: "1px solid #1e1e1e" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#1a1a1a" }}>
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

      {/* ── Avatar modal ── */}
      <AnimatePresence>
        {showAvatarModal && (
          <AvatarModal
            current={avatar}
            onSave={handleSaveAvatar}
            onClose={() => setShowAvatarModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
