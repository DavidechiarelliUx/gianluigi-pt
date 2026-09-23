import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, Check,
  ChevronRight, Dumbbell, Flame, Home, Mail, MessageCircle, Moon,
  Plus, Send,
  Sun, TrendingUp, UserRound, Video,
} from "lucide-react";
import WorkoutPreview from "./workout-preview";
import LivePreview from "./live-preview";
import { InstallPreview, PrivacyPreview, ProfilePreview, SettingsPreview } from "./profile-preview";
import coachPhoto from "../src/assets/gianluigi-chiarelli.webp";
import benchArt from "../src/assets/exercises/flat-bench-press.webp";
import rowArt from "../src/assets/exercises/dumbbell-row.webp";
import squatArt from "../src/assets/exercises/barbell-squat.webp";
import "./client-app.css";

const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
const demoPastSessions = [
  new Date(monday),
  new Date(new Date(monday).setDate(monday.getDate() + 1)),
  new Date(new Date(today).setDate(today.getDate() - 18)),
].filter((date) => date <= today);
const upcomingLive = new Date(today);
upcomingLive.setDate(today.getDate() + 3);
upcomingLive.setHours(10, 30, 0, 0);
const week = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(monday);
  date.setDate(monday.getDate() + index);
  return {
    label: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][index],
    day: date.getDate(),
    today: date.toDateString() === today.toDateString(),
    trained: index <= 1 && date <= today,
  };
});
const prettyDate = today.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const demoDays = [
  {
    id: "a", name: "Giorno A", focus: "Push", duration: "45 min", art: benchArt,
    exercises: [
      { id: "bench", name: "Panca piana", sets: "4 serie", reps: "8-10 rip.", rest: "90 sec", previous: "52,5 kg", lastReps: "8 rip.", art: benchArt },
      { id: "press", name: "Spinte manubri", sets: "3 serie", reps: "10 rip.", rest: "75 sec", previous: "22 kg", lastReps: "10 rip.", art: benchArt },
      { id: "lateral", name: "Alzate laterali", sets: "3 serie", reps: "12 rip.", rest: "60 sec", previous: "10 kg", lastReps: "12 rip.", art: rowArt },
    ],
  },
  {
    id: "b", name: "Giorno B", focus: "Pull", duration: "50 min", art: rowArt,
    exercises: [
      { id: "row", name: "Rematore manubrio", sets: "4 serie", reps: "10 rip.", rest: "90 sec", previous: "28 kg", lastReps: "10 rip.", art: rowArt },
      { id: "lat", name: "Lat machine", sets: "3 serie", reps: "10-12 rip.", rest: "75 sec", previous: "50 kg", lastReps: "12 rip.", art: rowArt },
      { id: "curl", name: "Curl bicipiti", sets: "3 serie", reps: "12 rip.", rest: "60 sec", previous: "12 kg", lastReps: "12 rip.", art: rowArt },
    ],
  },
  {
    id: "c", name: "Giorno C", focus: "Gambe", duration: "55 min", art: squatArt,
    exercises: [
      { id: "squat", name: "Squat con bilanciere", sets: "4 serie", reps: "8 rip.", rest: "120 sec", previous: "65 kg", lastReps: "8 rip.", art: squatArt },
      { id: "pressa", name: "Leg press", sets: "3 serie", reps: "12 rip.", rest: "90 sec", previous: "120 kg", lastReps: "12 rip.", art: squatArt },
      { id: "calf", name: "Calf raise", sets: "3 serie", reps: "15 rip.", rest: "60 sec", previous: "40 kg", lastReps: "15 rip.", art: squatArt },
    ],
  },
];
const strength = [
  { id: "panca", name: "Panca piana", group: "Petto", first: 45, current: 55, best: 55, data: [45, 47.5, 47.5, 50, 52.5, 55] },
  { id: "squat", name: "Squat con bilanciere", group: "Gambe", first: 50, current: 65, best: 65, data: [50, 52.5, 55, 57.5, 60, 65] },
  { id: "rematore", name: "Rematore manubrio", group: "Dorso", first: 22, current: 28, best: 28, data: [22, 24, 24, 26, 28] },
  { id: "plank", name: "Plank", group: "Core", first: null, current: null, best: null, data: [] },
];
const initialMessages = [
  { id: 1, from: "coach", text: "Ciao Andrea! Ho aggiornato la scheda per questa settimana. Come ti sei trovato con la panca?", time: "09:24" },
  { id: 2, from: "me", text: "Meglio! I 55 kg sono andati bene, ma nell'ultima serie ho faticato.", time: "10:12" },
  { id: 3, from: "coach", text: "Ottimo. Teniamo questo carico e curiamo la tecnica. Scrivimi dopo il prossimo allenamento.", time: "10:18" },
];
const messageSubjects = ["Domanda sulla scheda", "Problema tecnico", "Modifica esercizi", "Abbonamento / pagamento", "Altro"];
const formatValue = (value) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value);
const readPreviewState = (key, fallback) => {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};

function LineChart({ values, color = "var(--ui-accent)", id = "line" }) {
  if (values.length < 2) return null;
  const min = Math.min(...values) - 3;
  const max = Math.max(...values) + 3;
  const x = (index) => 16 + (index / (values.length - 1)) * 290;
  const y = (value) => 102 - ((value - min) / (max - min)) * 82;
  const path = values.map((value, index) => (index ? "L " : "M ") + x(index) + " " + y(value)).join(" ");
  const fill = path + " L 306 112 L 16 112 Z";
  return (
    <svg className="line-chart" viewBox="0 0 322 120" role="img" aria-label={"Andamento da " + values[0] + " a " + values.at(-1)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.2" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[32, 70, 108].map((gy) => <line key={gy} x1="16" x2="306" y1={gy} y2={gy} stroke="var(--ui-line-strong)" strokeDasharray="3 5" />)}
      <path d={fill} fill={"url(#" + id + ")"} />
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r={index === values.length - 1 ? 5 : 3} fill={color} stroke="#fff" strokeWidth="2" />)}
    </svg>
  );
}

function WeekStrip({ completedDays }) {
  return (
    <div className="week-strip" aria-label="Questa settimana">
      {week.map((day) => {
        const trained = day.trained || (day.today && completedDays > 0);
        return <div key={day.label} className={"week-day" + (day.today ? " is-today" : "") + (trained ? " is-trained" : "")}>
          <span>{day.label}</span>
          <strong>{trained ? <Check size={15} strokeWidth={3} /> : day.day}</strong>
        </div>;
      })}
    </div>
  );
}

function Header({ title, kicker, onBack, action }) {
  return (
    <header className="screen-header">
      <div className="screen-header-main">
        {onBack && <button className="icon-button back-button" onClick={onBack} aria-label="Indietro"><ArrowLeft size={20} /></button>}
        <div>
          {kicker && <p className="header-kicker">{kicker}</p>}
          <h1>{title}</h1>
        </div>
      </div>
      {action}
    </header>
  );
}

function HomeScreen({ go, openDay, theme, setTheme, stats, completedDays }) {
  const weeklyDone = Math.min(3, week.filter((day) => day.trained).length + (week.some((day) => day.today && day.trained) ? 0 : Math.min(1, completedDays)));
  return (
    <>
      <header className="home-header">
        <div>
          <p className="header-kicker">{prettyDate}</p>
          <h1>Ciao, Andrea<span className="wave">.</span></h1>
          <p className="home-subtitle">Un passo alla volta, si va avanti.</p>
        </div>
        <div className="home-actions">
          <button className="icon-button theme-icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"} title={theme === "dark" ? "Tema chiaro" : "Tema scuro"}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button className="avatar-button" onClick={() => go("chat")} aria-label="Apri la chat con Gianluigi">
            <img src={coachPhoto} alt="" />
            <span className="avatar-dot" />
          </button>
        </div>
      </header>

      <section className="week-panel">
        <div className="panel-heading">
          <div>
            <h2>Questa settimana</h2>
            <p>{weeklyDone} allenamenti su 3 previsti</p>
          </div>
          <span className="week-count">{weeklyDone}<span>/3</span></span>
        </div>
        <WeekStrip completedDays={completedDays} />
        <div className="progress-track"><span style={{ width: weeklyDone / 3 * 100 + "%" }} /></div>
      </section>

      <div className="section-title-row">
        <h2>Il tuo allenamento</h2>
        <button className="text-link" onClick={() => go("workout")}>Vedi scheda <ArrowRight size={15} /></button>
      </div>
      <button className="featured-workout" onClick={() => { openDay("b"); go("workout"); }}>
        <img src={rowArt} alt="" />
        <span className="featured-content">
          <span className="featured-pill"><Dumbbell size={13} /> OGGI</span>
          <strong>Giorno B<br />Pull</strong>
          <span>3 esercizi · 50 min</span>
          <span className="featured-action">Inizia <ArrowRight size={17} /></span>
        </span>
      </button>

      <div className="two-stat-row">
        <div><span className="stat-icon purple"><Activity size={17} /></span><strong>{stats.monthlySessions}</strong><span>sessioni questo mese</span></div>
        <div><span className="stat-icon coral"><Flame size={17} /></span><strong>{stats.streak}</strong><span>settimane di fila</span></div>
      </div>

      <div className="section-title-row"><h2>In programma</h2></div>
      <button className="event-row" onClick={() => go("live")}>
        <span className="event-date"><strong>{upcomingLive.getDate()}</strong><small>{upcomingLive.toLocaleDateString("it-IT", { month: "short" }).toUpperCase()}</small></span>
        <span className="event-copy"><strong>Live con Gianluigi</strong><small>{upcomingLive.toLocaleDateString("it-IT", { weekday: "long" })}, 10:30 · 45 min</small></span>
        <ChevronRight size={19} />
      </button>
      <button className="coach-row" onClick={() => go("chat")}>
        <img src={coachPhoto} alt="" />
        <span><strong>Gianluigi ti ha scritto</strong><small>“Teniamo questo carico e curiamo la tecnica.”</small></span>
        <ChevronRight size={18} />
      </button>
    </>
  );
}

function ProgressScreen({ go, mode, setMode, weight, setWeight, weeklyDone }) {
  const [selected, setSelected] = useState("panca");
  const [showForm, setShowForm] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const current = strength.find((item) => item.id === selected) || strength[0];
  const bodyValues = [74, 73.6, 73.1, weight];
  const saveWeight = (event) => {
    event.preventDefault();
    const parsed = Number(newWeight.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setWeight(parsed);
    setNewWeight("");
    setShowForm(false);
  };
  return (
    <>
      <Header title="Progressi" kicker="Il tuo percorso" action={<button className="icon-button" onClick={() => go("workout")} aria-label="Vai all'allenamento"><Dumbbell size={20} /></button>} />
      <div className="segment" role="tablist" aria-label="Tipo di progresso">
        <button role="tab" aria-selected={mode === "forza"} className={mode === "forza" ? "active" : ""} onClick={() => setMode("forza")}>Allenamento</button>
        <button role="tab" aria-selected={mode === "misure"} className={mode === "misure" ? "active" : ""} onClick={() => setMode("misure")}>Misure</button>
      </div>
      {mode === "forza" ? (
        <>
          <section className="consistency-block">
            <div className="section-title-row"><h2>La tua costanza</h2><span className="subtle-label">ULTIME 4 SETT.</span></div>
            <div className="consistency-head"><strong>{weeklyDone} <span>di 3</span></strong><p>allenamenti questa settimana</p></div>
            <div className="bar-chart">
              {[3, 2, 3, weeklyDone].map((value, index) => (
                <div key={index} className="bar-column">
                  <span>{value}</span>
                  <div className={"bar " + (index === 3 ? "selected" : "")} style={{ height: (value / 3) * 88 + "px" }} />
                  <small>{["31 ago", "7 set", "14 set", "Ora"][index]}</small>
                </div>
              ))}
            </div>
          </section>
          <div className="section-title-row strength-title"><h2>La tua forza</h2><span className="subtle-label">KG REGISTRATI</span></div>
          <div className="exercise-tabs" role="tablist" aria-label="Esercizio">
            {strength.map((item) => <button key={item.id} role="tab" aria-selected={selected === item.id} className={selected === item.id ? "active" : ""} onClick={() => setSelected(item.id)}>{item.name}</button>)}
          </div>
          <section className="strength-panel">
            <div className="strength-head"><div><span className="muted-label">{current.group}</span><h3>{current.name}</h3></div><span className="trend-badge">{current.current != null ? "+" + formatValue(current.current - current.first) + " kg" : "Corpo libero"}</span></div>
            {current.data.length ? (
              <>
                <div className="strength-numbers"><strong>{formatValue(current.current)} <small>kg</small></strong><span>Ultimo carico registrato</span></div>
                <LineChart key={current.id} values={current.data} id={"strength-" + current.id} />
                <div className="chart-legend"><span>PRIMO <strong>{formatValue(current.first)} kg</strong></span><span>MIGLIORE <strong>{formatValue(current.best)} kg</strong></span></div>
              </>
            ) : (
              <div className="no-load"><Dumbbell size={24} /><p>5 allenamenti eseguiti</p><span>Questo esercizio non prevede un carico in kg.</span></div>
            )}
          </section>
          <div className="section-title-row"><h2>Ultimi allenamenti</h2><button className="text-link" onClick={() => go("workout")}>Scheda <ArrowRight size={15} /></button></div>
          <div className="history-list">
            {demoPastSessions.map((date, index) => (
              <div key={date.toISOString()} className="history-row"><span className="history-date"><strong>{date.getDate()}</strong><small>{date.toLocaleDateString("it-IT", { month: "short" }).toUpperCase()}</small></span><span><strong>{["Giorno B · Pull", "Giorno A · Push", "Giorno C · Gambe"][index]}</strong><small>3 esercizi completati</small></span><Check size={16} /></div>
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="body-lead">
            <div className="section-title-row"><h2>Peso</h2><span className="subtle-label">ULTIMO CHECK-IN</span></div>
            <div className="body-number"><strong>{formatValue(weight)} <small>kg</small></strong><span>{weight === 74 ? "0" : (weight < 74 ? "−" : "+") + formatValue(Math.abs(74 - weight))} kg dall'inizio</span></div>
            <LineChart values={bodyValues} color="var(--ui-chart-secondary)" id="body-weight" />
            <div className="chart-legend"><span>PRIMO <strong>74 kg</strong></span><span>ORA <strong>{formatValue(weight)} kg</strong></span></div>
            {!showForm ? <button className="solid-button" onClick={() => setShowForm(true)}><Plus size={18} /> Registra peso</button> : (
              <form onSubmit={saveWeight} className="weight-form">
                <label>Il tuo peso oggi (kg)<input type="text" inputMode="decimal" value={newWeight} onChange={(event) => setNewWeight(event.target.value)} placeholder="es. 72,5" required /></label>
                <button type="submit" className="solid-button">Salva misura</button>
              </form>
            )}
          </section>
          <div className="section-title-row"><h2>Altre misure</h2></div>
          <div className="measure-list">
            {[["Vita", "80 cm", "−3 cm"], ["Torace", "98 cm", "+1 cm"], ["Fianchi", "92 cm", "−2 cm"]].map(([label, value, delta]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong><small>{delta} dall'inizio</small></div>
            ))}
          </div>
          <p className="measure-footnote">Ultimo check-in · {new Date(today.getTime() - 86_400_000).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</p>
        </>
      )}
    </>
  );
}

function ChatScreen({ messages, setMessages }) {
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState(messageSubjects[0]);
  const [whatsAppNotice, setWhatsAppNotice] = useState(false);
  const send = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setMessages((items) => [...items, { id: Date.now(), from: "me", subject, status: "Aperto", text: draft.trim(), time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) }]);
    setDraft("");
  };
  return (
    <>
      <Header title="Contatta Gianluigi" kicker="Il tuo coach" action={<img className="header-avatar" src={coachPhoto} alt="Gianluigi" />} />
      <div className="coach-status"><span className="online-dot" /><strong>Gianluigi Chiarelli</strong><span>Personal trainer</span></div>
      <div className="chat-date">MESSAGGI</div>
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={"message " + (message.from === "me" ? "mine" : "coach")}>
            {message.from === "coach" && <img src={coachPhoto} alt="" />}
            <div>{message.subject && <strong className="message-subject">{message.subject}</strong>}<p>{message.text}</p><small>{message.status && <span>{message.status} · </span>}{message.time}</small></div>
          </div>
        ))}
      </div>
      <form className="chat-compose" onSubmit={send}>
        <label className="chat-subject">Argomento<select value={subject} onChange={(event) => setSubject(event.target.value)}>{messageSubjects.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="sr-only" htmlFor="chat-message">Messaggio</label>
        <div><input id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Scrivi a Gianluigi..." /><button type="submit" aria-label="Invia messaggio" disabled={!draft.trim()}><Send size={18} /></button></div>
      </form>
      <div className="contact-channels"><button onClick={() => setWhatsAppNotice(true)}><MessageCircle size={17} /> WhatsApp</button><a href="mailto:gianluigi@gianluigipt.it"><Mail size={17} /> Email</a></div>
      {whatsAppNotice && <p className="contact-notice" role="status">Il numero WhatsApp non è ancora configurato in questa anteprima.</p>}
    </>
  );
}

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "progressi", label: "Progressi", icon: TrendingUp },
  { id: "workout", label: "Allenamento", icon: Plus, central: true },
  { id: "live", label: "Live", icon: Video },
  { id: "profile", label: "Profilo", icon: UserRound },
];

export function App() {
  const [view, setView] = useState("home");
  const [dayId, setDayId] = useState("b");
  const [entries, setEntries] = useState(() => readPreviewState("gpt-preview-entries", {}));
  const [reachedByDay, setReachedByDay] = useState(() => readPreviewState("gpt-preview-reached", {}));
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("gpt-preview-theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });
  const [progressMode, setProgressMode] = useState("forza");
  const [weight, setWeight] = useState(72.5);
  const [avatar, setAvatar] = useState(() => {
    try { return localStorage.getItem("gpt-preview-avatar") || ""; }
    catch { return ""; }
  });
  const [liveBookedIds, setLiveBookedIds] = useState(() => readPreviewState("gpt-preview-live-booked", ["technique"]));
  const [liveCredits, setLiveCredits] = useState(() => readPreviewState("gpt-preview-live-credits", 2));
  const [messages, setMessages] = useState(initialMessages);
  const completedDays = demoDays.filter((day) => day.exercises.every((exercise) => entries[exercise.id]?.status === "done")).length;
  const monthlySessions = demoPastSessions.filter((date) => date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()).length;
  const recentSessions = demoPastSessions.filter((date) => date >= new Date(today.getTime() - 14 * 86_400_000)).length;
  const stats = { totalSessions: 16 + completedDays, monthlySessions: monthlySessions + completedDays, recentSessions: recentSessions + completedDays, streak: 3, xp: 1600 + completedDays * 100 };
  const weeklyDone = Math.min(3, week.filter((day) => day.trained).length + (week.some((day) => day.today && day.trained) ? 0 : Math.min(1, completedDays)));
  useEffect(() => { try { sessionStorage.setItem("gpt-preview-entries", JSON.stringify(entries)); } catch { /* preview remains usable without storage */ } }, [entries]);
  useEffect(() => { try { sessionStorage.setItem("gpt-preview-reached", JSON.stringify(reachedByDay)); } catch { /* preview remains usable without storage */ } }, [reachedByDay]);
  useEffect(() => { try { sessionStorage.setItem("gpt-preview-live-booked", JSON.stringify(liveBookedIds)); } catch { /* preview remains usable without storage */ } }, [liveBookedIds]);
  useEffect(() => { try { sessionStorage.setItem("gpt-preview-live-credits", JSON.stringify(liveCredits)); } catch { /* preview remains usable without storage */ } }, [liveCredits]);
  useEffect(() => { try { localStorage.setItem("gpt-preview-theme", theme); } catch { /* preview remains usable without storage */ } }, [theme]);
  useEffect(() => { try { if (avatar) localStorage.setItem("gpt-preview-avatar", avatar); else localStorage.removeItem("gpt-preview-avatar"); } catch { /* preview remains usable without storage */ } }, [avatar]);
  const go = (next) => {
    if (next === "misure") setProgressMode("misure");
    setView(next === "misure" ? "progressi" : next);
    const screen = document.querySelector(".app-screen");
    if (screen) screen.scrollTop = 0;
  };
  const activeNav = useMemo(() => ["chat", "privacy", "settings", "install"].includes(view) ? "profile" : view, [view]);
  return (
    <div className="preview-stage" data-theme={theme}>
      <div className="preview-caption"><span className="caption-mark" /> Gianluigi PT <span>Anteprima area cliente · dati dimostrativi</span></div>
      <div className="client-device">
        <main className="app-screen" key={view}>
          {view === "home" && <HomeScreen go={go} openDay={setDayId} theme={theme} setTheme={setTheme} stats={stats} completedDays={completedDays} />}
          {view === "progressi" && <ProgressScreen go={go} mode={progressMode} setMode={setProgressMode} weight={weight} setWeight={setWeight} weeklyDone={weeklyDone} />}
          {view === "workout" && <WorkoutPreview days={demoDays} dayId={dayId} setDayId={setDayId} entries={entries} setEntries={setEntries} reachedByDay={reachedByDay} setReachedByDay={setReachedByDay} stats={stats} />}
          {view === "chat" && <ChatScreen messages={messages} setMessages={setMessages} />}
          {view === "profile" && <ProfilePreview go={go} avatar={avatar} setAvatar={setAvatar} stats={stats} />}
          {view === "live" && <LivePreview bookedIds={liveBookedIds} setBookedIds={setLiveBookedIds} credits={liveCredits} setCredits={setLiveCredits} />}
          {view === "settings" && <SettingsPreview go={go} theme={theme} setTheme={setTheme} />}
          {view === "privacy" && <PrivacyPreview go={go} />}
          {view === "install" && <InstallPreview go={go} />}
        </main>
        <nav className="app-nav" aria-label="Navigazione principale">
          {navItems.map(({ id, label, icon: Icon, central }) => (
            <button key={id} className={(activeNav === id ? "active " : "") + (central ? "central" : "")} onClick={() => go(id)} aria-current={activeNav === id ? "page" : undefined} aria-label={central ? "Apri allenamento" : label}>
              <span className="nav-icon"><Icon size={central ? 25 : 21} strokeWidth={central ? 2.4 : 2} /></span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
