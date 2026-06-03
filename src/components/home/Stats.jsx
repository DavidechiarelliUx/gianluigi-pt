import { useCountUp } from "../../hooks/useCountUp";

/**
 * Statistica con count-up animato all'ingresso in viewport.
 * format: funzione opzionale per formattare il numero (es. migliaia).
 */
function Stat({ end, suffix = "", label, format }) {
  const { ref, value } = useCountUp(end);
  const shown = format ? format(value) : Math.round(value).toString();
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl font-extrabold text-accent sm:text-5xl">
        {shown}
        {suffix}
      </div>
      <div className="mt-1 text-sm uppercase tracking-wide text-text-muted">
        {label}
      </div>
    </div>
  );
}

const itDecimal = (n) => Math.round(n).toLocaleString("it-IT");

export function Stats() {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      <Stat end={500} suffix="+" label="Clienti seguiti" />
      <Stat end={12000} label="Kg sollevati" format={itDecimal} />
      <Stat end={10} label="Anni esperienza" />
    </div>
  );
}
