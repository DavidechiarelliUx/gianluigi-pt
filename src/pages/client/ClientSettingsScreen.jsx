import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, ArrowLeft, Check, ChevronRight, LogOut,
  Mail, Moon, ShieldCheck, Smartphone, Sun, UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/app";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";
import { useClientLayout } from "./ClientLayoutContext";

const longDate = (value) => value ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : "—";
const money = (cents = 0, currency = "eur") => new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
const accessLabels = { app: "App + Schede", app_live: "App + Schede + Live", live: "Solo Live", premium: "App + Live + 1:1 Premium" };

function subscriptionProgress(subscription) {
  const endValue = subscription?.validUntil || subscription?.renewsAt;
  if (!endValue) return null;
  const end = new Date(endValue).getTime();
  if (!Number.isFinite(end)) return null;
  const startValue = subscription.currentPeriodStart;
  const start = startValue ? new Date(startValue).getTime() : end - 30 * 86_400_000;
  const total = start < end ? end - start : 30 * 86_400_000;
  const daysLeft = Math.ceil((end - Date.now()) / 86_400_000);
  const pct = Math.max(0, Math.min(100, Math.round(Math.max(0, end - Date.now()) / total * 100)));
  return { endValue, daysLeft, pct, label: daysLeft < 0 ? "Scaduto" : daysLeft === 0 ? "Scade oggi" : daysLeft === 1 ? "Manca 1 giorno" : `Mancano ${daysLeft} giorni` };
}

function SettingsRow({ icon: Icon, title, detail, onClick, trailing, danger, switchChecked }) {
  const content = <><span className="client-account-icon"><Icon size={19} /></span><span><strong>{title}</strong><small>{detail}</small></span>{trailing || (onClick && <ChevronRight size={18} />)}</>;
  return onClick ? <button className={"client-account-row " + (danger ? "danger" : "")} onClick={onClick} role={switchChecked == null ? undefined : "switch"} aria-checked={switchChecked == null ? undefined : switchChecked}>{content}</button> : <div className="client-account-row">{content}</div>;
}

export default function ClientSettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useClientLayout();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const overview = useQuery({ queryKey: ["client", "overview"], queryFn: () => apiFetch("/api/client/overview") });
  const subscription = overview.data?.subscription;
  const activePackage = overview.data?.activePackage;
  const progress = subscriptionProgress(subscription);
  const status = subscription?.status;
  const logoutNow = async () => {
    setLoggingOut(true);
    try { await logout(); navigate("/login", { replace: true }); }
    catch (error) { setLoggingOut(false); toast({ type: "error", title: "Logout non riuscito", description: error.message }); }
  };

  if (overview.isLoading) return <EmptyState icon={UserRound} title="Carico le impostazioni..." />;
  if (overview.isError) return <EmptyState icon={UserRound} title="Abbonamento non disponibile" description="Non sono riuscito a caricare lo stato del tuo account." action={<button className="client-retry-button" onClick={() => overview.refetch()}>Riprova</button>} />;

  return (
    <div className="client-settings">
      <header className="client-screen-header client-screen-back"><button className="client-icon-button" onClick={() => navigate("/area-cliente/profilo")} aria-label="Indietro"><ArrowLeft size={20} /></button><div><p>Account, app e supporto</p><h1>Impostazioni</h1></div></header>
      <div className="client-section-heading"><h2>Account</h2></div>
      <div className="client-account-list"><SettingsRow icon={UserRound} title={user?.fullName || "—"} detail="Nome" /><SettingsRow icon={Mail} title={user?.email || "—"} detail="Email" /></div>
      <div className="client-section-heading"><h2>Il tuo abbonamento</h2></div>
      {subscription && status !== "none" ? <section className="client-settings-subscription">
        <div className="client-settings-sub-head"><div><strong>{subscription.productName}</strong><span className={status === "past_due" || status === "canceled" ? "warning" : ""}>{status === "active" || status === "trialing" ? <Check size={14} /> : <AlertCircle size={14} />}{status === "past_due" ? "Pagamento in sospeso" : status === "canceled" ? "Abbonamento cancellato" : "Abbonamento attivo"}</span></div><small className={status === "past_due" || status === "canceled" ? "warning" : ""}>{status === "past_due" ? "SOSPESO" : status === "canceled" ? "CANCELLATO" : "ATTIVO"}</small></div>
        {subscription.renewsAt && !subscription.cancelAtPeriodEnd && <p>Si rinnova il {longDate(subscription.renewsAt)}</p>}
        {subscription.cancelAtPeriodEnd && subscription.validUntil && <p>Accesso valido fino al {longDate(subscription.validUntil)}</p>}
        {subscription.status === "canceled" && subscription.validUntil && <p>Accesso scaduto il {longDate(subscription.validUntil)}</p>}
        {subscription.accessLevel && <p>Include: <strong>{accessLabels[subscription.accessLevel] || subscription.accessLevel}</strong></p>}
        {progress && <div className="client-renewal"><div><span>{subscription.cancelAtPeriodEnd ? "SCADENZA ACCESSO" : "PROSSIMO RINNOVO"}</span><strong>{longDate(progress.endValue)}</strong></div><div className="client-progress-track"><i style={{ width: `${progress.pct}%` }} /></div><div><span>{progress.label}</span><span>{progress.pct}% del periodo rimasto</span></div></div>}
      </section> : activePackage ? <section className="client-settings-subscription"><div className="client-settings-sub-head"><div><strong>{activePackage.productName}</strong><span><Check size={14} /> Pacchetto attivo</span></div><small>ATTIVO</small></div><p>{money(activePackage.amountCents, activePackage.currency)}</p>{activePackage.sessionsQty ? <div className="client-renewal"><div><span>{activePackage.remainingSessions} sessioni residue</span><strong>{activePackage.usedSessions}/{activePackage.sessionsQty}</strong></div><div className="client-progress-track"><i style={{ width: `${Math.min(100, activePackage.usedSessions / activePackage.sessionsQty * 100)}%` }} /></div></div> : <p>Accesso piattaforma attivo</p>}</section> : <section className="client-settings-empty"><strong>Nessun abbonamento attivo</strong><p>Acquista un abbonamento per accedere alle schede e alle live.</p><button onClick={() => navigate("/area-cliente/abbonamenti")}>Vedi abbonamenti</button></section>}
      <div className="client-section-heading"><h2>Supporto</h2></div>
      <div className="client-account-list"><SettingsRow icon={Mail} title="Contatta Gianluigi" detail="Scrivi un messaggio o WhatsApp" onClick={() => navigate("/area-cliente/contatta")} /><SettingsRow icon={ShieldCheck} title="Privacy e sicurezza" detail="Trattamento dei dati" onClick={() => navigate("/area-cliente/privacy")} /></div>
      <div className="client-section-heading"><h2>Applicazione</h2></div>
      <div className="client-account-list"><SettingsRow icon={theme === "dark" ? Sun : Moon} title="Tema scuro" detail="Aspetto dell'app" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} switchChecked={theme === "dark"} trailing={<span className={"client-theme-switch " + (theme === "dark" ? "on" : "")} aria-hidden="true" />} /><SettingsRow icon={Smartphone} title="Aggiungi alla schermata Home" detail="Usa l'app direttamente dal telefono" onClick={() => navigate("/area-cliente/installa-app")} /><SettingsRow icon={LogOut} title={loggingOut ? "Uscita in corso..." : "Esci dall'app"} detail="Logout dal tuo account" onClick={loggingOut ? undefined : logoutNow} danger /></div>
    </div>
  );
}
