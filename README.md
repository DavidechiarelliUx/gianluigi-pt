# Gianluigi PT

Piattaforma fitness online per il personal trainer Gianluigi Chiarelli.
Sito vetrina premium dark/neon + (in fasi successive) app allenamenti, sessioni live, pagamenti.

## Stato

**Fase 1 (design-first)** — sito vetrina premium + design system + motion + form contatto reale.
Login, database, dashboard e app allenamenti sono attivi. La Fase 3 aggiunge live, pacchetti e pagamenti Stripe.

## Stack (Fase 1)

- Vite + React 18
- Tailwind CSS v3 (design system dark/neon a CSS variables)
- Framer Motion
- React Hook Form + Zod (form)
- Form contatto: Vercel serverless function + Nodemailer

## Database — Neon + Prisma (Fase 2)

L'app allenamenti usa **PostgreSQL su Neon** con **Prisma 7** (adapter Neon, serverless).

### Setup iniziale (una tantum)

1. Crea un progetto gratuito su **https://neon.tech**
2. Dalla dashboard Neon copia **due** connection string:
   - **Pooled** → `DATABASE_URL` (runtime serverless)
   - **Direct** → `DIRECT_URL` (migrations)
3. Copia `.env.example` in `.env` e compila `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `APP_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

> In Prisma 7 le connection URL stanno in `prisma.config.ts` (non nello schema). `.env` viene caricato via `dotenv`.

### Comandi Prisma

```bash
npx prisma validate         # valida lo schema (no DB)
npx prisma generate         # genera il client (no DB)
npx prisma migrate dev      # crea/applica le migration in locale (richiede DIRECT_URL)
npx prisma db seed          # crea admin + esercizi base (richiede DATABASE_URL + ADMIN_*)
npx prisma studio           # esplora il DB
# produzione (Neon prod):
npx prisma migrate deploy
```

### Variabili d'ambiente (Fase 2, oltre alle EMAIL_*)

| Variabile | Uso |
|---|---|
| `DATABASE_URL` | Neon **pooled** (runtime, adapter) |
| `DIRECT_URL` | Neon **direct** (migrations) |
| `JWT_SECRET` | Firma JWT (cookie httpOnly) |
| `APP_URL` | Base URL per i link d'invito |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Primo account admin (seed) |

In produzione, impostarle su **Vercel → Settings → Environment Variables**.

## SEO & asset

- Meta SEO completi in `index.html` (title, description, Open Graph, Twitter card, canonical)
- `public/robots.txt`, `public/sitemap.xml`, `public/favicon.svg` (manubrio neon), `public/og-image.jpg` (1200×630)
- Foto brand: `gianluigi-chiarelli.png` (originale conservato) + `.webp` ottimizzata (~55 kB) usata nel sito
- ⚠️ Aggiorna gli URL assoluti (`https://gianluigi-pt.vercel.app/`) in `index.html`/`sitemap.xml`/`robots.txt` con il dominio definitivo dopo il deploy

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

## Pagamenti Stripe — Fase 3C

I pacchetti sono acquistabili da `/pacchetti` tramite **Stripe Checkout**. Dopo il pagamento, il webhook:

1. marca l'ordine come `paid`
2. crea o collega l'utente cliente
3. crea il profilo `Client` se manca
4. genera il link invito se il cliente non ha ancora password
5. invia la email “la tua app è pronta” con guida PWA

### Variabili Stripe

| Variabile | Uso |
|---|---|
| `STRIPE_SECRET_KEY` | Chiave segreta Stripe, prima in modalità test |
| `STRIPE_WEBHOOK_SECRET` | Signing secret del webhook Stripe |
| `APP_URL` | URL base usato per success/cancel/invito |

Webhook endpoint su Vercel:

```text
https://gianluigi-pt.vercel.app/api/payments/webhook
```

Eventi minimi da abilitare:

- `checkout.session.completed`
- `checkout.session.expired`

Per test locale completo:

```bash
vercel dev
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Poi copia il webhook secret mostrato dalla Stripe CLI in `STRIPE_WEBHOOK_SECRET`.

## Documentazione

Progettazione e roadmap nel vault Obsidian `AstroAi/Wiki/`:
- `gianluigi-pt-roadmap-fasi` — roadmap a 3 fasi
- `gianluigi-pt-piano-fase1` — piano operativo Fase 1
- `gianluigi-pt-wireframe-design-system` — wireframe + design system
- `gianluigi-pt-architettura-tecnica` — architettura (Fase 2/3)
