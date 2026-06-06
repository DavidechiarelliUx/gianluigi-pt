import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, ClipboardList, CreditCard, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState, StatusBadge } from "../../components/app";
import { ExerciseIllustration } from "../../components/exercises";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

const emptyItem = () => ({ exerciseId: "", sets: 3, reps: "8-10", restSeconds: 90, notes: "" });
const emptyDay = () => ({ label: "Giorno A", items: [emptyItem()] });
const emptyWorkout = () => ({ title: "", description: "", days: [emptyDay()] });

const money = (cents = 0, currency = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

function normalizeWorkout(workout) {
  return {
    title: workout.title,
    description: workout.description || "",
    days: workout.days.map((day) => ({
      label: day.label,
      items: day.items.map((item) => ({
        exerciseId: item.exerciseId,
        sets: item.sets,
        reps: item.reps,
        restSeconds: item.restSeconds || "",
        notes: item.notes || "",
      })),
    })),
  };
}

export default function Workouts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clientId, setClientId] = useState(() => new URLSearchParams(window.location.search).get("clientId") || "");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyWorkout);

  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: () => apiFetch("/api/clients") });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: () => apiFetch("/api/admin/exercises") });
  const ordersQuery = useQuery({ queryKey: ["payments", "orders"], queryFn: () => apiFetch("/api/payments/orders") });
  const clients = useMemo(() => clientsQuery.data?.clients || [], [clientsQuery.data?.clients]);
  const exercises = useMemo(() => exercisesQuery.data?.exercises || [], [exercisesQuery.data?.exercises]);
  const paidOrders = useMemo(
    () => (ordersQuery.data?.orders || []).filter((order) => order.status === "paid" && order.user?.client?.id),
    [ordersQuery.data?.orders]
  );
  const selectedClient = clients.find((client) => client.id === clientId) || null;
  const paidOrdersByClientId = useMemo(() => {
    const map = new Map();
    for (const order of paidOrders) {
      const orderClientId = order.user?.client?.id;
      if (!orderClientId) continue;
      if (!map.has(orderClientId)) map.set(orderClientId, []);
      map.get(orderClientId).push(order);
    }
    return map;
  }, [paidOrders]);

  const packageGroups = useMemo(() => {
    const groups = new Map();
    for (const client of clients) {
      const clientOrders = paidOrdersByClientId.get(client.id) || [];
      for (const order of clientOrders) {
        const label = order.product?.name || "Pacchetto pagato";
        if (!groups.has(label)) groups.set(label, []);
        const group = groups.get(label);
        if (!group.some((item) => item.id === client.id)) {
          group.push({ ...client, latestOrder: order });
        }
      }
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [clients, paidOrdersByClientId]);

  const unpaidClients = useMemo(
    () => clients.filter((client) => !paidOrdersByClientId.has(client.id)),
    [clients, paidOrdersByClientId]
  );
  const selectedClientOrders = selectedClient ? paidOrdersByClientId.get(selectedClient.id) || [] : [];

  const workoutsQuery = useQuery({
    queryKey: ["workouts", clientId],
    queryFn: () => apiFetch(`/api/workouts?clientId=${clientId}`),
    enabled: !!clientId,
  });
  const workouts = workoutsQuery.data?.workouts || [];
  const activeWorkout = workouts.find((workout) => workout.status === "active");

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  );

  const saveWorkout = useMutation({
    mutationFn: (payload) =>
      editingId
        ? apiFetch(`/api/workouts/${editingId}`, { method: "PUT", body: payload })
        : apiFetch("/api/workouts", { method: "POST", body: payload }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["workouts", clientId] });
      await qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      setEditingId(null);
      setForm(emptyWorkout());
      toast({ type: "success", title: "Scheda salvata" });
    },
    onError: (err) => toast({ type: "error", title: "Salvataggio fallito", description: err.message }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => apiFetch(`/api/workouts/${id}`, { method: "PUT", body: { status } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["workouts", clientId] });
      await qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({ type: "success", title: "Stato scheda aggiornato" });
    },
    onError: (err) => toast({ type: "error", title: "Aggiornamento fallito", description: err.message }),
  });

  const setDay = (dayIndex, patch) => {
    setForm((current) => ({
      ...current,
      days: current.days.map((day, index) => (index === dayIndex ? { ...day, ...patch } : day)),
    }));
  };

  const setItem = (dayIndex, itemIndex, patch) => {
    setForm((current) => ({
      ...current,
      days: current.days.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              items: day.items.map((item, idx) => (idx === itemIndex ? { ...item, ...patch } : item)),
            }
          : day
      ),
    }));
  };

  const removeItem = (dayIndex, itemIndex) => {
    setForm((current) => ({
      ...current,
      days: current.days.map((day, index) =>
        index === dayIndex
          ? { ...day, items: day.items.filter((_, idx) => idx !== itemIndex) }
          : day
      ),
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!clientId) return toast({ type: "error", title: "Seleziona un cliente" });
    saveWorkout.mutate({
      clientId,
      title: form.title,
      description: form.description,
      status: "active",
      days: form.days.map((day) => ({
        ...day,
        items: day.items.filter((item) => item.exerciseId),
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold uppercase">Schede</h2>
        <p className="text-sm text-text-muted">Crea programmi e assegna una scheda attiva per cliente.</p>
      </div>

      <Card className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Cliente</span>
          <select
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setEditingId(null);
              setForm(emptyWorkout());
            }}
            className="h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">Seleziona cliente</option>
            {packageGroups.map(([packageName, group]) => (
              <optgroup key={packageName} label={packageName}>
                {group.map((client) => (
                  <option key={`${packageName}-${client.id}`} value={client.id}>
                    {client.user.fullName} · {money(client.latestOrder.amountCents, client.latestOrder.currency)}
                  </option>
                ))}
              </optgroup>
            ))}
            {unpaidClients.length > 0 && (
              <optgroup label="Clienti manuali / senza pagamento">
                {unpaidClients.map((client) => (
                  <option key={client.id} value={client.id}>{client.user.fullName}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {selectedClient && (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">
              Scheda attiva: <span className="text-accent">{activeWorkout?.title || "nessuna"}</span>
            </p>
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                <CreditCard size={15} className="text-accent" /> Pacchetti acquistati
              </div>
              {selectedClientOrders.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedClientOrders.map((order) => (
                    <StatusBadge key={order.id} status="success">
                      {order.product?.name || "Pacchetto"} · {money(order.amountCents, order.currency)}
                    </StatusBadge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  Nessun pagamento registrato: puoi comunque creare una scheda manuale.
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {!clientId ? (
        <EmptyState icon={ClipboardList} title="Seleziona un cliente" description="Poi potrai creare o modificare le sue schede." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            {workouts.length ? workouts.map((workout) => (
              <Card key={workout.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-bold uppercase">{workout.title}</h3>
                    <p className="text-xs text-text-muted">{workout.days.length} giorni · {workout._count?.sessions || 0} sessioni</p>
                  </div>
                  <StatusBadge status={workout.status === "active" ? "active" : "archived"}>
                    {workout.status === "active" ? "Attiva" : "Archivio"}
                  </StatusBadge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingId(workout.id);
                      setForm(normalizeWorkout(workout));
                    }}
                  >
                    Modifica
                  </Button>
                  {workout.status !== "active" ? (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: workout.id, status: "active" })}>
                      <CheckCircle2 size={16} /> Attiva
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => updateStatus.mutate({ id: workout.id, status: "archived" })}>
                      <Archive size={16} /> Archivia
                    </Button>
                  )}
                </div>
              </Card>
            )) : (
              <EmptyState title="Nessuna scheda" description="Crea la prima scheda per questo cliente." />
            )}
          </div>

          <Card>
            <form onSubmit={submit} className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-bold uppercase">
                  {editingId ? "Modifica scheda" : "Nuova scheda"}
                </h3>
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setForm(emptyWorkout()); }}>
                    Nuova
                  </Button>
                )}
              </div>
              <Input placeholder="Titolo scheda" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Descrizione / focus" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

              {form.days.map((day, dayIndex) => (
                <div key={dayIndex} className="rounded-lg border border-border bg-bg/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Input
                      value={day.label}
                      onChange={(e) => setDay(dayIndex, { label: e.target.value })}
                      className="max-w-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setForm({ ...form, days: form.days.filter((_, idx) => idx !== dayIndex) })}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {day.items.map((item, itemIndex) => {
                      const exercise = exerciseById.get(item.exerciseId);
                      return (
                        <div key={itemIndex} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 rounded-md border border-border bg-surface p-3 lg:grid-cols-[1.1fr_0.5fr_0.6fr_0.5fr_auto]">
                          {/* Esercizio: occupa tutta la riga su mobile (4 col), 1 col su desktop */}
                          <div className="col-span-4 flex gap-2 lg:col-span-1">
                            {exercise?.illustration && (
                              <ExerciseIllustration exercise={exercise.illustration} className="h-14 w-14 shrink-0" />
                            )}
                            <select
                              value={item.exerciseId}
                              onChange={(e) => setItem(dayIndex, itemIndex, { exerciseId: e.target.value })}
                              className="min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <option value="">Esercizio</option>
                              {exercises.map((exerciseOption) => (
                                <option key={exerciseOption.id} value={exerciseOption.id}>
                                  {exerciseOption.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Campi numerici: una riga da 3+1 su mobile, singole colonne su desktop */}
                          <Input type="number" min="1" value={item.sets} onChange={(e) => setItem(dayIndex, itemIndex, { sets: e.target.value })} placeholder="Serie" />
                          <Input value={item.reps} onChange={(e) => setItem(dayIndex, itemIndex, { reps: e.target.value })} placeholder="Rip" />
                          <Input type="number" min="0" value={item.restSeconds} onChange={(e) => setItem(dayIndex, itemIndex, { restSeconds: e.target.value })} placeholder="Rec s" />
                          <Button size="sm" variant="ghost" onClick={() => removeItem(dayIndex, itemIndex)}>
                            <Trash2 size={16} />
                          </Button>
                          {/* Note: occupa tutta la riga su entrambi i layout */}
                          <Textarea
                            className="col-span-4 lg:col-span-5"
                            placeholder="Note esercizio"
                            value={item.notes}
                            onChange={(e) => setItem(dayIndex, itemIndex, { notes: e.target.value })}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="secondary"
                    onClick={() => setDay(dayIndex, { items: [...day.items, emptyItem()] })}
                  >
                    <Plus size={16} /> Aggiungi esercizio
                  </Button>
                </div>
              ))}

              <div className="flex flex-wrap justify-between gap-3">
                <Button variant="secondary" onClick={() => setForm({ ...form, days: [...form.days, { ...emptyDay(), label: `Giorno ${form.days.length + 1}` }] })}>
                  <Plus size={16} /> Aggiungi giorno
                </Button>
                <Button type="submit" disabled={saveWorkout.isPending || !form.title.trim()}>
                  <Save size={18} /> Salva e rendi attiva
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
