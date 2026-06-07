import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  Lock,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

// ─── Utilities ─────────────────────────────────────────────────────────────────

function formatDate(dt) {
  return new Date(dt).toLocaleString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dt) {
  return new Date(dt).toLocaleString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Returns structured countdown: { days, hours, minutes, isLive, isPast } */
function parseCountdown(dt, now) {
  const diff = new Date(dt).getTime() - now;
  if (diff <= 0) return { isLive: diff > -7200000, isPast: diff <= -7200000, days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { isLive: false, isPast: false, days, hours, minutes };
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function LiveBadge({ status, booked }) {
  if (status === "live") {
    return (
      <motion.span
        animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase"
        style={{ background: "#ff3b3b", color: "#fff" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        Live ora
      </motion.span>
    );
  }
  if (booked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase"
        style={{ background: "rgba(57,255,20,0.15)", color: "#39FF14", border: "1px solid rgba(57,255,20,0.4)" }}>
        <CheckCircle2 size={11} /> Prenotata
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase"
      style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>
      Disponibile
    </span>
  );
}

// ─── Featured booked session card ──────────────────────────────────────────────

function BookedCard({ session, now, onCancel, isCancelling }) {
  const cd = parseCountdown(session.scheduledAt, now);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(57,255,20,0.07) 0%, rgba(0,255,135,0.03) 100%)",
        border: "1px solid rgba(57,255,20,0.35)",
      }}
    >
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#39FF14" }}>
              Prossima sessione
            </p>
            <h3 className="mt-0.5 font-display text-xl font-black uppercase text-white">
              {session.title}
            </h3>
          </div>
          <LiveBadge status={session.status} booked />
        </div>

        {/* Date */}
        <div className="mb-4 flex items-center gap-2">
          <CalendarCheck size={14} style={{ color: "#39FF14" }} />
          <span className="text-sm capitalize text-text-muted">{formatDate(session.scheduledAt)}</span>
        </div>

        {/* Countdown */}
        {!cd.isLive && !cd.isPast && (
          <div className="mb-4 flex items-center gap-3">
            {cd.days > 0 && (
              <div className="text-center">
                <p className="font-display text-2xl font-black text-white">{cd.days}</p>
                <p className="text-[10px] uppercase text-text-muted">giorni</p>
              </div>
            )}
            {(cd.days > 0 || cd.hours > 0) && (
              <div className="text-center">
                <p className="font-display text-2xl font-black text-white">{cd.hours}</p>
                <p className="text-[10px] uppercase text-text-muted">ore</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-display text-2xl font-black text-white">{cd.minutes}</p>
              <p className="text-[10px] uppercase text-text-muted">min</p>
            </div>
            <p className="text-xs text-text-muted">al via</p>
          </div>
        )}

        {cd.isLive && (
          <div className="mb-4 rounded-xl py-2 text-center"
            style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)" }}>
            <p className="text-sm font-bold" style={{ color: "#ff6b6b" }}>La live è iniziata!</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {session.videoLink ? (
            <a
              href={session.videoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: "#39FF14", color: "#0a0a0a" }}
            >
              <Video size={16} />
              {session.status === "live" ? "Entra nella sessione" : "Vai alla sessione"}
            </a>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text-muted">
              <Bell size={13} className="text-accent" />
              Link disponibile all'avvio
            </div>
          )}
          {session.status === "scheduled" && session.myBookingId && (
            <button
              onClick={() => onCancel(session.myBookingId)}
              disabled={isCancelling}
              className="rounded-xl px-3 py-2 text-xs text-text-muted transition-colors hover:text-text"
            >
              Cancella prenotazione
            </button>
          )}
        </div>
      </div>

      {/* Duration bar */}
      <div className="border-t px-5 py-2.5" style={{ borderColor: "rgba(57,255,20,0.15)" }}>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Clock3 size={12} className="text-accent" />
          {session.durationMin} minuti
          {session.type === "solo" ? " · Sessione 1:1" : " · Sessione di gruppo"}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Available session card ────────────────────────────────────────────────────

function AvailableCard({ session, now, onBook, isBooking }) {
  const cd = parseCountdown(session.scheduledAt, now);
  const bookedCount = session._count?.bookings ?? 0;
  const full = bookedCount >= session.maxSlots;

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-bold uppercase text-white">{session.title}</h3>
          <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
            style={{
              background: session.type === "solo" ? "rgba(57,255,20,0.1)" : "rgba(255,165,0,0.1)",
              color: session.type === "solo" ? "#39FF14" : "#FFA500",
              border: `1px solid ${session.type === "solo" ? "rgba(57,255,20,0.3)" : "rgba(255,165,0,0.3)"}`,
            }}>
            {session.type === "solo" ? "1:1" : "Gruppo"}
          </span>
        </div>

        <p className="mb-2 text-sm capitalize text-text-muted">{formatShortDate(session.scheduledAt)}</p>

        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs" style={{ color: "#39FF14" }}>
            <Zap size={12} />
            {cd.days > 0 ? `${cd.days}g ${cd.hours}h` : cd.hours > 0 ? `${cd.hours}h ${cd.minutes}m` : `${cd.minutes}m`}
          </div>
          <span className="text-xs text-text-muted">{session.durationMin} min</span>
          {session.type === "group" && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Users size={11} />
              {bookedCount}/{session.maxSlots} posti
              {full && <span style={{ color: "#ff6b6b" }}> · Completo</span>}
            </span>
          )}
        </div>

        <Button size="sm" onClick={() => onBook(session.id)} disabled={isBooking || full}
          className="w-full">
          {full ? "Completo" : "Prenota"}
        </Button>
      </div>
    </div>
  );
}

// ─── Payment required ──────────────────────────────────────────────────────────

function LockedScreen({
  title = "Sessioni Live Premium",
  description = "Le live sono incluse negli abbonamenti App+Live e Premium.",
  ctaLabel = "Sblocca le Live",
}) {
  const navigate = useNavigate();

  const features = [
    "Sessioni 1:1 con Gianluigi",
    "Live di gruppo incluse",
    "Accesso al link della sessione",
    "Prenotazione con un tap",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[65vh] flex-col items-center justify-center space-y-6 px-2 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "rgba(57,255,20,0.07)", border: "1px solid rgba(57,255,20,0.25)" }}>
        <Lock size={30} style={{ color: "#39FF14" }} />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#39FF14" }}>
          Upgrade richiesto
        </p>
        <h2 className="mt-1 font-display text-2xl font-black uppercase">{title}</h2>
        <p className="mt-2 text-sm text-text-muted">{description}</p>
      </div>

      <div className="w-full space-y-2">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-2.5 rounded-xl p-3"
            style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
            <CheckCircle2 size={15} style={{ color: "#39FF14" }} />
            <span className="text-sm text-text-muted">{f}</span>
          </div>
        ))}
      </div>

      <div className="w-full space-y-3">
        <Button className="w-full" onClick={() => navigate("/area-cliente/abbonamenti")}>
          <CreditCard size={18} /> {ctaLabel}
        </Button>
        <p className="text-xs text-text-muted">Puoi cambiare abbonamento in qualsiasi momento</p>
      </div>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ClientLive() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [now, setNow] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => { window.cancelAnimationFrame(frame); window.clearInterval(timer); };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["live", "sessions"],
    queryFn: () => apiFetch("/api/live/sessions"),
  });

  const sessions = data?.sessions || [];
  const paymentRequired = data?.access === "payment_required";
  const upgradeRequired = data?.access === "upgrade_required"; // ha app ma non live

  const book = useMutation({
    mutationFn: (liveSessionId) =>
      apiFetch("/api/live/bookings", { method: "POST", body: { liveSessionId } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["live", "sessions"] });
      toast({ type: "success", title: "Prenotazione confermata! 🎉" });
    },
    onError: (err) => toast({ type: "error", title: "Prenotazione fallita", description: err.message }),
  });

  const cancel = useMutation({
    mutationFn: (bookingId) =>
      apiFetch("/api/live/bookings", { method: "DELETE", body: { bookingId } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["live", "sessions"] });
      toast({ type: "success", title: "Prenotazione cancellata" });
    },
    onError: (err) => toast({ type: "error", title: "Cancellazione fallita", description: err.message }),
  });

  if (isLoading) return <EmptyState icon={CalendarCheck} title="Carico le sessioni…" />;

  if (paymentRequired) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase">Sessioni Live</h1>
          <p className="text-sm text-text-muted">Con Gianluigi, in diretta.</p>
        </div>
        <LockedScreen />
      </div>
    );
  }

  if (upgradeRequired) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase">Sessioni Live</h1>
          <p className="text-sm text-text-muted">Con Gianluigi, in diretta.</p>
        </div>
        <LockedScreen
          title="Passa ad App + Live"
          description="Il tuo abbonamento attuale include solo la scheda. Per accedere alle live, passa ad App + Live o Premium."
          ctaLabel="Vedi upgrade"
        />
      </div>
    );
  }

  // Separate booked and available, attach myBookingId for easy access
  const booked = sessions
    .filter((s) => s.bookings?.some((b) => b.status === "confirmed"))
    .map((s) => ({
      ...s,
      myBookingId: s.bookings?.find((b) => b.status === "confirmed")?.id,
    }));

  const available = sessions.filter((s) => !s.bookings?.some((b) => b.status === "confirmed"));

  const hasAnything = booked.length > 0 || available.length > 0;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase">Sessioni Live</h1>
        <p className="text-sm text-text-muted">Allena con Gianluigi in diretta.</p>
      </div>

      {/* Booked sessions */}
      {booked.length > 0 && (
        <div className="space-y-3">
          {booked.map((session) => (
            <BookedCard
              key={session.id}
              session={session}
              now={now}
              onCancel={(id) => cancel.mutate(id)}
              isCancelling={cancel.isPending}
            />
          ))}
        </div>
      )}

      {/* Available sessions */}
      {available.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase text-text-muted">
            {booked.length > 0 ? "Altre sessioni disponibili" : "Sessioni disponibili"}
          </h2>
          {available.map((session) => (
            <AvailableCard
              key={session.id}
              session={session}
              now={now}
              onBook={(id) => book.mutate(id)}
              isBooking={book.isPending}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasAnything && (
        <EmptyState
          icon={CalendarCheck}
          title="Nessuna sessione disponibile"
          description="Gianluigi non ha ancora pubblicato sessioni live. Controlla tra poco!"
        />
      )}
    </div>
  );
}
