import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { Container } from "../components/ui/Container";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { cn } from "../lib/utils";

const DEFAULT_FORM = { fullName: "", email: "", phone: "" };

const PLAN_COPY = {
  "Start Check": {
    order: 1,
    headline: "Capisci da dove partire",
    subtitle: "Analisi obiettivo e primo consiglio personalizzato.",
    standardCents: 2700,
    cta: "Inizia con il check",
    anchor: "Prova minima",
    bullets: ["Questionario guidato", "Analisi obiettivo", "Prima indicazione pratica"],
  },
  "App Starter": {
    order: 2,
    headline: "Prova la scheda nell'app",
    subtitle: "Sette giorni per capire come funziona il metodo.",
    standardCents: 4700,
    cta: "Prova l'app",
    anchor: "Assaggio pratico",
    bullets: ["Scheda 7 giorni", "Accesso app", "Tracking base"],
  },
  "App Mensile": {
    order: 3,
    headline: "Il percorso vero",
    subtitle: "Scheda mensile, app, tracking e aggiornamento manuale.",
    standardCents: 8900,
    cta: "Blocca il prezzo lancio",
    anchor: "Scelta consigliata",
    badge: "Consigliato",
    launchCapacity: 12,
    scarcityNote: "Ogni scheda la costruisco e la aggiorno manualmente: per questo apro pochi posti alla volta.",
    monthly: true,
    bullets: ["Scheda mensile aggiornata", "App + tracking", "Progressi e adattamenti"],
  },
  "App + Live": {
    order: 4,
    headline: "Aggiungi guida live",
    subtitle: "Per chi vuole anche allenarsi in gruppo con me.",
    standardCents: 12900,
    cta: "Aggiungi le live",
    anchor: "Upgrade gruppo",
    launchCapacity: 8,
    scarcityNote: "Live piccole: posso correggere tecnica, dubbi e progressi.",
    monthly: true,
    bullets: ["Tutto App Mensile", "Live gruppo settimanale", "Calendario prenotazioni"],
  },
  "Premium 1:1": {
    order: 5,
    headline: "Massima attenzione",
    subtitle: "Percorso premium con feedback e sessione individuale.",
    standardCents: 19900,
    cta: "Richiedi il premium",
    anchor: "Pochi posti",
    launchCapacity: 4,
    scarcityNote: "Pochi clienti 1:1, così posso seguirti con presenza reale.",
    monthly: true,
    bullets: ["Tutto App Mensile", "Feedback prioritario", "Sessione individuale 1:1"],
  },
};

const LOCAL_PREVIEW_PRODUCTS = Object.entries(PLAN_COPY).map(([name, meta]) => ({
  id: `preview-${meta.order}`,
  name,
  description: meta.subtitle,
  priceCents: {
    "Start Check": 1700,
    "App Starter": 2900,
    "App Mensile": 5900,
    "App + Live": 9700,
    "Premium 1:1": 14900,
  }[name],
  currency: "eur",
  type: "package",
  sessionsQty: 0,
  launchCapacity: meta.launchCapacity || null,
  remainingSeats: meta.launchCapacity || null,
}));

const OBJECTIONS = [
  {
    icon: ShieldCheck,
    title: "Non è una scheda PDF",
    text: "La scheda vive nell'app: allenamenti, carichi, note e progressi restano ordinati sul telefono.",
  },
  {
    icon: Timer,
    title: "Si aggiorna nel tempo",
    text: "Il percorso mensile permette di correggere rotta quando cambiano corpo, energia e disponibilità.",
  },
  {
    icon: Users,
    title: "Posti limitati reali",
    text: "La scarsità vale solo sui percorsi seguiti: ogni scheda richiede il mio tempo manuale.",
  },
];

function formatPrice(cents, currency = "eur") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function planMeta(product) {
  return PLAN_COPY[product.name] || {
    order: 99,
    headline: product.name,
    subtitle: product.description,
    standardCents: Math.round(product.priceCents * 1.35),
    cta: "Scegli pacchetto",
    anchor: "Percorso",
    bullets: [product.description].filter(Boolean),
  };
}

function displayPrice(product, meta, cents = product.priceCents) {
  return `${formatPrice(cents, product.currency)}${meta.monthly ? "/mese" : ""}`;
}

function productAvailability(product, meta) {
  const capacity = product.launchCapacity ?? meta.launchCapacity ?? null;
  if (!capacity) return null;
  const remaining = Math.max(0, product.remainingSeats ?? capacity);
  const percent = Math.max(0, Math.min(100, (remaining / capacity) * 100));
  return { capacity, remaining, percent };
}

function PackageCard({ product, active, onSelect }) {
  const meta = planMeta(product);
  const recommended = product.name === "App Mensile";
  const saving = Math.max(0, meta.standardCents - product.priceCents);
  const availability = productAvailability(product, meta);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex h-full flex-col rounded-xl border bg-surface p-5 text-left transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        active ? "border-accent shadow-glow-soft" : "border-border hover:border-accent/60",
        recommended
          ? "z-10 bg-accent/5 xl:-translate-y-4 xl:scale-[1.04] xl:border-accent xl:p-5 2xl:p-6 xl:shadow-glow-soft"
          : "xl:p-3.5 2xl:p-4"
      )}
      aria-pressed={active}
    >
      <div className="mb-4 flex min-h-[2rem] flex-wrap items-start justify-between gap-2">
        <Badge variant={recommended ? "live" : "soon"}>{meta.anchor}</Badge>
        {meta.badge && <Badge variant="neon">{meta.badge}</Badge>}
      </div>

      <h2
        className={cn(
          "font-display font-black uppercase leading-tight",
          recommended ? "text-2xl xl:text-[1.65rem] 2xl:text-3xl" : "text-xl xl:text-[1.05rem] 2xl:text-lg"
        )}
      >
        {product.name}
      </h2>
      <p
        className={cn(
          "mt-2 text-sm leading-6 text-text-muted",
          recommended ? "xl:min-h-[5rem]" : "xl:min-h-[4.6rem] xl:text-[0.8rem] xl:leading-5 2xl:text-sm 2xl:leading-6"
        )}
      >
        {meta.subtitle}
      </p>

      <div className="mt-5 space-y-1">
        <p className="text-sm text-text-muted">
          Standard <span className="line-through">{displayPrice(product, meta, meta.standardCents)}</span>
        </p>
        <p
          className={cn(
            "whitespace-nowrap font-display text-[2.65rem] font-black leading-none text-accent sm:text-5xl",
            recommended
              ? "xl:text-[2.85rem] 2xl:text-[3.25rem]"
              : "xl:text-[1.48rem] 2xl:text-[1.86rem]"
          )}
        >
          {displayPrice(product, meta)}
        </p>
        {saving > 0 && (
          <p className="text-xs font-semibold uppercase tracking-wide text-accent/90">
            Risparmi {formatPrice(saving, product.currency)} in fase lancio
          </p>
        )}
      </div>

      {availability ? (
        <div className="mt-5 rounded-md border border-accent/35 bg-bg/70 p-3 xl:p-2.5 2xl:p-3">
          <div className="flex items-center justify-between gap-3 text-[0.7rem] font-semibold uppercase tracking-wide">
            <span className="text-text-muted">Disponibilità</span>
            <span className="text-accent">{availability.remaining}/{availability.capacity} posti</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-neon-gradient shadow-[0_0_14px_rgba(57,255,20,0.45)]"
              style={{ width: `${availability.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-text-muted xl:text-[0.72rem] xl:leading-4 2xl:text-xs 2xl:leading-5">{meta.scarcityNote}</p>
        </div>
      ): null}

      <ul className="mt-5 space-y-2 text-sm text-text-muted xl:text-[0.82rem] 2xl:text-sm">
        {meta.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={16} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <span className={cn(
        "mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold transition-colors",
        recommended ? "text-accent" : "text-text-muted group-hover:text-accent"
      )}>
        {meta.cta} <ArrowRight size={16} />
      </span>
    </button>
  );
}

export default function Packages() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/payments/products")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const list = [...(data.products || [])].sort(
          (a, b) => planMeta(a).order - planMeta(b).order
        );
        setProducts(list);
        setSelectedId(list.find((p) => p.name === "App Mensile")?.id || list[0]?.id || "");
      })
      .catch(() => {
        if (!mounted) return;
        if (import.meta.env.DEV) {
          setPreviewMode(true);
          setProducts(LOCAL_PREVIEW_PRODUCTS);
          setSelectedId(LOCAL_PREVIEW_PRODUCTS.find((p) => p.name === "App Mensile")?.id || "");
          return;
        }
        setError("Pacchetti non disponibili. Riprova tra poco.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selected = useMemo(
    () => products.find((product) => product.id === selectedId),
    [products, selectedId]
  );
  const selectedMeta = selected ? planMeta(selected) : null;
  const appMonthly = products.find((product) => product.name === "App Mensile");
  const appLive = products.find((product) => product.name === "App + Live");
  const premium = products.find((product) => product.name === "Premium 1:1");
  const appMonthlyAvailability = appMonthly ? productAvailability(appMonthly, planMeta(appMonthly)) : null;
  const appLiveAvailability = appLive ? productAvailability(appLive, planMeta(appLive)) : null;
  const premiumAvailability = premium ? productAvailability(premium, planMeta(premium)) : null;
  const checkout = async (event) => {
    event.preventDefault();
    setError("");
    if (previewMode) {
      setError("Preview locale: per testare il pagamento usa Vercel dev o il sito online.");
      return;
    }
    setStatus("loading");

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedId, quantity: 1, ...form }),
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
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <Container className="relative max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="neon">
              <Sparkles size={14} /> Prezzi lancio piattaforma
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl">
              Scegli il percorso. <span className="text-accent">App Mensile</span> è la scelta intelligente.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-muted sm:text-lg sm:leading-8">
              Parti leggero se vuoi provare. Ma il vero percorso è scheda mensile, app, tracking e aggiornamento manuale fatto da me.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-accent/35 bg-accent/5 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-display text-lg font-black uppercase">Fase lancio: apro pochi posti sui percorsi seguiti</p>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  La scarsità è reale: costruisco e aggiorno personalmente le schede dei pacchetti mensili.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[340px]">
                <div className="rounded-md border border-border bg-bg/70 p-3">
                  <p className="font-display text-xl font-black text-accent">{appMonthlyAvailability?.remaining ?? 12}</p>
                  <p className="text-text-muted">App Mensile</p>
                </div>
                <div className="rounded-md border border-border bg-bg/70 p-3">
                  <p className="font-display text-xl font-black text-accent">{appLiveAvailability?.remaining ?? 8}</p>
                  <p className="text-text-muted">App + Live</p>
                </div>
                <div className="rounded-md border border-border bg-bg/70 p-3">
                  <p className="font-display text-xl font-black text-accent">{premiumAvailability?.remaining ?? 4}</p>
                  <p className="text-text-muted">Premium</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,0.78fr)_minmax(0,1.34fr)_minmax(0,0.78fr)_minmax(0,0.78fr)] xl:items-stretch">
              {products.map((product) => (
                <PackageCard
                  key={product.id}
                  product={product}
                  active={product.id === selectedId}
                  onSelect={() => setSelectedId(product.id)}
                />
              ))}
            </div>

            <Card className="mx-auto h-fit w-full max-w-2xl border-accent/30 bg-bg/80">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-accent text-bg">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold uppercase">Blocca il prezzo lancio</h2>
                  <p className="text-sm text-text-muted">Checkout sicuro gestito da Stripe.</p>
                </div>
              </div>

              {selected && selectedMeta && (
                <div className="mb-5 rounded-md border border-accent/30 bg-accent/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-text-muted">Pacchetto selezionato</p>
                  <p className="mt-1 font-display text-xl font-black uppercase text-text">{selected.name}</p>
                  <p className="mt-1 text-sm text-text-muted">{selectedMeta.headline}</p>
                  <p className="mt-3 font-display text-3xl font-black text-accent">
                    {displayPrice(selected, selectedMeta)}
                  </p>
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

                {error && (
                  <p className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                    {error}
                  </p>
                )}

                <Button className="w-full" type="submit" disabled={!selectedId || status === "loading"}>
                  {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                  {selectedMeta?.cta || "Vai al pagamento"}
                </Button>
                <p className="text-center text-xs leading-5 text-text-muted">
                  Dopo il pagamento ricevi via email il link per accedere o impostare la password.
                </p>
              </form>
            </Card>
          </div>
        </Container>
      </section>

      <section className="border-y border-border bg-surface py-14 sm:py-20">
        <Container>
          <SectionHeader
            eyebrow="Perché App Mensile"
            title="Il prodotto vero non è una singola scheda"
            subtitle="Start Check e App Starter servono per entrare. App Mensile è dove posso aggiornare il percorso ogni mese."
            align="center"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {OBJECTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="h-full">
                  <Icon className="mb-5 text-accent" size={30} />
                  <h2 className="font-display text-lg font-bold uppercase">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-text-muted">{item.text}</p>
                </Card>
              );
            })}
          </div>
          <div className="mt-8 flex justify-center">
            <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Torna ai pacchetti <Zap size={18} />
            </Button>
          </div>
        </Container>
      </section>
    </MainLayout>
  );
}
