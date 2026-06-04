import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarCheck, Clock3, CreditCard, Video } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState, StatusBadge } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

function formatDate(dt) {
  return new Date(dt).toLocaleString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeUntil(dt, now) {
  const diff = new Date(dt).getTime() - now;
  if (diff <= 0) return "in corso / imminente";
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `inizia tra ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return `inizia tra ${hours}h ${rest ? `${rest}m` : ""}`.trim();
  const days = Math.floor(hours / 24);
  return `inizia tra ${days} giorni`;
}

export default function ClientLive() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [now, setNow] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["live", "sessions"],
    queryFn: () => apiFetch("/api/live/sessions"),
  });
  const sessions = data?.sessions || [];
  const paymentRequired = data?.access === "payment_required";

  const book = useMutation({
    mutationFn: (liveSessionId) =>
      apiFetch("/api/live/bookings", { method: "POST", body: { liveSessionId } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["live", "sessions"] });
      toast({ type: "success", title: "Prenotazione confermata!" });
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
          <p className="text-sm text-text-muted">Le live sono riservate ai clienti con pacchetto attivo.</p>
        </div>
        <EmptyState
          icon={CreditCard}
          title="Sblocca le sessioni live"
          description="Acquista un pacchetto o una sessione singola per prenotare le live con Gianluigi."
          action={
            <Button onClick={() => (window.location.href = "/pacchetti")}>
              Vedi pacchetti
            </Button>
          }
        />
      </div>
    );
  }

  // Separa prenotate e disponibili
  const booked = sessions.filter((s) => s.bookings?.some((b) => b.status === "confirmed"));
  const available = sessions.filter((s) => !s.bookings?.some((b) => b.status === "confirmed"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase">Sessioni Live</h1>
        <p className="text-sm text-text-muted">Prenota le sessioni con Gianluigi.</p>
      </div>

      {booked.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-sm font-bold uppercase text-accent">Le tue prenotazioni</h2>
          <div className="space-y-3">
            {booked.map((session) => {
              const myBooking = session.bookings?.find((b) => b.status === "confirmed");
              return (
                <Card key={session.id} className="border-accent/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-bold uppercase">{session.title}</h3>
                      <p className="mt-1 text-sm text-text-muted">{formatDate(session.scheduledAt)}</p>
                      <p className="flex items-center gap-1 text-xs text-accent">
                        <Clock3 size={13} /> {timeUntil(session.scheduledAt, now)}
                      </p>
                      <p className="text-xs text-text-muted">{session.durationMin} min</p>
                    </div>
                    <StatusBadge status="active">Prenotata</StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {session.videoLink && session.status === "live" && (
                      <a
                        href={session.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg"
                      >
                        <Video size={16} /> Entra nella sessione
                      </a>
                    )}
                    {session.status === "scheduled" && (
                      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-muted">
                        <Bell size={14} className="text-accent" /> Link disponibile quando la live parte
                      </div>
                    )}
                    {session.status === "scheduled" && myBooking && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancel.mutate(myBooking.id)}
                        disabled={cancel.isPending}
                      >
                        Cancella prenotazione
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {available.length > 0 ? (
        <div>
          <h2 className="mb-3 font-display text-sm font-bold uppercase text-text-muted">
            Sessioni disponibili
          </h2>
          <div className="space-y-3">
            {available.map((session) => {
              const bookedCount = session._count?.bookings ?? 0;
              const full = bookedCount >= session.maxSlots;
              return (
                <Card key={session.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold uppercase">{session.title}</h3>
                        <StatusBadge status={session.type === "solo" ? "active" : "warning"}>
                          {session.type === "solo" ? "1:1" : "Gruppo"}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-sm text-text-muted">{formatDate(session.scheduledAt)}</p>
                      <p className="flex items-center gap-1 text-xs text-accent">
                        <Clock3 size={13} /> {timeUntil(session.scheduledAt, now)}
                      </p>
                      <p className="text-xs text-text-muted">{session.durationMin} min</p>
                      {session.type === "group" && (
                        <p className="text-xs text-text-muted">
                          Posti: {bookedCount}/{session.maxSlots}
                          {full && <span className="ml-1 text-accent"> · Completo</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() => book.mutate(session.id)}
                      disabled={book.isPending || full}
                    >
                      {full ? "Completo" : "Prenota"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : booked.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nessuna sessione disponibile"
          description="Gianluigi non ha ancora pubblicato sessioni live."
        />
      ) : null}
    </div>
  );
}
