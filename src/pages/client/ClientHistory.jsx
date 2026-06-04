import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Ruler, Save, TrendingUp } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState, ProgressBar, StatusBadge } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

const emptyMetric = {
  weightKg: "",
  waistCm: "",
  chestCm: "",
  hipsCm: "",
  photoUrl: "",
  notes: "",
};

function formatDate(value) {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ClientHistory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [metricForm, setMetricForm] = useState(emptyMetric);

  const workoutQuery = useQuery({
    queryKey: ["client", "active-workout"],
    queryFn: () => apiFetch("/api/client/active-workout"),
  });
  const progressQuery = useQuery({
    queryKey: ["client", "progress"],
    queryFn: () => apiFetch("/api/client/progress"),
  });
  const metricsQuery = useQuery({
    queryKey: ["client", "metrics"],
    queryFn: () => apiFetch("/api/client/metrics"),
  });

  const sessions = workoutQuery.data?.sessions || [];
  const exercises = progressQuery.data?.exercises || [];
  const metrics = metricsQuery.data?.metrics || [];
  const latestMetric = metrics[0];
  const previousMetric = metrics[1];
  const weightDelta = useMemo(() => {
    if (!latestMetric?.weightKg || !previousMetric?.weightKg) return null;
    return Math.round((latestMetric.weightKg - previousMetric.weightKg) * 10) / 10;
  }, [latestMetric, previousMetric]);

  const saveMetric = useMutation({
    mutationFn: () => apiFetch("/api/client/metrics", { method: "POST", body: metricForm }),
    onSuccess: async () => {
      setMetricForm(emptyMetric);
      await qc.invalidateQueries({ queryKey: ["client", "metrics"] });
      toast({ type: "success", title: "Check-in salvato" });
    },
    onError: (err) => toast({ type: "error", title: "Salvataggio fallito", description: err.message }),
  });

  if (workoutQuery.isLoading || progressQuery.isLoading || metricsQuery.isLoading) {
    return <EmptyState icon={CalendarCheck} title="Carico progressi" />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase">Progressi</h1>
        <p className="text-sm text-text-muted">Storico allenamenti, carichi e misure.</p>
      </div>

      <Card className="space-y-4 border-accent/25">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold uppercase">Check-in fisico</h2>
            <p className="text-sm text-text-muted">Peso, misure e foto progressi.</p>
          </div>
          <Ruler className="text-accent" size={22} />
        </div>

        {latestMetric && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="text-xs uppercase text-text-muted">Peso</div>
              <div className="font-display text-xl font-bold text-accent">
                {latestMetric.weightKg ? `${latestMetric.weightKg} kg` : "—"}
              </div>
              {weightDelta != null && (
                <div className="text-xs text-text-muted">
                  {weightDelta > 0 ? "+" : ""}{weightDelta} kg dall'ultimo check
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="text-xs uppercase text-text-muted">Vita</div>
              <div className="font-display text-xl font-bold text-accent">
                {latestMetric.waistCm ? `${latestMetric.waistCm} cm` : "—"}
              </div>
              <div className="text-xs text-text-muted">{formatDate(latestMetric.date)}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Input
            inputMode="decimal"
            placeholder="Peso kg"
            value={metricForm.weightKg}
            onChange={(e) => setMetricForm({ ...metricForm, weightKg: e.target.value })}
          />
          <Input
            inputMode="decimal"
            placeholder="Vita cm"
            value={metricForm.waistCm}
            onChange={(e) => setMetricForm({ ...metricForm, waistCm: e.target.value })}
          />
          <Input
            inputMode="decimal"
            placeholder="Torace cm"
            value={metricForm.chestCm}
            onChange={(e) => setMetricForm({ ...metricForm, chestCm: e.target.value })}
          />
          <Input
            inputMode="decimal"
            placeholder="Fianchi cm"
            value={metricForm.hipsCm}
            onChange={(e) => setMetricForm({ ...metricForm, hipsCm: e.target.value })}
          />
        </div>
        <Input
          placeholder="Link foto progressi (facoltativo)"
          value={metricForm.photoUrl}
          onChange={(e) => setMetricForm({ ...metricForm, photoUrl: e.target.value })}
        />
        <Textarea
          rows={3}
          placeholder="Note check-in: energia, sonno, fame, dolori..."
          value={metricForm.notes}
          onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })}
        />
        <Button onClick={() => saveMetric.mutate()} disabled={saveMetric.isPending}>
          <Save size={18} /> Salva check-in
        </Button>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-accent" size={20} />
          <h2 className="font-display text-base font-bold uppercase">Progressi esercizi</h2>
        </div>
        {exercises.length ? (
          <div className="space-y-3">
            {exercises.slice(0, 5).map((exercise) => (
              <div key={exercise.name} className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-sm font-bold uppercase">{exercise.name}</h3>
                    <p className="text-xs text-text-muted">
                      {exercise.completedSessions} sessioni completate
                    </p>
                  </div>
                  {exercise.improvement != null ? (
                    <StatusBadge status={exercise.improvement >= 0 ? "success" : "warning"}>
                      {exercise.improvement >= 0 ? "+" : ""}{exercise.improvement} kg
                    </StatusBadge>
                  ) : (
                    <StatusBadge status="neutral">tracking</StatusBadge>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-muted">
                  <div>Ultimo carico: <span className="text-text">{exercise.latestLoad ?? "—"}</span></div>
                  <div>Best load: <span className="text-accent">{exercise.bestLoad ?? "—"}</span></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-surface-2 p-4 text-sm text-text-muted">
            Completa qualche sessione con i carichi per vedere i progressi esercizio per esercizio.
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-base font-bold uppercase">Ultime sessioni</h2>
        {sessions.length ? (
          sessions.map((session) => {
            const completed = session.itemLogs.filter((log) => log.completed).length;
            const total = session.itemLogs.length;
            return (
              <div key={session.id} className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold uppercase">{formatDate(session.date)}</h3>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    <CheckCircle2 size={14} />
                    {completed}/{total}
                  </span>
                </div>
                <ProgressBar label="Completamento" value={total ? (completed / total) * 100 : 0} />
                {session.feedbackNotes && <p className="mt-2 text-sm text-text-muted">{session.feedbackNotes}</p>}
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={CalendarCheck}
            title="Nessuna sessione salvata"
            description="Completa il primo allenamento per vedere lo storico."
          />
        )}
      </Card>
    </div>
  );
}
