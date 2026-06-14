import {
  Clock3,
  ExternalLink,
  Mail,
  MessageCircle,
  RefreshCw,
  Timer,
  XCircle,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/Button";
import { StatusBadge } from "./index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const longDate = (value) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

/**
 * Calcola progress %, daysLeft e info visive per un abbonamento.
 * pct = clamp((currentPeriodEnd - now) / (currentPeriodEnd - currentPeriodStart) * 100, 0, 100)
 */
function subBarInfo(sub, now = Date.now()) {
  const end = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : null;
  const start = sub.currentPeriodStart ? new Date(sub.currentPeriodStart).getTime() : null;

  if (!end) {
    return {
      pct: 100,
      daysLeft: null,
      barStyle: "green",
      urgency: "ok",
      statusLabel: "Attivo",
      copyLabel: "Abbonamento attivo",
    };
  }

  const daysLeft = Math.ceil((end - now) / 86_400_000);
  const total = start && start < end ? end - start : 30 * 86_400_000;
  const remaining = Math.max(0, end - now);
  let pct = Math.round((remaining / total) * 100);
  pct = Math.max(0, Math.min(100, pct));

  let barStyle, urgency, statusLabel, copyLabel;

  if (sub.status === "past_due") {
    barStyle = "orange";
    urgency = "past_due";
    statusLabel = "Sospeso";
    copyLabel = "Pagamento sospeso — rinnova subito";
  } else if (daysLeft <= 0) {
    barStyle = "red";
    urgency = "expired";
    statusLabel = "Scaduto";
    copyLabel = "Accesso scaduto";
    pct = 0;
  } else if (sub.cancelAtPeriodEnd) {
    barStyle = daysLeft <= 7 ? "orange" : "gray";
    urgency = daysLeft <= 7 ? "cancel_soon" : "cancel";
    statusLabel = "In cancellazione";
    copyLabel = `Accesso valido fino al ${longDate(end)}`;
  } else if (daysLeft <= 1) {
    barStyle = "red";
    urgency = "urgent";
    statusLabel = "Scade oggi";
    copyLabel = "Scade oggi!";
  } else if (daysLeft <= 7) {
    barStyle = "orange";
    urgency = "warning";
    statusLabel = `${daysLeft} giorni`;
    copyLabel = `Rinnovo previsto: ${longDate(end)}`;
  } else {
    barStyle = "green";
    urgency = "ok";
    statusLabel = `${daysLeft} giorni`;
    copyLabel = `Rinnovo previsto: ${longDate(end)}`;
  }

  return { pct, daysLeft, barStyle, urgency, statusLabel, copyLabel };
}

// ─── Visual tokens ────────────────────────────────────────────────────────────

const BAR_GRADIENT = {
  green:  "linear-gradient(90deg, #39FF14 0%, #00FF87 100%)",
  orange: "linear-gradient(90deg, #FFA500 0%, #FFD700 100%)",
  red:    "linear-gradient(90deg, #ff3b3b 0%, #ff6b6b 100%)",
  gray:   "linear-gradient(90deg, #444 0%, #666 100%)",
};

const BAR_GLOW = {
  green:  "0 0 10px rgba(57,255,20,0.55)",
  orange: "0 0 10px rgba(255,165,0,0.5)",
  red:    "0 0 10px rgba(255,59,59,0.5)",
  gray:   "none",
};

const CARD_BORDER = {
  green:  "rgba(57,255,20,0.18)",
  orange: "rgba(255,165,0,0.28)",
  red:    "rgba(255,59,59,0.32)",
  gray:   "rgba(255,255,255,0.08)",
};

const CARD_GLOW = {
  green:  "none",
  orange: "0 0 18px rgba(255,165,0,0.08)",
  red:    "0 0 18px rgba(255,59,59,0.1)",
  gray:   "none",
};

const PCT_COLOR = {
  green:  "#39FF14",
  orange: "#FFA500",
  red:    "#ff6b6b",
  gray:   "#666",
};

const BADGE_STATUS = {
  ok:          "success",
  warning:     "warning",
  urgent:      "danger",
  expired:     "danger",
  past_due:    "warning",
  cancel:      "neutral",
  cancel_soon: "warning",
};

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTERS = [
  { label: "3 giorni",  value: 3 },
  { label: "7 giorni",  value: 7 },
  { label: "30 giorni", value: 30 },
  { label: "Tutti",     value: "all" },
];

// ─── SubscriptionCard ─────────────────────────────────────────────────────────

function SubscriptionCard({ sub, onSendReminder, sendingId, sentIds }) {
  const name     = sub.user?.fullName || sub.user?.email || "Cliente";
  const email    = sub.user?.email;
  const phone    = sub.user?.client?.phone;
  const clientId = sub.user?.client?.id;
  const wa       = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null;
  const isSent    = sentIds?.has(sub.id);
  const isSending = sendingId === sub.id;
  const isUrgent  = sub.urgency === "urgent" || sub.urgency === "expired";
  const planName  = sub.product?.name || "Abbonamento";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="relative overflow-hidden rounded-xl p-4 space-y-3"
      style={{
        background: "hsl(var(--surface-2))",
        border: `1px solid ${CARD_BORDER[sub.barStyle]}`,
        boxShadow: CARD_GLOW[sub.barStyle],
      }}
    >
      {/* Urgency pulse accent (red/orange only) */}
      {isUrgent && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: [0, 0.04, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(ellipse at 50% 0%, #ff3b3b 0%, transparent 70%)" }}
        />
      )}

      {/* ── Row 1: nome + badge giorni ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold uppercase tracking-wide leading-tight">
            {name}
          </p>
          <p className="mt-0.5 truncate text-xs" style={{ color: "hsl(var(--text-muted))" }}>
            {planName}
          </p>
          {sub.currentPeriodEnd && (
            <p className="mt-0.5 text-[11px] font-semibold" style={{ color: PCT_COLOR[sub.barStyle] }}>
              Scadenza: {longDate(sub.currentPeriodEnd)}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <StatusBadge status={BADGE_STATUS[sub.urgency] || "neutral"}>
            {sub.daysLeft === null ? "—"
              : sub.daysLeft <= 0 ? "Scaduto"
              : sub.daysLeft === 1 ? "Oggi"
              : `${sub.daysLeft}gg`}
          </StatusBadge>
          {sub.status === "past_due" && (
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#FFA500" }}>
              Pagamento sospeso
            </span>
          )}
        </div>
      </div>

      {/* ── Row 2: progress bar ── */}
      <div className="space-y-1.5">
        {/* Track */}
        <div
          className="relative h-3.5 overflow-hidden rounded-full"
          style={{ background: "hsl(120 5% 9%)" }}
        >
          {/* Filled bar */}
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              background: BAR_GRADIENT[sub.barStyle],
              boxShadow: BAR_GLOW[sub.barStyle],
            }}
            initial={{ width: 0 }}
            animate={{ width: `${sub.pct}%` }}
            transition={{ duration: 0.85, ease: "easeOut", delay: 0.05 }}
          />
          {/* Shimmer overlay on the filled bar */}
          {sub.pct > 5 && (
            <motion.div
              className="absolute top-0 h-full rounded-full"
              style={{
                left: 0,
                width: `${sub.pct}%`,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
              }}
              animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
            />
          )}
        </div>

        {/* Label row */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] leading-tight" style={{ color: "hsl(var(--text-muted))" }}>
            {sub.urgency === "cancel" || sub.urgency === "cancel_soon" ? (
              <span className="flex items-center gap-1">
                <XCircle size={10} style={{ color: "#FFA500" }} />
                {sub.copyLabel}
              </span>
            ) : sub.urgency === "expired" ? (
              <span style={{ color: "#ff6b6b" }}>Accesso scaduto</span>
            ) : (
              <span className="flex items-center gap-1">
                <RefreshCw size={10} style={{ color: PCT_COLOR[sub.barStyle] }} />
                {sub.copyLabel}
              </span>
            )}
          </span>
          <span
            className="shrink-0 font-mono text-[12px] font-bold tabular-nums"
            style={{ color: PCT_COLOR[sub.barStyle] }}
          >
            {sub.pct}%
          </span>
        </div>
      </div>

      {/* ── Row 3: CTA buttons ── */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {email && (
          <Button
            size="sm"
            variant={isSent ? "ghost" : "secondary"}
            onClick={() => !isSent && onSendReminder(sub)}
            disabled={isSending || isSent}
          >
            {isSending ? (
              <><Clock3 size={12} className="animate-spin" /> Invio…</>
            ) : isSent ? (
              <><Mail size={12} /> Inviato ✓</>
            ) : (
              <><Mail size={12} /> Reminder</>
            )}
          </Button>
        )}
        {wa && (
          <Button as="a" size="sm" variant="secondary" href={wa} target="_blank" rel="noreferrer">
            <MessageCircle size={12} /> WhatsApp
          </Button>
        )}
        {email && (
          <Button as="a" size="sm" variant="ghost" href={`mailto:${email}`}>
            <ExternalLink size={12} /> Email
          </Button>
        )}
        {clientId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { window.location.href = `/dashboard/schede?clientId=${clientId}`; }}
          >
            Scheda →
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── SubscriptionTimeline ─────────────────────────────────────────────────────

export function SubscriptionTimeline({ subscriptions, onSendReminder, sendingId, sentIds }) {
  const [filter, setFilter] = useState(30);
  // useState lazy initializer: Date.now is called once outside the render hot path
  const [now] = useState(Date.now);

  const enriched = useMemo(
    () => subscriptions.map((sub) => ({ ...sub, ...subBarInfo(sub, now) })),
    [subscriptions, now]
  );

  const filtered = useMemo(() => {
    return enriched
      .filter((sub) => {
        if (filter === "all") return true;
        if (sub.daysLeft === null) return false;
        return sub.daysLeft <= filter;
      })
      .sort((a, b) => {
        if (a.daysLeft === null && b.daysLeft === null) return 0;
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999);
      });
  }, [enriched, filter]);

  // Urgency counters for header chips
  const counts = useMemo(() => {
    const urgent  = enriched.filter((s) => (s.daysLeft ?? 99) <= 3 || s.urgency === "expired" || s.urgency === "urgent").length;
    const warning = enriched.filter((s) => (s.daysLeft ?? 99) <= 7 && (s.daysLeft ?? 99) > 3).length;
    return { urgent, warning };
  }, [enriched]);

  return (
    <div
      className="rounded-xl border p-5 space-y-5"
      style={{
        background: "hsl(var(--surface))",
        borderColor: counts.urgent > 0
          ? "rgba(255,59,59,0.25)"
          : counts.warning > 0
          ? "rgba(255,165,0,0.2)"
          : "hsl(var(--border))",
        boxShadow: counts.urgent > 0 ? "0 0 24px rgba(255,59,59,0.06)" : "none",
      }}
    >
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5">
          {/* Icon with glow */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: "hsl(var(--surface-2))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <Timer size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold uppercase tracking-wide leading-tight">
              Accessi in esaurimento
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "hsl(var(--text-muted))" }}>
              {subscriptions.length} abbonamenti attivi
              {counts.urgent > 0 && (
                <> · <span style={{ color: "#ff6b6b" }}>{counts.urgent} urgenti</span></>
              )}
              {counts.warning > 0 && (
                <> · <span style={{ color: "#FFA500" }}>{counts.warning} in scadenza</span></>
              )}
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 shrink-0">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-150"
                style={{
                  background: active ? "#39FF14" : "hsl(var(--surface-2))",
                  color: active ? "#0a0a0a" : "hsl(var(--text-muted))",
                  border: active ? "none" : "1px solid hsl(var(--border))",
                  boxShadow: active ? "0 0 10px rgba(57,255,20,0.35)" : "none",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg px-3 py-2"
        style={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--border))" }}
      >
        <LegendItem color="#39FF14" label="Rinnovo automatico" />
        <LegendItem color="#FFA500" label="In scadenza (≤7gg)" />
        <LegendItem color="#ff6b6b" label="Urgente / Scaduto" />
        <LegendItem color="#666" label="Cancellato" />
      </div>

      {/* ── Content ── */}
      {subscriptions.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <p className="py-4 text-center text-sm" style={{ color: "hsl(var(--text-muted))" }}>
          Nessun abbonamento in scadenza in questo intervallo.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                onSendReminder={onSendReminder}
                sendingId={sendingId}
                sentIds={sentIds}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Footer ── */}
      {filtered.length > 0 && (
        <p className="text-center text-[10px] uppercase tracking-widest" style={{ color: "hsl(var(--text-muted))" }}>
          Ordinato per urgenza · {filtered.length} abbonamenti visibili
        </p>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LegendItem({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide" style={{ color: "hsl(var(--text-muted))" }}>
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 4px ${color}55` }}
      />
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center"
      style={{
        background: "hsl(var(--surface-2))",
        borderColor: "hsl(var(--border))",
        borderStyle: "dashed",
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}
      >
        <Zap size={22} className="text-accent" />
      </div>
      <div>
        <p className="text-sm font-semibold">Nessun abbonamento ricorrente</p>
        <p className="mt-1 max-w-xs text-xs" style={{ color: "hsl(var(--text-muted))" }}>
          Qui appariranno gli abbonamenti Stripe con la barra di scadenza non appena i clienti attiveranno un piano mensile o annuale.
        </p>
      </div>
    </div>
  );
}
