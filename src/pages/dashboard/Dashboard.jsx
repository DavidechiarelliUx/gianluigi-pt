import {
  Activity,
  CalendarDays,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Mail,
  MessageCircle,
  Users,
  Video,
} from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/app";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";

const money = (cents = 0, currency = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

const dateTime = (value) =>
  new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const shortDate = (value) =>
  new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(new Date(value));

const statusStyle = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  refunded: "neutral",
};

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

export default function Dashboard() {
  const { user } = useAuth();
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => apiFetch("/api/admin/summary"),
  });
  const ordersQuery = useQuery({
    queryKey: ["payments", "orders"],
    queryFn: () => apiFetch("/api/payments/orders"),
  });
  const liveQuery = useQuery({
    queryKey: ["live", "sessions", "admin"],
    queryFn: () => apiFetch("/api/live/sessions"),
  });

  const summary = summaryQuery.data?.summary;
  const orders = useMemo(() => ordersQuery.data?.orders || [], [ordersQuery.data?.orders]);
  const sessions = useMemo(() => liveQuery.data?.sessions || [], [liveQuery.data?.sessions]);
  const paidOrders = useMemo(() => orders.filter((order) => order.status === "paid"), [orders]);
  const upcomingSessions = useMemo(() => {
    return sessions
      .filter((session) => session.status !== "cancelled")
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      .slice(0, 6);
  }, [sessions]);

  const payingClients = useMemo(() => {
    const byEmail = new Map();
    for (const order of paidOrders) {
      const client = clientFromOrder(order);
      if (!client.email) continue;
      if (!byEmail.has(client.email)) byEmail.set(client.email, client);
    }
    return [...byEmail.values()].slice(0, 8);
  }, [paidOrders]);

  const revenueCents = paidOrders.reduce((sum, order) => sum + (order.amountCents || 0), 0);
  const isLoading = summaryQuery.isLoading || ordersQuery.isLoading || liveQuery.isLoading;

  const stats = [
    { label: "Clienti", value: summary?.clients ?? "—", icon: Users },
    { label: "Schede attive", value: summary?.activeWorkouts ?? "—", icon: ClipboardList },
    { label: "Incassi", value: money(revenueCents), icon: CreditCard },
    { label: "Live future", value: upcomingSessions.length, icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">
            Ciao, {user?.fullName?.split(" ")[0] || "Coach"}
          </h2>
          <p className="text-sm text-text-muted">
            Pagamenti, clienti paganti, appuntamenti e live in un'unica vista.
          </p>
        </div>
        <Button variant="secondary" onClick={() => { window.location.href = "/dashboard/live"; }}>
          <Video size={18} /> Gestisci live
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <Icon className="mb-2 text-accent" size={22} />
              <div className="font-display text-3xl font-extrabold text-accent">
                {isLoading ? "..." : s.value}
              </div>
              <div className="text-xs uppercase tracking-wide text-text-muted">{s.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold uppercase">Clienti paganti</h3>
              <p className="text-sm text-text-muted">Contatti rapidi per follow-up, schede e appuntamenti.</p>
            </div>
            <StatusBadge status="success">{payingClients.length}</StatusBadge>
          </div>

          <div className="space-y-3">
            {payingClients.length ? (
              payingClients.map((client) => {
                const wa = whatsappHref(client.phone);
                return (
                  <article
                    key={client.email}
                    className="rounded-lg border border-border bg-surface-2 p-4"
                  >
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
                          <Button
                            as="a"
                            size="sm"
                            variant="secondary"
                            href={`mailto:${client.email}`}
                          >
                            <Mail size={15} /> Email
                          </Button>
                        )}
                        {wa && (
                          <Button as="a" size="sm" variant="secondary" href={wa} target="_blank" rel="noreferrer">
                            <MessageCircle size={15} /> WhatsApp
                          </Button>
                        )}
                        {client.id && (
                          <Button
                            size="sm"
                            onClick={() => { window.location.href = `/dashboard/schede?clientId=${client.id}`; }}
                          >
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
            <p className="text-sm text-text-muted">Prossimi appuntamenti, classi e link video.</p>
          </div>

          <div className="space-y-3">
            {upcomingSessions.length ? (
              upcomingSessions.map((session) => (
                <article key={session.id} className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-accent">{dateTime(session.scheduledAt)}</p>
                      <h4 className="mt-1 font-display text-sm font-bold uppercase">{session.title}</h4>
                      <p className="mt-1 text-xs text-text-muted">
                        {session.type === "group" ? "Live di gruppo" : "Sessione 1:1"} ·{" "}
                        {session._count?.bookings || 0}/{session.maxSlots} prenotati
                      </p>
                    </div>
                    <StatusBadge status={session.status === "live" ? "active" : "info"}>
                      {session.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { window.location.href = "/dashboard/live"; }}>
                      Vedi live
                    </Button>
                    {session.videoLink && (
                      <Button
                        as="a"
                        size="sm"
                        variant="ghost"
                        href={session.videoLink}
                        target="_blank"
                        rel="noreferrer"
                      >
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

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="text-accent" size={20} />
          <h3 className="font-display text-lg font-bold uppercase">Pagamenti recenti</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-text-muted">
              <tr className="border-b border-border">
                <th className="py-3 pr-4">Cliente</th>
                <th className="py-3 pr-4">Pacchetto</th>
                <th className="py-3 pr-4">Importo</th>
                <th className="py-3 pr-4">Sessioni</th>
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Stato</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-text">{order.user?.fullName || order.customerName || "Cliente"}</div>
                    <div className="text-xs text-text-muted">{order.user?.email || order.customerEmail}</div>
                  </td>
                  <td className="py-3 pr-4 text-text-muted">{order.product?.name || "—"}</td>
                  <td className="py-3 pr-4 font-semibold text-accent">{money(order.amountCents, order.currency)}</td>
                  <td className="py-3 pr-4 text-text-muted">{order.sessionsQty ?? "—"}</td>
                  <td className="py-3 pr-4 text-text-muted">{shortDate(order.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={statusStyle[order.status] || "neutral"}>{order.status}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && (
            <p className="py-6 text-sm text-text-muted">Nessun pagamento registrato.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
