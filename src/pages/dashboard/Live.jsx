import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Plus, Save, Trash2, Video } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState, Modal, StatusBadge } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

const EMPTY_FORM = {
  title: "",
  type: "solo",
  scheduledAt: "",
  durationMin: 60,
  maxSlots: 1,
  targetClientId: "",
  videoLink: "",
  notes: "",
};

const EMPTY_CREDIT_FORM = {
  clientId: "",
  amount: 1,
  note: "",
};

function sessionStatus(s) {
  if (s === "scheduled") return "active";
  if (s === "live") return "warning";
  if (s === "completed") return "success";
  return "archived";
}

function sessionStatusLabel(s) {
  return { scheduled: "Programmata", live: "In corso", completed: "Conclusa", cancelled: "Annullata" }[s] ?? s;
}

function formatDate(dt) {
  return new Date(dt).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Live() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editSession, setEditSession] = useState(null); // sessione selezionata per dettaglio
  const [form, setForm] = useState(EMPTY_FORM);
  const [creditForm, setCreditForm] = useState(EMPTY_CREDIT_FORM);

  const sessionsQuery = useQuery({
    queryKey: ["live", "sessions"],
    queryFn: () => apiFetch("/api/live/sessions"),
  });
  const sessions = useMemo(() => sessionsQuery.data?.sessions || [], [sessionsQuery.data]);

  const creditsQuery = useQuery({
    queryKey: ["admin", "live-credits"],
    queryFn: () => apiFetch("/api/admin/live-credits"),
  });
  const clients = useMemo(() => creditsQuery.data?.clients || [], [creditsQuery.data]);

  const createSession = useMutation({
    mutationFn: (payload) => apiFetch("/api/live/sessions", { method: "POST", body: payload }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["live", "sessions"] });
      await qc.invalidateQueries({ queryKey: ["admin", "live-credits"] });
      await qc.invalidateQueries({ queryKey: ["clients"] });
      await qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      const emailDescription =
        data?.emailSent > 0
          ? data.emailFailed > 0
            ? `${data.emailSent} email inviate, ${data.emailFailed} non inviate.`
            : data.emailSent === 1
              ? "Email inviata al cliente."
              : `${data.emailSent} email inviate ai clienti.`
          : data?.emailFailed > 0
            ? "Sessione creata. Email non inviata."
            : "Sessione creata.";
      toast({ type: "success", title: "Sessione live creata", description: emailDescription });
    },
    onError: (err) => toast({ type: "error", title: "Creazione fallita", description: err.message }),
  });

  const updateSession = useMutation({
    mutationFn: ({ id, ...data }) => apiFetch(`/api/live/session-detail?id=${id}`, { method: "PUT", body: data }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["live", "sessions"] });
      toast({ type: "success", title: "Sessione aggiornata" });
    },
    onError: (err) => toast({ type: "error", title: "Aggiornamento fallito", description: err.message }),
  });

  const deleteSession = useMutation({
    mutationFn: (session) => apiFetch(`/api/live/session-detail?id=${session.id}`, { method: "DELETE" }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["live", "sessions"] });
      await qc.invalidateQueries({ queryKey: ["admin", "live-credits"] });
      await qc.invalidateQueries({ queryKey: ["clients"] });
      await qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      setEditSession(null);
      toast({
        type: "success",
        title: "Live eliminata",
        description: data?.removedBookings ? `${data.removedBookings} prenotazioni collegate eliminate.` : "La live sbagliata è stata rimossa.",
      });
    },
    onError: (err) => toast({ type: "error", title: "Eliminazione fallita", description: err.message }),
  });

  const grantCredits = useMutation({
    mutationFn: (payload) => apiFetch("/api/admin/live-credits", { method: "POST", body: payload }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "live-credits"] });
      setCreditForm(EMPTY_CREDIT_FORM);
      toast({ type: "success", title: "Crediti live aggiunti" });
    },
    onError: (err) => toast({ type: "error", title: "Credito non aggiunto", description: err.message }),
  });

  const submitCreate = (e) => {
    e.preventDefault();
    createSession.mutate({
      ...form,
      durationMin: Number(form.durationMin),
      maxSlots: Number(form.maxSlots),
      targetClientId: form.type === "solo" ? form.targetClientId || null : null,
    });
  };

  const confirmDeleteSession = (session, event) => {
    event?.stopPropagation();
    const booked = session._count?.bookings || 0;
    const detail = booked
      ? `Questa live ha ${booked} prenotazioni confermate. Eliminandola rimuovi la live e ripristini i crediti scalati.`
      : "Questa live non ha prenotazioni confermate e verrà rimossa definitivamente.";
    if (!window.confirm(`${detail}\n\nVuoi eliminarla davvero?`)) return;
    deleteSession.mutate(session);
  };

  const submitCredits = (event) => {
    event.preventDefault();
    grantCredits.mutate({
      clientId: creditForm.clientId,
      amount: Number(creditForm.amount) || 1,
      note: creditForm.note,
    });
  };

  // Sessioni future ordinate
  const upcoming = sessions.filter((s) => s.status === "scheduled" || s.status === "live");
  const past = sessions.filter((s) => s.status === "completed" || s.status === "cancelled");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">Sessioni Live</h2>
          <p className="text-sm text-text-muted">Crea sessioni 1:1 o di gruppo e gestisci le prenotazioni.</p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setModalOpen(true);
          }}
        >
          <Plus size={18} /> Nuova sessione
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold uppercase">Aggiungi Crediti A Cliente </h3>
            <p className="text-sm text-text-muted">
              Seleziona un cliente e aggiungi sessioni live al suo account (questo serve in caso ci fossero problemi o per ricompense).
            </p>
          </div>
          {creditForm.clientId && (
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              Saldo: {clients.find((client) => client.id === creditForm.clientId)?.liveCredits ?? 0}
            </span>
          )}
        </div>
        <form className="grid gap-3 md:grid-cols-[1.3fr_0.5fr_1fr_auto]" onSubmit={submitCredits}>
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-text-muted">Cliente</span>
            <select
              value={creditForm.clientId}
              onChange={(event) => setCreditForm((value) => ({ ...value, clientId: event.target.value }))}
              className="h-11 w-full rounded-sm border border-border bg-surface-2 px-3 text-text focus:outline-none focus:ring-2 focus:ring-accent"
              required
            >
              <option value="">Seleziona cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.user?.fullName || client.user?.email} · {client.liveCredits} crediti
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-text-muted">Live</span>
            <Input
              type="number"
              min="1"
              max="100"
              value={creditForm.amount}
              onChange={(event) => setCreditForm((value) => ({ ...value, amount: event.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-text-muted">Nota</span>
            <Input
              placeholder="Es. bonus, recupero, acquisto offline"
              value={creditForm.note}
              onChange={(event) => setCreditForm((value) => ({ ...value, note: event.target.value }))}
            />
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={grantCredits.isPending || creditsQuery.isLoading}>
              <Plus size={16} /> Aggiungi
            </Button>
          </div>
        </form>
      </Card>

      {sessionsQuery.isLoading ? (
        <EmptyState icon={CalendarCheck} title="Carico le sessioni…" />
      ) : upcoming.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Nessuna sessione live" description="Crea la prima sessione per iniziare." />
      ) : (
        <div className="space-y-3">
          {upcoming.map((session) => {
            const booked = session._count?.bookings ?? 0;
            const full = booked >= session.maxSlots;
            return (
              <Card key={session.id} className="cursor-pointer hover:border-accent/40 transition-colors" onClick={() => setEditSession(session)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-bold uppercase">{session.title}</h3>
                      <StatusBadge status={sessionStatus(session.status)}>{sessionStatusLabel(session.status)}</StatusBadge>
                      <StatusBadge status={session.type === "solo" ? "active" : "warning"}>{session.type === "solo" ? "1:1" : "Gruppo"}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {formatDate(session.scheduledAt)} · {session.durationMin} min
                    </p>
                    <p className="text-xs text-text-muted">
                      Prenotati:{" "}
                      <span className={full ? "text-accent" : ""}>
                        {booked}/{session.maxSlots}
                      </span>
                      {session.targetClient?.user && <> · Cliente: {session.targetClient.user.fullName || session.targetClient.user.email}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {session.videoLink && (
                      <a
                        href={session.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <Video size={14} /> Link
                      </a>
                    )}
                    <Button size="sm" variant="danger" onClick={(event) => confirmDeleteSession(session, event)} disabled={deleteSession.isPending}>
                      <Trash2 size={14} /> Elimina
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Dettaglio sessione ── */}
      <Modal
        open={!!editSession}
        onClose={() => setEditSession(null)}
        title={editSession?.title || "Dettaglio sessione"}
        footer={
          <div className="flex w-full justify-between gap-3">
            <Button variant="danger" disabled={deleteSession.isPending} onClick={(event) => confirmDeleteSession(editSession, event)}>
              <Trash2 size={16} /> Elimina sessione
            </Button>
            <Button variant="ghost" onClick={() => setEditSession(null)}>
              Chiudi
            </Button>
          </div>
        }
      >
        {editSession && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs uppercase text-text-muted">Data/ora</div>
                <div>{formatDate(editSession.scheduledAt)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-text-muted">Durata</div>
                <div>{editSession.durationMin} min</div>
              </div>
              <div>
                <div className="text-xs uppercase text-text-muted">Tipo</div>
                <div>{editSession.type === "solo" ? "1:1" : "Gruppo"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-text-muted">Posti</div>
                <div>
                  {editSession._count?.bookings ?? 0}/{editSession.maxSlots}
                </div>
              </div>
            </div>
            {editSession.videoLink && (
              <div>
                <div className="text-xs uppercase text-text-muted">Link video</div>
                <a href={editSession.videoLink} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">
                  {editSession.videoLink}
                </a>
              </div>
            )}
            {editSession.notes && (
              <div>
                <div className="text-xs uppercase text-text-muted">Note</div>
                <div className="text-text-muted">{editSession.notes}</div>
              </div>
            )}
            <div>
              <div className="mb-2 text-xs uppercase text-text-muted">Aggiorna link video</div>
              <div className="flex gap-2">
                <Input placeholder="https://meet.google.com/..." defaultValue={editSession.videoLink || ""} id="video-link-input" className="flex-1" />
                <Button
                  size="sm"
                  onClick={() => {
                    const val = document.getElementById("video-link-input")?.value;
                    updateSession.mutate({ id: editSession.id, videoLink: val });
                  }}
                  disabled={updateSession.isPending}
                >
                  <Save size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Crea sessione ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuova sessione live"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" form="live-form" disabled={createSession.isPending}>
              Crea sessione
            </Button>
          </>
        }
      >
        <form id="live-form" onSubmit={submitCreate} className="space-y-3">
          <Input placeholder="Titolo (es. Allenamento 1:1 — Mario)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs uppercase text-text-muted">Tipo</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value,
                    maxSlots: e.target.value === "solo" ? 1 : 10,
                    targetClientId: e.target.value === "solo" ? form.targetClientId : "",
                  })
                }
                className="h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="solo">1:1</option>
                <option value="group">Gruppo</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase text-text-muted">Max posti</span>
              <Input type="number" min="1" value={form.maxSlots} onChange={(e) => setForm({ ...form, maxSlots: e.target.value })} />
            </label>
          </div>
          {form.type === "solo" && (
            <label className="block">
              <span className="mb-1 block text-xs uppercase text-text-muted">Cliente 1:1 dedicato</span>
              <select
                value={form.targetClientId}
                onChange={(e) => setForm({ ...form, targetClientId: e.target.value, maxSlots: 1 })}
                className="h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Nessun cliente specifico</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.user?.fullName || client.user?.email} · {client.liveCredits} crediti
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-muted">
                Se scegli un cliente, la live sarà visibile solo a lui, verrà prenotata automaticamente e scalerà 1 credito live.
              </p>
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-text-muted">Data e ora</span>
            <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-text-muted">Durata (minuti)</span>
            <Input type="number" min="15" step="15" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
          </label>
          <Input placeholder="Link video (Zoom/Meet) — opzionale" value={form.videoLink} onChange={(e) => setForm({ ...form, videoLink: e.target.value })} />
          <Textarea placeholder="Note interne (opzionale)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </form>
      </Modal>

      {/* Storico */}
      {past.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase text-text-muted">Storico</h3>
          <div className="space-y-2">
            {past.slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <span className="font-semibold">{session.title}</span>
                <span className="text-text-muted">{formatDate(session.scheduledAt)}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={sessionStatus(session.status)}>{sessionStatusLabel(session.status)}</StatusBadge>
                  <Button size="sm" variant="danger" onClick={() => confirmDeleteSession(session)} disabled={deleteSession.isPending}>
                    <Trash2 size={14} /> Elimina
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
