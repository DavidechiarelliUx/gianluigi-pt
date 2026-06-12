import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, Minus, Plus, ShieldCheck, Sparkles, Star } from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { Container } from "../components/ui/Container";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { cn } from "../lib/utils";

const DEFAULT_FORM = { fullName: "", email: "", phone: "" };

const LOCAL_PRODUCTS = [
  {
    id: "start",
    name: "Start",
    description: "Scheda personalizzata, app e supporto messaggi per partire con metodo.",
    priceCents: 2900,
    effectivePriceCents: 2900,
    currency: "eur",
    type: "package",
    sessionsQty: 0,
    billingInterval: "month",
    features: ["Scheda personalizzata", "Accesso app", "Supporto messaggi", "Aggiornamento ogni 4 settimane"],
    sortOrder: 1,
  },
  {
    id: "progress",
    name: "Progress",
    description: "Percorso seguito con una live inclusa ogni mese.",
    priceCents: 6900,
    effectivePriceCents: 6900,
    currency: "eur",
    type: "package",
    sessionsQty: 1,
    billingInterval: "month",
    badgeLabel: "Consigliato",
    features: ["Tutto Start", "1 live inclusa", "Check-in settimanale", "Adattamenti su carichi e recupero"],
    sortOrder: 2,
  },
  {
    id: "complete",
    name: "Complete",
    description: "Percorso completo con tre live incluse ogni mese.",
    priceCents: 11900,
    effectivePriceCents: 11900,
    currency: "eur",
    type: "package",
    sessionsQty: 3,
    billingInterval: "month",
    features: ["Tutto Progress", "3 live incluse", "Revisione tecnica esercizi", "Strategia mensile su obiettivo e recupero"],
    sortOrder: 3,
  },
  {
    id: "live",
    name: "Live 1:1 extra",
    description: "Credito live acquistabile separatamente e usabile dall'area cliente.",
    priceCents: 2500,
    effectivePriceCents: 2500,
    currency: "eur",
    type: "session_solo",
    sessionsQty: 1,
    billingInterval: "one_time",
    discountTiers: [{ minQty: 4, discountPercent: 10 }, { minQty: 8, discountPercent: 20 }],
    features: ["Credito live 1:1", "Prenotazione dall'app", "Link video integrato"],
    sortOrder: 20,
  },
];

function money(cents = 0, currency = "eur") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function clampQty(value) {
  return Math.max(0, Math.min(20, Number(value) || 0));
}

function discountFor(product, quantity = 1) {
  const base = Number(product.discountPercent) || 0;
  const tier = (product.discountTiers || [])
    .filter((item) => quantity >= Number(item.minQty || 0))
    .reduce((max, item) => Math.max(max, Number(item.discountPercent) || 0), 0);
  return Math.max(base, tier);
}

function unitPrice(product, quantity = 1) {
  const discount = discountFor(product, quantity);
  return Math.round(product.priceCents * (100 - discount) / 100);
}

function ProductDiscountBadge({ product, quantity = 1 }) {
  const discount = discountFor(product, quantity);
  if (discount <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-black text-bg">
      <Star size={13} fill="currentColor" /> -{discount}%
    </span>
  );
}

function PackageCard({ product, active, onSelect }) {
  const discount = discountFor(product, 1);
  const effective = unitPrice(product, 1);
  const recommended = product.badgeLabel || product.name === "Progress";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex h-full flex-col rounded-lg border bg-surface p-5 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        active ? "border-accent shadow-glow-soft" : "border-border hover:border-accent/60",
        recommended ? "bg-accent/5" : ""
      )}
      aria-pressed={active}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <Badge variant={recommended ? "live" : "soon"}>{product.badgeLabel || "Percorso"}</Badge>
        <ProductDiscountBadge product={product} />
      </div>

      <h2 className="font-display text-2xl font-black uppercase leading-tight">{product.name}</h2>
      <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-text-muted">{product.description}</p>

      <div className="mt-4">
        {discount > 0 && (
          <p className="text-sm text-text-muted line-through">{money(product.priceCents, product.currency)}/mese</p>
        )}
        <p className="font-display text-4xl font-black text-accent">
          {money(effective, product.currency)}<span className="text-sm text-text-muted">/mese</span>
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {product.sessionsQty > 0 ? `${product.sessionsQty} live ${product.sessionsQty === 1 ? "inclusa" : "incluse"}` : "Live acquistabili a parte"}
        </p>
      </div>

      <ul className="mt-5 space-y-2 text-sm text-text-muted">
        {(product.features || []).map((feature) => (
          <li key={feature} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={16} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-accent">
        Seleziona <ArrowRight size={16} />
      </span>
    </button>
  );
}

function QuantityControl({ value, onChange, min = 0 }) {
  return (
    <div className="flex items-center rounded-full border border-border bg-bg p-1">
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Diminuisci live"
      >
        <Minus size={16} />
      </button>
      <span className="w-10 text-center font-display text-lg font-black">{value}</span>
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full bg-accent text-bg transition-transform hover:scale-105"
        onClick={() => onChange(Math.min(20, value + 1))}
        aria-label="Aumenta live"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function Packages() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [mode, setMode] = useState("package");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [extraLiveQty, setExtraLiveQty] = useState(0);
  const [liveOnlyQty, setLiveOnlyQty] = useState(1);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/payments/products")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const list = (data.products || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        const packages = list.filter((product) => product.type === "package");
        setProducts(list);
        setSelectedId(packages.find((product) => product.name === "Progress")?.id || packages[0]?.id || "");
      })
      .catch(() => {
        if (!mounted) return;
        if (import.meta.env.DEV) {
          setPreviewMode(true);
          setProducts(LOCAL_PRODUCTS);
          setSelectedId("progress");
          return;
        }
        setError("Pacchetti non disponibili. Riprova tra poco.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const packages = useMemo(
    () => products.filter((product) => product.type === "package" && product.active !== false),
    [products]
  );
  const liveProduct = useMemo(
    () => products.find((product) => product.type === "session_solo" && product.active !== false),
    [products]
  );
  const selectedPackage = packages.find((product) => product.id === selectedId) || null;

  const selectedProduct = mode === "live" ? liveProduct : selectedPackage;
  const liveQty = mode === "live" ? liveOnlyQty : extraLiveQty;
  const packageTotal = mode === "package" && selectedPackage ? unitPrice(selectedPackage, 1) : 0;
  const liveUnit = liveProduct ? unitPrice(liveProduct, mode === "live" ? liveOnlyQty : extraLiveQty) : 0;
  const liveTotal = liveProduct ? liveUnit * liveQty : 0;
  const total = packageTotal + liveTotal;
  const liveDiscount = liveProduct ? discountFor(liveProduct, liveQty) : 0;

  const checkout = async (event) => {
    event.preventDefault();
    setError("");
    if (previewMode) {
      setError("Preview locale: per testare il pagamento usa Vercel dev o il sito online.");
      return;
    }
    if (!selectedProduct) return;
    setStatus("loading");

    try {
      const body = mode === "live"
        ? { productId: liveProduct.id, quantity: liveOnlyQty, ...form }
        : { productId: selectedPackage.id, quantity: 1, liveQuantity: extraLiveQty, ...form };
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout non riuscito");
      window.location.href = data.url;
    } catch (err) {
      setStatus("error");
      setError(err.message || "Checkout non riuscito");
    }
  };

  return (
    <MainLayout>
      <section className="relative overflow-hidden py-12 sm:py-section">
        <Container className="relative max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="neon">
              <Sparkles size={14} /> Percorsi online
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl">
              Scegli il pacchetto e aggiungi le live quando vuoi.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-muted sm:text-lg sm:leading-8">
              Tutti i piani includono app, scheda personalizzata e supporto messaggi. Le live diventano crediti nel tuo account.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {packages.map((product) => (
              <PackageCard
                key={product.id}
                product={product}
                active={mode === "package" && product.id === selectedId}
                onSelect={() => {
                  setMode("package");
                  setSelectedId(product.id);
                }}
              />
            ))}
          </div>

          {liveProduct && (
            <Card className="mt-8 border-accent/30 bg-bg/80">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="live">Extra live</Badge>
                    <ProductDiscountBadge product={liveProduct} quantity={liveOnlyQty} />
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-black uppercase">Acquista live</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                    Se vuoi più sessioni, acquisti crediti live separati. Li ritrovi nell'app e li usi per prenotare.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <QuantityControl value={liveOnlyQty} min={1} onChange={(value) => setLiveOnlyQty(clampQty(value) || 1)} />
                  <div className="min-w-[150px]">
                    {liveDiscount > 0 && <p className="text-xs text-text-muted line-through">{money(liveProduct.priceCents * liveOnlyQty, liveProduct.currency)}</p>}
                    <p className="font-display text-3xl font-black text-accent">{money(liveUnit * liveOnlyQty, liveProduct.currency)}</p>
                  </div>
                  <Button
                    variant={mode === "live" ? "primary" : "secondary"}
                    onClick={() => {
                      setMode("live");
                      window.requestAnimationFrame(() => document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                    }}
                  >
                    Acquista live
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card id="checkout" className="mx-auto mt-10 h-fit w-full max-w-2xl border-accent/30 bg-bg/80">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-accent text-bg">
                <CreditCard size={22} />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold uppercase">Checkout</h2>
                <p className="text-sm text-text-muted">Pagamento sicuro gestito da Stripe.</p>
              </div>
            </div>

            {selectedProduct && (
              <div className="mb-5 space-y-3 rounded-md border border-accent/30 bg-accent/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Selezione</p>
                    <p className="mt-1 font-display text-xl font-black uppercase text-text">
                      {mode === "live" ? `${liveOnlyQty} ${liveOnlyQty === 1 ? "live" : "live"}` : selectedPackage.name}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {mode === "live" ? liveProduct.description : selectedPackage.description}
                    </p>
                  </div>
                  <p className="font-display text-3xl font-black text-accent">{money(total, selectedProduct.currency)}</p>
                </div>

                {mode === "package" && liveProduct && (
                  <div className="rounded-md border border-border bg-bg/70 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">Vuoi aggiungere live extra?</p>
                        <p className="text-xs text-text-muted">
                          I crediti vengono aggiunti al tuo account insieme al pacchetto.
                        </p>
                      </div>
                      <QuantityControl value={extraLiveQty} onChange={(value) => setExtraLiveQty(clampQty(value))} />
                    </div>
                    {extraLiveQty > 0 && (
                      <p className="mt-2 text-xs text-text-muted">
                        Extra live: {money(liveTotal, liveProduct.currency)}
                        {liveDiscount > 0 ? ` con sconto -${liveDiscount}%` : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {previewMode && (
              <p className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-warning">
                Preview locale: i pacchetti sono caricati in modalità design. Il checkout reale funziona su Vercel.
              </p>
            )}

            <form className="space-y-4" onSubmit={checkout}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-text-muted">Nome completo</span>
                <Input required value={form.fullName} onChange={(e) => setForm((v) => ({ ...v, fullName: e.target.value }))} placeholder="Mario Rossi" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-text-muted">Email</span>
                <Input required type="email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} placeholder="mario@email.it" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-text-muted">Telefono opzionale</span>
                <Input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} placeholder="+39 ..." />
              </label>

              {error && <p className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}

              <Button className="w-full" type="submit" disabled={!selectedProduct || status === "loading"}>
                {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                Vai al pagamento
              </Button>
              <p className="text-center text-xs leading-5 text-text-muted">
                Dopo il pagamento ricevi via email il link per accedere o impostare la password.
              </p>
            </form>
          </Card>
        </Container>
      </section>
    </MainLayout>
  );
}
