import { useEffect, useState } from "react";
import {
  Bell, CalendarDays, Check, ChevronRight, Clock3, CreditCard, Minus,
  Plus, Users, Video, Zap,
} from "lucide-react";
import coachPhoto from "../src/assets/gianluigi-chiarelli.webp";
import "./live-preview.css";

const futureDate = (days, hour, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
};
const schedule = [
  { id: "technique", title: "Revisione tecnica 1:1", type: "solo", date: futureDate(3, 10, 30), duration: 45, slots: 1, bookedCount: 1 },
  { id: "mobility", title: "Mobilità e core", type: "group", date: futureDate(6, 18), duration: 50, slots: 8, bookedCount: 5 },
  { id: "planning", title: "Obiettivi del mese 1:1", type: "solo", date: futureDate(9, 11), duration: 45, slots: 1, bookedCount: 0 },
];
const longDate = (date) => date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const shortDate = (date) => date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
const time = (date) => date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const countdown = (date, now) => {
  const remaining = Math.max(0, date.getTime() - now);
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
  };
};

export default function LivePreview({ bookedIds, setBookedIds, credits, setCredits }) {
  const [quantity, setQuantity] = useState(1);
  const [buyOpen, setBuyOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const booked = schedule.filter((item) => bookedIds.includes(item.id));
  const available = schedule.filter((item) => !bookedIds.includes(item.id));
  const book = (id) => {
    if (credits < 1) { setBuyOpen(true); return; }
    setBookedIds((current) => [...current, id]);
    setCredits((current) => current - 1);
    setNotice("Prenotazione confermata");
  };
  const cancel = (id) => {
    setBookedIds((current) => current.filter((item) => item !== id));
    setCredits((current) => current + 1);
    setNotice("Prenotazione cancellata");
  };
  return (
    <>
      <header className="screen-header"><div><p className="header-kicker">Con Gianluigi, in diretta</p><h1>Sessioni live</h1></div><img className="header-avatar" src={coachPhoto} alt="Gianluigi Chiarelli" /></header>
      <section className="live-credit-summary"><span className="live-credit-icon"><Video size={21} /></span><div><span>CREDITI LIVE</span><strong>{credits} <small>disponibili</small></strong></div><button onClick={() => setBuyOpen((value) => !value)} aria-label="Aggiungi crediti live" title="Aggiungi crediti"><Plus size={19} /></button></section>
      {buyOpen && <section className="live-buy"><div><strong>Aggiungi sessioni</strong><button onClick={() => setBuyOpen(false)} aria-label="Chiudi acquisto">Chiudi</button></div><p>Sessioni 1:1 con Gianluigi</p><div className="live-buy-controls"><span className="live-stepper"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuisci live"><Minus size={16} /></button><strong>{quantity}</strong><button onClick={() => setQuantity((value) => Math.min(20, value + 1))} aria-label="Aumenta live"><Plus size={16} /></button></span><strong>{new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(quantity * 35)}</strong></div><button className="live-buy-button" onClick={() => { setCredits((value) => value + quantity); setBuyOpen(false); setNotice(`${quantity} ${quantity === 1 ? "credito aggiunto" : "crediti aggiunti"}`); }}><CreditCard size={17} /> Simula acquisto</button></section>}
      {notice && <p className="live-notice" role="status"><Check size={16} /> {notice}</p>}
      {booked.length > 0 && <><div className="section-title-row"><h2>Le tue prenotazioni</h2><span className="subtle-label">{booked.length} IN PROGRAMMA</span></div><div className="live-booked-list">{booked.map((session) => { const left = countdown(session.date, now); return <section key={session.id} className="live-booked"><div className="live-booked-top"><span className="live-booked-icon"><Video size={20} /></span><span className="live-booked-status"><Check size={13} /> PRENOTATA</span></div><h3>{session.title}</h3><p><CalendarDays size={15} /> {longDate(session.date)} · {time(session.date)}</p><div className="live-countdown" aria-label="Tempo alla sessione"><span><strong>{left.days}</strong> giorni</span><span><strong>{left.hours}</strong> ore</span><span><strong>{left.minutes}</strong> min</span></div><div className="live-booked-meta"><span><Clock3 size={14} /> {session.duration} min</span><span>{session.type === "solo" ? "Sessione 1:1" : "Sessione di gruppo"}</span></div><div className="live-booked-actions"><span><Bell size={16} /> Link disponibile all'avvio</span><button onClick={() => cancel(session.id)}>Cancella</button></div></section>; })}</div></>}
      <div className="section-title-row"><h2>Sessioni disponibili</h2></div>
      {available.length ? <div className="live-available-list">{available.map((session) => { const bookedCount = session.id === "technique" ? 0 : session.bookedCount; const full = bookedCount >= session.slots; return <section key={session.id} className="live-available"><div className="live-date-box"><strong>{session.date.getDate()}</strong><small>{session.date.toLocaleDateString("it-IT", { month: "short" }).toUpperCase()}</small></div><div className="live-available-copy"><span>{session.type === "solo" ? "1:1" : "GRUPPO"}</span><h3>{session.title}</h3><p>{shortDate(session.date)} · {time(session.date)} · {session.duration} min</p>{session.type === "group" && <small><Users size={12} /> {bookedCount}/{session.slots} posti</small>}</div><button className="live-book-button" onClick={() => book(session.id)} disabled={full} aria-label={full ? "Sessione completa" : `Prenota ${session.title}`} title={full ? "Completo" : credits ? "Prenota" : "Acquista live"}>{full ? <span>PIENO</span> : credits ? <ChevronRight size={19} /> : <Zap size={18} />}</button></section>; })}</div> : <p className="live-empty">Nessun'altra sessione disponibile.</p>}
    </>
  );
}
