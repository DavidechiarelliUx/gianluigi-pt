import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  EyeOff,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  Unlock,
  Users,
  Video,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { DataList, DataTable, EmptyState, Modal, StatusBadge } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

const EMPTY_FORM = { fullName: "", email: "", phone: "", goal: "", notes: "" };

const money = (cents = 0, currency = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: currency.toUpperCase() }).format((cents || 0) / 100);

const shortDate = (value) =>
  value ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(value)) : "—";

const dateTime = (value) =>
  value ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";

function subscriptionStatusLabel(status) {
  const map = {
    active: "Attivo",
    trialing: "In prova",
    past_due: "Pagamento da verificare",
    canceled: "Cancellato",
  };
  return map[status] || "Abbonamento registrato";
}

function accessDeadline(summary) {
  if (!summary?.subscriptionStatus) return null;
  const hasDate = !!summary.subscriptionExpiresAt;
  return {
    date: summary.subscriptionExpiresAt,
    label: summary.subscriptionCancelAtPeriodEnd ? "Scadenza" : "Rinnovo",
    productName: summary.subscriptionProductName || "Abbonamento",
    status: summary.subscriptionStatus,
    hasDate,
  };
}

function clientStatus(client) {
  if (client.accessDisabledAt) return { label: "App chiusa", status: "danger" };
  if (client.user?.hasPassword) return { label: "Attivo", status: "success" };
  if (client.user?.inviteToken) return { label: "Invitato", status: "warning" };
  return { label: "Da invitare", status: "archived" };
}

function paymentStatus(summary) {
  const status = summary?.paymentStatus || "none";
  const map = {
    active: { label: "Attivo", status: "success" },
    paid: { label: "Pagato", status: "success" },
    pending: { label: "In attesa", status: "warning" },
    failed: { label: "Fallito", status: "danger" },
    refunded: { label: "Rimborsato", status: "neutral" },
    none: { label: "Nessun pagamento", status: "archived" },
  };
  return map[status] || map.none;
}

function whatsappHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function parseLoadNumber(value) {
  if (!value) return null;
  const match = String(value).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function workoutItemsById(session) {
  const map = new Map();
  for (const day of session?.workout?.days || []) {
    for (const item of day.items || []) {
      map.set(item.id, item);
    }
  }
  return map;
}

function completedLogs(session) {
  return (session?.itemLogs || []).filter((log) => log.completed);
}

function isTrainingSession(session) {
  return session?.status === "completed" || completedLogs(session).length > 0;
}

function sessionCompletion(session) {
  const logs = session?.itemLogs || [];
  const total = logs.length;
  const completed = completedLogs(session).length;
  return {
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

function buildTrainingSummary(sessions = []) {
  const trainingSessions = sessions.filter(isTrainingSession);
  const completions = trainingSessions.map(sessionCompletion);
  const loadLogs = trainingSessions.flatMap((session) => (session.itemLogs || []).filter((log) => log.loadUsed));
  const rpeValues = trainingSessions
    .map((session) => Number(session.feedbackDifficulty))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageCompletion = completions.length
    ? Math.round(completions.reduce((sum, item) => sum + item.percent, 0) / completions.length)
    : 0;
  const averageRpe = rpeValues.length
    ? (rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length).toFixed(1)
    : null;

  return {
    sessions: trainingSessions,
    totalSessions: trainingSessions.length,
    latestSession: trainingSessions[0] || sessions[0] || null,
    totalCompletedExercises: completions.reduce((sum, item) => sum + item.completed, 0),
    averageCompletion,
    trackedLoads: loadLogs.length,
    averageRpe,
  };
}

function buildExerciseProgress(sessions = []) {
  const byExercise = new Map();

  for (const session of [...sessions].reverse()) {
    const itemMap = workoutItemsById(session);
    for (const log of session.itemLogs || []) {
      const item = itemMap.get(log.workoutItemId);
      const name = item?.exercise?.name;
      if (!name || (!log.completed && !log.loadUsed && !log.repsDone)) continue;

      if (!byExercise.has(name)) {
        byExercise.set(name, {
          name,
          muscleGroup: item?.exercise?.muscleGroup || null,
          completedSessions: 0,
          firstLoad: null,
          latestLoad: null,
          latestLoadLabel: null,
          bestLoad: null,
          bestLoadLabel: null,
          latestReps: null,
          latestRpe: null,
          lastDate: null,
        });
      }

      const entry = byExercise.get(name);
      const loadNumber = parseLoadNumber(log.loadUsed);
      if (log.completed) entry.completedSessions += 1;
      if (loadNumber != null) {
        if (entry.firstLoad == null) entry.firstLoad = loadNumber;
        entry.latestLoad = loadNumber;
        entry.latestLoadLabel = log.loadUsed;
        if (entry.bestLoad == null || loadNumber > entry.bestLoad) {
          entry.bestLoad = loadNumber;
          entry.bestLoadLabel = log.loadUsed;
        }
      } else if (log.loadUsed) {
        entry.latestLoadLabel = log.loadUsed;
      }
      if (log.repsDone) entry.latestReps = log.repsDone;
      if (log.perceivedDifficulty) entry.latestRpe = log.perceivedDifficulty;
      entry.lastDate = session.date;
    }
  }

  return [...byExercise.values()]
    .map((entry) => ({
      ...entry,
      improvement: entry.firstLoad != null && entry.latestLoad != null ? entry.latestLoad - entry.firstLoad : null,
    }))
    .sort((a, b) => {
      const loadDelta = Number(b.bestLoad != null) - Number(a.bestLoad != null);
      if (loadDelta) return loadDelta;
      return b.completedSessions - a.completedSessions;
    })
    .slice(0, 6);
}

function sessionLoadPreview(session) {
  const itemMap = workoutItemsById(session);
  return (session?.itemLogs || [])
    .filter((log) => log.loadUsed || log.repsDone)
    .map((log) => {
      const exercise = itemMap.get(log.workoutItemId)?.exercise?.name || "Esercizio";
      const details = [log.loadUsed, log.repsDone ? `${log.repsDone} reps` : null].filter(Boolean).join(" · ");
      return `${exercise}: ${details}`;
    })
    .slice(0, 3);
}

function StatTile({ icon: Icon, label, value, tone = "text-accent" }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
        <Icon size={15} className={tone} /> {label}
      </div>
      <p className={`mt-2 font-display text-2xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

function MessageBubble({ message, onResolve, onHide, busy }) {
  const isAdmin = message.senderRole === "admin";
  const unresolved = !isAdmin && message.status !== "resolved";
  return (
    <article className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[86%] rounded-lg border p-3 ${isAdmin ? "border-accent/30 bg-accent/10" : "border-border bg-surface-2"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
            {isAdmin ? "Trainer" : "Cliente"} · {shortDate(message.createdAt)}
          </p>
          {!isAdmin && <StatusBadge status={message.status === "resolved" ? "success" : "warning"}>{message.status}</StatusBadge>}
        </div>
        <p className="mt-1 text-sm font-semibold text-text">{message.subject}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-muted">{message.message}</p>
        {unresolved && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onResolve(message.id)} disabled={busy}>
              <CheckCircle2 size={15} /> Risolto
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onHide(message.id)} disabled={busy}>
              <EyeOff size={15} /> Nascondi
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function Clients() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIdState, setSelectedIdState] = useState(searchParams.get("client"));
  const [form, setForm] = useState(EMPTY_FORM);
  const [messageDraft, setMessageDraft] = useState("");

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: () => apiFetch("/api/clients"),
  });

  const clients = useMemo(() => clientsQuery.data?.clients || [], [clientsQuery.data?.clients]);
  const selectedId = selectedIdState || searchParams.get("client") || clients[0]?.id || null;

  const selectClient = (id) => {
    setSelectedIdState(id);
    setMessageDraft("");
    if (id) setSearchParams({ client: id }, { replace: true });
  };

  const selectedSummary = useMemo(
    () => clients.find((client) => client.id === selectedId) || clients[0] || null,
    [clients, selectedId]
  );

  const detailQuery = useQuery({
    queryKey: ["clients", selectedId],
    queryFn: () => apiFetch(`/api/clients/${selectedId}`),
    enabled: !!selectedId,
  });

  const selected = detailQuery.data?.client || selectedSummary;
  const summary = selected?.dashboard || {};
  const payStatus = paymentStatus(summary);
  const accountStatus = selected ? clientStatus(selected) : null;
  const wa = selected ? whatsappHref(selected.phone) : null;
  const selectedDeadline = accessDeadline(summary);
  const trainingSummary = useMemo(
    () => buildTrainingSummary(selected?.sessions || []),
    [selected?.sessions]
  );
  const exerciseProgress = useMemo(
    () => buildExerciseProgress(selected?.sessions || []),
    [selected?.sessions]
  );

  const createClient = useMutation({
    mutationFn: (payload) => apiFetch("/api/clients", { method: "POST", body: payload }),
    onSuccess: async (data) => {
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await qc.invalidateQueries({ queryKey: ["clients"] });
      if (data?.client?.id) selectClient(data.client.id);
      toast({
        type: data?.inviteEmailSent ? "success" : "warning",
        title: data?.inviteEmailSent ? "Cliente creato e invito inviato" : "Cliente creato, invito da reinviare",
        description: data?.inviteEmailError ? `Email non inviata: ${data.inviteEmailError}` : undefined,
      });
    },
    onError: (err) => toast({ type: "error", title: "Creazione fallita", description: err.message }),
  });

  const inviteClient = useMutation({
    mutationFn: (id) => apiFetch(`/api/clients/${id}/invite`, { method: "POST" }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["clients"] }),
        qc.invalidateQueries({ queryKey: ["clients", selectedId] }),
      ]);
      toast({ type: "success", title: "Invito inviato" });
    },
    onError: (err) => toast({ type: "error", title: "Invito non inviato", description: err.message }),
  });

  const deleteClient = useMutation({
    mutationFn: (id) => apiFetch(`/api/clients/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setSelectedIdState(null);
      setSearchParams({}, { replace: true });
      await qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ type: "success", title: "Cliente archiviato" });
    },
    onError: (err) => toast({ type: "error", title: "Archivio fallito", description: err.message }),
  });

  const toggleClientAccess = useMutation({
    mutationFn: ({ id, disabled }) =>
      apiFetch(`/api/clients/${id}`, {
        method: "PUT",
        body: {
          accessDisabled: disabled,
          accessDisabledReason: disabled ? "Chiuso manualmente dall'admin" : null,
        },
      }),
    onSuccess: async (_, { disabled }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["clients"] }),
        qc.invalidateQueries({ queryKey: ["clients", selectedId] }),
      ]);
      toast({
        type: disabled ? "warning" : "success",
        title: disabled ? "App cliente chiusa" : "App cliente riaperta",
      });
    },
    onError: (err) => toast({ type: "error", title: "Aggiornamento accesso fallito", description: err.message }),
  });

  const sendAdminMessage = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/messages", {
        method: "POST",
        body: { clientId: selected?.id, subject: "Messaggio dal trainer", message: messageDraft },
      }),
    onSuccess: async () => {
      setMessageDraft("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["clients", selectedId] }),
        qc.invalidateQueries({ queryKey: ["admin", "messages"] }),
      ]);
      toast({ type: "success", title: "Messaggio inviato" });
    },
    onError: (err) => toast({ type: "error", title: "Invio fallito", description: err.message }),
  });

  const sendInvoice = useMutation({
    mutationFn: (id) => apiFetch("/api/admin-billing", { method: "POST", body: { type: "invoice", id } }),
    onSuccess: (data) =>
      toast({
        type: "success",
        title: data?.documentType === "receipt" ? "Ricevuta inviata" : "Fattura inviata",
        description: data?.to ? `Email inviata a ${data.to}` : undefined,
      }),
    onError: (err) => toast({ type: "error", title: "Invio fattura fallito", description: err.message }),
  });

  const updateMessage = useMutation({
    mutationFn: ({ id, ...payload }) => apiFetch("/api/admin/messages", { method: "PATCH", body: { id, ...payload } }),
    onSuccess: async (_, payload) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["clients"] }),
        qc.invalidateQueries({ queryKey: ["clients", selectedId] }),
        qc.invalidateQueries({ queryKey: ["admin", "messages"] }),
        qc.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
      ]);
      toast({ type: "success", title: payload.hidden ? "Richiesta nascosta" : "Richiesta risolta" });
    },
    onError: (err) => toast({ type: "error", title: "Aggiornamento fallito", description: err.message }),
  });

  const submit = (event) => {
    event.preventDefault();
    createClient.mutate(form);
  };

  const columns = [
    {
      key: "fullName",
      label: "Cliente",
      render: (client) => (
        <div>
          <div className="font-semibold">{client.user.fullName}</div>
          <div className="text-xs text-text-muted">{client.user.email}</div>
        </div>
      ),
    },
    { key: "goal", label: "Obiettivo", render: (client) => client.goal || "—" },
    {
      key: "payment",
      label: "Pagamento",
      render: (client) => {
        const status = paymentStatus(client.dashboard);
        const deadline = accessDeadline(client.dashboard);
        return (
          <div className="space-y-1">
            <StatusBadge status={status.status}>{status.label}</StatusBadge>
            {deadline && (
              <p className="text-[11px] text-text-muted">
                Scade {shortDate(deadline.date)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "workouts",
      label: "Schede",
      render: (client) => `${client.dashboard?.activeWorkouts || 0}/${client.dashboard?.totalWorkouts || client._count?.workouts || 0}`,
    },
    {
      key: "requests",
      label: "Richieste",
      render: (client) => {
        const count = client.dashboard?.openRequests || 0;
        return <StatusBadge status={count > 0 ? "warning" : "success"}>{count}</StatusBadge>;
      },
    },
    { key: "live", label: "Live", render: (client) => client.dashboard?.liveCredits || 0 },
  ];

  const activeWorkouts = (selected?.workouts || []).filter((workout) => workout.status === "active");
  const latestMetric = selected?.metrics?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">Clienti</h2>
          <p className="text-sm text-text-muted">Lista clienti, stato pagamenti, schede, richieste e progressi.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Nuovo cliente
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              rows={clients}
              loading={clientsQuery.isLoading}
              error={clientsQuery.error?.message}
              onRowClick={(client) => selectClient(client.id)}
              empty={<EmptyState icon={Users} title="Nessun cliente" description="Crea il primo cliente per iniziare." />}
            />
          </div>

          <div className="md:hidden">
            <DataList
              items={clients}
              loading={clientsQuery.isLoading}
              error={clientsQuery.error?.message}
              onItemClick={(client) => selectClient(client.id)}
              empty={<EmptyState icon={Users} title="Nessun cliente" description="Crea il primo cliente per iniziare." />}
              renderItem={(client) => {
                const status = paymentStatus(client.dashboard);
                return (
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold">{client.user.fullName}</div>
                      <div className="text-xs text-text-muted">{client.user.email}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={clientStatus(client).status}>{clientStatus(client).label}</StatusBadge>
                      <StatusBadge status={status.status}>{status.label}</StatusBadge>
                      <StatusBadge status={(client.dashboard?.openRequests || 0) > 0 ? "warning" : "success"}>
                        {client.dashboard?.openRequests || 0} richieste
                      </StatusBadge>
                      {accessDeadline(client.dashboard) && (
                        <StatusBadge status="warning">
                          Scade {shortDate(accessDeadline(client.dashboard).date)}
                        </StatusBadge>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {selected ? (
            <>
              <Card className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold uppercase">{selected.user.fullName}</h3>
                    <p className="flex items-center gap-2 text-sm text-text-muted">
                      <Mail size={14} /> {selected.user.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={accountStatus.status}>{accountStatus.label}</StatusBadge>
                      <StatusBadge status={payStatus.status}>{payStatus.label}</StatusBadge>
                      {selectedDeadline && (
                        <StatusBadge status="warning">
                          Scade {shortDate(selectedDeadline.date)}
                        </StatusBadge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => inviteClient.mutate(selected.id)} disabled={inviteClient.isPending}>
                      <Send size={15} /> Invito
                    </Button>
                    <Button
                      size="sm"
                      variant={selected.accessDisabledAt ? "secondary" : "ghost"}
                      onClick={() => toggleClientAccess.mutate({ id: selected.id, disabled: !selected.accessDisabledAt })}
                      disabled={toggleClientAccess.isPending}
                    >
                      {selected.accessDisabledAt ? <Unlock size={15} /> : <Lock size={15} />}
                      {selected.accessDisabledAt ? "Riapri app" : "Chiudi app"}
                    </Button>
                    {wa && (
                      <Button as="a" size="sm" variant="secondary" href={wa} target="_blank" rel="noreferrer">
                        <MessageCircle size={15} /> WhatsApp
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => deleteClient.mutate(selected.id)} disabled={deleteClient.isPending}>
                      <Trash2 size={15} /> Archivia
                    </Button>
                  </div>
                </div>

                {selected.accessDisabledAt && (
                  <div className="rounded-lg border border-danger/35 bg-danger/10 p-3 text-sm text-danger">
                    App cliente chiusa dal {shortDate(selected.accessDisabledAt)}.
                    {selected.accessDisabledReason ? ` Motivo: ${selected.accessDisabledReason}` : ""}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <StatTile icon={CreditCard} label="Totale pagato" value={money(summary.totalPaidCents || 0)} />
                  <StatTile icon={Video} label="Live rimaste" value={summary.liveCredits ?? 0} />
                  <StatTile icon={CalendarDays} label="Scadenza accesso" value={selectedDeadline ? shortDate(selectedDeadline.date) : "—"} tone={selectedDeadline ? "text-yellow-400" : "text-accent"} />
                  <StatTile icon={Dumbbell} label="Schede attive" value={summary.activeWorkouts ?? activeWorkouts.length} />
                  <StatTile icon={Activity} label="Sessioni svolte" value={summary.totalSessions ?? selected._count?.workoutSessions ?? 0} />
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase text-text-muted">Telefono</div>
                    <div>{selected.phone || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-text-muted">Obiettivo</div>
                    <div>{selected.goal || "—"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs uppercase text-text-muted">Note operative</div>
                    <div>{selected.notes || "—"}</div>
                  </div>
                </div>
              </Card>

              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <Dumbbell className="text-accent" size={18} />
                  <h3 className="font-display text-base font-bold uppercase">Schede e allenamenti</h3>
                </div>
                {(selected.workouts || []).length ? (
                  <div className="space-y-3">
                    {(selected.workouts || []).slice(0, 4).map((workout) => (
                      <article key={workout.id} className="rounded-lg border border-border bg-surface-2 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{workout.title}</p>
                            <p className="text-xs text-text-muted">
                              {workout._count?.days || workout.days?.length || 0} giorni · {workout._count?.sessions || 0} sessioni
                            </p>
                          </div>
                          <StatusBadge status={workout.status === "active" ? "active" : "archived"}>{workout.status}</StatusBadge>
                        </div>
                        {workout.description && <p className="mt-2 text-xs text-text-muted">{workout.description}</p>}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-muted">Nessuna scheda creata.</p>
                )}
                <Button variant="secondary" onClick={() => { window.location.href = `/dashboard/schede?clientId=${selected.id}`; }}>
                  Gestisci schede
                </Button>
              </Card>

              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="text-accent" size={18} />
                  <h3 className="font-display text-base font-bold uppercase">Progressi</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                  <div className="rounded-lg border border-border bg-surface-2 p-3">
                    <p className="text-xs uppercase text-text-muted">Allenamenti</p>
                    <p className="mt-1 font-display text-lg font-bold text-accent">{trainingSummary.totalSessions}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 p-3">
                    <p className="text-xs uppercase text-text-muted">Esercizi svolti</p>
                    <p className="mt-1 font-display text-lg font-bold text-accent">{trainingSummary.totalCompletedExercises}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 p-3">
                    <p className="text-xs uppercase text-text-muted">Media completamento</p>
                    <p className="mt-1 font-display text-lg font-bold text-accent">{trainingSummary.averageCompletion}%</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 p-3">
                    <p className="text-xs uppercase text-text-muted">Carichi inseriti</p>
                    <p className="mt-1 font-display text-lg font-bold text-accent">{trainingSummary.trackedLoads}</p>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface-2 p-3">
                    <p className="text-xs uppercase text-text-muted">Ultimo allenamento</p>
                    <p className="mt-1 font-semibold">{trainingSummary.latestSession ? shortDate(trainingSummary.latestSession.date) : "—"}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {trainingSummary.latestSession?.workout?.title || "Nessuna sessione salvata"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 p-3">
                    <p className="text-xs uppercase text-text-muted">Check-in misure</p>
                    {latestMetric ? (
                      <>
                        <p className="mt-1 font-semibold">{shortDate(latestMetric.date)}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          Peso {latestMetric.weightKg ? `${latestMetric.weightKg} kg` : "—"} · Vita {latestMetric.waistCm ? `${latestMetric.waistCm} cm` : "—"}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-text-muted">Nessun check-in inserito</p>
                    )}
                  </div>
                </div>

                {latestMetric?.notes && (
                  <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                    <p className="text-xs uppercase text-text-muted">Note ultimo check-in</p>
                    <p className="mt-1 text-text">{latestMetric.notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Carichi esercizi</p>
                    {trainingSummary.averageRpe && <StatusBadge status="neutral">RPE medio {trainingSummary.averageRpe}</StatusBadge>}
                  </div>
                  {exerciseProgress.length ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {exerciseProgress.slice(0, 6).map((exercise) => (
                        <article key={exercise.name} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{exercise.name}</p>
                              <p className="text-xs text-text-muted">
                                {exercise.completedSessions} sessioni{exercise.muscleGroup ? ` · ${exercise.muscleGroup}` : ""}
                              </p>
                            </div>
                            {exercise.improvement != null ? (
                              <StatusBadge status={exercise.improvement >= 0 ? "success" : "warning"}>
                                {exercise.improvement >= 0 ? "+" : ""}{exercise.improvement}
                              </StatusBadge>
                            ) : (
                              <StatusBadge status="neutral">tracking</StatusBadge>
                            )}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-muted">
                            <span>Ultimo: <strong className="text-text">{exercise.latestLoadLabel || "—"}</strong></span>
                            <span>Best: <strong className="text-accent">{exercise.bestLoadLabel || "—"}</strong></span>
                            <span>Reps: <strong className="text-text">{exercise.latestReps || "—"}</strong></span>
                            <span>RPE: <strong className="text-text">{exercise.latestRpe || "—"}</strong></span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-muted">
                      Nessun carico inserito negli allenamenti salvati.
                    </p>
                  )}
                </div>

                {trainingSummary.sessions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Ultimi allenamenti</p>
                    {trainingSummary.sessions.slice(0, 4).map((session) => {
                      const completion = sessionCompletion(session);
                      const loadPreview = sessionLoadPreview(session);
                      return (
                        <div key={session.id} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{session.workout?.title || "Allenamento"}</span>
                            <span className="text-xs text-text-muted">{shortDate(session.date)}</span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${completion.percent}%` }} />
                          </div>
                          <p className="mt-1 text-xs text-text-muted">
                            {completion.completed}/{completion.total} esercizi · {completion.percent}% completato
                          </p>
                          {loadPreview.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {loadPreview.map((item) => (
                                <p key={item} className="truncate text-xs text-text-muted">{item}</p>
                              ))}
                            </div>
                          )}
                          <p className="mt-1 text-xs text-text-muted">
                            RPE {session.feedbackDifficulty || "—"} · {session.feedbackNotes || "Nessuna nota"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-muted">
                    Nessun allenamento completato o salvato dal cliente.
                  </p>
                )}
              </Card>

              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="text-accent" size={18} />
                  <h3 className="font-display text-base font-bold uppercase">Messaggi e richieste</h3>
                </div>
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {(selected.messages || []).length ? (
                    selected.messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        busy={updateMessage.isPending}
                        onResolve={(id) => updateMessage.mutate({ id, status: "resolved" })}
                        onHide={(id) => updateMessage.mutate({ id, hidden: true })}
                      />
                    ))
                  ) : (
                    <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-muted">Nessun messaggio ancora.</p>
                  )}
                </div>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (messageDraft.trim()) sendAdminMessage.mutate();
                  }}
                >
                  <Textarea
                    rows={3}
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    placeholder="Scrivi un messaggio al cliente..."
                  />
                  <Button type="submit" disabled={!messageDraft.trim() || sendAdminMessage.isPending}>
                    <Send size={16} /> Invia messaggio
                  </Button>
                </form>
              </Card>

              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="text-accent" size={18} />
                  <h3 className="font-display text-base font-bold uppercase">Pagamenti e live</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Scadenza abbonamento</p>
                    <p className="mt-1 font-display text-lg font-bold text-accent">
                      {selectedDeadline?.hasDate ? shortDate(selectedDeadline.date) : "—"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {selectedDeadline
                        ? selectedDeadline.hasDate
                          ? `${selectedDeadline.label} · ${selectedDeadline.productName}`
                          : `${subscriptionStatusLabel(selectedDeadline.status)} · ${selectedDeadline.productName} · data rinnovo non disponibile`
                        : "Nessun abbonamento ricorrente attivo"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Crediti live disponibili</p>
                    <p className="mt-1 font-display text-lg font-bold text-accent">{summary.liveCredits ?? 0}</p>
                    <p className="text-xs text-text-muted">Saldo live del cliente</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {(selected.orders || []).slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 p-3 text-sm">
                      <div>
                        <p className="font-semibold">{order.product?.name || "Ordine"}</p>
                        <p className="text-xs text-text-muted">{shortDate(order.createdAt)} · {order.quantity}x</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <p className="font-semibold text-accent">{money(order.amountCents, order.currency)}</p>
                        <StatusBadge status={paymentStatus({ paymentStatus: order.status }).status}>{order.status}</StatusBadge>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={order.status !== "paid" || sendInvoice.isPending}
                          onClick={() => sendInvoice.mutate(order.id)}
                        >
                          <Send size={14} />
                          Fattura
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!(selected.orders || []).length && <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-muted">Nessun pagamento registrato.</p>}
                </div>
                {(selected.bookings || []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Live prenotate</p>
                    {selected.bookings.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{booking.liveSession?.title || "Live"}</span>
                          <StatusBadge status={booking.status === "confirmed" ? "success" : "neutral"}>{booking.status}</StatusBadge>
                        </div>
                        <p className="mt-1 text-xs text-text-muted">
                          <CalendarDays size={13} className="mr-1 inline" />
                          {dateTime(booking.liveSession?.scheduledAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card>
              <EmptyState title="Seleziona un cliente" description="Il dossier completo apparirà qui." />
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuovo cliente"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" form="client-form" disabled={createClient.isPending}>
              Crea e invia invito
            </Button>
          </>
        }
      >
        <form id="client-form" onSubmit={submit} className="space-y-3">
          <Input placeholder="Nome completo" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Telefono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Obiettivo" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          <Textarea placeholder="Note operative" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
