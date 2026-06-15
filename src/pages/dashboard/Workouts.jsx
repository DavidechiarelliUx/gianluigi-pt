import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Maximize2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState, Modal, StatusBadge } from "../../components/app";
import { ExerciseIllustration } from "../../components/exercises";
import {
  getMuscleGroupColor,
  getExerciseMuscleGroup,
} from "../../components/exercises/exercise-data";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyItem = () => ({ exerciseId: "", sets: 3, reps: "8-10", restSeconds: 90, notes: "" });
const emptyDay  = () => ({ label: "Giorno A", items: [emptyItem()] });
const emptyWorkout = () => ({ title: "", description: "", days: [emptyDay()] });

const money = (cents = 0, currency = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

function normalizeWorkout(w) {
  return {
    title: w.title,
    description: w.description || "",
    days: w.days.map((d) => ({
      label: d.label,
      items: d.items.map((it) => ({
        exerciseId:  it.exerciseId,
        sets:        it.sets,
        reps:        it.reps,
        restSeconds: it.restSeconds || "",
        notes:       it.notes || "",
      })),
    })),
  };
}

/** Resolve muscleGroup from server data OR fallback to client-side inference. */
function resolveMuscleGroup(exercise) {
  return exercise.muscleGroup || getExerciseMuscleGroup(exercise.name) || "Altro";
}

// ─── MuscleGroupBadge ──────────────────────────────────────────────────────────

function MuscleGroupBadge({ group, size = "sm" }) {
  if (!group) return null;
  const { bg, color } = getMuscleGroupColor(group);
  const cls = size === "xs"
    ? "px-1.5 py-0 text-[9px]"
    : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={`shrink-0 rounded-full font-bold uppercase tracking-wide ${cls}`}
      style={{ background: bg, color }}
    >
      {group}
    </span>
  );
}

// ─── ExercisePicker ────────────────────────────────────────────────────────────

function ExercisePicker({ exercises, value, onChange }) {
  const [open, setOpen]               = useState(false);
  const [search, setSearch]           = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [previewExercise, setPreviewExercise] = useState(null);

  const selected = useMemo(() => exercises.find((e) => e.id === value) || null, [exercises, value]);

  const muscleGroups = useMemo(() => {
    const groups = new Set(exercises.map((e) => resolveMuscleGroup(e)).filter(Boolean));
    return ["all", ...Array.from(groups).sort()];
  }, [exercises]);

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      const mg = resolveMuscleGroup(e);
      const matchGroup  = filterGroup === "all" || mg === filterGroup;
      const matchSearch = !search.trim() || e.name.toLowerCase().includes(search.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [exercises, search, filterGroup]);

  const close = () => {
    setOpen(false);
    setSearch("");
    setFilterGroup("all");
  };

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 p-2.5 text-left transition-colors hover:border-accent/40"
      >
        {selected?.illustration ? (
          <ExerciseIllustration
            exercise={selected.illustration}
            className="h-9 w-9 shrink-0 rounded-md"
            showBackground={false}
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}
          >
            🏋️
          </div>
        )}
        <div className="min-w-0 flex-1">
          {selected ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-text">{selected.name}</span>
              <MuscleGroupBadge group={resolveMuscleGroup(selected)} size="xs" />
            </div>
          ) : (
            <span className="text-sm text-text-muted">Seleziona esercizio…</span>
          )}
        </div>
        <ChevronDown size={14} className="shrink-0 text-text-muted" />
      </button>

      {/* Modal drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={close}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl"
              style={{ background: "#0d0d0d", boxShadow: "0 -8px 40px rgba(0,0,0,0.6)" }}
            >
              {/* Handle */}
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full" style={{ background: "#2a2a2a" }} />

              {/* Header */}
              <div className="flex shrink-0 items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Dumbbell size={18} className="text-accent" />
                  <h3 className="font-display text-base font-bold uppercase">Scegli esercizio</h3>
                </div>
                <button type="button" onClick={close} className="rounded-full p-1 text-text-muted hover:text-text">
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="shrink-0 px-4 pb-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <Input
                    placeholder="Cerca esercizio…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                    autoFocus
                  />
                </div>
              </div>

              {/* Category chips */}
              <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
                {muscleGroups.map((cat) => {
                  const active = filterGroup === cat;
                  const { color } = cat !== "all" ? getMuscleGroupColor(cat) : { color: "#39FF14" };
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setFilterGroup(cat)}
                      className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-all"
                      style={{
                        background: active ? color : "hsl(var(--surface-2))",
                        color:      active ? "#0a0a0a" : "#888",
                        border:     active ? "none" : "1px solid hsl(var(--border))",
                        boxShadow:  active ? `0 0 10px ${color}44` : "none",
                      }}
                    >
                      {cat === "all" ? "Tutti" : cat}
                    </button>
                  );
                })}
              </div>

              {/* Exercise grid */}
              <div className="overflow-y-auto px-4 pb-10">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Search size={28} className="text-text-muted" />
                    <p className="text-sm text-text-muted">Nessun esercizio trovato</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {filtered.map((ex) => {
                      const mg = resolveMuscleGroup(ex);
                      const { bg, color } = getMuscleGroupColor(mg);
                      const isSelected = value === ex.id;
                      return (
                        <article
                          key={ex.id}
                          className="relative rounded-xl border text-center transition-all"
                          style={{
                            background:   isSelected ? "rgba(57,255,20,0.08)" : "#111",
                            borderColor:  isSelected ? "#39FF14" : "#1e1e1e",
                            boxShadow:    isSelected ? "0 0 14px rgba(57,255,20,0.2)" : "none",
                          }}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="absolute right-1.5 top-1.5 z-10 h-7 w-7 bg-bg/80 p-0 backdrop-blur-sm"
                            onClick={() => setPreviewExercise(ex)}
                            title={`Ingrandisci immagine ${ex.name}`}
                            aria-label={`Ingrandisci immagine ${ex.name}`}
                          >
                            <Maximize2 size={13} />
                          </Button>

                          <button
                            type="button"
                            onClick={() => { onChange(ex.id); close(); }}
                            className="flex h-full w-full flex-col items-center gap-2 rounded-xl p-2.5 pt-3 transition-all"
                          >
                            {ex.illustration ? (
                              <ExerciseIllustration
                                exercise={ex.illustration}
                                className="h-16 w-16 rounded-lg"
                              />
                            ) : (
                              <div
                                className="flex h-16 w-16 items-center justify-center rounded-lg text-2xl"
                                style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
                              >
                                🏋️
                              </div>
                            )}
                            <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-text">
                              {ex.name}
                            </span>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                              style={{ background: bg, color }}
                            >
                              {mg}
                            </span>
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ExercisePreviewModal
        exercise={previewExercise}
        open={!!previewExercise}
        onClose={() => setPreviewExercise(null)}
      />
    </>
  );
}

function ExercisePreviewModal({ exercise, open, onClose }) {
  if (!exercise) return null;
  const muscleGroup = resolveMuscleGroup(exercise);

  return (
    <Modal open={open} onClose={onClose} title={exercise.name} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <MuscleGroupBadge group={muscleGroup} />
          {exercise.defaultNotes && (
            <span className="text-xs text-text-muted">{exercise.defaultNotes}</span>
          )}
        </div>

        {exercise.illustration ? (
          <ExerciseIllustration
            exercise={exercise.illustration}
            title={`Anteprima esercizio ${exercise.name}`}
            className="mx-auto aspect-[4/3] max-h-[62vh] w-full rounded-lg"
          />
        ) : (
          <div className="flex aspect-[4/3] max-h-[62vh] w-full items-center justify-center rounded-lg border border-border bg-bg text-5xl">
            🏋️
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── WorkoutItemRow ────────────────────────────────────────────────────────────

function WorkoutItemRow({ item, itemIndex, dayIndex, exercises, onSetItem, onRemove }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const selectedExercise = exercises.find((e) => e.id === item.exerciseId) || null;
  const mg = selectedExercise ? resolveMuscleGroup(selectedExercise) : null;

  return (
    <div
      className="rounded-xl border bg-bg/50 p-3 space-y-3"
      style={{
        borderColor: mg ? getMuscleGroupColor(mg).bg.replace("0.1", "0.25") : "hsl(var(--border))",
      }}
    >
      {/* Exercise picker */}
      <ExercisePicker
        exercises={exercises}
        value={item.exerciseId}
        onChange={(id) => onSetItem(dayIndex, itemIndex, { exerciseId: id })}
      />

      {selectedExercise && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-text">{selectedExercise.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-text-muted">Anteprima esercizio</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 shrink-0 p-0"
            onClick={() => setPreviewOpen(true)}
            title={`Ingrandisci immagine ${selectedExercise.name}`}
            aria-label={`Ingrandisci immagine ${selectedExercise.name}`}
          >
            <Maximize2 size={14} />
          </Button>
        </div>
      )}

      {/* Sets / Reps / Rest */}
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Serie
          </span>
          <Input
            type="number"
            min="1"
            value={item.sets}
            onChange={(e) => onSetItem(dayIndex, itemIndex, { sets: e.target.value })}
            placeholder="3"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Rip
          </span>
          <Input
            value={item.reps}
            onChange={(e) => onSetItem(dayIndex, itemIndex, { reps: e.target.value })}
            placeholder="8-10"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Rec (s)
          </span>
          <Input
            type="number"
            min="0"
            value={item.restSeconds}
            onChange={(e) => onSetItem(dayIndex, itemIndex, { restSeconds: e.target.value })}
            placeholder="90"
          />
        </label>
      </div>

      {/* Notes + trash */}
      <div className="flex gap-2">
        <Textarea
          className="flex-1"
          placeholder="Note esercizio (facoltative)"
          rows={1}
          value={item.notes}
          onChange={(e) => onSetItem(dayIndex, itemIndex, { notes: e.target.value })}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRemove(dayIndex, itemIndex)}
          className="self-start shrink-0"
          title="Rimuovi esercizio"
        >
          <Trash2 size={15} />
        </Button>
      </div>

      <ExercisePreviewModal
        exercise={selectedExercise}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Workouts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clientId, setClientId] = useState(
    () => new URLSearchParams(window.location.search).get("clientId") || ""
  );
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(emptyWorkout);

  // ── Queries ────────────────────────────────────────────────────────────────
  const clientsQuery   = useQuery({ queryKey: ["clients"],          queryFn: () => apiFetch("/api/clients") });
  const exercisesQuery = useQuery({ queryKey: ["exercises"],         queryFn: () => apiFetch("/api/admin/exercises") });
  const ordersQuery    = useQuery({ queryKey: ["payments", "orders"], queryFn: () => apiFetch("/api/payments/orders") });

  const clients   = useMemo(() => clientsQuery.data?.clients || [],   [clientsQuery.data?.clients]);
  const exercises = useMemo(() => exercisesQuery.data?.exercises || [], [exercisesQuery.data?.exercises]);
  const paidOrders = useMemo(
    () => (ordersQuery.data?.orders || []).filter((o) => o.status === "paid" && o.user?.client?.id),
    [ordersQuery.data?.orders]
  );
  const paidPackageOrders = useMemo(
    () => paidOrders.filter((o) => o.product?.type === "package"),
    [paidOrders]
  );

  const selectedClient = clients.find((c) => c.id === clientId) || null;

  const paidOrdersByClientId = useMemo(() => {
    const map = new Map();
    for (const o of paidOrders) {
      const cid = o.user?.client?.id;
      if (!cid) continue;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid).push(o);
    }
    return map;
  }, [paidOrders]);

  const packageOrdersByClientId = useMemo(() => {
    const map = new Map();
    for (const o of paidPackageOrders) {
      const cid = o.user?.client?.id;
      if (!cid) continue;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid).push(o);
    }
    return map;
  }, [paidPackageOrders]);

  const packageGroups = useMemo(() => {
    const groups = new Map();
    for (const client of clients) {
      const latestPackageOrder = packageOrdersByClientId.get(client.id)?.[0];
      if (!latestPackageOrder) continue;
      const label = latestPackageOrder.product?.name || "Pacchetto pagato";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push({ ...client, latestOrder: latestPackageOrder });
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [clients, packageOrdersByClientId]);

  const unpaidClients = useMemo(
    () => clients.filter((c) => !paidOrdersByClientId.has(c.id)),
    [clients, paidOrdersByClientId]
  );
  const selectedClientOrders = selectedClient
    ? packageOrdersByClientId.get(selectedClient.id) || []
    : [];

  const workoutsQuery = useQuery({
    queryKey: ["workouts", clientId],
    queryFn:  () => apiFetch(`/api/workouts?clientId=${clientId}`),
    enabled:  !!clientId,
  });
  const workouts     = workoutsQuery.data?.workouts || [];
  const activeWorkout = workouts.find((w) => w.status === "active");

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveWorkout = useMutation({
    mutationFn: (payload) =>
      editingId
        ? apiFetch(`/api/workouts/${editingId}`, { method: "PUT", body: payload })
        : apiFetch("/api/workouts", { method: "POST", body: payload }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["workouts", clientId] });
      await qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      setEditingId(null);
      setForm(emptyWorkout());
      toast({
        type: "success",
        title: "Scheda salvata",
        description: editingId
          ? "Scheda aggiornata."
          : data?.emailSent
            ? "Email inviata al cliente."
            : "Scheda creata. Email non inviata.",
      });
    },
    onError: (err) => toast({ type: "error", title: "Salvataggio fallito", description: err.message }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) =>
      apiFetch(`/api/workouts/${id}`, { method: "PUT", body: { status } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["workouts", clientId] });
      await qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({ type: "success", title: "Stato aggiornato" });
    },
    onError: (err) => toast({ type: "error", title: "Aggiornamento fallito", description: err.message }),
  });

  const deleteWorkout = useMutation({
    mutationFn: (workout) => apiFetch(`/api/workouts/${workout.id}`, { method: "DELETE" }),
    onSuccess: async (data, workout) => {
      await qc.invalidateQueries({ queryKey: ["workouts", clientId] });
      await qc.invalidateQueries({ queryKey: ["clients"] });
      await qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      if (editingId === workout.id) {
        setEditingId(null);
        setForm(emptyWorkout());
      }
      toast({
        type: "success",
        title: "Scheda eliminata",
        description: data?.removedSessions
          ? `${data.removedSessions} sessioni collegate eliminate.`
          : "La scheda sbagliata è stata rimossa.",
      });
    },
    onError: (err) => toast({ type: "error", title: "Eliminazione fallita", description: err.message }),
  });

  const confirmDeleteWorkout = (workout) => {
    const sessions = workout._count?.sessions || 0;
    const detail = sessions
      ? `Questa scheda ha ${sessions} sessioni salvate. Eliminandola perderai anche quelle sessioni e i relativi progressi.`
      : "Questa scheda non ha sessioni salvate e verrà rimossa definitivamente.";
    if (!window.confirm(`${detail}\n\nVuoi eliminarla davvero?`)) return;
    deleteWorkout.mutate(workout);
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setDay  = (di, patch) =>
    setForm((f) => ({ ...f, days: f.days.map((d, i) => (i === di ? { ...d, ...patch } : d)) }));

  const setItem = (di, ii, patch) =>
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) =>
        i === di
          ? { ...d, items: d.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) }
          : d
      ),
    }));

  const removeItem = (di, ii) =>
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) =>
        i === di ? { ...d, items: d.items.filter((_, j) => j !== ii) } : d
      ),
    }));

  const submit = (e) => {
    e.preventDefault();
    if (!clientId) return toast({ type: "error", title: "Seleziona un cliente" });
    saveWorkout.mutate({
      clientId,
      title:       form.title,
      description: form.description,
      status:      "active",
      days: form.days.map((d) => ({
        ...d,
        items: d.items.filter((it) => it.exerciseId),
      })),
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="font-display text-xl font-bold uppercase">Schede</h2>
        <p className="text-sm text-text-muted">
          Crea programmi e assegna una scheda attiva per cliente.
        </p>
      </div>

      {/* ── Sezione cliente ── */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <CreditCard size={14} className="text-accent" /> Area cliente
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wide text-text-muted">
            Seleziona cliente
          </span>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setEditingId(null);
              setForm(emptyWorkout());
            }}
            className="h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">— nessun cliente selezionato —</option>
            {packageGroups.map(([pkg, group]) => (
              <optgroup key={pkg} label={pkg}>
                {group.map((c) => (
                  <option key={`${pkg}-${c.id}`} value={c.id}>
                    {c.user.fullName} · {money(c.latestOrder.amountCents, c.latestOrder.currency)}
                  </option>
                ))}
              </optgroup>
            ))}
            {unpaidClients.length > 0 && (
              <optgroup label="Clienti manuali / senza pagamento">
                {unpaidClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.user.fullName}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {selectedClient && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                Scheda attiva:{" "}
                <span className="font-semibold text-accent">
                  {activeWorkout?.title || "nessuna"}
                </span>
              </p>
              {activeWorkout && (
                <StatusBadge status="active">attiva</StatusBadge>
              )}
            </div>

            {selectedClientOrders.length > 0 && (
              <div
                className="rounded-lg border p-3 space-y-2"
                style={{ background: "hsl(var(--bg))", borderColor: "hsl(var(--border))" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  Pacchetti acquistati
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedClientOrders.map((o) => (
                    <StatusBadge key={o.id} status="success">
                      {o.product?.name || "Pacchetto"} · {money(o.amountCents, o.currency)}
                    </StatusBadge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {!clientId ? (
        <EmptyState
          icon={ClipboardList}
          title="Seleziona un cliente"
          description="Poi potrai creare o modificare le sue schede."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">

          {/* ── Schede esistenti ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Schede di {selectedClient?.user?.fullName}
            </p>
            {workouts.length ? (
              workouts.map((w) => (
                <Card key={w.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-bold uppercase">
                        {w.title}
                      </h3>
                      <p className="text-xs text-text-muted">
                        {w.days.length} giorni · {w._count?.sessions || 0} sessioni salvate
                      </p>
                    </div>
                    <StatusBadge status={w.status === "active" ? "active" : "archived"}>
                      {w.status === "active" ? "Attiva" : "Archivio"}
                    </StatusBadge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(w.id);
                        setForm(normalizeWorkout(w));
                      }}
                    >
                      Modifica
                    </Button>
                    {w.status !== "active" ? (
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: w.id, status: "active" })}
                      >
                        <CheckCircle2 size={15} /> Attiva
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => updateStatus.mutate({ id: w.id, status: "archived" })}
                      >
                        <Archive size={15} /> Archivia
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => confirmDeleteWorkout(w)}
                      disabled={deleteWorkout.isPending}
                    >
                      <Trash2 size={15} /> Elimina
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <EmptyState
                title="Nessuna scheda"
                description="Crea la prima scheda per questo cliente."
              />
            )}
          </div>

          {/* ── Form crea / modifica ── */}
          <Card>
            <form onSubmit={submit} className="space-y-5">
              {/* Form header */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Area scheda
                  </p>
                  <h3 className="font-display text-lg font-bold uppercase">
                    {editingId ? "Modifica scheda" : "Nuova scheda"}
                  </h3>
                </div>
                {editingId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingId(null); setForm(emptyWorkout()); }}
                  >
                    + Nuova
                  </Button>
                )}
              </div>

              <Input
                placeholder="Titolo scheda (es. Scheda Forza A)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Textarea
                placeholder="Descrizione / focus / obiettivo (facoltativo)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              {/* Days */}
              {form.days.map((day, di) => (
                <div
                  key={di}
                  className="rounded-xl border border-border bg-bg/40 p-4 space-y-3"
                >
                  {/* Day header */}
                  <div className="flex items-center gap-3">
                    <Input
                      value={day.label}
                      onChange={(e) => setDay(di, { label: e.target.value })}
                      className="max-w-[180px] font-semibold"
                      placeholder="Giorno A"
                    />
                    <span className="text-xs text-text-muted">
                      {day.items.filter((it) => it.exerciseId).length} esercizi
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() =>
                        setForm({ ...form, days: form.days.filter((_, i) => i !== di) })
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  {/* Exercise items */}
                  <div className="space-y-2">
                    {day.items.map((item, ii) => (
                      <WorkoutItemRow
                        key={ii}
                        item={item}
                        itemIndex={ii}
                        dayIndex={di}
                        exercises={exercises}
                        onSetItem={setItem}
                        onRemove={removeItem}
                      />
                    ))}
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDay(di, { items: [...day.items, emptyItem()] })}
                  >
                    <Plus size={14} /> Aggiungi esercizio
                  </Button>
                </div>
              ))}

              {/* Footer actions */}
              <div className="flex flex-wrap justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setForm({
                      ...form,
                      days: [
                        ...form.days,
                        { ...emptyDay(), label: `Giorno ${form.days.length + 1}` },
                      ],
                    })
                  }
                >
                  <Plus size={15} /> Aggiungi giorno
                </Button>
                <Button
                  type="submit"
                  disabled={saveWorkout.isPending || !form.title.trim()}
                >
                  <Save size={16} />
                  {saveWorkout.isPending ? "Salvo…" : "Salva e rendi attiva"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
