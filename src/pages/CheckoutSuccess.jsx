import { CheckCircle2, Mail, Smartphone } from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { Container } from "../components/ui/Container";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export default function CheckoutSuccess() {
  return (
    <MainLayout>
      <section className="py-section">
        <Container className="max-w-3xl">
          <Card className="border-accent/40 bg-bg/80 text-center shadow-glow-soft">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-bg">
              <CheckCircle2 size={34} />
            </div>
            <h1 className="mt-6 font-display text-4xl font-black uppercase md:text-5xl">
              Pagamento ricevuto
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-text-muted">
              Il tuo acquisto è stato registrato. Se è il tuo primo accesso, riceverai una email
              con il link per impostare la password e aprire la tua area cliente.
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
