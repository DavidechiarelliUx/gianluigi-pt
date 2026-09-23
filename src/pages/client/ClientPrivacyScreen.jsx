import { ArrowLeft, Lock, Mail, Server, ShieldCheck, Trash2, UserRoundCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = [
  { icon: UserRoundCheck, title: "Dati che raccogliamo", text: "Nome, email, telefono (opzionale), dati di allenamento (esercizi, carichi, RPE), sessioni completate e feedback. Nessun dato raccolto senza il tuo consenso." },
  { icon: Server, title: "Come vengono usati", text: "I tuoi dati servono esclusivamente per gestire le schede di allenamento, l'accesso alla piattaforma e comunicarti aggiornamenti relativi al tuo abbonamento. Non li vendiamo né cediamo a terzi." },
  { icon: Lock, title: "Sicurezza", text: "La piattaforma usa HTTPS ovunque. Le password sono cifrate con bcrypt. I pagamenti sono gestiti interamente da Stripe (PCI DSS Level 1). Nessun dato di carta di credito viene memorizzato sui nostri server." },
  { icon: Trash2, title: "Cancellazione dati", text: "Puoi richiedere accesso, rettifica o cancellazione scrivendo a gianluigi@gianluigipt.it. Alcuni dati possono essere conservati per obblighi fiscali o tutela di diritti." },
  { icon: Mail, title: "Email e comunicazioni", text: "Ti inviamo email solo per confermare acquisti, inviarti credenziali di accesso o notificarti scadenze abbonamento. Non facciamo spam né newsletter non richieste." },
  { icon: ShieldCheck, title: "I tuoi diritti (GDPR)", text: "Hai diritto di accesso, rettifica, cancellazione e portabilità dei tuoi dati. Per esercitare questi diritti scrivi a gianluigi@gianluigipt.it con oggetto 'GDPR – Richiesta'." },
];

export default function ClientPrivacyScreen() {
  const navigate = useNavigate();
  return <div className="client-privacy"><header className="client-screen-header client-screen-back"><button className="client-icon-button" onClick={() => navigate(-1)} aria-label="Indietro"><ArrowLeft size={20} /></button><div><p>Trattamento dei tuoi dati</p><h1>Privacy e sicurezza</h1></div></header><p className="client-privacy-intro">Gianluigi PT raccoglie solo i dati strettamente necessari al funzionamento del servizio. Non utilizziamo tracker, non vendiamo dati, non facciamo pubblicità.</p><div className="client-privacy-sections">{sections.map(({ icon: Icon, title, text }) => <section key={title}><h2><Icon size={18} /> {title}</h2><p>{text}</p></section>)}</div><footer className="client-privacy-footer"><p>Titolare del trattamento: Gianluigi Chiarelli</p><p>gianluigi@gianluigipt.it · P.IVA da inserire</p><p><a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy policy completa</a> · <a href="/cookie-policy" target="_blank" rel="noopener noreferrer">Cookie policy</a></p><small>Ultimo aggiornamento: luglio 2026</small></footer></div>;
}
