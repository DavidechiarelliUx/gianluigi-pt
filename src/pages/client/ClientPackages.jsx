import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const money = (cents = 0, cur = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: cur }).format(cents / 100);

const ACCESS_LABEL = {
  app:      "App + Schede",
  app_live: "App + Schede + Live",
  live:     "Solo Live",
  premium:  "App + Live + 1:1",
};

// ─── PackageCard ───────────────────────────────────────────────────────────────

function PackageCard({ product, active, onSelect }) {
  const isMonthly = product.billingInterval === "month";
  const isRecommended = product.name === "App Mensile";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      layout
      className="w-full rounded-2xl border p-4 text-left transition-all"
      style={{
        background:   active ? "rgba(57,255,20,0.07)" : "#0d0d0d",
        borderColor:  active ? "#39FF14" : "#1e1e1e",
        boxShadow:    active ? "0 0 20px rgba(57,255,20,0.12)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-black uppercase text-white">
              {product.name}
            </span>
            {isRecommended && (
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: "#39FF14", color: "#0a0a0a" }}>
                consigliato
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-muted line-clamp-2">{product.description}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: "#555" }}>
            {ACCESS_LABEL[product.accessLevel] || "App"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-display text-lg font-black" style={{ color: active ? "#39FF14" : "#fff" }}>
            {money(product.priceCents, product.currency)}
          </div>
          {isMonthly && (
            <p className="text-[10px] text-text-muted">/mese</p>
          )}
        </div>
      </div>

      {active && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#39FF14" }}>
          <CheckCircle2 size={13} /> Selezionato
        </div>
      )}
    </motion.button>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ClientPackages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [selectedId, setSelectedId] = useState(null);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");

  // Pre-fill user data from auth
  const fullName = user?.fullName || "";
  const email    = user?.email || "";

  const productsQuery = useQuery({
    queryKey: ["payments", "products"],
    queryFn:  () => apiFetch("/api/payments/products"),
  });

  const products = useMemo(
    () => (productsQuery.data?.products || [])
      .filter((p) => p.active !== false)
      .sort((a, b) => a.priceCents - b.priceCents),
    [productsQuery.data?.products]
  );

  const selected = products.find((p) => p.id === selectedId) || null;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await apiFetch("/api/payments/checkout", {
        method: "POST",
        body: {
          productId: selectedId,
          fullName,
          email,
          phone: phone.trim() || undefined,
          returnTo: "app", // indica all'API di usare /area-cliente come URL di ritorno
        },
      });
      if (res.url) {
        // Redirect to Stripe Checkout (user comes back to /area-cliente?checkout=success)
        window.location.href = res.url;
      } else {
        setErrorMsg(res.error || "Errore sconosciuto");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg(err.message || "Errore di rete");
      setStatus("error");
    }
  };

  // Handle cancelled checkout
  const wasCancelled = searchParams.get("checkout") === "cancelled";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl font-black uppercase leading-none">
            Abbonamenti
          </h1>
          <p className="text-xs text-text-muted">Scegli il piano più adatto a te</p>
        </div>
      </div>

      {/* Cancelled banner */}
      {wasCancelled && (
        <div className="rounded-xl p-3 text-sm"
          style={{ background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.3)", color: "#FFA500" }}>
          Pagamento annullato. Nessun addebito è stato effettuato.
        </div>
      )}

      {/* Plans */}
      {productsQuery.isLoading ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 size={28} className="animate-spin text-accent" />
          <p className="text-sm text-text-muted">Carico i piani…</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <PackageCard
              key={p.id}
              product={p}
              active={p.id === selectedId}
              onSelect={() => setSelectedId(p.id === selectedId ? null : p.id)}
            />
          ))}
        </div>
      )}

      {/* Checkout form — shown when a plan is selected */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="rounded-2xl overflow-hidden" style={{ background: "#111", border: "1px solid rgba(57,255,20,0.2)" }}>
              {/* Selected recap */}
              <div className="border-b px-4 py-3" style={{ borderColor: "#1e1e1e" }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted">Stai acquistando</p>
                    <p className="font-display text-base font-bold uppercase text-white">{selected.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-black" style={{ color: "#39FF14" }}>
                      {money(selected.priceCents, selected.currency)}
                    </p>
                    {selected.billingInterval === "month" && (
                      <p className="text-[10px] text-text-muted">/mese, cancellabile</p>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4 p-4">
                {/* Pre-filled user info */}
                <div
                  className="rounded-xl p-3 space-y-1"
                  style={{ background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.15)" }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    Dati account
                  </p>
                  <p className="text-sm font-semibold text-white">{fullName}</p>
                  <p className="text-xs text-text-muted">{email}</p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Sparkles size={11} className="text-accent" />
                    <p className="text-[10px] text-text-muted">
                      I tuoi dati sono già pre-compilati. Stripe ricorderà la carta per i rinnovi.
                    </p>
                  </div>
                </div>

                {/* Phone (optional) */}
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Telefono (opzionale)
                  </span>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+39 333 000 0000"
                  />
                </label>

                {errorMsg && (
                  <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(255,59,59,0.1)", color: "#ff6b6b" }}>
                    {errorMsg}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <><Loader2 size={18} className="animate-spin" /> Reindirizzo a Stripe…</>
                  ) : (
                    <><ShieldCheck size={18} /> Vai al pagamento sicuro</>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted">
                  <CreditCard size={11} />
                  Pagamento sicuro gestito da Stripe · nessun dato di carta sui nostri server
                </div>

                {selected.billingInterval === "month" && (
                  <p className="text-center text-[10px] text-text-muted">
                    <Zap size={10} className="inline mr-1 text-accent" />
                    Abbonamento mensile · cancellabile in qualsiasi momento
                  </p>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
