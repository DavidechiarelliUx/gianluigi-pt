import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail, Smartphone } from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { Container } from "../components/ui/Container";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export default function CheckoutSuccess() {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Verifico il pagamento e preparo l'accesso...");

  useEffect(() => {
    let mounted = true;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      queueMicrotask(() => {
        if (!mounted) return;
        setStatus("missing");
        setMessage("Pagamento ricevuto. Se non arriva l'email entro pochi minuti, contatta Gianluigi.");
      });
      return;
    }

    fetch(`/api/payments/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (!data.ok) throw new Error(data.error || "Verifica non riuscita");
        if (data.status !== "paid") {
          setStatus("checking");
          setMessage("Pagamento in verifica. Controlla la tua email tra qualche minuto.");
          return;
        }
        if (data.emailSent) {
          setStatus("sent");
          setMessage("Accesso preparato. Ti abbiamo inviato l'email per entrare nella piattaforma.");
        } else if (data.emailAlreadySent) {
          setStatus("sent");
          setMessage("Accesso già preparato. Controlla la tua email, anche nella cartella spam.");
        } else {
          setStatus("warning");
          setMessage("Pagamento confermato, ma l'email non risulta inviata. Contatta Gianluigi se non arriva a breve.");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("warning");
        setMessage("Pagamento ricevuto, ma non sono riuscito a verificare l'invio email. Contatta Gianluigi se non arriva a breve.");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const StatusIcon = status === "checking" ? Loader2 : status === "warning" ? AlertCircle : CheckCircle2;

  return (
    <MainLayout>
      <section className="py-section">
        <Container className="max-w-3xl">
          <Card className="border-accent/40 bg-bg/80 text-center shadow-glow-soft">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-bg">
              <StatusIcon size={34} className={status === "checking" ? "animate-spin" : ""} />
            </div>
            <h1 className="mt-6 font-display text-4xl font-black uppercase md:text-5xl">
              Pagamento ricevuto
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-text-muted">
              {message}
            </p>

            <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
              <div className="rounded-md border border-border bg-surface-2 p-4">
                <Mail className="mb-3 text-accent" size={24} />
                <h2 className="font-bold">Controlla la tua email</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Troverai il link per entrare nella piattaforma Gianluigi PT.
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-2 p-4">
                <Smartphone className="mb-3 text-accent" size={24} />
                <h2 className="font-bold">Installa la web app</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Puoi aggiungerla alla schermata Home e usarla come un'app.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => (window.location.href = "/login")}>Vai al login</Button>
              <Button variant="secondary" onClick={() => (window.location.href = "/installa-app")}>
                Guida installazione
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    </MainLayout>
  );
}
