import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Camera, ChevronRight, CreditCard, Dumbbell,
  ImagePlus, MessageCircle, Settings, TrendingUp, UserRound, Video, X, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/app";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";
import coachPhoto from "../../assets/gianluigi-chiarelli.webp";

const LEVELS = [
  { min: 0, label: "Principiante", emoji: "🌱", nextMin: 300 },
  { min: 300, label: "Allenato", emoji: "💪", nextMin: 700 },
  { min: 700, label: "Dedicato", emoji: "🔥", nextMin: 1500 },
  { min: 1500, label: "Atleta", emoji: "⚡", nextMin: 3000 },
  { min: 3000, label: "Campione", emoji: "🏆", nextMin: null },
];
const avatarKey = (identity) => `gianluigi-pt:avatar:${identity}`;
function loadAvatar(identity) { try { return localStorage.getItem(avatarKey(identity)) || ""; } catch { return ""; } }
function storeAvatar(identity, value) { try { if (value) localStorage.setItem(avatarKey(identity), value); else localStorage.removeItem(avatarKey(identity)); } catch { /* The image stays available until reload. */ } }
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, 400 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function ProfileRow({ icon: Icon, label, detail, onClick }) {
  return <button className="client-account-row" onClick={onClick}><span className="client-account-icon"><Icon size={19} /></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={18} /></button>;
}

export default function ClientProfileScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const identity = user?.id || user?.email || "";
  const [avatars, setAvatars] = useState({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const fileRef = useRef(null);
  const avatar = avatars[identity] ?? loadAvatar(identity);
  const saveAvatar = (value) => { storeAvatar(identity, value); setAvatars((current) => ({ ...current, [identity]: value })); setEditorOpen(false); setPhotoError(""); };
  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setPhotoError("Scegli un'immagine fino a 5 MB."); event.target.value = ""; return; }
    try { saveAvatar(await resizeImage(file)); }
    catch { setPhotoError("Impossibile aprire l'immagine."); }
    event.target.value = "";
  };
  const saveUrl = () => {
    try {
      const parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid URL");
      saveAvatar(parsed.href);
    } catch { setPhotoError("Inserisci un URL immagine valido."); }
  };

  const overview = useQuery({ queryKey: ["client", "overview"], queryFn: () => apiFetch("/api/client/overview") });
  const workoutQuery = useQuery({ queryKey: ["client", "active-workout"], queryFn: () => apiFetch("/api/client/active-workout") });
  const messagesQuery = useQuery({ queryKey: ["client", "messages"], queryFn: () => apiFetch("/api/client/messages") });
  const sessions = useMemo(() => workoutQuery.data?.sessions ?? [], [workoutQuery.data?.sessions]);
  const messages = useMemo(() => messagesQuery.data?.messages ?? [], [messagesQuery.data?.messages]);
  const totalSessions = overview.data?.totalSessions ?? sessions.length;
  const xp = totalSessions * 100;
  const levelIndex = Math.max(0, LEVELS.findLastIndex((level) => xp >= level.min));
  const level = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
  const progress = next ? Math.min(100, (xp - level.min) / (next.min - level.min) * 100) : 100;
  const now = new Date();
  const monthCount = sessions.filter((session) => { const date = new Date(session.date); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); }).length;
  const recentCount = sessions.filter((session) => new Date(session.date) >= new Date(now.getTime() - 14 * 86_400_000)).length;
  const activePackage = overview.data?.activePackage;
  const badges = [
    { emoji: "🏅", label: "Primo allenamento", earned: totalSessions >= 1 },
    { emoji: "💪", label: "3 sessioni", earned: totalSessions >= 3 },
    { emoji: "🔥", label: "5 sessioni", earned: totalSessions >= 5 },
    { emoji: "⚡", label: "10 sessioni", earned: totalSessions >= 10 },
    { emoji: "🏆", label: "20 sessioni", earned: totalSessions >= 20 },
    { emoji: "💬", label: "Feedback al coach", earned: messages.length > 0 },
    { emoji: "⭐", label: "Pacchetto attivo", earned: !!activePackage },
  ];
  const initials = user?.fullName ? user.fullName.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase() : "?";

  if (overview.isLoading || workoutQuery.isLoading || messagesQuery.isLoading) return <EmptyState icon={UserRound} title="Carico il profilo..." />;
  if (overview.isError || workoutQuery.isError || messagesQuery.isError) return <EmptyState icon={UserRound} title="Profilo non disponibile" description="Non sono riuscito a caricare tutti i tuoi dati." action={<button className="client-retry-button" onClick={() => { overview.refetch(); workoutQuery.refetch(); messagesQuery.refetch(); }}>Riprova</button>} />;

  return (
    <div className="client-profile">
      <header className="client-profile-heading"><div><p className="client-kicker">Il tuo spazio</p><h1>Profilo</h1></div><button className="client-icon-button" onClick={() => navigate("/area-cliente/supporto")} aria-label="Apri impostazioni"><Settings size={20} /></button></header>
      <section className="client-profile-hero"><button className="client-profile-avatar" onClick={() => setEditorOpen(true)} aria-label="Modifica foto profilo">{avatar ? <img src={avatar} alt="Foto profilo" onError={() => saveAvatar("")} /> : <span>{initials}</span>}<i><Camera size={14} /></i></button><div><h2>{user?.fullName || "Atleta"}</h2><p>Livello {levelIndex + 1} · {level.label} <span>{level.emoji}</span></p><button onClick={() => setEditorOpen(true)}>Modifica foto</button></div></section>
      {photoError && <p className="client-photo-error" role="alert">{photoError}</p>}
      <section className="client-profile-xp"><div><strong>{xp} XP</strong><span>{next ? `${next.label} a ${next.min} XP` : "Livello massimo"} <ArrowRight size={14} /></span></div><div><i style={{ width: `${progress}%` }} /></div></section>
      <div className="client-profile-stats"><div><strong>{totalSessions}</strong><span>Sessioni tot.</span></div><div><strong>{monthCount}</strong><span>Questo mese</span></div><div><strong>{recentCount}</strong><span>Ultime 2 sett.</span></div></div>
      <div className="client-section-heading"><h2>I tuoi badge</h2><small>{badges.filter((badge) => badge.earned).length}/{badges.length} SBLOCCATI</small></div>
      <div className="client-profile-badges">{badges.map((badge) => <div key={badge.label} className={badge.earned ? "earned" : "locked"}><span>{badge.emoji}</span><small>{badge.label}</small></div>)}</div>
      {totalSessions > 0 && <div className="client-profile-insight"><Zap size={19} /><div><strong>{monthCount > 0 ? `${monthCount} ${monthCount === 1 ? "sessione" : "sessioni"} questo mese: continua così!` : "Nessuna sessione questo mese: oggi è il momento giusto!"}</strong>{totalSessions >= 3 && <p>{totalSessions >= 10 ? "Sei nel tuo miglior periodo. Non mollare." : "Stai costruendo una routine solida. Ogni sessione conta."}</p>}</div></div>}
      <div className="client-section-heading"><h2>Azioni rapide</h2></div>
      <div className="client-account-list"><ProfileRow icon={Dumbbell} label="Vai all'allenamento" detail="Apri la scheda di oggi" onClick={() => navigate("/area-cliente/allenamento")} /><ProfileRow icon={Video} label="Sessioni live" detail="Prenota con Gianluigi" onClick={() => navigate("/area-cliente/live")} /><ProfileRow icon={TrendingUp} label="I tuoi progressi" detail="Storico e misure" onClick={() => navigate("/area-cliente/storico")} /></div>
      {activePackage && <div className="client-profile-package"><span>PACCHETTO ATTIVO</span><strong>{activePackage.productName}</strong>{activePackage.sessionsQty ? <><p>{activePackage.remainingSessions} sessioni residue · {activePackage.usedSessions}/{activePackage.sessionsQty} utilizzate</p><div><i style={{ width: `${Math.min(100, activePackage.usedSessions / activePackage.sessionsQty * 100)}%` }} /></div></> : <p>Accesso piattaforma attivo</p>}</div>}
      <div className="client-section-heading"><h2>Account</h2></div>
      <div className="client-account-list"><ProfileRow icon={MessageCircle} label="Scrivi a Gianluigi" detail="Messaggi e supporto" onClick={() => navigate("/area-cliente/contatta")} /><ProfileRow icon={CreditCard} label="Impostazioni e abbonamento" detail="Account, privacy e app" onClick={() => navigate("/area-cliente/supporto")} /></div>
      <div className="client-profile-coach"><img src={coachPhoto} alt="" /><span><strong>Gianluigi Chiarelli</strong><small>Il tuo personal trainer</small></span><button onClick={() => navigate("/area-cliente/contatta")} aria-label="Scrivi a Gianluigi"><MessageCircle size={19} /></button></div>
      {editorOpen && <div className="client-avatar-overlay" role="dialog" aria-modal="true" aria-label="Foto profilo"><button className="client-avatar-backdrop" onClick={() => setEditorOpen(false)} aria-label="Chiudi" /><div className="client-avatar-dialog"><div className="client-avatar-dialog-top"><strong>Foto profilo</strong><button onClick={() => setEditorOpen(false)} aria-label="Chiudi"><X size={19} /></button></div><button className="client-avatar-pick" onClick={() => fileRef.current?.click()}><ImagePlus size={18} /> Scegli dalla galleria</button><input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="sr-only" /><label>Oppure URL immagine<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></label><div><button onClick={saveUrl} disabled={!url.trim()}>Salva URL</button>{avatar && <button onClick={() => saveAvatar("")}>Rimuovi foto</button>}</div></div></div>}
    </div>
  );
}
