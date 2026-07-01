import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Clock3, CreditCard, Dumbbell, Flame, Minimize2, Save, Smartphone } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState, ExerciseCard, ProgressBar, StickyActionBar, Tabs } from "../../components/app";
import { getExerciseIllustrationId, getExerciseMuscleGroup } from "../../components/exercises/exercise-data";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";
import { formatWorkoutTarget } from "../../lib/workoutTarget";

function itemToExercise(item) {
  const target = formatWorkoutTarget(item);
  return {
    name: item.exercise.name,
    setsReps: target.fullLabel,
    rest: item.restSeconds ? `${item.restSeconds}s` : "",
    restSeconds: item.restSeconds || 0,
    videoUrl: item.exercise.videoUrl,
    illustration: item.exercise.defaultNotes || getExerciseIllustrationId(item.exercise.name),
    muscleGroup: item.exercise.muscleGroup || getExerciseMuscleGroup(item.exercise.name) || null,
  };
}

const money = (cents = 0, currency = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

export default function MyWorkout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeDayId, setActiveDayId] = useState(null);
  const [logs, setLogs] = useState({});
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [gymMode, setGymMode] = useState(false);

  const workoutQuery = useQuery({
    queryKey: ["client", "active-workout"],
    queryFn: () => apiFetch("/api/client/active-workout"),
  });
  const overviewQuery = useQuery({
    queryKey: ["client", "overview"],
    queryFn: () => apiFetch("/api/client/overview"),
  });

  const workout = workoutQuery.data?.workout;
  const sessions = workoutQuery.data?.sessions || [];
  const activePackage = overviewQuery.data?.activePackage;
  const activeDay = useMemo(() => {
    if (!workout?.days?.length) return null;
    return workout.days.find((day) => day.id === activeDayId) || workout.days[0];
  }, [workout, activeDayId]);

  const totalItems = activeDay?.items?.length || 0;
  const completedItems = activeDay?.items?.filter((item) => logs[item.id]?.completed).length || 0;
  const progress = totalItems ? (completedItems / totalItems) * 100 : 0;
  const totalWorkoutItems = workout?.days?.reduce((sum, day) => sum + (day.items?.length || 0), 0) || 0;
  const lastSession = sessions[0];
  const lastSessionCompleted = lastSession?.itemLogs?.filter((log) => log.completed).length || 0;
  const lastSessionTotal = lastSession?.itemLogs?.length || 0;

  const saveSession = useMutation({
    mutationFn: () =>
      apiFetch("/api/client/sessions", {
        method: "POST",
        body: {
          workoutId: workout.id,
          workoutDayId: activeDay.id,
          feedbackNotes,
          logs: activeDay.items.map((item) => ({
            workoutItemId: item.id,
            ...(logs[item.id] || {}),
          })),
        },
      }),
    onSuccess: async () => {
      setLogs({});
      setFeedbackNotes("");
      await qc.invalidateQueries({ queryKey: ["client", "active-workout"] });
      toast({ type: "success", title: "Sessione salvata" });
    },
    onError: (err) => toast({ type: "error", title: "Salvataggio fallito", description: err.message }),
  });

  const updateLog = (itemId, field, value) => {
    setLogs((current) => ({
      ...current,
      [itemId]: { ...current[itemId], [field]: value },
    }));
  };

  if (workoutQuery.isLoading) {
    return <EmptyState icon={Dumbbell} title="Carico la tua scheda" description="Preparazione allenamento…" />;
  }

  if (!workout) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase">
            Ciao, {user?.fullName?.split(" ")[0] || "Atleta"}
          </h1>
          <p className="text-sm text-text-muted">La tua area allenamenti.</p>
        </div>
        <EmptyState
          icon={Dumbbell}
          title="Nessuna scheda attiva"
          description="Quando Gianluigi assegna una scheda, la troverai qui."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase">
            Ciao, {user?.fullName?.split(" ")[0] || "Atleta"}
          </h1>
          <p className="text-sm text-text-muted">La tua scheda attiva: {workout.title}</p>
        </div>
        <Button
          size="sm"
          variant={gymMode ? "primary" : "secondary"}
          onClick={() => setGymMode((value) => !value)}
          aria-pressed={gymMode}
        >
          {gymMode ? <Minimize2 size={16} /> : <Smartphone size={16} />}
          {gymMode ? "Normale" : "Palestra"}
        </Button>
      </div>

      <Card className="overflow-hidden border-accent/25 bg-gradient-to-br from-accent/10 via-surface to-surface">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Allenamento di oggi</p>
            <h2 className="mt-1 font-display text-xl font-extrabold uppercase">
              {activeDay?.label || workout.days[0]?.label}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Completa gli esercizi, segna carico/RPE e salva a fine sessione.
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-bg/70">
            <Flame className="text-accent" size={24} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { value: completedItems, label: "fatti" },
            { value: totalItems, label: "esercizi" },
            { value: Math.round(progress), label: "% oggi" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-bg/45 p-2 text-center">
              <div className="font-display text-lg font-extrabold text-accent">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-wide text-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {activePackage && !gymMode && (
        <Card className="space-y-3 border-accent/25">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
                <CreditCard size={15} /> Pacchetto attivo
              </div>
              <h2 className="mt-1 font-display text-lg font-bold uppercase">{activePackage.productName}</h2>
              <p className="text-sm text-text-muted">
                {money(activePackage.amountCents, activePackage.currency)}
                {activePackage.quantity > 1 ? ` · x${activePackage.quantity}` : ""}
              </p>
            </div>
            {activePackage.remainingSessions != null && (
              <div className="rounded-full border border-accent/30 px-3 py-1 text-xs font-semibold text-accent">
                {activePackage.remainingSessions} rimaste
              </div>
            )}
          </div>
          {activePackage.sessionsQty ? (
            <ProgressBar
              label="Sessioni usate"
              value={(activePackage.usedSessions / activePackage.sessionsQty) * 100}
            />
          ) : (
            <p className="text-sm text-text-muted">Accesso piattaforma attivo.</p>
          )}
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold uppercase">{workout.title}</h2>
            {workout.description && <p className="mt-1 text-sm text-text-muted">{workout.description}</p>}
          </div>
          <div className="rounded-full border border-accent/30 px-3 py-1 text-xs font-semibold text-accent">
            {workout.days.length} giorni
          </div>
        </div>

        <Tabs
          tabs={workout.days.map((day) => ({ id: day.id, label: day.label }))}
          activeId={activeDay?.id}
          onChange={(value) => setActiveDayId(value)}
        />
        <ProgressBar label="Completamento sessione" value={progress} />
      </Card>

      {!gymMode && <div className="grid grid-cols-2 gap-3">
        <Card className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            <Clock3 size={16} className="text-accent" /> Ultima sessione
          </div>
          <p className="font-display text-lg font-bold text-text">
            {lastSession ? new Date(lastSession.date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : "—"}
          </p>
          <p className="text-xs text-text-muted">
            {lastSession ? `${lastSessionCompleted}/${lastSessionTotal} esercizi completati` : "Ancora nessun salvataggio"}
          </p>
        </Card>
        <Card className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            <CheckCircle2 size={16} className="text-accent" /> Piano
          </div>
          <p className="font-display text-lg font-bold text-text">{workout.days.length} giorni</p>
          <p className="text-xs text-text-muted">{totalWorkoutItems} esercizi totali nella scheda</p>
        </Card>
      </div>}

      <div className="space-y-4">
        {activeDay?.items.map((item) => (
          <ExerciseCard
            key={item.id}
            exercise={itemToExercise(item)}
            value={logs[item.id] || {}}
            onToggle={() => updateLog(item.id, "completed", !logs[item.id]?.completed)}
            onChange={(field, value) => updateLog(item.id, field, value)}
          />
        ))}
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 font-display text-sm font-bold uppercase">
          <CalendarCheck size={18} className="text-accent" /> Feedback sessione
        </div>
        <Textarea
          placeholder="Come è andata? Dolori, energia, esercizi da modificare..."
          value={feedbackNotes}
          onChange={(event) => setFeedbackNotes(event.target.value)}
        />
      </Card>

      {!!sessions.length && (
        <Card>
          <h3 className="font-display text-sm font-bold uppercase">Ultime sessioni</h3>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            {sessions.slice(0, 4).map((session) => (
              <li key={session.id} className="flex justify-between border-b border-border pb-2 last:border-0">
                <span>{new Date(session.date).toLocaleDateString("it-IT")}</span>
                <span>{session.itemLogs.filter((log) => log.completed).length} esercizi completati</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <StickyActionBar>
        <Button
          className="w-full sm:w-auto"
          onClick={() => saveSession.mutate()}
          disabled={saveSession.isPending || !activeDay?.items?.length}
        >
          <Save size={18} /> Termina e salva
        </Button>
      </StickyActionBar>
    </div>
  );
}
