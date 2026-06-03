import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classi condizionali e risolve i conflitti Tailwind. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
