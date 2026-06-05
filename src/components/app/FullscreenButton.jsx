import { useEffect, useState } from "react";
import { ExternalLink, Maximize2, Minimize2, Smartphone } from "lucide-react";
import { Button } from "../ui/Button";

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function canRequestFullscreen() {
  const root = document.documentElement;
  return Boolean(root.requestFullscreen || root.webkitRequestFullscreen);
}

function isStandaloneApp() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

export function FullscreenButton() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    const update = () => {
      setActive(Boolean(fullscreenElement()));
      setSupported(canRequestFullscreen());
      setStandalone(isStandaloneApp());
    };

    update();
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
    };
  }, []);

  const toggleFullscreen = async () => {
    setHint("");

    if (standalone) {
      setHint("Sei già in modalità app: le barre di Safari/Chrome non vengono mostrate.");
      return;
    }

    if (!supported) {
      setHint("Su iPhone il fullscreen dal browser è limitato: aggiungi l'app alla schermata Home.");
      return;
    }

    try {
      if (fullscreenElement()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        return;
      }

      const root = document.documentElement;
      if (root.requestFullscreen) await root.requestFullscreen();
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    } catch {
      setHint("Il browser ha bloccato il fullscreen. Apri l'app dalla schermata Home per usarla senza barre.");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface/90 p-3 shadow-base backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-sm font-bold uppercase">
            <Smartphone size={16} className="text-accent" />
            Modalità app
          </p>
          <p className="mt-0.5 text-xs leading-5 text-text-muted">
            Nascondi le barre del browser mentre ti alleni.
          </p>
        </div>
        <Button size="sm" variant={active ? "primary" : "secondary"} onClick={toggleFullscreen}>
          {active ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          {active ? "Esci" : "Schermo intero"}
        </Button>
      </div>

      {hint && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-accent/25 bg-accent/5 p-3 text-xs leading-5 text-text-muted">
          <p>{hint}</p>
          {!standalone && (
            <a
              href="/installa-app"
              className="inline-flex w-fit items-center gap-1 font-semibold text-accent hover:text-accent-2"
            >
              Vedi istruzioni <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
