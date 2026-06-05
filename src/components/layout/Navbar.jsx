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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-bg/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="border-b border-accent/25 bg-bg/95 text-xs backdrop-blur-md">
        <Container className="flex min-h-9 items-center justify-between gap-3 py-2">
          <a href="/pacchetti" className="min-w-0 font-semibold text-text transition-colors hover:text-accent">
            <span className="text-accent">Prezzo lancio:</span> App Mensile 59€/mese
          </a>
          <a
            href="/pacchetti"
            className="shrink-0 rounded-full border border-accent/40 px-3 py-1 font-semibold text-accent transition hover:bg-accent/10"
          >
            12 posti
          </a>
        </Container>
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
