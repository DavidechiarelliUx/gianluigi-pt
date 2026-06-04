import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Dumbbell, Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState, ExerciseCard, ProgressBar, StickyActionBar, Tabs } from "../../components/app";
import { getExerciseIllustrationId } from "../../components/exercises/exercise-data";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

function itemToExercise(item) {
  return {
    name: item.exercise.name,
    setsReps: `${item.sets} x ${item.reps}`,
    rest: item.restSeconds ? `${item.restSeconds}s` : "",
    videoUrl: item.exercise.videoUrl,
    illustration: item.exercise.defaultNotes || getExerciseIllustrationId(item.exercise.name),
  };
}

export default function MyWorkout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeDayId, setActiveDayId] = useState(null);
  const [logs, setLogs] = useState({});
  const [feedbackNotes, setFeedbackNotes] = useState("");

  const workoutQuery = useQuery({
    queryKey: ["client", "active-workout"],
    queryFn: () => apiFetch("/api/client/active-workout"),
  });

  const workout = workoutQuery.data?.workout;
  const sessions = workoutQuery.data?.sessions || [];
  const activeDay = useMemo(() => {
    if (!workout?.days?.length) return null;
    return workout.days.find((day) => day.id === activeDayId) || workout.days[0];
  }, [workout, activeDayId]);

  const totalItems = activeDay?.items?.length || 0;
  const completedItems = activeDay?.items?.filter((item) => logs[item.id]?.completed).length || 0;
  const progress = totalItems ? (completedItems / totalItems) * 100 : 0;

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
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase">
          Ciao, {user?.fullName?.split(" ")[0] || "Atleta"}
        </h1>
        <p className="text-sm text-text-muted">La tua scheda attiva: {workout.title}</p>
      </div>

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
