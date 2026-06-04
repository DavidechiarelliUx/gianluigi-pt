import { z } from "zod";

export const REQUEST_TYPES = [
  { value: "personal_training", label: "Personal Training" },
  { value: "scheda", label: "Scheda personalizzata" },
  { value: "coaching_online", label: "Coaching online" },
  { value: "sessione_live", label: "Sessione live" },
  { value: "altro", label: "Altro" },
];

const REQUEST_VALUES = REQUEST_TYPES.map((r) => r.value);

/** Schema condiviso (frontend + serverless function). */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il tuo nome"),
  email: z.string().trim().email("Email non valida"),
  phone: z
    .string()
    .trim()
    .max(30, "Numero troppo lungo")
    .optional()
    .or(z.literal("")),
  goal: z.string().trim().max(120, "Massimo 120 caratteri").optional().or(z.literal("")),
  requestType: z.enum(REQUEST_VALUES, {
    errorMap: () => ({ message: "Seleziona un tipo di richiesta" }),
  }),
  message: z
    .string()
    .trim()
    .min(10, "Scrivi almeno 10 caratteri")
    .max(2000, "Messaggio troppo lungo"),
  privacy: z.literal(true, {
    errorMap: () => ({ message: "Devi accettare la privacy policy" }),
  }),
  // honeypot anti-spam: deve restare vuoto
  company: z.literal("").optional(),
});
