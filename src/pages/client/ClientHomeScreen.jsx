import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle, ArrowRight, CalendarCheck, Check, ChevronRight,
  Dumbbell, Flame, MessageCircle, Moon, Sun, Video, X,
} from "lucide-react";
import { EmptyState } from "../../components/app";
import { ExerciseIllustration } from "../../components/exercises/ExerciseIllustration";
import { getExerciseIllustrationId } from "../../components/exercises/exercise-data";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";
import { calcWeeklyStreak, isCountedSession } from "../../lib/sessionStats";
import { useClientLayout } from "./ClientLayoutContext";
import coachPhoto from "../../assets/gianluigi-chiarelli.webp";
import ClientWeeklyCheckIn from "./ClientWeeklyCheckIn";

function weekDays(sessions) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const trained = new Set(sessions.map((session) => {
    const date = new Date(session.date);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { ts: date.getTime(), label: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][index], day: date.getDate(), today: date.getTime() === today.getTime(), trained: trained.has(date.getTime()) };
  });
}

export default function ClientHomeScreen() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { theme, setTheme } = useClientLayout();
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const checkoutSessionId = searchParams.get("session_id");
  const [checkoutState, setCheckoutState] = useState({ status: checkoutSuccess ? "checking" : "idle", message: "Verifico il pagamento e aggiorno i tuoi crediti..." });

  useEffect(() => {
    if (!checkoutSuccess) return undefined;
    let cancelled = false;
    let timer;
    if (!checkoutSessionId) {
      queueMicrotask(() => {
        if (!cancelled) setCheckoutState({ status: "warning", message: "Pagamento effettuato. Se i crediti live non compaiono entro pochi secondi, ricarica l'app." });
      });
      return () => { cancelled = true; };
    }
    let attempts = 0;
    const verify = async () => {
      attempts += 1;
      setCheckoutState({ status: "checking", message: "Verifico il pagamento e aggiorno i tuoi crediti..." });
      try {
        const result = await apiFetch(`/api/payments/verify-session?session_id=${encodeURIComponent(checkoutSessionId)}`);
        if (cancelled) return;
        if (result.status === "paid") {
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["client", "overview"] }),
            qc.invalidateQueries({ queryKey: ["live", "sessions"] }),
            qc.invalidateQueries({ queryKey: ["payments", "orders"] }),
          ]);
          if (!cancelled) setCheckoutState({ status: "paid", message: "Pagamento confermato. I crediti live sono stati aggiornati nel tuo account." });
          return;
        }
        if (attempts < 4) { timer = window.setTimeout(verify, 1800); return; }
        setCheckoutState({ status: "warning", message: "Pagamento in verifica. Se i crediti live non compaiono a breve, ricarica l'app." });
      } catch {
        if (cancelled) return;
        if (attempts < 3) { timer = window.setTimeout(verify, 2000); return; }
        setCheckoutState({ status: "warning", message: "Pagamento effettuato, ma non sono riuscito ad aggiornare subito i crediti. Ricarica l'app tra qualche secondo." });
      }
    };
    verify();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [checkoutSuccess, checkoutSessionId, qc]);

  const overview = useQuery({ queryKey: ["client", "overview"], queryFn: () => apiFetch("/api/client/overview") });
  const workoutQuery = useQuery({ queryKey: ["client", "active-workout"], queryFn: () => apiFetch("/api/client/active-workout") });
  const liveQuery = useQuery({ queryKey: ["live", "sessions"], queryFn: () => apiFetch("/api/live/sessions"), retry: false });
  const workout = workoutQuery.data?.workout;
  const sessions = useMemo(() => workoutQuery.data?.sessions || [], [workoutQuery.data?.sessions]);
  const doneSessions = useMemo(() => sessions.filter(isCountedSession), [sessions]);
  const planSessions = workout ? doneSessions.filter((session) => session.workoutId === workout.id) : doneSessions;
  const streak = calcWeeklyStreak(doneSessions, workout?.days?.length || 1);
  const week = useMemo(() => weekDays(doneSessions), [doneSessions]);
  const weekCount = week.filter((day) => day.trained).length;
  const firstDay = workout?.days?.[0];
  const firstItem = firstDay?.items?.[0];
  const artId = firstItem?.exercise?.defaultNotes || getExerciseIllustrationId(firstItem?.exercise?.name || "");
  const today = new Date();
  const trainedToday = week.some((day) => day.today && day.trained);
  const nextLive = (liveQuery.data?.sessions || []).find((session) =>
    ["scheduled", "live"].includes(session.status) && session.bookings?.some((booking) => booking.status === "confirmed")
  );
  const lastSession = doneSessions[0];
  const lastDone = lastSession?.itemLogs?.filter((log) => log.completed).length ?? 0;
  const lastTotal = lastSession?.itemLogs?.length ?? 0;
  const subscription = overview.data?.subscription;
  const hasAppAccess = overview.data?.hasAppAccess ?? true;
  const firstName = user?.fullName?.split(" ")[0] || "Atleta";
  const dismissCheckoutBanner = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("checkout"); params.delete("session_id");
    setSearchParams(params, { replace: true });
  };

  if (workoutQuery.isLoading) return <EmptyState icon={Dumbbell} title="Carico la tua area..." />;
  if (workoutQuery.isError) return <EmptyState icon={Dumbbell} title="Area non disponibile" description="Non sono riuscito a caricare la scheda. Riprova tra poco." action={<button className="client-retry-button" onClick={() => workoutQuery.refetch()}>Riprova</button>} />;

  return (
    <div className="client-home">
      {checkoutSuccess && <div className={"client-notice " + (checkoutState.status === "warning" ? "warning" : "success")} role="status"><div><strong>{checkoutState.status === "checking" ? "Pagamento in elaborazione..." : checkoutState.status === "warning" ? "Pagamento in verifica" : "Pagamento confermato"}</strong><p>{checkoutState.message}</p></div><button onClick={dismissCheckoutBanner} aria-label="Chiudi avviso"><X size={17} /></button></div>}
      <header className="client-home-header">
        <div><p className="client-kicker">{today.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</p><h1>Ciao, {firstName}<span>.</span></h1><p>Un passo alla volta, si va avanti.</p></div>
        <div className="client-home-actions"><button className="client-icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"} title={theme === "dark" ? "Tema chiaro" : "Tema scuro"}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button><button className="client-coach-avatar" onClick={() => navigate("/area-cliente/contatta")} aria-label="Contatta Gianluigi"><img src={coachPhoto} alt="" /></button></div>
      </header>

      {subscription && subscription.status !== "none" && <button className={"client-subscription-strip " + (subscription.status === "past_due" ? "warning" : "")} onClick={() => navigate("/area-cliente/supporto")}><span><strong>{subscription.status === "past_due" ? "Pagamento in sospeso" : subscription.status === "canceled" ? "Abbonamento cancellato" : subscription.productName}</strong><small>{subscription.status === "past_due" ? "Controlla il tuo abbonamento" : subscription.cancelAtPeriodEnd && subscription.validUntil ? `Accesso valido fino al ${new Date(subscription.validUntil).toLocaleDateString("it-IT")}` : subscription.renewsAt ? `Si rinnova il ${new Date(subscription.renewsAt).toLocaleDateString("it-IT")}` : "Il tuo abbonamento"}</small></span><ChevronRight size={18} /></button>}
      {!hasAppAccess && !overview.isLoading && <div className="client-notice warning"><AlertCircle size={20} /><div><strong>Abbonamento non attivo</strong><p>Acquista un abbonamento per accedere alle schede e all'area allenamenti.</p><button onClick={() => navigate("/area-cliente/abbonamenti")}>Vedi abbonamenti <ArrowRight size={15} /></button></div></div>}

      <section className="client-week-panel">
        <div className="client-week-heading"><div><h2>Questa settimana</h2><p>{weekCount} {weekCount === 1 ? "allenamento" : "allenamenti"} su {workout?.days?.length || 1} previsti</p></div><strong>{weekCount}<small>/{workout?.days?.length || 1}</small></strong></div>
        <div className="client-week-strip" aria-label="Allenamenti questa settimana">{week.map((day) => <div key={day.ts} className={(day.today ? "today " : "") + (day.trained ? "trained" : "")}><span>{day.label}</span><strong>{day.trained ? <Check size={15} strokeWidth={3} /> : day.day}</strong></div>)}</div>
        <div className="client-progress-track"><i style={{ width: `${Math.min(100, weekCount / (workout?.days?.length || 1) * 100)}%` }} /></div>
      </section>

      <div className="client-section-heading"><h2>Il tuo allenamento</h2><button onClick={() => navigate("/area-cliente/allenamento")}>Vedi scheda <ArrowRight size={16} /></button></div>
      {workout ? <button className="client-featured-workout" onClick={() => navigate("/area-cliente/allenamento")}><ExerciseIllustration exercise={artId} className="client-feature-art" /><span className="client-feature-copy"><span><Dumbbell size={14} /> {trainedToday ? "ALLENATO OGGI" : "LA TUA SCHEDA"}</span><strong>{firstDay?.label || workout.title}</strong><small>{workout.title} · {firstDay?.items?.length || 0} esercizi</small><b>{trainedToday ? "Apri percorso" : "Inizia"} <ArrowRight size={17} /></b></span></button> : <EmptyState icon={Dumbbell} title="Nessuna scheda attiva" description="Gianluigi ti assegnerà presto la tua scheda." />}

      <div className="client-home-stats"><div><span><Dumbbell size={17} /></span><strong>{workout ? workoutQuery.data?.totalWorkoutSessions ?? planSessions.length : workoutQuery.data?.totalSessions ?? planSessions.length}</strong><small>sessioni con la scheda</small></div><div><span><Flame size={17} /></span><strong>{streak}</strong><small>settimane di fila</small></div></div>
      <ClientWeeklyCheckIn goal={overview.data?.goal} />

      {nextLive && <><div className="client-section-heading"><h2>In programma</h2></div><button className="client-event-row" onClick={() => navigate("/area-cliente/live")}><span className="client-event-date"><strong>{new Date(nextLive.scheduledAt).getDate()}</strong><small>{new Date(nextLive.scheduledAt).toLocaleDateString("it-IT", { month: "short" }).toUpperCase()}</small></span><span><strong>{nextLive.title}</strong><small>{new Date(nextLive.scheduledAt).toLocaleString("it-IT", { weekday: "long", hour: "2-digit", minute: "2-digit" })} · {nextLive.durationMin} min</small></span><Video size={18} /></button></>}
      {lastSession && <button className="client-last-row" onClick={() => navigate("/area-cliente/storico")}><span><CalendarCheck size={19} /></span><span><strong>Ultima sessione</strong><small>{new Date(lastSession.date).toLocaleDateString("it-IT", { day: "numeric", month: "long" })} · {lastDone}/{lastTotal} esercizi{lastSession.feedbackNotes ? ` · ${lastSession.feedbackNotes.slice(0, 30)}` : ""}</small></span><ChevronRight size={18} /></button>}
      {!sessions.length && workout && <p className="client-first-note"><Flame size={17} /> Inizia oggi e costruisci la tua streak.</p>}
      <button className="client-contact-row" onClick={() => navigate("/area-cliente/contatta")}><img src={coachPhoto} alt="" /><span><strong>Gianluigi è qui per te</strong><small>Scrivigli una domanda sulla scheda</small></span><MessageCircle size={17} /></button>
    </div>
  );
}
