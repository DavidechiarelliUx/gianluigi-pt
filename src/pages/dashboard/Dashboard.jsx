import {
  Activity,
  AlertCircle,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Mail,
  MessageCircle,
  MessageSquareText,
  TrendingUp,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/app";
import { SubscriptionTimeline } from "../../components/app/SubscriptionTimeline";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

// ─── Formatters ───────────────────────────────────────────────────────────────

const money = (cents = 0, currency = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

const dateTime = (value) =>
  new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    .format(new Date(value));

const shortDate = (value) =>
  new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(new Date(value));

// ─── Main Dashboard ────────────────────────────────────────────────────────────

function clientFromOrder(order) {
  const email = order.user?.email || order.customerEmail;
  const phone = order.user?.client?.phone || order.customerPhone;
  return {
    id: order.user?.client?.id,
    name: order.user?.fullName || order.customerName || email || "Cliente",
    email,
    phone,
    goal: order.user?.client?.goal,
    latestOrder: order,
  };
}

function whatsappHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

const orderStatusStyle = { paid: "success", pending: "warning", failed: "danger", refunded: "neutral" };

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sentReminders, setSentReminders] = useState(new Set());
  const [sendingReminderFor, setSendingReminderFor] = useState(null);

  const summaryQuery    = useQuery({ queryKey: ["dashboard", "summary"],               queryFn: () => apiFetch("/api/admin/summary") });
  const ordersQuery     = useQuery({ queryKey: ["payments", "orders"],                  queryFn: () => apiFetch("/api/payments/orders") });
  const liveQuery       = useQuery({ queryKey: ["live", "sessions", "admin"],           queryFn: () => apiFetch("/api/live/sessions") });
  const messagesQuery   = useQuery({ queryKey: ["admin", "messages"],                   queryFn: () => apiFetch("/api/admin/messages") });
  const expiringQuery   = useQuery({ queryKey: ["admin", "subscription-expiring"],      queryFn: () => apiFetch("/api/admin/subscription-expiring") });

  const summary       = summaryQuery.data?.summary;
  const orders        = useMemo(() => ordersQuery.data?.orders || [],  [ordersQuery.data?.orders]);
  const sessions      = useMemo(() => liveQuery.data?.sessions || [],  [liveQuery.data?.sessions]);
  const messages      = useMemo(() => messagesQuery.data?.messages || [], [messagesQuery.data?.messages]);
  const subscriptions = useMemo(() => expiringQuery.data?.subscriptions || [], [expiringQuery.data?.subscriptions]);

  const paidOrders = useMemo(() => orders.filter((o) => o.status === "paid"), [orders]);

  const upcomingSessions = useMemo(() =>
    sessions.filter((s) => s.status !== "cancelled")
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      .slice(0, 6),
    [sessions]
  );

  const payingClients = useMemo(() => {
    const byEmail = new Map();
    for (const o of paidOrders) {
      const c = clientFromOrder(o);
      if (c.email && !byEmail.has(c.email)) byEmail.set(c.email, c);
    }
    return [...byEmail.values()].slice(0, 8);
  }, [paidOrders]);

  const isLoading = summaryQuery.isLoading || ordersQuery.isLoading || liveQuery.isLoading || messagesQuery.isLoading;

  // Send renewal reminder mutation
  const sendReminder = useMutation({
    mutationFn: ({ userId, subscriptionId }) =>
      apiFetch("/api/admin/send-renewal-reminder", { method: "POST", body: { userId, subscriptionId } }),
    onMutate: ({ subscriptionId }) => setSendingReminderFor(subscriptionId),
    onSuccess: (_, { subscriptionId, userEmail }) => {
      setSendingReminderFor(null);
      setSentReminders((prev) => new Set([...prev, subscriptionId]));
      toast({ type: "success", title: "Reminder inviato!", description: userEmail });
    },
    onError: (err) => {
      setSendingReminderFor(null);
      toast({ type: "error", title: "Invio fallito", description: err.message });
    },
  });

  const handleSendReminder = (sub) => {
    sendReminder.mutate({
      userId: sub.user?.id,
      subscriptionId: sub.id,
      userEmail: sub.user?.email,
    });
  };

  // ── KPI definition ────────────────────────────────────────────────────────
  const kpis = [
    {
      icon: Users, label: "Clienti totali",
      value: summary?.clients ?? "—",
      color: "text-accent",
    },
    {
      icon: Zap, label: "Abbonamenti attivi",
      value: summary?.subscriptionsActive ?? "—",
      color: "text-accent",
    },
    {
      icon: AlertCircle, label: "In scadenza (7gg)",
      value: summary?.subscriptionsExpiring7d ?? "—",
      color: (summary?.subscriptionsExpiring7d ?? 0) > 0 ? "text-yellow-400" : "text-accent",
    },
    {
      icon: Activity, label: "Sessioni questa settimana",
      value: summary?.sessionsWeek ?? "—",
      color: "text-accent",
    },
    {
      icon: CreditCard, label: "Incassi questo mese",
      value: summary ? money(summary.revenueMonthCents) : "—",
      color: "text-accent",
    },
    {
      icon: ClipboardList, label: "Senza scheda attiva",
      value: summary?.clientsWithoutWorkout ?? "—",
      color: (summary?.clientsWithoutWorkout ?? 0) > 0 ? "text-yellow-400" : "text-accent",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">
            Ciao, {user?.fullName?.split(" ")[0] || "Coach"}
          </h2>
          <p className="text-sm text-text-muted">Dashboard operativa — abbonamenti, clienti e live.</p>
        </div>
        <Button variant="secondary" onClick={() => { window.location.href = "/dashboard/live"; }}>
          <Video size={18} /> Gestisci live
        </Button>
      </div>

      {/* KPI grid — 2 cols mobile, 3 cols md, 3 cols xl */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="flex flex-col gap-1">
              <Icon className={`mb-1 ${kpi.color}`} size={20} />
              <div className={`font-display text-2xl font-extrabold ${kpi.color}`}>
                {isLoading ? "…" : kpi.value}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-text-muted leading-tight">{kpi.label}</div>
            </Card>
          );
        })}
      </div>

      {/* ── Subscription timeline ── */}
      <SubscriptionTimeline
        subscriptions={subscriptions}
        onSendReminder={handleSendReminder}
        sendingId={sendingReminderFor}
        sentIds={sentReminders}
      />

      {/* ── Clienti paganti + Live ── */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold uppercase">Clienti paganti</h3>
              <p className="text-sm text-text-muted">Ordini confermati — contatti rapidi.</p>
            </div>
            <StatusBadge status="success">{payingClients.length}</StatusBadge>
          </div>

          <div className="space-y-3">
            {payingClients.length ? (
              payingClients.map((client) => {
                const wa = whatsappHref(client.phone);
                return (
                  <article key={client.email} className="rounded-lg border border-border bg-surface-2 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h4 className="truncate font-display text-sm font-bold uppercase">{client.name}</h4>
                        <p className="truncate text-sm text-text-muted">{client.email}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-accent">
                          {client.latestOrder.product?.name || "Pacchetto"} ·{" "}
                          {money(client.latestOrder.amountCents, client.latestOrder.currency)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {client.email && (
                          <Button as="a" size="sm" variant="secondary" href={`mailto:${client.email}`}>
                            <Mail size={15} /> Email
                          </Button>
                        )}
                        {wa && (
                          <Button as="a" size="sm" variant="secondary" href={wa} target="_blank" rel="noreferrer">
                            <MessageCircle size={15} /> WhatsApp
                          </Button>
                        )}
                        {client.id && (
                          <Button size="sm" onClick={() => { window.location.href = `/dashboard/schede?clientId=${client.id}`; }}>
                            Scheda
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-lg border border-border bg-surface-2 p-4 text-sm text-text-muted">
                Nessun ordine pagato ancora registrato.
              </p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-bold uppercase">Calendario live</h3>
            <p className="text-sm text-text-muted">Prossimi appuntamenti e link video.</p>
          </div>
          <div className="space-y-3">
            {upcomingSessions.length ? (
              upcomingSessions.map((s) => (
                <article key={s.id} className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-accent">{dateTime(s.scheduledAt)}</p>
                      <h4 className="mt-1 font-display text-sm font-bold uppercase">{s.title}</h4>
                      <p className="mt-1 text-xs text-text-muted">
                        {s.type === "group" ? "Live di gruppo" : "Sessione 1:1"} ·{" "}
                        {s._count?.bookings || 0}/{s.maxSlots} prenotati
                      </p>
                    </div>
                    <StatusBadge status={s.status === "live" ? "active" : "info"}>{s.status}</StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { window.location.href = "/dashboard/live"; }}>
                      Vedi live
                    </Button>
                    {s.videoLink && (
                      <Button as="a" size="sm" variant="ghost" href={s.videoLink} target="_blank" rel="noreferrer">
                        <ExternalLink size={15} /> Link
                      </Button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-border bg-surface-2 p-4 text-sm text-text-muted">
                Nessuna live futura pianificata.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Richieste clienti ── */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="text-accent" size={20} />
            <div>
              <h3 className="font-display text-lg font-bold uppercase">Richieste clienti</h3>
              <p className="text-sm text-text-muted">Messaggi inviati dall'area cliente.</p>
            </div>
          </div>
          <StatusBadge status={messages.length ? "warning" : "neutral"}>{messages.length}</StatusBadge>
        </div>
        {messages.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {messages.slice(0, 4).map((msg) => {
              const email = msg.client?.user?.email;
              const phone = msg.client?.phone;
              const wa = whatsappHref(phone);
              return (
                <article key={msg.id} className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate font-display text-sm font-bold uppercase">{msg.subject}</h4>
                      <p className="text-xs text-text-muted">
                        {msg.client?.user?.fullName || email || "Cliente"} · {shortDate(msg.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={msg.status === "open" ? "warning" : "success"}>{msg.status}</StatusBadge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-text-muted">{msg.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {email && <Button as="a" size="sm" variant="secondary" href={`mailto:${email}`}><Mail size={15} /> Email</Button>}
                    {wa && <Button as="a" size="sm" variant="secondary" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</Button>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-surface-2 p-4 text-sm text-text-muted">
            Nessuna richiesta inviata dai clienti.
          </p>
        )}
      </Card>

      {/* ── Pagamenti recenti ── */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-accent" size={20} />
          <h3 className="font-display text-lg font-bold uppercase">Pagamenti recenti</h3>
        </div>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-text-muted">
              <tr className="border-b border-border">
                <th className="py-3 pr-4">Cliente</th>
                <th className="py-3 pr-4">Pacchetto</th>
                <th className="py-3 pr-4">Importo</th>
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Stato</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((o) => (
                <tr key={o.id} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{o.user?.fullName || o.customerName || "Cliente"}</div>
                    <div className="text-xs text-text-muted">{o.user?.email || o.customerEmail}</div>
                  </td>
                  <td className="py-3 pr-4 text-text-muted">{o.product?.name || "—"}</td>
                  <td className="py-3 pr-4 font-semibold text-accent">{money(o.amountCents, o.currency)}</td>
                  <td className="py-3 pr-4 text-text-muted">{shortDate(o.createdAt)}</td>
                  <td className="py-3 pr-4"><StatusBadge status={orderStatusStyle[o.status] || "neutral"}>{o.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && <p className="py-6 text-sm text-text-muted">Nessun pagamento registrato.</p>}
        </div>
        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {orders.slice(0, 6).map((o) => (
            <div key={o.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{o.user?.fullName || o.customerName || "Cliente"}</p>
                <p className="text-xs text-text-muted">{o.product?.name || "—"} · {shortDate(o.createdAt)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-accent">{money(o.amountCents, o.currency)}</p>
                <StatusBadge status={orderStatusStyle[o.status] || "neutral"}>{o.status}</StatusBadge>
              </div>
            </div>
          ))}
          {!orders.length && <p className="text-sm text-text-muted">Nessun pagamento.</p>}
        </div>
      </Card>
    </div>
  );
}
