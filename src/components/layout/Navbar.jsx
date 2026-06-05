import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Menu, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Container } from "../ui/Container";
import { cn } from "../../lib/utils";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "App", href: "/app" },
  { label: "Pacchetti", href: "/pacchetti" },
  { label: "Contatti", href: "/contatti" },
];

/** Navbar fixed scroll-aware: trasparente in cima → blur+bordo dopo lo scroll. */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [appSeats, setAppSeats] = useState(12);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/payments/products")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const appMensile = data.products?.find((product) => product.name === "App Mensile");
        if (typeof appMensile?.remainingSeats === "number") setAppSeats(appMensile.remainingSeats);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const marqueeText = `PREZZO LANCIO APP MENSILE 59€/MESE • ${appSeats} POSTI RIMASTI • SCHEDE AGGIORNATE MANUALMENTE • BLOCCA IL PREZZO LANCIO`;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-bg/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="overflow-hidden bg-accent text-bg">
        <a
          href="/pacchetti"
          className="flex min-h-9 items-center whitespace-nowrap font-display text-xs font-black uppercase tracking-wide text-bg sm:text-sm"
          aria-label={`Prezzo lancio App Mensile 59 euro al mese, ${appSeats} posti rimasti`}
        >
          <span className="flex min-w-max animate-marquee-x items-center gap-8 pr-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <span key={index}>{marqueeText}</span>
            ))}
          </span>
        </a>
      </div>
      <Container className="flex h-16 items-center justify-between">
        <a
          href="/"
          className="group flex items-center gap-2 font-display text-lg font-bold uppercase"
        >
          <Dumbbell
            size={22}
            className="text-accent transition-transform group-hover:scale-110"
          />
          Gianluigi <span className="text-accent">PT</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-text-muted transition-colors hover:text-accent"
            >
              {l.label}
            </a>
          ))}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => (window.location.href = "/login")}
          >
            Login
          </Button>
        </nav>

        {/* Mobile toggle */}
        <button
          className="rounded-sm p-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </Container>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-border bg-bg/95 backdrop-blur-md md:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-sm px-2 py-3 text-text-muted transition-colors hover:bg-surface-2 hover:text-accent"
                >
                  {l.label}
                </a>
              ))}
              <Button
                className="mt-2 w-full"
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  window.location.href = "/login";
                }}
              >
                Login
              </Button>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
