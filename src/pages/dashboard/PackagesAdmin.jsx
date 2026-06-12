import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Pencil, RefreshCw, Save, Star } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { EmptyState, Modal, StatusBadge } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

const ACCESS_LEVELS = ["app", "app_live", "premium", "live", "none"];
const BILLING_INTERVALS = ["month", "one_time", "year"];

function money(cents = 0, currency = "eur") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function discountFor(product, quantity = 1) {
  const base = Number(product.discountPercent) || 0;
  const tier = (product.discountTiers || [])
    .filter((item) => quantity >= Number(item.minQty || 0))
    .reduce((max, item) => Math.max(max, Number(item.discountPercent) || 0), 0);
  return Math.max(base, tier);
}

function effectivePrice(product, quantity = 1) {
  return Math.round(product.priceCents * (100 - discountFor(product, quantity)) / 100);
}

function toEdit(product) {
  return {
    ...product,
    priceEuro: String((product.priceCents || 0) / 100),
    featuresText: (product.features || []).join("\n"),
    tier1Qty: String(product.discountTiers?.[0]?.minQty || ""),
    tier1Discount: String(product.discountTiers?.[0]?.discountPercent || ""),
    tier2Qty: String(product.discountTiers?.[1]?.minQty || ""),
    tier2Discount: String(product.discountTiers?.[1]?.discountPercent || ""),
  };
}

function fromEdit(form) {
  const discountTiers = [
    { minQty: form.tier1Qty, discountPercent: form.tier1Discount },
    { minQty: form.tier2Qty, discountPercent: form.tier2Discount },
  ]
    .filter((tier) => Number(tier.minQty) > 0 && Number(tier.discountPercent) > 0)
    .map((tier) => ({
      minQty: Number(tier.minQty),
      discountPercent: Number(tier.discountPercent),
    }));

  return {
    id: form.id,
    name: form.name,
    description: form.description,
    priceCents: Math.round(Number(String(form.priceEuro).replace(",", ".")) * 100),
    sessionsQty: Number(form.sessionsQty) || 0,
    discountPercent: Number(form.discountPercent) || 0,
    discountTiers,
    features: form.featuresText,
    badgeLabel: form.badgeLabel,
    sortOrder: Number(form.sortOrder) || 0,
    active: !!form.active,
    accessLevel: form.accessLevel,
    billingInterval: form.billingInterval,
  };
}

function ProductCard({ product, onEdit }) {
  const isLive = product.type === "session_solo";
  const discount = discountFor(product, isLive ? 4 : 1);
  const price = effectivePrice(product, isLive ? 4 : 1);

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold uppercase">{product.name}</h3>
            <StatusBadge status={product.active ? "success" : "archived"}>
              {product.active ? "Attivo" : "Nascosto"}
            </StatusBadge>
            {discount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-bg">
                <Star size={11} fill="currentColor" /> -{discount}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-text-muted">{product.description}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onEdit(product)}>
          <Pencil size={15} />
        </Button>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-text-muted">Prezzo</p>
          <p className="font-display text-xl font-black text-accent">
            {money(price, product.currency)}
          </p>
          {discount > 0 && <p className="text-xs text-text-muted line-through">{money(product.priceCents, product.currency)}</p>}
        </div>
        <div>
          <p className="text-xs uppercase text-text-muted">Crediti live</p>
          <p className="font-semibold">{product.sessionsQty || 0}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-text-muted">Ordine</p>
          <p className="font-semibold">{product.sortOrder}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-1 text-sm text-text-muted">
        {(product.features || []).slice(0, 4).map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>
    </Card>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-sm border border-border bg-surface-2 px-3 text-text focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export default function PackagesAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [edit, setEdit] = useState(null);

  const productsQuery = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => apiFetch("/api/admin/products"),
  });

  const products = useMemo(
    () => productsQuery.data?.products || [],
    [productsQuery.data?.products]
  );

  const packages = products.filter((product) => product.type === "package");
  const liveProducts = products.filter((product) => product.type !== "package");

  const save = useMutation({
    mutationFn: (payload) => apiFetch("/api/admin/products", { method: "PUT", body: payload }),
    onSuccess: async () => {
      setEdit(null);
      await qc.invalidateQueries({ queryKey: ["admin", "products"] });
      await qc.invalidateQueries({ queryKey: ["payments", "products"] });
      toast({ type: "success", title: "Prodotto aggiornato" });
    },
    onError: (err) => toast({ type: "error", title: "Salvataggio fallito", description: err.message }),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">Pacchetti</h2>
          <p className="text-sm text-text-muted">
            Gestisci testi, prezzi, sconti e crediti live mostrati nella pagina pacchetti.
          </p>
        </div>
        <Button variant="secondary" onClick={() => productsQuery.refetch()}>
          <RefreshCw size={16} /> Aggiorna
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold uppercase">
          <CreditCard size={18} className="text-accent" /> Abbonamenti
        </h3>
        {productsQuery.isLoading ? (
          <EmptyState icon={CreditCard} title="Carico i pacchetti…" />
        ) : packages.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nessun pacchetto" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {packages.map((product) => (
              <ProductCard key={product.id} product={product} onEdit={(item) => setEdit(toEdit(item))} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold uppercase">
          <CreditCard size={18} className="text-accent" /> Live extra
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {liveProducts.map((product) => (
            <ProductCard key={product.id} product={product} onEdit={(item) => setEdit(toEdit(item))} />
          ))}
        </div>
      </section>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Modifica prodotto"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEdit(null)}>Annulla</Button>
            <Button onClick={() => save.mutate(fromEdit(edit))} disabled={save.isPending}>
              <Save size={16} /> Salva
            </Button>
          </>
        }
      >
        {edit && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Nome</span>
              <Input value={edit.name} onChange={(e) => setEdit((v) => ({ ...v, name: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Badge</span>
              <Input value={edit.badgeLabel || ""} onChange={(e) => setEdit((v) => ({ ...v, badgeLabel: e.target.value }))} placeholder="Consigliato" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Descrizione</span>
              <Textarea rows={3} value={edit.description || ""} onChange={(e) => setEdit((v) => ({ ...v, description: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Prezzo base (€)</span>
              <Input type="number" step="0.01" min="1" value={edit.priceEuro} onChange={(e) => setEdit((v) => ({ ...v, priceEuro: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Sconto %</span>
              <Input type="number" min="0" max="90" value={edit.discountPercent || 0} onChange={(e) => setEdit((v) => ({ ...v, discountPercent: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Crediti live inclusi</span>
              <Input type="number" min="0" value={edit.sessionsQty || 0} onChange={(e) => setEdit((v) => ({ ...v, sessionsQty: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Ordine</span>
              <Input type="number" min="0" value={edit.sortOrder || 0} onChange={(e) => setEdit((v) => ({ ...v, sortOrder: e.target.value }))} />
            </label>
            <SelectField label="Accesso" value={edit.accessLevel} options={ACCESS_LEVELS} onChange={(value) => setEdit((v) => ({ ...v, accessLevel: value }))} />
            <SelectField label="Fatturazione" value={edit.billingInterval} options={BILLING_INTERVALS} onChange={(value) => setEdit((v) => ({ ...v, billingInterval: value }))} />
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Feature, una per riga</span>
              <Textarea rows={5} value={edit.featuresText} onChange={(e) => setEdit((v) => ({ ...v, featuresText: e.target.value }))} />
            </label>

            {edit.type !== "package" && (
              <div className="space-y-3 rounded-lg border border-border bg-bg/60 p-3 md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Sconti progressivi live</p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Input type="number" min="1" placeholder="Min live" value={edit.tier1Qty} onChange={(e) => setEdit((v) => ({ ...v, tier1Qty: e.target.value }))} />
                  <Input type="number" min="0" max="90" placeholder="Sconto %" value={edit.tier1Discount} onChange={(e) => setEdit((v) => ({ ...v, tier1Discount: e.target.value }))} />
                  <Input type="number" min="1" placeholder="Min live" value={edit.tier2Qty} onChange={(e) => setEdit((v) => ({ ...v, tier2Qty: e.target.value }))} />
                  <Input type="number" min="0" max="90" placeholder="Sconto %" value={edit.tier2Discount} onChange={(e) => setEdit((v) => ({ ...v, tier2Discount: e.target.value }))} />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-text-muted md:col-span-2">
              <input type="checkbox" className="accent-[hsl(var(--accent))]" checked={!!edit.active} onChange={(e) => setEdit((v) => ({ ...v, active: e.target.checked }))} />
              Mostra nella pagina pacchetti
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
