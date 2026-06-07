import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ExternalLink, LogOut, Mail, RefreshCw, Shield, Smartphone, User, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";

const money = (cents = 0, currency = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

function SectionCard({ children }) {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
      {children}
    </div>
  );
}

function SectionRow({ icon: Icon, label, value, href, onClick, danger }) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${onClick || href ? "hover:bg-white/5 transition-colors" : ""}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: danger ? "rgba(255,59,59,0.1)" : "#1a1a1a" }}>
        <Icon size={17} style={{ color: danger ? "#ff6b6b" : "#888" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-white"}`}>{label}</p>
        {value && <p className="truncate text-xs text-text-muted">{value}</p>}
      </div>
      {(href || onClick) && <ExternalLink size={14} className="shrink-0 text-text-muted" />}
    </div>
  );

  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left">{inner}</button>;
  return <div>{inner}</div>;
}

function Divider() {
  return <div className="mx-4 border-t" style={{ borderColor: "#1e1e1e" }} />;
}

export default function ClientSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const overviewQuery = useQuery({
    queryKey: ["client", "overview"],
    queryFn: () => apiFetch("/api/client/overview"),
  });

  const activePackage = overviewQuery.data?.activePackage;
  const subscription = overviewQuery.data?.subscription;

  // Logout: navigate to /login (auth state cleared by login page or token expiry)
  const handleLogout = () => {
    // Clear any local auth tokens if stored
    try { localStorage.removeItem("auth-token"); } catch { /* noop */ }
    navigate("/login", { replace: true });
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/area-cliente/profilo")}
          className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl font-black uppercase leading-none">Impostazioni</h1>
          <p className="text-xs text-text-muted">Account, app e supporto</p>
        </div>
      </div>

      {/* Account */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-text-muted">Account</p>
        <SectionCard>
          <SectionRow icon={User} label={user?.fullName || "—"} value="Nome" />
          <Divider />
          <SectionRow icon={Mail} label={user?.email || "—"} value="Email" />
        </SectionCard>
      </div>

      {/* Subscription / Abbonamento */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-text-muted">Il tuo abbonamento</p>
        {subscription && subscription.status !== "none" ? (
          <SectionCard>
            <div className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-base font-bold uppercase text-white">{subscription.productName}</p>
                  {/* Status label */}
                  {(subscription.status === "active" || subscription.status === "trialing") && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "#39FF14" }}>
                      <Zap size={11} /> Abbonamento attivo
                    </p>
                  )}
                  {subscription.status === "past_due" && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "#FFA500" }}>
                      <AlertCircle size={11} /> Pagamento in sospeso
                    </p>
                  )}
                  {subscription.status === "canceled" && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "#ff6b6b" }}>
                      <AlertCircle size={11} /> Abbonamento cancellato
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase"
                  style={{
                    background: subscription.status === "active"
                      ? "rgba(57,255,20,0.12)"
                      : subscription.status === "past_due"
                      ? "rgba(255,165,0,0.12)"
                      : "rgba(255,59,59,0.12)",
                    color: subscription.status === "active"
                      ? "#39FF14"
                      : subscription.status === "past_due"
                      ? "#FFA500"
                      : "#ff6b6b",
                  }}>
                  {subscription.status === "active" ? "Attivo"
                    : subscription.status === "past_due" ? "Sospeso"
                    : "Cancellato"}
                </span>
              </div>

              {/* Rinnovo / scadenza */}
              {subscription.renewsAt && !subscription.cancelAtPeriodEnd && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                  <RefreshCw size={11} className="text-accent" />
                  Si rinnova il {new Date(subscription.renewsAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              )}
              {subscription.cancelAtPeriodEnd && subscription.validUntil && (
                <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "#FFA500" }}>
                  <AlertCircle size={11} />
                  Accesso valido fino al {new Date(subscription.validUntil).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              )}
              {subscription.validUntil && subscription.status === "canceled" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "#ff6b6b" }}>
                  <AlertCircle size={11} />
                  Accesso scaduto il {new Date(subscription.validUntil).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              )}

              {/* Access level badge */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-text-muted">Include:</span>
                {subscription.accessLevel === "app" && <span className="text-xs text-white">App + Schede</span>}
                {subscription.accessLevel === "app_live" && <span className="text-xs text-white">App + Schede + Live</span>}
                {subscription.accessLevel === "live" && <span className="text-xs text-white">Solo Live</span>}
                {subscription.accessLevel === "premium" && <span className="text-xs text-white">App + Live + 1:1 Premium</span>}
              </div>
            </div>
          </SectionCard>
        ) : activePackage ? (
          /* Fallback: ordine legacy */
          <SectionCard>
            <div className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-base font-bold uppercase text-white">{activePackage.productName}</p>
                  <p className="text-sm text-text-muted">{money(activePackage.amountCents, activePackage.currency)}</p>
                </div>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase"
                  style={{ background: "rgba(57,255,20,0.12)", color: "#39FF14" }}>
                  Attivo
                </span>
              </div>
              {activePackage.sessionsQty ? (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-text-muted">
                    <span>{activePackage.remainingSessions} sessioni residue</span>
                    <span>{activePackage.usedSessions}/{activePackage.sessionsQty}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#1a1a1a" }}>
                    <div className="h-full rounded-full" style={{ background: "#39FF14", width: `${(activePackage.usedSessions / activePackage.sessionsQty) * 100}%` }} />
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-xs text-text-muted">Accesso piattaforma attivo</p>
              )}
            </div>
          </SectionCard>
        ) : (
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,59,59,0.06)", border: "1px solid rgba(255,59,59,0.25)" }}>
            <p className="text-sm font-semibold" style={{ color: "#ff6b6b" }}>Nessun abbonamento attivo</p>
            <p className="mt-1 text-xs text-text-muted">Acquista un abbonamento per accedere alle schede e alle live.</p>
            <Button className="mt-3 w-full" onClick={() => navigate("/pacchetti")}>
              Vedi abbonamenti
            </Button>
          </div>
        )}
      </div>

      {/* App */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-text-muted">Applicazione</p>
        <SectionCard>
          <SectionRow
            icon={Smartphone}
            label="Aggiungi alla schermata Home"
            value="Usa l'app direttamente dal telefono"
            href="/installa-app"
          />
        </SectionCard>
      </div>

      {/* Support */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-text-muted">Supporto</p>
        <SectionCard>
          <SectionRow
            icon={Mail}
            label="Contatta Gianluigi"
            value="Supporto via sito"
            href="/contatti"
          />
          <Divider />
          <SectionRow
            icon={Shield}
            label="Privacy & sicurezza"
            value="Trattamento dati"
            href="/privacy"
          />
        </SectionCard>
      </div>

      {/* Logout */}
      <div>
        <SectionCard>
          <SectionRow
            icon={LogOut}
            label="Esci dall'account"
            onClick={handleLogout}
            danger
          />
        </SectionCard>
      </div>

      {/* Upgrade CTA if no package */}
      {!activePackage && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.2)" }}>
          <p className="text-sm font-semibold text-white">Nessun pacchetto attivo</p>
          <p className="mt-1 text-xs text-text-muted">Acquista un pacchetto per sbloccare la scheda e le sessioni live.</p>
          <Button className="mt-3 w-full" onClick={() => navigate("/pacchetti")}>
            Vedi i pacchetti
          </Button>
        </div>
      )}
    </div>
  );
}
