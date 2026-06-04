# Gianluigi PT

Piattaforma fitness online per il personal trainer Gianluigi Chiarelli.
Sito vetrina premium dark/neon + (in fasi successive) app allenamenti, sessioni live, pagamenti.

## Stato

**Fase 1 (design-first)** — sito vetrina premium + design system + motion + form contatto reale.
Login, database, dashboard funzionante e pagamenti arrivano in Fase 2/3.

## Stack (Fase 1)

- Vite + React 18
- Tailwind CSS v3 (design system dark/neon a CSS variables)
- Framer Motion
- React Hook Form + Zod (form)
- Form contatto: Vercel serverless function + Nodemailer

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173 (solo frontend)
npm run build    # build di produzione
npm run preview  # anteprima build
```

## Form contatto — variabili d'ambiente

Il form invia email via una **Vercel serverless function** (`api/contact.js`) con Nodemailer.
Copia `.env.example` in `.env` e compila:

| Variabile | Descrizione |
|---|---|
| `EMAIL_HOST` | Host SMTP (es. `smtp.gmail.com`) |
| `EMAIL_PORT` | `587` (STARTTLS) o `465` (SSL) |
| `EMAIL_USER` | Utente/login SMTP |
| `EMAIL_PASS` | Password o app-password SMTP |
| `STUDIO_EMAIL` | Indirizzo che riceve le richieste |

In produzione, impostarle nel pannello **Vercel → Settings → Environment Variables**.
Le credenziali NON vanno mai committate (`.env` è in `.gitignore`).

### Testare il form in locale

- `npm run dev` (Vite) **non** esegue le funzioni in `api/`: il form mostrerà
  un errore gestito + fallback WhatsApp. Utile per testare UI e validazione.
- Per testare l'invio reale in locale serve la **Vercel CLI**:
  ```bash
  npm i -g vercel
  vercel dev        # esegue frontend + funzioni /api
  ```
  con un file `.env` valorizzato.

## Documentazione

Progettazione e roadmap nel vault Obsidian `AstroAi/Wiki/`:
- `gianluigi-pt-roadmap-fasi` — roadmap a 3 fasi
- `gianluigi-pt-piano-fase1` — piano operativo Fase 1
- `gianluigi-pt-wireframe-design-system` — wireframe + design system
- `gianluigi-pt-architettura-tecnica` — architettura (Fase 2/3)
