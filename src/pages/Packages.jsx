import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, Minus, Plus, ShieldCheck, Zap } from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { Container } from "../components/ui/Container";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { cn } from "../lib/utils";

const DEFAULT_FORM = { fullName: "", email: "", phone: "" };

function formatPrice(cents, currency = "eur") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function Packages() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/payments/products")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const list = [...(data.products || [])].sort(
          (a, b) => (a.priceCents || 0) - (b.priceCents || 0)
        );
        setProducts(list);
        setSelectedId(list[0]?.id || "");
      })
      .catch(() => mounted && setError("Pacchetti non disponibili. Riprova tra poco."));
    return () => {
      mounted = false;
    };
  }, []);

  const selected = useMemo(
    () => products.find((product) => product.id === selectedId),
    [products, selectedId]
  );

  const canChooseQuantity = selected?.type === "session_solo";
  const totalCents = (selected?.priceCents || 0) * (canChooseQuantity ? quantity : 1);
  const totalSessions = selected?.sessionsQty != null
    ? selected.sessionsQty * (canChooseQuantity ? quantity : 1)
    : null;

  const checkout = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("loading");

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedId, quantity, ...form }),
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
      <section className="relative overflow-hidden py-section">
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <Container className="relative">
          <SectionHeader
            eyebrow="Pacchetti online"
            title="Acquista il percorso e sblocca la tua area cliente"
            subtitle="Dopo il pagamento ricevi via email il link per entrare nella piattaforma, impostare la password e aggiungere l'app alla schermata Home."
            align="center"
          />

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.3fr_.7fr]">
            <div className="grid gap-5 sm:grid-cols-2">
              {products.map((product) => {
                const active = product.id === selectedId;
                const featured = product.name === "Abbonamento mensile";
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(product.id);
                      setQuantity(1);
                    }}
                    className={cn(
                      "rounded-lg border bg-surface p-6 text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      active
                        ? "border-accent shadow-glow-soft"
                        : "border-border hover:border-accent/50 hover:-translate-y-1",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-xl font-bold uppercase">{product.name}</h3>
                          {featured && <Badge variant="soon">Consigliato</Badge>}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-text-muted">{product.description}</p>
                      </div>
                      {active && <Zap className="shrink-0 text-accent" size={22} />}
                    </div>

                    <div className="mt-6 flex items-end justify-between gap-4">
                      <p className="font-display text-4xl font-black text-accent">
                        {formatPrice(product.priceCents, product.currency)}
                      </p>
                      <p className="text-sm text-text-muted">
                        {product.type === "session_solo"
                          ? "cad."
                          : product.sessionsQty
                            ? `${product.sessionsQty} sessioni`
                            : "accesso app"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Card className="h-fit border-accent/30 bg-bg/70">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-accent text-bg">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold uppercase">Checkout sicuro</h2>
                  <p className="text-sm text-text-muted">Pagamento test/prod gestito da Stripe.</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={checkout}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-text-muted">Nome completo</span>
                  <Input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((v) => ({ ...v, fullName: e.target.value }))}
                    placeholder="Mario Rossi"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-text-muted">Email</span>
                  <Input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                    placeholder="mario@email.it"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-text-muted">Telefono opzionale</span>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
                    placeholder="+39 ..."
                  />
                </label>

                {canChooseQuantity && (
                  <div className="rounded-md border border-border bg-surface-2 p-4">
                    <span className="mb-3 block text-sm font-semibold text-text-muted">Numero sessioni</span>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                        className="grid h-10 w-10 place-items-center rounded-full border border-border text-text hover:border-accent"
                        aria-label="Diminuisci sessioni"
                      >
                        <Minus size={16} />
                      </button>
                      <div className="text-center">
                        <p className="font-display text-3xl font-black text-accent">{quantity}</p>
                        <p className="text-xs text-text-muted">{quantity === 1 ? "sessione" : "sessioni"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity((v) => Math.min(20, v + 1))}
                        className="grid h-10 w-10 place-items-center rounded-full border border-border text-text hover:border-accent"
                        aria-label="Aumenta sessioni"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {selected && (
                  <div className="rounded-md border border-border bg-surface-2 p-4">
                    <p className="text-sm text-text-muted">Stai acquistando</p>
                    <p className="mt-1 font-bold text-text">{selected.name}</p>
                    <p className="mt-1 text-lg font-black text-accent">
                      {formatPrice(totalCents, selected.currency)}
                    </p>
                    {totalSessions != null && totalSessions > 0 && (
                      <p className="mt-1 text-xs text-text-muted">
                        Include {totalSessions} {totalSessions === 1 ? "sessione" : "sessioni"}.
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <p className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                    {error}
                  </p>
                )}

                <Button className="w-full" type="submit" disabled={!selectedId || status === "loading"}>
                  {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                  Vai al pagamento
                </Button>
              </form>
            </Card>
          </div>
        </Container>
      </section>
    </MainLayout>
  );
}
