import { useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Camera, Check, ChevronRight, CreditCard, Dumbbell,
  LogOut, Mail, MessageCircle, Moon, ShieldCheck, Smartphone, Sun,
  TrendingUp, UserRound, Video, Zap,
} from "lucide-react";
import coachPhoto from "../src/assets/gianluigi-chiarelli.webp";
import "./profile-preview.css";

const renewal = new Date();
renewal.setDate(renewal.getDate() + 9);
const renewalLabel = renewal.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
const badgesFor = (totalSessions) => [
  { icon: "🏅", label: "Primo allenamento", earned: totalSessions >= 1 },
  { icon: "💪", label: "3 sessioni", earned: totalSessions >= 3 },
  { icon: "🔥", label: "5 sessioni", earned: totalSessions >= 5 },
  { icon: "⚡", label: "10 sessioni", earned: totalSessions >= 10 },
  { icon: "🏆", label: "20 sessioni", earned: totalSessions >= 20 },
  { icon: "💬", label: "Feedback al coach", earned: true },
  { icon: "⭐", label: "Pacchetto attivo", earned: true },
];

function resizeAvatar(file) {
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

const privacySections = [
  { title: "Dati che raccogliamo", text: "Nome, email, telefono (opzionale), dati di allenamento (esercizi, carichi, RPE), sessioni completate e feedback. Nessun dato raccolto senza il tuo consenso." },
  { title: "Come vengono usati", text: "I tuoi dati servono esclusivamente per gestire le schede di allenamento, l'accesso alla piattaforma e comunicarti aggiornamenti relativi al tuo abbonamento. Non li vendiamo né cediamo a terzi." },
  { title: "Sicurezza", text: "La piattaforma usa HTTPS ovunque. Le password sono cifrate con bcrypt. I pagamenti sono gestiti interamente da Stripe (PCI DSS Level 1). Nessun dato di carta di credito viene memorizzato sui nostri server." },
  { title: "Cancellazione dati", text: "Puoi richiedere accesso, rettifica o cancellazione scrivendo a gianluigi@gianluigipt.it. Alcuni dati possono essere conservati per obblighi fiscali o tutela di diritti." },
  { title: "Email e comunicazioni", text: "Ti inviamo email solo per confermare acquisti, inviarti credenziali di accesso o notificarti scadenze abbonamento. Non facciamo spam né newsletter non richieste." },
  { title: "I tuoi diritti (GDPR)", text: "Hai diritto di accesso, rettifica, cancellazione e portabilità dei tuoi dati. Per esercitare questi diritti scrivi a gianluigi@gianluigipt.it con oggetto 'GDPR – Richiesta'." },
];

function AccountRow({ icon: Icon, label, value, onClick, trailing }) {
  const content = <><span className="account-row-icon"><Icon size={19} /></span><span className="account-row-copy"><strong>{label}</strong>{value && <small>{value}</small>}</span>{trailing || (onClick && <ChevronRight size={18} />)}</>;
  return onClick ? <button type="button" className="account-row" onClick={onClick}>{content}</button> : <div className="account-row">{content}</div>;
}

export function ProfilePreview({ go, avatar, setAvatar, stats }) {
  const fileRef = useRef(null);
  const [photoError, setPhotoError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const badges = badgesFor(stats.totalSessions);
  const earnedBadges = badges.filter((badge) => badge.earned).length;
  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setPhotoError("Scegli un'immagine fino a 5 MB."); event.target.value = ""; return; }
    try { setAvatar(await resizeAvatar(file)); setPhotoError(""); setEditorOpen(false); }
    catch { setPhotoError("Impossibile aprire l'immagine."); }
    event.target.value = "";
  };
  const savePhotoUrl = () => {
    try {
      const url = new URL(photoUrl.trim());
      if (!(["https:", "http:"].includes(url.protocol))) throw new Error("Invalid image URL");
      setAvatar(url.href);
      setEditorOpen(false);
      setPhotoError("");
    } catch { setPhotoError("Inserisci un URL immagine valido."); }
  };
  return (
    <>
      <header className="profile-page-heading"><div><p className="header-kicker">Il tuo spazio</p><h1>Profilo</h1></div><button className="icon-button" onClick={() => go("settings")} aria-label="Apri impostazioni"><ChevronRight size={20} /></button></header>
      <section className="profile-hero">
        <button className="profile-avatar" onClick={() => fileRef.current?.click()} aria-label="Modifica foto profilo">{avatar ? <img src={avatar} alt="Foto profilo" onError={() => setAvatar("")} /> : <span>AR</span>}<i><Camera size={14} /></i></button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFile} />
        <div className="profile-hero-copy"><h2>Andrea Rossi</h2><p>Livello 4 · Atleta <Zap size={14} fill="currentColor" /></p><button onClick={() => setEditorOpen((open) => !open)}>Modifica foto</button></div>
      </section>
      {photoError && <p className="profile-photo-error" role="alert">{photoError}</p>}
      {editorOpen && <div className="profile-avatar-editor"><button onClick={() => fileRef.current?.click()}><Camera size={15} /> Scegli foto</button><label>Oppure URL immagine<input type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://..." /></label><div><button disabled={!photoUrl.trim()} onClick={savePhotoUrl}>Salva URL</button>{avatar && <button onClick={() => { setAvatar(""); setEditorOpen(false); }}>Rimuovi foto</button>}</div></div>}
      <section className="profile-xp"><div><strong>{stats.xp} XP</strong><span>Campione a 3000 XP <ArrowRight size={14} /></span></div><div className="profile-xp-track"><i style={{ width: Math.min(100, (stats.xp - 1500) / 1500 * 100) + "%" }} /></div></section>
      <div className="profile-stat-grid"><div><strong>{stats.totalSessions}</strong><span>Sessioni tot.</span></div><div><strong>{stats.monthlySessions}</strong><span>Questo mese</span></div><div><strong>{stats.recentSessions}</strong><span>Ultime 2 sett.</span></div></div>
      <div className="section-title-row"><h2>I tuoi badge</h2><span className="subtle-label">{earnedBadges}/{badges.length} SBLOCCATI</span></div>
      <div className="profile-badges">{badges.map((badge) => <div key={badge.label} className={badge.earned ? "earned" : "locked"}><span>{badge.icon}</span><small>{badge.label}</small></div>)}</div>
      <div className="profile-insight"><Zap size={19} /><div><strong>{stats.monthlySessions > 0 ? `${stats.monthlySessions} ${stats.monthlySessions === 1 ? "sessione" : "sessioni"} questo mese: continua così!` : "Nessuna sessione questo mese: oggi è il momento giusto!"}</strong><p>{stats.totalSessions >= 10 ? "Sei nel tuo miglior periodo. Non mollare." : "Stai costruendo una routine solida. Ogni sessione conta."}</p></div></div>
      <div className="section-title-row"><h2>Azioni rapide</h2></div>
      <div className="account-list">
        <AccountRow icon={Dumbbell} label="Vai all'allenamento" value="Apri la scheda di oggi" onClick={() => go("workout")} />
        <AccountRow icon={Video} label="Sessioni live" value="Prenota con Gianluigi" onClick={() => go("live")} />
        <AccountRow icon={TrendingUp} label="I tuoi progressi" value="Storico e misure" onClick={() => go("progressi")} />
      </div>
      <div className="profile-package"><span>PACCHETTO ATTIVO</span><strong>Start</strong><p>Accesso piattaforma attivo</p></div>
      <div className="section-title-row"><h2>Account</h2></div>
      <div className="account-list"><AccountRow icon={MessageCircle} label="Scrivi a Gianluigi" value="Messaggi e supporto" onClick={() => go("chat")} /><AccountRow icon={CreditCard} label="Impostazioni e abbonamento" value="Account, privacy e app" onClick={() => go("settings")} /></div>
      <div className="profile-coach"><img src={coachPhoto} alt="" /><span><strong>Gianluigi Chiarelli</strong><small>Il tuo personal trainer</small></span><button onClick={() => go("chat")} aria-label="Scrivi a Gianluigi"><MessageCircle size={19} /></button></div>
    </>
  );
}

export function SettingsPreview({ go, theme, setTheme }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  return (
    <>
      <header className="screen-header"><div className="screen-header-main"><button className="icon-button back-button" onClick={() => go("profile")} aria-label="Indietro"><ArrowLeft size={20} /></button><div><p className="header-kicker">Account, app e supporto</p><h1>Impostazioni</h1></div></div></header>
      <div className="section-title-row"><h2>Account</h2></div>
      <div className="account-list"><AccountRow icon={UserRound} label="Andrea Rossi" value="Nome" /><AccountRow icon={Mail} label="andrea@example.com" value="Email" /></div>
      <div className="section-title-row"><h2>Il tuo abbonamento</h2></div>
      <section className="settings-subscription"><div><span>COACHING ONLINE</span><strong>Start</strong><small><Check size={14} /> Attivo</small></div><p>Si rinnova il {renewalLabel}</p><p>Include: App + Schede</p><div className="subscription-progress"><span><strong>Prossimo rinnovo</strong><b>{renewalLabel}</b></span><i><i style={{ width: "30%" }} /></i><span><small>Mancano 9 giorni</small><small>30% del periodo rimasto</small></span></div></section>
      <div className="section-title-row"><h2>Supporto</h2></div>
      <div className="account-list"><AccountRow icon={MessageCircle} label="Contatta Gianluigi" value="Scrivi un messaggio o WhatsApp" onClick={() => go("chat")} /><AccountRow icon={ShieldCheck} label="Privacy e sicurezza" value="Trattamento dei dati" onClick={() => go("privacy")} /></div>
      <div className="section-title-row"><h2>Applicazione</h2></div>
      <div className="account-list"><button type="button" className="account-row theme-setting" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} role="switch" aria-checked={theme === "dark"}><span className="account-row-icon">{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</span><span className="account-row-copy"><strong>Tema scuro</strong><small>Aspetto dell'app</small></span><i aria-hidden="true" className={theme === "dark" ? "on" : ""} /></button><AccountRow icon={Smartphone} label="Aggiungi alla schermata Home" value="Usa l'app dal telefono" onClick={() => go("install")} /><AccountRow icon={LogOut} label="Esci dall'app" value="Logout dal tuo account" onClick={() => setConfirmLogout(true)} /></div>
      {confirmLogout && <div className="account-confirm"><p>Uscire dall'account?</p><div><button onClick={() => setConfirmLogout(false)}>Annulla</button><button onClick={() => { setConfirmLogout(false); go("home"); }}>Esci</button></div></div>}
    </>
  );
}

export function PrivacyPreview({ go }) {
  return (
    <>
      <header className="screen-header"><div className="screen-header-main"><button className="icon-button back-button" onClick={() => go("settings")} aria-label="Indietro"><ArrowLeft size={20} /></button><div><p className="header-kicker">Trattamento dei tuoi dati</p><h1>Privacy e sicurezza</h1></div></div></header>
      <p className="privacy-intro">Gianluigi PT raccoglie solo i dati strettamente necessari al funzionamento del servizio. Non utilizziamo tracker, non vendiamo dati, non facciamo pubblicità.</p>
      <div className="privacy-sections">{privacySections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}</div>
      <footer className="privacy-footer"><p>Titolare del trattamento: Gianluigi Chiarelli</p><p>gianluigi@gianluigipt.it · P.IVA da inserire</p><p><a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy policy completa</a> · <a href="/cookie-policy" target="_blank" rel="noopener noreferrer">Cookie policy</a></p><small>Ultimo aggiornamento: luglio 2026</small></footer>
    </>
  );
}

export function InstallPreview({ go }) {
  return <><header className="screen-header"><div className="screen-header-main"><button className="icon-button back-button" onClick={() => go("settings")} aria-label="Indietro"><ArrowLeft size={20} /></button><div><p className="header-kicker">Applicazione</p><h1>Installa app</h1></div></div></header><div className="install-panel"><Smartphone size={29} /><h2>Gianluigi PT sul tuo telefono</h2><p>Accedi al tuo percorso direttamente dalla schermata Home.</p></div><div className="section-title-row"><h2>Installazione</h2></div><div className="install-steps"><p><strong>iPhone</strong> Apri il menu Condividi in Safari e seleziona “Aggiungi a Home”.</p><p><strong>Android</strong> Apri il menu del browser e seleziona “Installa app”.</p></div></>;
}
