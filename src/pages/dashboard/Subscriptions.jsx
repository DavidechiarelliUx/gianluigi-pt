import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, FileText, Pencil, RefreshCw, Send } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { DataTable, EmptyState, Modal, StatusBadge } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

const SUB_STATUSES = ["active", "trialing", "past_due", "unpaid", "canceled", "incomplete"];
const ACCESS_LEVELS = ["none", "app", "live", "app_live", "premium"];
const ORDER_STATUSES = ["pending", "paid", "failed", "refunded"];

const money = (cents = 0, currency = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format((cents || 0) / 100);

function subBadge(status) {
  if (["active", "trialing"].includes(status)) return "success";
  if (["past_due", "unpaid", "incomplete"].includes(status)) return "warning";
  return "archived"; // canceled
}
function orderBadge(status) {
  if (status === "paid") return "success";
  if (status === "failed") return "danger";
  if (status === "refunded") return "archived";
  return "warning"; // pending
}
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("it-IT") : "—");
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/** Field select coerente col tema dark. */
function Select({ value, onChange, options, id }) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="h-10 w-full rounded-sm border border-border bg-surface-2 px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export default function Subscriptions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editSub, setEditSub] = useState(null);
  const [editOrder, setEditOrder] = useState(null);

  const billingQuery = useQuery({
    queryKey: ["admin", "billing"],
    queryFn: () => apiFetch("/api/admin-billing"),
  });

  const subscriptions = useMemo(() => billingQuery.data?.subscriptions || [], [billingQuery.data]);
  const orders = useMemo(() => billingQuery.data?.orders || [], [billingQuery.data]);

  const saveSub = useMutation({
    mutationFn: (payload) => apiFetch("/api/admin-billing", { method: "POST", body: { type: "subscription", ...payload } }),
    onSuccess: async () => {
      setEditSub(null);
      await qc.invalidateQueries({ queryKey: ["admin", "billing"] });
      toast({ type: "success", title: "Abbonamento aggiornato" });
    },
    onError: (err) => toast({ type: "error", title: "Aggiornamento fallito", description: err.message }),
  });

  const saveOrder = useMutation({
    mutationFn: (payload) => apiFetch("/api/admin-billing", { method: "POST", body: { type: "order", ...payload } }),
    onSuccess: async () => {
      setEditOrder(null);
      await qc.invalidateQueries({ queryKey: ["admin", "billing"] });
      toast({ type: "success", title: "Ordine aggiornato" });
    },
    onError: (err) => toast({ type: "error", title: "Aggiornamento fallito", description: err.message }),
  });

  const sendInvoice = useMutation({
    mutationFn: (id) => apiFetch("/api/admin-billing", { method: "POST", body: { type: "invoice", id } }),
    onSuccess: (data) => {
      toast({
        type: "success",
        title: data?.documentType === "receipt" ? "Ricevuta inviata" : "Fattura inviata",
        description: data?.to ? `Email inviata a ${data.to}` : undefined,
      });
    },
    onError: (err) => toast({ type: "error", title: "Invio fattura fallito", description: err.message }),
  });

  const subColumns = [
    {
      key: "user", label: "Cliente",
      render: (s) => (
        <div>
          <div className="font-semibold">{s.user?.fullName || "—"}</div>
          <div className="text-xs text-text-muted">{s.user?.email}</div>
        </div>
      ),
    },
    { key: "product", label: "Prodotto", render: (s) => s.product?.name || "—" },
    { key: "status", label: "Stato", render: (s) => <StatusBadge status={subBadge(s.status)}>{s.status}</StatusBadge> },
    { key: "access", label: "Accesso", render: (s) => s.accessLevel },
    { key: "end", label: "Scadenza", render: (s) => fmtDate(s.currentPeriodEnd) },
    { key: "edit", label: "", render: () => <Pencil size={16} className="text-text-muted" /> },
  ];

  const orderColumns = [
    {
      key: "user", label: "Cliente",
      render: (o) => (
        <div>
          <div className="font-semibold">{o.user?.fullName || o.customerName || "—"}</div>
          <div className="text-xs text-text-muted">{o.user?.email || o.customerEmail}</div>
        </div>
      ),
    },
    { key: "product", label: "Prodotto", render: (o) => o.product?.name || "—" },
    { key: "amount", label: "Importo", render: (o) => money(o.amountCents, o.currency) },
    { key: "status", label: "Stato", render: (o) => <StatusBadge status={orderBadge(o.status)}>{o.status}</StatusBadge> },
    { key: "date", label: "Data", render: (o) => fmtDate(o.createdAt) },
    {
      key: "invoice",
      label: "Fattura",
      render: (o) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={o.status !== "paid" || sendInvoice.isPending}
          onClick={(event) => {
            event.stopPropagation();
            sendInvoice.mutate(o.id);
          }}
        >
          {sendInvoice.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
          Invia
        </Button>
      ),
    },
    { key: "edit", label: "", render: () => <Pencil size={16} className="text-text-muted" /> },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">Abbonamenti &amp; pagamenti</h2>
          <p className="text-sm text-text-muted">
            Gestisci gli abbonamenti dei clienti. Se Stripe va in errore, puoi correggere manualmente qui.
          </p>
        </div>
        <Button variant="secondary" onClick={() => billingQuery.refetch()}>
          <RefreshCw size={16} /> Aggiorna
        </Button>
      </div>

      {/* Abbonamenti ricorrenti */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold uppercase">
          <CreditCard size={18} className="text-accent" /> Abbonamenti ricorrenti
        </h3>
        <DataTable
          columns={subColumns}
          rows={subscriptions}
          loading={billingQuery.isLoading}
          error={billingQuery.error?.message}
          onRowClick={(s) => setEditSub({
            id: s.id, status: s.status, accessLevel: s.accessLevel,
            currentPeriodEnd: toDateInput(s.currentPeriodEnd), cancelAtPeriodEnd: !!s.cancelAtPeriodEnd,
            _label: `${s.user?.fullName || ""} · ${s.product?.name || ""}`,
          })}
          empty={<EmptyState icon={CreditCard} title="Nessun abbonamento" description="Gli abbonamenti Stripe appariranno qui." />}
        />
      </section>

      {/* Ordini / pacchetti */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold uppercase">
          <FileText size={18} className="text-accent" /> Ordini &amp; pacchetti
        </h3>
        <DataTable
          columns={orderColumns}
          rows={orders}
          loading={billingQuery.isLoading}
          error={billingQuery.error?.message}
          onRowClick={(o) => setEditOrder({ id: o.id, status: o.status, _label: `${o.user?.fullName || o.customerName || ""} · ${o.product?.name || ""}` })}
          empty={<EmptyState icon={CreditCard} title="Nessun ordine" description="Gli acquisti appariranno qui." />}
        />
      </section>

      {/* Modal modifica abbonamento */}
      <Modal
        open={!!editSub}
        onClose={() => setEditSub(null)}
        title="Modifica abbonamento"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditSub(null)}>Annulla</Button>
            <Button onClick={() => saveSub.mutate(editSub)} disabled={saveSub.isPending}>Salva</Button>
          </>
        }
      >
        {editSub && (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">{editSub._label}</p>
            <div>
              <label htmlFor="sub-status" className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Stato</label>
              <Select id="sub-status" value={editSub.status} options={SUB_STATUSES}
                onChange={(e) => setEditSub((s) => ({ ...s, status: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="sub-access" className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Livello di accesso</label>
              <Select id="sub-access" value={editSub.accessLevel} options={ACCESS_LEVELS}
                onChange={(e) => setEditSub((s) => ({ ...s, accessLevel: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="sub-end" className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Scadenza periodo</label>
              <Input id="sub-end" type="date" value={editSub.currentPeriodEnd}
                onChange={(e) => setEditSub((s) => ({ ...s, currentPeriodEnd: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input type="checkbox" className="accent-[hsl(var(--accent))]" checked={editSub.cancelAtPeriodEnd}
                onChange={(e) => setEditSub((s) => ({ ...s, cancelAtPeriodEnd: e.target.checked }))} />
              Disdetta a fine periodo
            </label>
          </div>
        )}
      </Modal>

      {/* Modal modifica ordine */}
      <Modal
        open={!!editOrder}
        onClose={() => setEditOrder(null)}
        title="Modifica ordine"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOrder(null)}>Annulla</Button>
            <Button onClick={() => saveOrder.mutate(editOrder)} disabled={saveOrder.isPending}>Salva</Button>
          </>
        }
      >
        {editOrder && (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">{editOrder._label}</p>
            <div>
              <label htmlFor="ord-status" className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Stato pagamento</label>
              <Select id="ord-status" value={editOrder.status} options={ORDER_STATUSES}
                onChange={(e) => setEditOrder((o) => ({ ...o, status: e.target.value }))} />
            </div>
            <p className="text-xs text-text-muted">
              Nota: questa modifica è solo nel database dell'app, non rimborsa su Stripe.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
