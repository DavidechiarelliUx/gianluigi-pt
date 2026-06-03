import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

/**
 * Conta da 0 a `end` quando l'elemento entra in viewport.
 * Rispetta prefers-reduced-motion (mostra subito il valore finale).
 * Ritorna { ref, value } — value è un numero da formattare a piacere.
 */
export function useCountUp(end, { duration = 1400 } = {}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    let raf;
    if (reduce) {
      // valore finale immediato (fuori dal corpo sincrono dell'effect)
      raf = requestAnimationFrame(() => setValue(end));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration, reduce]);

  return { ref, value };
}
