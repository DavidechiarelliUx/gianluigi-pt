import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell, CalendarDays, Check, ChevronRight, Clock3,
  CreditCard, Minus, Plus, Users, Video, Zap,
} from "lucide-react";
import { EmptyState } from "../../components/app";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";
import coachPhoto from "../../assets/gianluigi-chiarelli.webp";

const longDate = (value) => new Date(value).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const shortDate = (value) => new Date(value).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
const time = (value) => new Date(value).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const money = (cents = 0, currency = "eur") => new Intl.NumberFormat("it-IT", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
const discountFor = (product, quantity) => Math.max(
  Number(product?.discountPercent) || 0,
  ...(product?.discountTiers || []).filter((tier) => quantity >= Number(tier.minQty || 0)).map((tier) => Number(tier.discountPercent) || 0),
);
const countdown = (value, now) => {
  const remaining = Math.max(0, new Date(value).getTime() - now);
  return { days: Math.floor(remaining / 86_400_000), hours: Math.floor((remaining % 86_400_000) / 3_600_000), minutes: Math.floor((remaining % 3_600_000) / 60_000) };
};

function BookedSession({ session, now, onCancel, cancelling }) {
  const left = countdown(session.scheduledAt, now);
  const isLive = session.status === "live";
  return (
    <section className="client-live-booked">
      <div className="client-live-booked-top"><span><Video size={20} /></span><small className={isLive ? "is-live" : ""}><Check size={13} /> {isLive ? "LIVE ORA" : "PRENOTATA"}</small></div>
      <h3>{session.title}</h3>
      <p><CalendarDays size={15} /> {longDate(session.scheduledAt)} · {time(session.scheduledAt)}</p>
      {!isLive && <div className="client-live-countdown" aria-label="Tempo alla sessione"><span><strong>{left.days}</strong> giorni</span><span><strong>{left.hours}</strong> ore</span><span><strong>{left.minutes}</strong> min</span></div>}
      <div className="client-live-meta"><span><Clock3 size={14} /> {session.durationMin} min</span><span>{session.type === "solo" ? "Sessione 1:1" : "Sessione di gruppo"}</span></div>
      <div className="client-live-actions">
        {session.videoLink ? <a href={session.videoLink} target="_blank" rel="noopener noreferrer"><Video size={16} /> {isLive ? "Entra nella sessione" : "Vai alla sessione"}</a> : <span><Bell size={16} /> Link disponibile all'avvio</span>}
        {session.status === "scheduled" && session.myBookingId && <button onClick={() => onCancel(session.myBookingId)} disabled={cancelling}>Cancella</button>}
      </div>
    </section>
  );
}

function AvailableSession({ session, onBook, onBuy, booking, credits }) {
  const bookedCount = session._count?.bookings ?? 0;
  const full = bookedCount >= session.maxSlots;
  return (
    <section className="client-live-available">
      <div className="client-live-date"><strong>{new Date(session.scheduledAt).getDate()}</strong><small>{new Date(session.scheduledAt).toLocaleDateString("it-IT", { month: "short" }).toUpperCase()}</small></div>
      <div className="client-live-available-copy"><span>{session.type === "solo" ? "1:1" : "GRUPPO"}</span><h3>{session.title}</h3><p>{shortDate(session.scheduledAt)} · {time(session.scheduledAt)} · {session.durationMin} min</p>{session.type === "group" && <small><Users size={12} /> {bookedCount}/{session.maxSlots} posti</small>}</div>
      <button className="client-live-book-button" onClick={() => credits > 0 ? onBook(session.id) : onBuy()} disabled={full || booking} aria-label={full ? "Sessione completa" : credits > 0 ? `Prenota ${session.title}` : "Acquista live"} title={full ? "Completo" : credits > 0 ? "Prenota" : "Acquista live"}>{full ? <span>PIENO</span> : credits > 0 ? <ChevronRight size={19} /> : <Zap size={18} />}</button>
    </section>
  );
}

export default function ClientLiveScreen() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [quantity, setQuantity] = useState(1);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const sessionsQuery = useQuery({ queryKey: ["live", "sessions"], queryFn: () => apiFetch("/api/live/sessions") });
  const productsQuery = useQuery({ queryKey: ["payments", "products"], queryFn: () => apiFetch("/api/payments/products") });
  const sessions = sessionsQuery.data?.sessions || [];
  const credits = sessionsQuery.data?.liveCredits ?? 0;
  const product = productsQuery.data?.products?.find((item) => item.type === "session_solo" && item.active !== false);
  const discount = discountFor(product, quantity);
  const price = Math.round((product?.priceCents || 0) * (100 - discount) / 100) * quantity;
  const booked = sessions.filter((session) => session.bookings?.some((booking) => booking.status === "confirmed")).map((session) => ({ ...session, myBookingId: session.bookings.find((booking) => booking.status === "confirmed")?.id }));
  const available = sessions.filter((session) => !session.bookings?.some((booking) => booking.status === "confirmed"));
  const book = useMutation({
    mutationFn: (liveSessionId) => apiFetch("/api/live/bookings", { method: "POST", body: { liveSessionId } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["live", "sessions"] }); toast({ type: "success", title: "Prenotazione confermata!" }); },
    onError: (error) => toast({ type: "error", title: "Prenotazione fallita", description: error.message }),
  });
  const cancel = useMutation({
    mutationFn: (bookingId) => apiFetch("/api/live/bookings", { method: "DELETE", body: { bookingId } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["live", "sessions"] }); toast({ type: "success", title: "Prenotazione cancellata" }); },
    onError: (error) => toast({ type: "error", title: "Cancellazione fallita", description: error.message }),
  });
  const buy = async () => {
    if (!product || !user?.email) return;
    setBuying(true);
    try {
      const result = await apiFetch("/api/payments/checkout", { method: "POST", body: { productId: product.id, quantity, fullName: user.fullName, email: user.email, returnTo: "app" } });
      window.location.href = result.url;
    } catch (error) {
      toast({ type: "error", title: "Checkout non riuscito", description: error.message });
      setBuying(false);
    }
  };

  if (sessionsQuery.isLoading) return <EmptyState icon={CalendarDays} title="Carico le sessioni..." />;
  if (sessionsQuery.isError) return <EmptyState icon={CalendarDays} title="Live non disponibili" description="Non sono riuscito a caricare le sessioni e i tuoi crediti." action={<button className="client-retry-button" onClick={() => sessionsQuery.refetch()}>Riprova</button>} />;

  return (
    <div className="client-live-screen">
      <header className="client-screen-header"><div><p>Con Gianluigi, in diretta</p><h1>Sessioni live</h1></div><img src={coachPhoto} alt="Gianluigi Chiarelli" /></header>
      <section className="client-live-credit"><span><Video size={21} /></span><div><small>CREDITI LIVE</small><strong>{credits} <em>disponibili</em></strong></div>{product && <button onClick={() => setBuyOpen((open) => !open)} aria-label="Aggiungi crediti live" title="Aggiungi crediti"><Plus size={19} /></button>}</section>
      {buyOpen && product && <section className="client-live-buy"><div><strong>Aggiungi sessioni</strong><button onClick={() => setBuyOpen(false)} aria-label="Chiudi acquisto">Chiudi</button></div><p>Sessioni 1:1 con Gianluigi</p><div className="client-live-buy-controls"><span><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuisci live"><Minus size={16} /></button><strong>{quantity}</strong><button onClick={() => setQuantity((value) => Math.min(20, value + 1))} aria-label="Aumenta live"><Plus size={16} /></button></span><strong>{money(price, product.currency)}</strong></div>{discount > 0 && <small>Sconto {discount}% applicato</small>}<button className="client-live-buy-button" onClick={buy} disabled={buying}><CreditCard size={17} /> {buying ? "Apro il checkout..." : "Acquista live"}</button></section>}
      {booked.length > 0 && <><div className="client-section-heading"><h2>Le tue prenotazioni</h2><small>{booked.length} IN PROGRAMMA</small></div><div className="client-live-list">{booked.map((session) => <BookedSession key={session.id} session={session} now={now} onCancel={cancel.mutate} cancelling={cancel.isPending} />)}</div></>}
      <div className="client-section-heading"><h2>{booked.length ? "Altre sessioni" : "Sessioni disponibili"}</h2></div>
      {available.length ? <div className="client-live-list">{available.map((session) => <AvailableSession key={session.id} session={session} onBook={book.mutate} onBuy={() => setBuyOpen(true)} booking={book.isPending} credits={credits} />)}</div> : <p className="client-live-empty">{booked.length ? "Nessun'altra sessione disponibile." : "Gianluigi non ha ancora pubblicato sessioni live."}</p>}
    </div>
  );
}
